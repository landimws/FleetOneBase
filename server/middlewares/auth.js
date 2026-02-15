
import session from 'express-session';
import connectSessionSequelize from 'connect-session-sequelize';
import sequelize from '../config/database-sqlite.js';

const SequelizeStore = connectSessionSequelize(session.Store);

const sessionStore = new SequelizeStore({
    db: sequelize,
    checkExpirationInterval: 15 * 60 * 1000,
    expiration: 24 * 60 * 60 * 1000
});

// Sincronizar tabela de sessões
sessionStore.sync();

// Configuração da Sessão
export const sessionConfig = session({
    secret: process.env.SESSION_SECRET || 'secreta_super_secreta_locadora_123',
    store: sessionStore,
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
        role: req.session.userRole,
        empresaId: req.session.empresaId // [NEW] Disponível na view
    };

    // [SECURITY] Bloqueio Total para FleetOne em Rotas Operacionais
    const FLEETONE_EMPRESA_ID = 1;
    if (req.session.empresaId === FLEETONE_EMPRESA_ID) {
        // Rotas permitidas para SuperAdmin
        const allowedPaths = [
            '/admin',
            '/logout',
            '/auth/logout',
            '/api/profile'
        ];

        // Verifica se o path inicia com algum permitido
        const isAllowed = allowedPaths.some(p => req.path.startsWith(p));

        // Se tentar acessar dashboard, veiculos, etc -> Redireciona para Admin
        if (!isAllowed) {
            // Evitar loop de redirecionamento se já estiver no admin
            if (req.path === '/admin/empresas') return next();

            return res.redirect('/admin/empresas');
        }
    }

    next();
};

// Middleware de Admin
export const isAdmin = (req, res, next) => {
    if (req.session.userRole === 'admin') {
        return next();
    }
    return res.status(403).send('Acesso negado. Apenas administradores.');
};

// Middleware de Super Admin (Painel Administrativo)
// SuperAdmin = Usuários da empresa FleetOne (empresaId === 1)
export const isSuperAdmin = (req, res, next) => {
    // Verificar se usuário está autenticado
    if (!req.session.userId) {
        return res.redirect('/login');
    }

    // REGRA: SuperAdmin = empresaId da FleetOne (ID fixo = 1)
    const FLEETONE_EMPRESA_ID = 1;

    // [FIX] Usar == para permitir string '1' ou number 1
    if (req.session.empresaId == FLEETONE_EMPRESA_ID) {
        return next();
    }

    // Log de segurança para debugar o 403
    console.warn(`[SECURITY] Acesso negado ao Admin. User: ${req.session.userUsername}, Role: ${req.session.userRole}, EmpresaId: ${req.session.empresaId} (Type: ${typeof req.session.empresaId})`);

    return res.status(403).render('errors/403', {
        message: 'Acesso negado. Apenas administradores FleetOne têm acesso ao Painel Administrativo.',
        layout: false
    });
};

