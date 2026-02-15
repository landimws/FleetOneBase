/**
 * Script para adicionar campos de segurança à tabela Usuarios no master.sqlite
 * Executa ALTER TABLE para adicionar as 3 novas colunas
 */

import { Sequelize } from 'sequelize';
import path from 'path';

const masterDbPath = path.resolve(process.cwd(), 'data/master.sqlite');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: masterDbPath,
    logging: console.log
});

async function migrateUsuarios() {
    try {
        console.log('🔧 Migrando tabela Usuarios no master.sqlite...\n');

        await sequelize.authenticate();
        console.log('✅ Conectado ao master.sqlite');

        // Verificar se colunas já existem
        const [results] = await sequelize.query(`PRAGMA table_info(Usuarios);`);
        const columns = results.map(r => r.name);

        console.log('\n📋 Colunas atuais:', columns.join(', '));

        // Adicionar colunas se não existirem
        if (!columns.includes('primeiro_acesso')) {
            console.log('\n➕ Adicionando coluna: primeiro_acesso');
            await sequelize.query(`
                ALTER TABLE Usuarios 
                ADD COLUMN primeiro_acesso INTEGER DEFAULT 1;
            `);
        }

        if (!columns.includes('senha_temporaria_gerada_em')) {
            console.log('➕ Adicionando coluna: senha_temporaria_gerada_em');
            await sequelize.query(`
                ALTER TABLE Usuarios 
                ADD COLUMN senha_temporaria_gerada_em DATETIME;
            `);
        }

        if (!columns.includes('senha_expira_em')) {
            console.log('➕ Adicionando coluna: senha_expira_em');
            await sequelize.query(`
                ALTER TABLE Usuarios 
                ADD COLUMN senha_expira_em DATETIME;
            `);
        }

        // Verificar resultado
        const [newResults] = await sequelize.query(`PRAGMA table_info(Usuarios);`);
        const newColumns = newResults.map(r => r.name);

        console.log('\n✅ Colunas após migração:', newColumns.join(', '));
        console.log('\n🎉 Migração concluída com sucesso!');

        await sequelize.close();
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Erro na migração:', error);
        process.exit(1);
    }
}

migrateUsuarios();
