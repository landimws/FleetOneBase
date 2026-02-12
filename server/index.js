
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';
import https from 'https';
// import sequelize from './config/database-sqlite.js'; // [REMOVED] Legacy
import MasterDatabase from './config/MasterDatabase.js'; // [NEW] Master DB
import tenantContext from './middlewares/tenantContext.js'; // [NEW] Tenant Context
import { sessionConfig, isAuthenticated } from './middlewares/auth.js';
import AuthController from './controllers/AuthController.js';
import bcrypt from 'bcrypt';

// Configuração de __dirname para ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

import expressLayouts from 'express-ejs-layouts';

// Configurar EJS
app.use(expressLayouts);
app.set('layout', 'layouts/main'); // Layout padrão
app.set("layout extractScripts", true);
app.set("layout extractStyles", true);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Middlewares
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// [NEW] Content Security Policy Middleware (Fix connection blocking)
app.use((req, res, next) => {
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://unpkg.com https://cdn.jsdelivr.net; " +
        "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://unpkg.com https://cdn.jsdelivr.net; " +
        "font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com https://unpkg.com https://cdn.jsdelivr.net; " +
        "img-src 'self' data: https://unpkg.com https://cdnjs.cloudflare.com; " +
        "connect-src 'self' https://localhost:3000 wss://localhost:3000 https://*.chrome.devtools.json https://viacep.com.br https://unpkg.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net;"
    );
    next();
});

app.use(sessionConfig);

// Inicializar MasterDatabase e Criar Admin Padrão
if (process.env.NODE_ENV !== 'test') {
    (async () => {
        try {
            await MasterDatabase.init();
            const { Usuario, Empresa } = MasterDatabase;

            // 1. Garantir Empresa Padrão (FleetOne Admin)
            let fleetOne = await Empresa.findByPk(1);
            if (!fleetOne) {
                fleetOne = await Empresa.create({
                    id: 1, // ID Fixo 1
                    nome: 'FleetOne Admin',
                    responsavel: 'Sistema',
                    email: 'admin@fleetone.com.br',
                    ativo: true
                });
                console.log('🏢 Empresa FleetOne criada (ID: 1)');
            }

            // 2. Garantir Usuário Admin
            const count = await Usuario.count();
            if (count === 0) {
                const hashedPassword = await bcrypt.hash('admin123', 10);
                await Usuario.create({
                    nome: 'Administrador',
                    username: 'admin',
                    password: hashedPassword,
                    role: 'admin',
                    empresaId: 1, // Vincula à FleetOne
                    isSuperAdmin: true // Flag de SuperAdmin
                });
                console.log('👤 Usuário padrão criado: admin / admin123 (SuperAdmin)');
            }
        } catch (e) {
            console.error('❌ Erro na inicialização do MasterDB:', e);
        }
    })();
}

// Importar rotas
import veiculosRoutes from './routes/veiculos.js';
import clientesRoutes from './routes/clientes.js';
import semanasRoutes from './routes/semanas.js';
import dashboardRoutes from './routes/dashboard.js';
import relatoriosRoutes from './routes/relatorios.js';

import carteiraRoutes from './routes/carteira.js';
import multasRoutes from './routes/multas.js';
import encerramentoRoutes from './routes/encerramento.js';
import constantsRoutes from './routes/constants.js';
import financeiroRoutes from './routes/financeiro.js';
import usuariosRoutes from './routes/usuarios.js';
import empresasRoutes from './routes/empresas.js';
import profileRoutes from './routes/profile.js';
import adminRoutes from './routes/admin.js';

// [NEW] Rotas de Autenticação (Públicas)
app.get('/login', AuthController.loginPage);
app.post('/auth/login', AuthController.login);
app.get('/logout', AuthController.logout);

// Rotas de API
app.use('/api/semanas', semanasRoutes);

// [NEW] Rotas Administrativas (protegidas por isSuperAdmin internamente)
app.use('/admin', adminRoutes);

// [NEW] Middleware Global de Proteção + Tenant Context
app.use(isAuthenticated);
app.use(tenantContext); // [IMPORTANT] Injeta req.models baseado no login

// Rotas que dependem de req.models
app.use('/api/veiculos', veiculosRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/relatorios', relatoriosRoutes);

app.use('/api/carteira', carteiraRoutes);
app.use('/api/multas', multasRoutes);
app.use('/api/encerramento', encerramentoRoutes);
app.use('/api/constants', constantsRoutes);
app.use('/api/financeiro', financeiroRoutes);
app.use('/configuracoes/usuarios', usuariosRoutes);
app.use('/configuracoes/empresa', empresasRoutes);
app.use('/api/profile', profileRoutes);

// Rotas de View
app.get('/', (req, res) => res.render('pages/dashboard', { title: 'Gestão de Locadora', page: 'grid' }));
app.get('/veiculos', (req, res) => res.render('pages/veiculos', { title: 'Veículos', page: 'veiculos' }));
app.get('/clientes', (req, res) => res.render('pages/clientes', { title: 'Clientes', page: 'clientes' }));
app.get('/analise', (req, res) => res.render('pages/analytics', { title: 'Análise', page: 'dashboard' }));
app.get('/relatorios', (req, res) => res.render('pages/relatorios', { title: 'Relatórios', page: 'relatorios' }));

app.get('/carteira', (req, res) => res.render('pages/carteira', { title: 'Carteira de Clientes', page: 'carteira' }));
app.get('/multas', (req, res) => res.render('pages/multas', { title: 'Gestão de Multas', page: 'multas' })); // [NEW]

// Financeiro Views
app.get('/financeiro/fornecedores', (req, res) => res.render('pages/financeiro/fornecedores', { title: 'Fornecedores', page: 'financeiro_fornecedores' }));
app.get('/financeiro/compras', (req, res) => res.render('pages/financeiro/compras', { title: 'Compras', page: 'financeiro_compras' }));
app.get('/financeiro/contas', (req, res) => res.render('pages/financeiro/contas', { title: 'Contas a Pagar', page: 'financeiro_contas' }));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', db: 'sqlite' }));

if (process.env.NODE_ENV !== 'test') {
    // Carregar certificados SSL
    const privateKey = fs.readFileSync(path.join(__dirname, '../certs/server.key'), 'utf8');
    const certificate = fs.readFileSync(path.join(__dirname, '../certs/server.cert'), 'utf8');
    const credentials = { key: privateKey, cert: certificate };

    const httpsServer = https.createServer(credentials, app);

    httpsServer.listen(PORT, () => {
        console.log(`🚀 Servidor HTTPS rodando em https://localhost:${PORT}`);
    });
}

export default app;
