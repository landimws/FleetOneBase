
import sequelize from './config/database-sqlite.js';

(async () => {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');

        // Add empresaId column to Usuarios table
        try {
            await sequelize.query(`ALTER TABLE Usuarios ADD COLUMN empresaId INTEGER REFERENCES Empresas(id);`);
            console.log('✅ Column empresaId added to Usuarios table.');
        } catch (error) {
            if (error.message.includes('duplicate column name')) {
                console.log('ℹ️ Column empresaId already exists.');
            } else {
                console.error('❌ Error adding column:', error);
            }
        }

    } catch (error) {
        console.error('Unable to connect to the database:', error);
    } finally {
        await sequelize.close();
    }
})();
