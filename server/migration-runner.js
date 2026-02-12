import Database from 'better-sqlite3';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar variáveis de ambiente (mesma lógica do database-sqlite.js)
const env = process.env.NODE_ENV || 'production';
const envFile = env === 'test' ? '.env.test' : '.env';
dotenv.config({ path: path.resolve(__dirname, '../', envFile) });

// Definir caminho do banco seguro
const dbStorage = process.env.DATABASE_STORAGE || 'data/prod/database.sqlite';
const DB_PATH = path.resolve(__dirname, '../', dbStorage);

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');
const BACKUPS_DIR = path.join(__dirname, '../backups');

console.log(`[MIGRATION] Ambiente: ${env}`);
console.log(`[MIGRATION] Banco Alvo: ${DB_PATH}`);

// Fail Fast Check
if (env === 'test' && !DB_PATH.includes('test')) {
    console.error('❌ ERRO CRÍTICO: Tentativa de migrar banco de produção em ambiente de teste!');
    process.exit(1);
}

class MigrationRunner {
    constructor() {
        // Ensure directory exists
        fs.ensureDirSync(path.dirname(DB_PATH));
        this.db = new Database(DB_PATH);
        this.ensureMigrationsTable();
    }

    ensureMigrationsTable() {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS migrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
    }

    async createBackup(label = 'manual') {
        await fs.ensureDir(BACKUPS_DIR);

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const backupName = `${timestamp}_${label}.db`;
        const backupPath = path.join(BACKUPS_DIR, backupName);

        await fs.copy(DB_PATH, backupPath);
        console.log(`✅ Backup criado: ${backupName}`);

        // Limpar backups antigos
        await this.cleanOldBackups();

        return backupPath;
    }

    async cleanOldBackups() {
        const files = await fs.readdir(BACKUPS_DIR);
        const backups = files
            .filter(f => f.endsWith('.db'))
            .map(f => ({
                name: f,
                path: path.join(BACKUPS_DIR, f),
                time: fs.statSync(path.join(BACKUPS_DIR, f)).mtime
            }))
            .sort((a, b) => b.time - a.time);

        // Manter últimos 30 backups
        const toDelete = backups.slice(30);
        for (const backup of toDelete) {
            await fs.remove(backup.path);
            console.log(`🗑️  Backup antigo removido: ${backup.name}`);
        }
    }

    getAppliedMigrations() {
        const stmt = this.db.prepare('SELECT name FROM migrations ORDER BY id');
        return stmt.all().map(row => row.name);
    }

    getPendingMigrations() {
        const applied = new Set(this.getAppliedMigrations());
        const allMigrations = fs.readdirSync(MIGRATIONS_DIR)
            .filter(f => f.endsWith('.js'))
            .sort();

        return allMigrations.filter(m => !applied.has(m));
    }

    async runMigrations() {
        const pending = this.getPendingMigrations();

        if (pending.length === 0) {
            console.log('✅ Nenhuma migração pendente.');
            return;
        }

        console.log(`📦 ${pending.length} migração(ões) pendente(s):`);
        pending.forEach(m => console.log(`   - ${m}`));

        // Criar backup antes de migrar
        await this.createBackup('pre-migration');

        for (const migrationFile of pending) {
            console.log(`\n🔄 Executando: ${migrationFile}`);

            try {
                const migrationPath = path.join(MIGRATIONS_DIR, migrationFile);
                const migration = await import(`file://${migrationPath}`);

                // Executar migração dentro de transação
                const transaction = this.db.transaction(() => {
                    migration.up(this.db);

                    // Registrar migração aplicada
                    this.db.prepare('INSERT INTO migrations (name) VALUES (?)').run(migrationFile);
                });

                transaction();
                console.log(`✅ ${migrationFile} aplicada com sucesso!`);

            } catch (error) {
                console.error(`❌ Erro ao aplicar ${migrationFile}:`, error);
                throw error;
            }
        }

        console.log('\n🎉 Todas as migrações foram aplicadas!');
    }

    async rollback() {
        const applied = this.getAppliedMigrations();

        if (applied.length === 0) {
            console.log('⚠️  Nenhuma migração para reverter.');
            return;
        }

        const lastMigration = applied[applied.length - 1];
        console.log(`🔙 Revertendo: ${lastMigration}`);

        // Criar backup antes de reverter
        await this.createBackup('pre-rollback');

        try {
            const migrationPath = path.join(MIGRATIONS_DIR, lastMigration);
            const migration = await import(`file://${migrationPath}`);

            if (!migration.down) {
                throw new Error('Migração não possui função down()');
            }

            const transaction = this.db.transaction(() => {
                migration.down(this.db);
                this.db.prepare('DELETE FROM migrations WHERE name = ?').run(lastMigration);
            });

            transaction();
            console.log(`✅ ${lastMigration} revertida com sucesso!`);

        } catch (error) {
            console.error(`❌ Erro ao reverter ${lastMigration}:`, error);
            throw error;
        }
    }

    status() {
        const applied = this.getAppliedMigrations();
        const pending = this.getPendingMigrations();

        console.log('\n📊 Status das Migrações:\n');
        console.log(`✅ Aplicadas: ${applied.length}`);
        applied.forEach(m => console.log(`   - ${m}`));

        console.log(`\n⏳ Pendentes: ${pending.length}`);
        pending.forEach(m => console.log(`   - ${m}`));
    }

    close() {
        this.db.close();
    }
}

// CLI
const command = process.argv[2];

const runner = new MigrationRunner();

try {
    switch (command) {
        case 'up':
        case 'migrate':
            await runner.runMigrations();
            break;
        case 'down':
        case 'rollback':
            await runner.rollback();
            break;
        case 'status':
            runner.status();
            break;
        case 'backup':
            await runner.createBackup('manual');
            break;
        default:
            console.log(`
Uso: node migration-runner.js [comando]

Comandos:
  migrate, up      - Executa migrações pendentes
  rollback, down   - Reverte última migração
  status           - Mostra status das migrações
  backup           - Cria backup manual
            `);
    }
} catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
} finally {
    runner.close();
}
