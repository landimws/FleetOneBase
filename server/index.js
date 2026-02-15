
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

import cookieParser from 'cookie-parser';

// Middlewares
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser()); // [NEW] Cookie Parser
app.use(express.static(path.join(__dirname, '../public')));

// [NEW] Middleware de UI State (Sidebar)
app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.path} - Cookies:`, req.cookies);
    // Ler cookie ou usar padrão 'expanded'
    res.locals.sidebarState = req.cookies.sidebar_state || 'expanded';
    next();
});

// [NEW] Content Security Policy Middleware (Dev Friendly)
app.use((req, res, next) => {
    res.setHeader(
        'Content-Security-Policy',
        "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;"
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
                // Gerar senha segura
                const { gerarSenhaSegura } = await import('./utils/senhaSegura.js');
                const senhaSuperAdmin = gerarSenhaSegura(16);
                const hashedPassword = await bcrypt.hash(senhaSuperAdmin, 10);

                await Usuario.create({
                    nome: 'Administrador',
                    username: 'admin',
                    password: hashedPassword,
                    role: 'admin',
                    empresaId: 1, // Vincula à FleetOne
                    isSuperAdmin: true // Flag de SuperAdmin
                });

                console.log('\n' + '='.repeat(60));
                console.log('🔐 SUPER ADMIN CRIADO NA PRIMEIRA INICIALIZAÇÃO');
                console.log('='.repeat(60));
                console.log(`   Usuário: admin`);
                console.log(`   Senha:   ${senhaSuperAdmin}`);
                console.log('   ⚠️  GUARDE ESTA SENHA COM SEGURANÇA!');
                console.log('='.repeat(60) + '\n');
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
import AdminEmpresasController from './controllers/admin/AdminEmpresasController.js';
import encerramentoRoutes from './routes/encerramento.js';
import constantsRoutes from './routes/constants.js';
import financeiroRoutes from './routes/financeiro.js';
import usuariosRoutes from './routes/usuarios.js';
import empresasRoutes from './routes/empresas.js';
import profileRoutes from './routes/profile.js';
import adminRoutes from './routes/admin.js';
import controleRoutes from './routes/controle.js'; // [NEW]
import contratosRoutes from './routes/contratos.js'; // [NEW] Módulo de Contratos

// [NEW] Rotas de Autenticação (Públicas)
app.get('/login', AuthController.loginPage);
app.post('/auth/login', AuthController.login);
app.get('/logout', AuthController.logout);

// [NEW] Rotas de Primeiro Acesso (Semi-públicas - requer sessão)
app.get('/alterar-senha-obrigatoria', AuthController.paginaTrocaObrigatoria);
app.post('/api/auth/trocar-senha-primeiro-acesso', AuthController.trocarSenhaPrimeiroAcesso);

// Rotas de API
// app.use('/api/semanas', semanasRoutes); // Movido para baixo pós-auth

// [NEW] Rotas Administrativas (protegidas por isSuperAdmin internamente)
app.use('/admin', adminRoutes);
// Rota para reverter Impersonate (fora do /admin para acesso público/logado)
app.post('/revert-impersonate', AdminEmpresasController.revertImpersonate);

// [NEW] Middleware para expor sessão para as views (Impersonate)
app.use((req, res, next) => {
    res.locals.session = req.session;
    next();
});

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
app.use('/api/semanas', semanasRoutes); // [MOVED] Agora tem acesso ao tenantContext
app.use('/api/controle', controleRoutes); // [NEW] Rotas do Módulo Controle
app.use('/api/contratos', contratosRoutes); // [NEW] Rotas do Módulo de Contratos

// Rotas de View
app.get('/', (req, res) => res.render('pages/dashboard', { title: 'Gestão de Locadora', page: 'grid' }));
app.get('/controle', (req, res) => res.render('pages/controle', { title: 'Controle Operacional', page: 'controle', layout: 'layouts/main', useTailwind: true })); // [NEW]
app.get('/veiculos', (req, res) => res.render('pages/veiculos', { title: 'Veículos', page: 'veiculos' }));
app.get('/clientes', (req, res) => res.render('pages/clientes', { title: 'Clientes', page: 'clientes' }));
app.get('/analise', (req, res) => res.render('pages/analytics', { title: 'Análise', page: 'dashboard', layout: 'layouts/main' }));
app.get('/relatorios', (req, res) => res.render('pages/relatorios', { title: 'Relatórios', page: 'relatorios' }));

app.get('/carteira', (req, res) => res.render('pages/carteira', { title: 'Carteira de Clientes', page: 'carteira' }));
app.get('/multas', (req, res) => res.render('pages/multas', { title: 'Gestão de Multas', page: 'multas' })); // [NEW]

// Financeiro Views
app.get('/financeiro/fornecedores', (req, res) => res.render('pages/financeiro/fornecedores', { title: 'Fornecedores', page: 'financeiro_fornecedores' }));
app.get('/financeiro/compras', (req, res) => res.render('pages/financeiro/compras', { title: 'Compras', page: 'financeiro_compras' }));
app.get('/financeiro/contas', (req, res) => res.render('pages/financeiro/contas', { title: 'Contas a Pagar', page: 'financeiro_contas' }));

// Contratos Views
app.get('/contratos', (req, res) => res.render('pages/contratos', { title: 'Contratos', page: 'contratos' }));
app.get('/contratos/novo', (req, res) => res.render('pages/contrato-form', { title: 'Novo Contrato', page: 'contratos', contratoId: null }));
app.get('/contratos/editar/:id', (req, res) => res.render('pages/contrato-form', { title: 'Editar Contrato', page: 'contratos', contratoId: req.params.id }));

// Configurações Contratos (Admin)
app.get('/configuracoes/contratos', (req, res) => res.render('pages/configuracoes/configuracoes-contrato', { title: 'Configurações de Contratos', page: 'config_contratos' }));
app.get('/configuracoes/itens-padrao', (req, res) => res.render('pages/configuracoes/itens-contrato-padrao', { title: 'Itens Padrão', page: 'config_itens' }));
app.get('/configuracoes/templates', (req, res) => res.render('pages/configuracoes/editor-templates', { title: 'Editor de Templates', page: 'config_templates' }));

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
