/**
 * Migration: Adicionar campo senha_temporaria_visivel à tabela Usuarios
 * Permite exibir senha temporária para admin até primeiro login
 */

import { Sequelize } from 'sequelize';
import path from 'path';

const masterDbPath = path.resolve(process.cwd(), 'data/master.sqlite');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: masterDbPath,
    logging: console.log
});

async function migrate() {
    try {
        console.log('🔧 Adicionando campo senha_temporaria_visivel...\n');

        await sequelize.authenticate();
        console.log('✅ Conectado ao master.sqlite');

        // Verificar se coluna já existe
        const [results] = await sequelize.query(`PRAGMA table_info(Usuarios);`);
        const columns = results.map(r => r.name);

        if (columns.includes('senha_temporaria_visivel')) {
            console.log('ℹ️  Coluna senha_temporaria_visivel já existe. Nada a fazer.');
        } else {
            console.log('\n➕ Adicionando coluna: senha_temporaria_visivel');
            await sequelize.query(`
                ALTER TABLE Usuarios 
                ADD COLUMN senha_temporaria_visivel VARCHAR(255);
            `);
            console.log('✅ Coluna adicionada com sucesso!');
        }

        await sequelize.close();
        console.log('\n🎉 Migration concluída!');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Erro na migration:', error);
        process.exit(1);
    }
}

migrate();
