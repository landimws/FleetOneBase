
import sequelize from './config/database-sqlite.js';

async function up() {
    const queryInterface = sequelize.getQueryInterface();
    const tableInfo = await queryInterface.describeTable('Empresas');

    const transaction = await sequelize.transaction();

    try {
        const columnsToAdd = [
            { name: 'cep', type: 'VARCHAR(255)' },
            { name: 'logradouro', type: 'VARCHAR(255)' },
            { name: 'numero', type: 'VARCHAR(255)' },
            { name: 'bairro', type: 'VARCHAR(255)' },
            { name: 'cidade', type: 'VARCHAR(255)' },
            { name: 'estado', type: 'VARCHAR(255)' }
        ];

        for (const col of columnsToAdd) {
            if (!tableInfo[col.name]) {
                console.log(`Adding column ${col.name} to Empresas...`);
                await queryInterface.addColumn('Empresas', col.name, {
                    type: col.type === 'VARCHAR(255)' ? sequelize.Sequelize.STRING : sequelize.Sequelize.STRING,
                    allowNull: true
                }, { transaction });
            }
        }

        // Migrate existing 'endereco' data if possible (best effort split)
        // This is tricky without structured data, so we might just leave it in 'endereco' or 'logradouro'
        // For now, we keep 'endereco' as legacy or move it to logradouro.
        // Let's copy address to logradouro if logradouro is empty.

        await sequelize.query(`UPDATE Empresas SET logradouro = endereco WHERE logradouro IS NULL AND endereco IS NOT NULL`, { transaction });

        await transaction.commit();
        console.log('Migration for Empresa Address completed successfully.');

    } catch (error) {
        await transaction.rollback();
        console.error('Migration failed:', error);
        throw error;
    }
}

up().then(() => {
    console.log('Done.');
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
