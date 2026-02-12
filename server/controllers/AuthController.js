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
    }
};

export default AuthController;
