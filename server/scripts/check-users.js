
import { Sequelize } from 'sequelize';
import path from 'path';

const masterDbPath = path.resolve(process.cwd(), 'data/master.sqlite');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: masterDbPath,
    logging: false
});

async function lerUsuarios() {
    try {
        await sequelize.authenticate();
        const [results] = await sequelize.query(`SELECT id, username, senha_temporaria_visivel FROM Usuarios WHERE empresaId = 1000;`);
        console.log('Resultados:', JSON.stringify(results, null, 2));
    } catch (error) {
        console.error('Erro:', error);
    }
}

lerUsuarios();
