import MasterDatabase from '../config/MasterDatabase.js';
import bcrypt from 'bcrypt';

const AuthController = {
    // Render Login Page
    loginPage: (req, res) => {
        if (req.session.userId) {
            return res.redirect('/');
        }
        res.render('pages/login', {
            layout: 'layouts/login',
            title: 'Login',
            error: null
        });
    },

    // Handle Login
    login: async (req, res) => {
        const { username, password } = req.body;

        try {
            // [MULTI-TENANT] Usar Usuario do MasterDatabase
            if (!MasterDatabase.Usuario) {
                await MasterDatabase.init();
            }

            const user = await MasterDatabase.Usuario.findOne({ where: { username, ativo: true } });

            if (!user) {
                return res.render('pages/login', {
                    layout: 'layouts/login',
                    title: 'Login',
                    error: 'Usuário ou senha incorretos'
                });
            }

            const match = await bcrypt.compare(password, user.password);

            if (!match) {
                return res.render('pages/login', {
                    layout: 'layouts/login',
                    title: 'Login',
                    error: 'Usuário ou senha incorretos'
                });
            }

            // [NOVO] Verificar primeiro acesso
            if (user.primeiro_acesso) {
                // Salvar userId temporário para tela de troca
                req.session.userId = user.id;
                req.session.empresaId = user.empresaId;
                req.session.primeiroAcesso = true;

                return req.session.save(() => {
                    res.redirect('/alterar-senha-obrigatoria');
                });
            }

            // Set Session
            req.session.userId = user.id;
            req.session.userName = user.nome;
            req.session.userUsername = user.username;
            req.session.userRole = user.role;

            // [MULTI-TENANT] Salvar empresaId na sessão
            req.session.empresaId = user.empresaId;

            req.session.lastActivity = Date.now();

            req.session.save(() => {
                // REGRA: SuperAdmin = empresa FleetOne (ID = 1)
                const FLEETONE_EMPRESA_ID = 1;

                if (user.empresaId === FLEETONE_EMPRESA_ID) {
                    console.log(`🔒 Login FleetOne (ID 1) detectado. Redirecionando para /admin.`);
                    // Usuário da FleetOne = SuperAdmin → Painel Administrativo APENAS
                    return res.redirect('/admin/empresas');
                }

                // Usuários de outras empresas → Dashboard do Tenant
                res.redirect('/');
            });

        } catch (error) {
            console.error('Erro no login:', error);
            res.render('pages/login', {
                layout: 'layouts/login',
                title: 'Login',
                error: 'Erro interno no servidor'
            });
        }
    },

    // Handle Logout
    logout: (req, res) => {
        // [MULTI-TENANT] Limpar conexões se necessário (opcional, gerenciado pelo factory)
        const empresaId = req.session.empresaId;
        req.session.destroy(() => {
            res.redirect('/login');
        });
    },

    // Renderizar tela de troca obrigatória de senha
    paginaTrocaObrigatoria: (req, res) => {
        // Verificar se tem sessão de primeiro acesso
        if (!req.session.userId || !req.session.primeiroAcesso) {
            return res.redirect('/login');
        }

        res.render('pages/alterar-senha-obrigatoria', {
            layout: false, // [FIX] View tem HTML completo com Bootstrap
            title: 'Alterar Senha - Obrigatório'
        });
    },

    // API: Trocar senha no primeiro acesso
    trocarSenhaPrimeiroAcesso: async (req, res) => {
        try {
            const userId = req.session.userId;

            if (!userId || !req.session.primeiroAcesso) {
                return res.status(401).json({ success: false, error: 'Sessão inválida' });
            }

            const { novaSenha } = req.body;

            if (!novaSenha || novaSenha.length < 8) {
                return res.status(400).json({ success: false, error: 'Senha deve ter no mínimo 8 caracteres' });
            }

            if (!MasterDatabase.Usuario) {
                await MasterDatabase.init();
            }

            const user = await MasterDatabase.Usuario.findByPk(userId);

            if (!user || !user.primeiro_acesso) {
                return res.status(400).json({ success: false, error: 'Operação inválida' });
            }

            // Atualizar senha
            const senhaHash = await bcrypt.hash(novaSenha, 10);
            await user.update({
                password: senhaHash,
                primeiro_acesso: false,
                senha_temporaria_visivel: null, // Apagar senha temporária
                senha_temporaria_gerada_em: null,
                senha_expira_em: null
            });

            // Atualizar sessão para login normal
            req.session.userName = user.nome;
            req.session.userUsername = user.username;
            req.session.userRole = user.role;
            req.session.lastActivity = Date.now();
            delete req.session.primeiroAcesso;

            req.session.save(() => {
                res.json({ success: true });
            });

        } catch (error) {
            console.error('Erro ao trocar senha:', error);
            res.status(500).json({ success: false, error: 'Erro ao processar' });
        }
    }
};

export default AuthController;
