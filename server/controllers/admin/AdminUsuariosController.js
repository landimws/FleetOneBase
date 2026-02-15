import MasterDatabase from '../../config/MasterDatabase.js';
import bcrypt from 'bcrypt';

/**
 * Controller Administrativo para gestão de Usuários Master
 * Rotas: /admin/usuarios/*
 * Requer: isSuperAdmin middleware
 */
class AdminUsuariosController {
    /**
     * GET /admin/usuarios
     * Lista todos os usuários do Master DB
     */
    async listAllMasterUsers(req, res) {
        try {
            const { empresaId } = req.query;

            const whereClause = empresaId ? { empresaId: parseInt(empresaId) } : {};

            const usuarios = await MasterDatabase.Usuario.findAll({
                where: whereClause,
                include: [{
                    model: MasterDatabase.Empresa,
                    attributes: ['id', 'nome', 'ativo']
                }],
                order: [['createdAt', 'DESC']]
            });

            // Buscar todas as empresas para o filtro
            const empresas = await MasterDatabase.Empresa.findAll({
                attributes: ['id', 'nome'],
                where: { ativo: true },
                order: [['nome', 'ASC']]
            });

            res.render('admin/usuarios/index', {
                title: 'Gerenciar Usuários',
                usuarios,
                empresas,
                filtroEmpresaId: empresaId || '',
                page: 'usuarios',
                layout: 'admin/layouts/admin-layout'
            });
        } catch (error) {
            console.error('Erro ao listar usuários:', error);
            res.status(500).send('Erro ao carregar usuários.');
        }
    }

    /**
     * GET /admin/usuarios/novo
     * Renderiza formulário de criação/edição
     */
    async renderForm(req, res) {
        const usuarioId = req.query.id;
        let usuario = null;

        if (usuarioId) {
            usuario = await MasterDatabase.Usuario.findByPk(usuarioId);
        }

        // Buscar empresas ativas para o select
        const empresas = await MasterDatabase.Empresa.findAll({
            attributes: ['id', 'nome'],
            where: { ativo: true },
            order: [['nome', 'ASC']]
        });

        res.render('admin/usuarios/form', {
            title: usuario ? 'Editar Usuário' : 'Novo Usuário',
            usuario: usuario || {},
            empresas,
            page: 'usuarios',
            layout: 'admin/layouts/admin-layout'
        });
    }

    /**
     * POST /admin/usuarios
     * Cria novo usuário Master
     */
    async createMasterUser(req, res) {
        try {
            const { nome, username, password, role, empresaId, isSuperAdmin } = req.body;

            // Validar username único
            const usuarioExistente = await MasterDatabase.Usuario.findOne({
                where: { username }
            });

            if (usuarioExistente) {
                return res.status(400).json({
                    success: false,
                    message: 'Username já cadastrado.'
                });
            }

            // Validar que empresa existe
            if (empresaId) {
                const empresa = await MasterDatabase.Empresa.findByPk(empresaId);
                if (!empresa) {
                    return res.status(400).json({
                        success: false,
                        message: 'Empresa não encontrada.'
                    });
                }
            }

            // Hash da senha
            const passwordHash = await bcrypt.hash(password, 10);

            const usuario = await MasterDatabase.Usuario.create({
                nome,
                username,
                password: passwordHash,
                role: role || 'admin',
                ativo: true,
                isSuperAdmin: isSuperAdmin === 'true' || isSuperAdmin === true,
                empresaId: empresaId || null
            });

            res.json({
                success: true,
                message: 'Usuário criado com sucesso!',
                usuarioId: usuario.id
            });
        } catch (error) {
            console.error('Erro ao criar usuário:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao criar usuário: ' + error.message
            });
        }
    }

    /**
     * PUT /admin/usuarios/:id
     * Atualiza dados do usuário
     */
    async update(req, res) {
        try {
            const { id } = req.params;
            const { nome, username, password, role, empresaId, isSuperAdmin } = req.body;

            const usuario = await MasterDatabase.Usuario.findByPk(id);

            if (!usuario) {
                return res.status(404).json({
                    success: false,
                    message: 'Usuário não encontrado.'
                });
            }

            // Validar username único (se mudou)
            if (username && username !== usuario.username) {
                const usuarioExistente = await MasterDatabase.Usuario.findOne({
                    where: { username }
                });

                if (usuarioExistente) {
                    return res.status(400).json({
                        success: false,
                        message: 'Username já cadastrado.'
                    });
                }
            }

            // Preparar dados de atualização
            const updateData = {
                nome,
                username,
                role: role || usuario.role,
                isSuperAdmin: isSuperAdmin === 'true' || isSuperAdmin === true,
                empresaId: empresaId || null
            };

            // Atualizar senha apenas se fornecida
            if (password && password.trim() !== '') {
                updateData.password = await bcrypt.hash(password, 10);
            }

            await usuario.update(updateData);

            res.json({
                success: true,
                message: 'Usuário atualizado com sucesso!'
            });
        } catch (error) {
            console.error('Erro ao atualizar usuário:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao atualizar usuário.'
            });
        }
    }

    /**
     * POST /admin/usuarios/:id/toggle-status
     * Ativa/Desativa usuário
     */
    async toggleUserStatus(req, res) {
        try {
            const { id } = req.params;

            const usuario = await MasterDatabase.Usuario.findByPk(id);

            if (!usuario) {
                return res.status(404).json({
                    success: false,
                    message: 'Usuário não encontrado.'
                });
            }

            const novoStatus = !usuario.ativo;

            await usuario.update({ ativo: novoStatus });

            res.json({
                success: true,
                message: `Usuário ${novoStatus ? 'ativado' : 'desativado'} com sucesso!`,
                novoStatus
            });
        } catch (error) {
            console.error('Erro ao alterar status do usuário:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao alterar status.'
            });
        }
    }

    /**
     * POST /admin/usuarios/:id/transferir-empresa
     * Transfere usuário entre empresas
     */
    async updateUserCompany(req, res) {
        try {
            const { id } = req.params;
            const { novaEmpresaId } = req.body;

            const usuario = await MasterDatabase.Usuario.findByPk(id);

            if (!usuario) {
                return res.status(404).json({
                    success: false,
                    message: 'Usuário não encontrado.'
                });
            }

            // Validar que nova empresa existe
            const empresa = await MasterDatabase.Empresa.findByPk(novaEmpresaId);
            if (!empresa) {
                return res.status(400).json({
                    success: false,
                    message: 'Empresa não encontrada.'
                });
            }

            await usuario.update({ empresaId: novaEmpresaId });

            res.json({
                success: true,
                message: 'Usuário transferido com sucesso!',
                novaEmpresa: empresa.nome
            });
        } catch (error) {
            console.error('Erro ao transferir usuário:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao transferir usuário.'
            });
        }
    }
}

export default new AdminUsuariosController();
