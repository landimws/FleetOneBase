import MasterDatabase from '../../config/MasterDatabase.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import { Op } from 'sequelize'; // [NEW] Import Op

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Controller Administrativo para gestão de Empresas (Tenants)
 * Rotas: /admin/empresas/*
 * Requer: isSuperAdmin middleware
 */
class AdminEmpresasController {
    constructor() {
        // Bind methods to this instance
        this.listAll = this.listAll.bind(this);
        this.renderForm = this.renderForm.bind(this);
        this.create = this.create.bind(this);
        this.update = this.update.bind(this);
        this.toggleStatus = this.toggleStatus.bind(this);
        this.delete = this.delete.bind(this);
        this.impersonate = this.impersonate.bind(this);
        this.revertImpersonate = this.revertImpersonate.bind(this);
    }

    /**
     * GET /admin/empresas
     * Lista todas as empresas do sistema (Exceto a Master ID 1)
     */
    async listAll(req, res) {
        try {
            const empresas = await MasterDatabase.Empresa.findAll({
                where: {
                    id: { [Op.ne]: 1 } // [FIX] Ocultar Truvex (Sistema)
                },
                include: [{
                    model: MasterDatabase.Usuario,
                    attributes: ['id', 'username', 'primeiro_acesso', 'senha_temporaria_visivel'],
                    as: 'Usuarios',
                    required: false // LEFT JOIN para incluir empresas sem usuários
                }],
                order: [['createdAt', 'DESC']]
            });

            // Contar usuários por empresa e identificar pendentes
            const empresasComContagem = empresas.map(empresa => ({
                ...empresa.toJSON(),
                numUsuarios: empresa.Usuarios ? empresa.Usuarios.length : 0,
                usuarioPendente: empresa.Usuarios?.find(u => u.primeiro_acesso) || null
            }));

            res.render('admin/empresas/index', {
                title: 'Gerenciar Empresas',
                empresas: empresasComContagem,
                page: 'empresas',
                layout: 'admin/layouts/admin-layout'
            });
        } catch (error) {
            console.error('Erro ao listar empresas:', error);
            res.status(500).send('Erro ao carregar empresas.');
        }
    }

    /**
     * GET /admin/empresas/novo
     * Renderiza formulário de criação
     */
    async renderForm(req, res) {
        const empresaId = req.query.id;
        let empresa = null;

        if (empresaId) {
            // [SECURITY] Não permitir editar ID 1
            if (parseInt(empresaId) === 1) {
                return res.status(403).send('Acesso negado. Empresa do sistema não pode ser editada.');
            }
            empresa = await MasterDatabase.Empresa.findByPk(empresaId);
        }

        res.render('admin/empresas/form', {
            title: empresa ? 'Editar Empresa' : 'Nova Empresa',
            empresa: empresa || {},
            page: 'empresas',
            layout: 'admin/layouts/admin-layout'
        });
    }

    /**
     * POST /admin/empresas
     * Cria ou Atualiza (Upsert) empresa
     * Se vier ID no body, redireciona para Update.
     */
    async create(req, res) {
        try {
            // [FIX] Suporte para Edição via Form Nativo (se JS falhar)
            if (req.body.id) {
                console.log('🔄 Detectada edição via POST. Redirecionando para Update...');
                req.params.id = req.body.id;
                return this.update(req, res);
            }

            const { nome, cnpj, email, telefone, responsavel, cep, logradouro,
                numero, bairro, cidade, estado } = req.body;

            // Validar CNPJ único
            if (cnpj) {
                const empresaExistente = await MasterDatabase.Empresa.findOne({
                    where: { cnpj }
                });

                if (empresaExistente) {
                    // [UX] Verificar se a requisição espera JSON ou HTML
                    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                        return res.status(400).json({ success: false, message: 'CNPJ já cadastrado.' });
                    } else {
                        return res.send('<script>alert("CNPJ já cadastrado!"); history.back();</script>');
                    }
                }
            }

            // Criar empresa no Master DB
            const empresa = await MasterDatabase.Empresa.create({
                nome,
                cnpj: cnpj || null,
                email: email || null,
                telefone: telefone || null,
                responsavel: responsavel || null,
                cep: cep || null,
                logradouro: logradouro || null,
                numero: numero || null,
                bairro: bairro || null,
                cidade: cidade || null,
                estado: estado || null,
                ativo: true
            });

            // Executar script para criar banco do tenant
            try {
                const scriptPath = path.resolve(process.cwd(), 'server/scripts/createTenant.js');
                const { stdout, stderr } = await execAsync(`node "${scriptPath}" ${empresa.id}`);

                console.log('✅ Banco criado para empresa:', empresa.id);
                if (stdout) console.log(stdout);
                if (stderr) console.error(stderr);
            } catch (scriptError) {
                console.error('❌ Erro ao criar banco tenant:', scriptError);
                // Rollback: deletar empresa criada
                await empresa.destroy();

                if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                    return res.status(500).json({ success: false, message: 'Erro ao criar banco de dados da empresa.' });
                } else {
                    return res.send('<script>alert("Erro ao criar banco de dados!"); history.back();</script>');
                }
            }

            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.json({ success: true, message: 'Empresa criada com sucesso!', empresaId: empresa.id });
            } else {
                return res.redirect('/admin/empresas');
            }

        } catch (error) {
            console.error('Erro ao criar empresa:', error);
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                res.status(500).json({ success: false, message: 'Erro ao criar empresa: ' + error.message });
            } else {
                return res.send(`<script>alert("Erro ao criar empresa: ${error.message}"); history.back();</script>`);
            }
        }
    }

    /**
     * PUT /admin/empresas/:id
     * Atualiza dados da empresa
     */
    async update(req, res) {
        try {
            const { id } = req.params; // Pode vir via req.body.id no POST acima
            console.log(`📝 [AdminEmpresasController] Update request para ID: ${id}`);

            // [SECURITY] Não permitir editar ID 1
            if (parseInt(id) === 1) {
                const msg = 'Acesso negado. Empresa do sistema não pode ser editada.';
                if (req.xhr || req.headers.accept.indexOf('json') > -1) return res.status(403).json({ success: false, message: msg });
                else return res.send(`<script>alert("${msg}"); history.back();</script>`);
            }

            const { nome, cnpj, email, telefone, responsavel, cep, logradouro,
                numero, bairro, cidade, estado } = req.body;

            const empresa = await MasterDatabase.Empresa.findByPk(id);

            if (!empresa) {
                const msg = 'Empresa não encontrada.';
                if (req.xhr || req.headers.accept.indexOf('json') > -1) return res.status(404).json({ success: false, message: msg });
                else return res.send(`<script>alert("${msg}"); history.back();</script>`);
            }

            // Validar CNPJ único (se mudou)
            if (cnpj && cnpj !== empresa.cnpj) {
                const empresaExistente = await MasterDatabase.Empresa.findOne({
                    where: { cnpj }
                });

                if (empresaExistente) {
                    const msg = 'CNPJ já cadastrado em outra empresa.';
                    if (req.xhr || req.headers.accept.indexOf('json') > -1) return res.status(400).json({ success: false, message: msg });
                    else return res.send(`<script>alert("${msg}"); history.back();</script>`);
                }
            }

            await empresa.update({
                nome,
                cnpj: cnpj || null,
                email: email || null,
                telefone: telefone || null,
                responsavel: responsavel || null,
                cep: cep || null,
                logradouro: logradouro || null,
                numero: numero || null,
                bairro: bairro || null,
                cidade: cidade || null,
                estado: estado || null
            });

            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.json({ success: true, message: 'Empresa atualizada com sucesso!' });
            } else {
                return res.redirect('/admin/empresas');
            }

        } catch (error) {
            console.error('Erro ao atualizar empresa:', error);
            const msg = 'Erro ao atualizar empresa.';
            if (req.xhr || req.headers.accept.indexOf('json') > -1) return res.status(500).json({ success: false, message: msg });
            else return res.send(`<script>alert("${msg}"); history.back();</script>`);
        }
    }

    /**
     * POST /admin/empresas/:id/toggle-status
     * Ativa/Desativa empresa + desativa usuários em cascata
     */
    async toggleStatus(req, res) {
        try {
            const { id } = req.params;

            // [SECURITY] Não permitir desativar ID 1
            if (parseInt(id) === 1) {
                return res.status(403).json({
                    success: false,
                    message: 'Acesso negado. Empresa do sistema não pode ser desativada.'
                });
            }

            const empresa = await MasterDatabase.Empresa.findByPk(id);

            if (!empresa) {
                return res.status(404).json({
                    success: false,
                    message: 'Empresa não encontrada.'
                });
            }

            const novoStatus = !empresa.ativo;

            await MasterDatabase.sequelize.transaction(async (t) => {
                // Atualizar status da empresa
                await empresa.update({ ativo: novoStatus }, { transaction: t });

                // Cascata: Se desativar empresa, desativa todos os usuários
                if (!novoStatus) {
                    const usuariosDesativados = await MasterDatabase.Usuario.update(
                        { ativo: false },
                        {
                            where: { empresaId: id },
                            transaction: t
                        }
                    );

                    console.log(`🔒 Empresa ${id} desativada. ${usuariosDesativados[0]} usuários desativados em cascata.`);
                }
            });

            res.json({
                success: true,
                message: `Empresa ${novoStatus ? 'ativada' : 'desativada'} com sucesso!`,
                novoStatus
            });
        } catch (error) {
            console.error('Erro ao alterar status da empresa:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao alterar status.'
            });
        }
    }

    /**
     * DELETE /admin/empresas/:id
     * Remove empresa (soft delete)
     * TODO: Implementar exclusão de banco físico se necessário
     */
    async delete(req, res) {
        try {
            const { id } = req.params;

            // [SECURITY] Não permitir deletar ID 1
            if (parseInt(id) === 1) {
                return res.status(403).json({
                    success: false,
                    message: 'Acesso negado. Empresa do sistema não pode ser deletada.'
                });
            }

            const empresa = await MasterDatabase.Empresa.findByPk(id);

            if (!empresa) {
                return res.status(404).json({
                    success: false,
                    message: 'Empresa não encontrada.'
                });
            }

            // Por segurança, apenas desativar (não deletar fisicamente)
            await empresa.update({ ativo: false });

            res.json({
                success: true,
                message: 'Empresa desativada com sucesso!'
            });
        } catch (error) {
            console.error('Erro ao deletar empresa:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao deletar empresa.'
            });
        }
    }

    /**
     * POST /admin/empresas/:id/impersonate
     * Acessar painel como cliente para suporte
     */
    async impersonate(req, res) {
        try {
            const { id } = req.params;

            // [SECURITY] Não permitir impersonate na própria empresa do sistema
            if (parseInt(id) === 1) {
                return res.send('<script>alert("Ação inválida para a empresa do sistema."); history.back();</script>');
            }

            const empresa = await MasterDatabase.Empresa.findByPk(id);
            if (!empresa) return res.status(404).send('Empresa não encontrada.');

            // Buscar um usuário admin dessa empresa (geralmente o primeiro criado)
            const usuarioAlvo = await MasterDatabase.Usuario.findOne({
                where: {
                    empresaId: id,
                    ativo: true
                },
                order: [['createdAt', 'ASC']]
            });

            if (!usuarioAlvo) {
                return res.send('<script>alert("Empresa não possui usuários ativos para acessar."); history.back();</script>');
            }

            console.log(`[AUDIT] ADMIN ${req.session.userUsername} iniciou suporte na empresa ${empresa.nome}`);

            // 1. Salvar sessão original do Admin
            const originalSession = {
                userId: req.session.userId,
                userName: req.session.userName,
                userUsername: req.session.userUsername,
                userRole: req.session.userRole,
                isSuperAdmin: true,
                empresaId: req.session.empresaId
            };

            // 2. Definir sessão para Impersonate
            req.session.originalAdmin = originalSession;
            req.session.isImpersonating = true;
            req.session.impersonateTarget = empresa.nome;

            // 3. Substituir dados da sessão pelos do usuário alvo
            req.session.userId = usuarioAlvo.id;
            req.session.userName = usuarioAlvo.nome;
            req.session.userUsername = usuarioAlvo.username;
            req.session.userRole = usuarioAlvo.role;
            req.session.empresaId = usuarioAlvo.empresaId;
            req.session.isSuperAdmin = false; // Admin impersonando perde superpoderes globais

            req.session.save(() => {
                res.redirect('/'); // Redireciona para o dashboard do cliente
            });

        } catch (error) {
            console.error('Erro no Impersonate:', error);
            res.status(500).send('Erro ao acessar painel do cliente.');
        }
    }

    /**
     * POST /admin/revert-impersonate
     * Sair do modo impersonate e voltar ao admin
     */
    async revertImpersonate(req, res) {
        try {
            if (!req.session.originalAdmin || !req.session.isImpersonating) {
                return res.redirect('/');
            }

            // Log de auditoria deve ser seguro
            const adminUser = req.session.originalAdmin ? req.session.originalAdmin.userUsername : 'Desconhecido';
            console.log(`[AUDIT] ADMIN ${adminUser} encerrou suporte.`);

            // Restaurar Sessão Original
            const original = req.session.originalAdmin;

            if (original) {
                req.session.userId = original.userId;
                req.session.userName = original.userName;
                req.session.userUsername = original.userUsername;
                req.session.userRole = original.userRole;
                req.session.empresaId = Number(original.empresaId); // [FIX] Garantir Number
                req.session.isSuperAdmin = true; // Restaura superpoderes

                console.log(`[AUDIT] Sessão restaurada para ADMIN: ${original.userUsername} (Empresa ID: ${req.session.empresaId})`);
            }

            // Limpar flags de impersonate
            delete req.session.originalAdmin;
            delete req.session.isImpersonating;
            delete req.session.impersonateTarget;

            req.session.save(() => {
                res.redirect('/admin/empresas');
            });

        } catch (error) {
            console.error('Erro ao reverter impersonate:', error);
            res.redirect('/');
        }
    }
}

export default new AdminEmpresasController();
