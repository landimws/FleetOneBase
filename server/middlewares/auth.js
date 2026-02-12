
import session from 'express-session';
import connectSessionSequelize from 'connect-session-sequelize';
import sequelize from '../config/database-sqlite.js';

const SequelizeStore = connectSessionSequelize(session.Store);

// Configuração da Sessão
export const sessionConfig = session({
    secret: process.env.SESSION_SECRET || 'secreta_super_secreta_locadora_123',
    store: new SequelizeStore({
        db: sequelize,
        checkExpirationInterval: 15 * 60 * 1000,
        expiration: 24 * 60 * 60 * 1000
    }),
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000,
        secure: false // Set to true only if using HTTPS in production
    }
});

// Middleware de Autenticação
export const isAuthenticated = (req, res, next) => {
    const publicPaths = ['/login', '/auth/login', '/health'];
    if (publicPaths.includes(req.path) || req.path.startsWith('/css') || req.path.startsWith('/js') || req.path.startsWith('/images')) {
        return next();
    }

    if (!req.session.userId) {
        return res.redirect('/login');
    }

    const INACTIVITY_LIMIT = 30 * 60 * 1000;
    const now = Date.now();

    if (req.session.lastActivity && (now - req.session.lastActivity > INACTIVITY_LIMIT)) {
        req.session.destroy(() => {
            res.redirect('/login?timeout=true');
        });
        return;
    }

    req.session.lastActivity = now;

    res.locals.user = {
        id: req.session.userId,
        nome: req.session.userName,
        username: req.session.userUsername,
        role: req.session.userRole
    };

    next();
};

// Middleware de Admin
export const isAdmin = (req, res, next) => {
    if (req.session.userRole === 'admin') {
        return next();
    }
    return res.status(403).send('Acesso negado. Apenas administradores.');
};
