
import Usuario from '../models-sqlite/Usuario.js';
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
            const user = await Usuario.findOne({ where: { username, ativo: true } });

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
            req.session.userUsername = user.username; // [NEW] Needed for profile edit
            req.session.userRole = user.role;
            req.session.lastActivity = Date.now();

            req.session.save(() => {
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
        req.session.destroy(() => {
            res.redirect('/login');
        });
    }
};

export default AuthController;
