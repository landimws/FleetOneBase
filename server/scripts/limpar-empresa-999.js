/**
 * Script para remover empresa 999 do banco master
 */
import { Sequelize } from 'sequelize';
import path from 'path';

const masterDbPath = path.resolve(process.cwd(), 'data/master.sqlite');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: masterDbPath,
    logging: false
});

async function removerEmpresa999() {
    try {
        await sequelize.authenticate();
        console.log('✅ Conectado ao master.sqlite');

        // Remover usuários da empresa 999
        const [usersDeleted] = await sequelize.query(`DELETE FROM Usuarios WHERE empresaId = 999;`);
        console.log(`🗑️  ${usersDeleted.changes || 0} usuário(s) removido(s)`);

        // Remover empresa 999
        const [empresaDeleted] = await sequelize.query(`DELETE FROM Empresas WHERE id = 999;`);
        console.log(`🗑️  Empresa 999 removida`);

        await sequelize.close();
        console.log('\n✅ Empresa 999 removida completamente do master!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Erro:', error);
        process.exit(1);
    }
}

removerEmpresa999();
