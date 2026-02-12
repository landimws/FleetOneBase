import { Sequelize } from 'sequelize';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';

// 1. Carregar variáveis baseado no ambiente
// Se NODE_ENV não estiver setado, assume 'production' por segurança em ambiente Windows Service
const env = process.env.NODE_ENV || 'production';
const envFile = env === 'test' ? '.env.test' : '.env';

// Carregar .env do ROOT
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 2. Definir caminho do banco
// IMPORTANTE: Em produção no Windows Service, process.cwd() pode ser diferente. 
// Mas assumimos que o serviço roda a partir da pasta raiz do projeto.
const dbStorage = process.env.DATABASE_STORAGE || 'data/prod/database.sqlite';
const storagePath = path.resolve(process.cwd(), dbStorage);

// console.log(`[DATABASE] Ambiente: ${env}`);
// console.log(`[DATABASE] Storage: ${storagePath}`);

// ---------------------------------------------------------
// 🛡️ SAFETY GUARD: PREVENIR USO ACIDENTAL DO BANCO DE PROD
// ---------------------------------------------------------
// Se o processo for iniciado por um runner de teste (node --test, mocha, jest)
// MAS a variável de ambiente não for 'test', ABORTAR IMEDIATAMENTE.
const isTestRunner = process.argv.some(arg => arg.includes('--test') || arg.includes('mocha') || arg.includes('jest'));
if (isTestRunner && env !== 'test') {
    console.error('\n\n🛑 PERIGO CRÍTICO: DETECTADA EXECUÇÃO DE TESTES SEM NODE_ENV=test');
    console.error('🛑 ISSO IRIA DESTRUIR O BANCO DE PRODUÇÃO.');
    console.error('🛑 EXECUÇÃO ABORTADA AUTOMATICAMENTE.\n');
    process.exit(1);
}
// ---------------------------------------------------------

// 3. BARREIRA DE SEGURANÇA (Safety Check - Fail Fast)
const isTestEnv = env === 'test';
const isProdDbPath = storagePath.includes('prod') || storagePath.includes('database.sqlite') && !storagePath.includes('test');

// REGRA 1: Se for teste, PROIBIDO usar banco de produção ou caminho suspeito
// Se estamos em teste, o caminho OBRIGATORIAMENTE deve conter 'test'
if (isTestEnv && !storagePath.includes('test')) {
    console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
    console.error('CRITICAL ERROR: TENTATIVA DE RODAR TESTES FORA DA PASTA TEST');
    console.error(`Ambiente: ${env}`);
    console.error(`Storage Alvo: ${storagePath}`);
    console.error('A execução foi abortada imediatamente para proteger os dados.');
    console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
    process.exit(1);
}

// REGRA 2: Se for produção, PROIBIDO usar banco com 'test' no nome
if (!isTestEnv && storagePath.includes('test')) {
    console.error('CRITICAL ERROR: AMBIENTE DE PRODUÇÃO APONTANDO PARA BANCO DE TESTE');
    process.exit(1);
}

// Conexão com SQLite
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: storagePath,
    logging: false,
});

export default sequelize;
