
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs'; // [NEW] HTTPS
import https from 'https'; // [NEW] HTTPS
import sequelize from './config/database-sqlite.js';
import { sessionConfig, isAuthenticated } from './middlewares/auth.js'; // [NEW] Auth
import AuthController from './controllers/AuthController.js'; // [NEW] Auth
import Usuario from './models-sqlite/Usuario.js'; // [NEW] User Model
import bcrypt from 'bcrypt'; // [NEW] For default user

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
app.use(express.json({ limit: '10mb' })); // Aumentado para suportar semanas grandes
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

app.use(sessionConfig); // [NEW] Session Middleware

// Inicializar SQLite e Sincronizar Tabelas
if (process.env.NODE_ENV !== 'test') {
    (async () => {
        try {
            // Disable FKs temporarily (just in case)
            await sequelize.query('PRAGMA foreign_keys = OFF;');

            // Remove 'alter: true' to prevent risky table recreation.
            // We rely on manual migrations for schema changes now.
            await sequelize.sync();

            await sequelize.query('PRAGMA foreign_keys = ON;');
            // console.log('✅ SQLite sincronizado com sucesso (database.sqlite)');
        } catch (err) {
            console.error('❌ Erro ao sincronizar SQLite:', err);
        }
    })();

    // [NEW] Criar usuário admin padrão se não existir
    (async () => {
        try {
            await sequelize.sync(); // Garante que a tabela existe
            const count = await Usuario.count();
            if (count === 0) {
                const hashedPassword = await bcrypt.hash('admin123', 10);
                await Usuario.create({
                    nome: 'Administrador',
                    username: 'admin',
                    password: hashedPassword,
                    role: 'admin'
                });
                console.log('👤 Usuário padrão criado: admin / admin123');
            }
        } catch (e) {
            // The original instruction provided a `res.status(500).json(...)` which is not applicable here.
            // Assuming the intent was to enhance logging for this specific error.
            console.error('❌ Erro ao criar usuário padrão:', e);
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
import multasRoutes from './routes/multas.js'; // [NEW]
import encerramentoRoutes from './routes/encerramento.js';
import constantsRoutes from './routes/constants.js'; // [NEW]
import financeiroRoutes from './routes/financeiro.js'; // [NEW]
import usuariosRoutes from './routes/usuarios.js'; // [NEW] Users CRUD
import empresasRoutes from './routes/empresas.js'; // [NEW] Company Settings
import profileRoutes from './routes/profile.js'; // [NEW] Profile Update

// [NEW] Rotas de Autenticação (Públicas)
app.get('/login', AuthController.loginPage);
app.post('/auth/login', AuthController.login);
app.get('/logout', AuthController.logout);

// Rotas de API
app.use('/api/semanas', semanasRoutes);

// [NEW] Middleware Global de Proteção
app.use(isAuthenticated);
app.use('/api/veiculos', veiculosRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/relatorios', relatoriosRoutes);

app.use('/api/carteira', carteiraRoutes);
app.use('/api/multas', multasRoutes); // [NEW]
app.use('/api/encerramento', encerramentoRoutes);
app.use('/api/constants', constantsRoutes); // [NEW]
app.use('/api/financeiro', financeiroRoutes); // [NEW]
app.use('/configuracoes/usuarios', usuariosRoutes); // [NEW] Admin Routes
app.use('/configuracoes/empresa', empresasRoutes); // [NEW] Company Routes
app.use('/api/profile', profileRoutes); // [NEW] Profile API

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
