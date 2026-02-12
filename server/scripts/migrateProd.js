
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Sequelize, DataTypes } from 'sequelize';
import MasterDatabase from '../config/MasterDatabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');

// Configurações
const PROD_DB_PATH = path.join(ROOT_DIR, 'data/prod/database.sqlite');
// O ID da empresa a ser criada
const MIGRATE_TENANT_ID = 2; // ID 1 é FleetOne
const MIGRATE_TENANT_NAME = 'Locadora Principal (Migrada)';

async function migrate() {
    console.log('🚀 Iniciando migração do banco de produção...');

    // 1. Verificar se banco de produção existe
    if (!fs.existsSync(PROD_DB_PATH)) {
        console.error(`❌ Banco de produção não encontrado em: ${PROD_DB_PATH}`);
        process.exit(1);
    }

    try {
        // Inicializar Master DB
        await MasterDatabase.init();
        const { Empresa, Usuario } = MasterDatabase;

        // 2. Criar Empresa no Master
        console.log(`\n🏢 Verificando/Criando Empresa ID ${MIGRATE_TENANT_ID}...`);

        let empresa = await Empresa.findByPk(MIGRATE_TENANT_ID);
        if (!empresa) {
            empresa = await Empresa.create({
                id: MIGRATE_TENANT_ID,
                nome: MIGRATE_TENANT_NAME,
                ativo: true,
                responsavel: 'Admin Migrado',
                // Outros campos opcionais podem ficar null
            });
            console.log(`✅ Empresa criada: ${empresa.nome} (ID: ${empresa.id})`);
        } else {
            console.log(`ℹ️ Empresa já existe: ${empresa.nome}`);
        }

        // 3. Copiar arquivo de banco de dados
        const tenantDbPath = path.join(ROOT_DIR, `data/empresa_${MIGRATE_TENANT_ID}.sqlite`);

        // Se o arquivo destino já existe, fazer backup antes de sobrescrever?
        // Neste caso, vamos assumir que queremos substituir.
        console.log(`\n📂 Copiando banco de dados...`);
        console.log(`   De: ${PROD_DB_PATH}`);
        console.log(`   Para: ${tenantDbPath}`);

        fs.copyFileSync(PROD_DB_PATH, tenantDbPath);
        console.log('✅ Arquivo de banco copiado com sucesso.');

        // 4. Migrar Usuários (Legado -> Master)
        console.log(`\nbust👥 Migrando usuários...`);

        // Conectar ao banco LEGADO para ler usuários
        const legacySequelize = new Sequelize({
            dialect: 'sqlite',
            storage: PROD_DB_PATH,
            logging: false
        });

        const [usuariosLegados] = await legacySequelize.query("SELECT * FROM Usuarios");

        if (!usuariosLegados || usuariosLegados.length === 0) {
            console.log('ℹ️ Nenhum usuário encontrado no banco legado.');
        } else {
            for (const user of usuariosLegados) {
                let novoUsername = user.username;
                let aviso = '';

                // Regra de conflito: admin -> admin_locadora
                if (user.username === 'admin') {
                    novoUsername = 'admin_locadora';
                    aviso = ' (Renomeado de admin)';
                }

                // Verificar se já existe no Master
                const existe = await Usuario.findOne({ where: { username: novoUsername } });

                if (existe) {
                    console.log(`⚠️ Usuário ${novoUsername} já existe no Master. Pulando.`);

                    // Se o usuário existir mas não estiver vinculado à empresa correta (ex: admin do sistema)
                    // isso é um problema. Mas se renomeamos 'admin' para 'admin_locadora', deve ser único.
                    continue;
                }

                await Usuario.create({
                    nome: user.nome,
                    username: novoUsername,
                    password: user.password, // Mantém o hash original (Bcrypt é compatível)
                    role: 'admin', // Força role admin para acesso ao painel da locadora
                    ativo: user.ativo !== 0, // SQLite salva boolean como 0/1
                    empresaId: MIGRATE_TENANT_ID,
                    isSuperAdmin: false
                });

                console.log(`✅ Usuário migrado: ${user.username} -> ${novoUsername}${aviso}`);
            }
        }

        console.log('\n✨ Migração concluída com sucesso!');
        console.log(`👉 Agora você pode logar com 'admin_locadora' (mesma senha) para acessar a empresa ${MIGRATE_TENANT_ID}.`);

    } catch (error) {
        console.error('❌ Erro fatal na migração:', error);
        process.exit(1);
    }
}

migrate();
