
import sequelize from './config/database-sqlite.js';

async function up() {
    const queryInterface = sequelize.getQueryInterface();
    const transaction = await sequelize.transaction();

    try {
        // 1. Rename existing table to backup
        const tableExists = await queryInterface.tableExists('Clientes');
        if (tableExists) {
            await queryInterface.renameTable('Clientes', 'Clientes_Backup', { transaction });
        }

        // 2. Create new table
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS Clientes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome VARCHAR(255) NOT NULL,
                ativo BOOLEAN DEFAULT 1,
                cpf VARCHAR(255) UNIQUE,
                rg VARCHAR(255),
                cnh VARCHAR(255),
                logradouro VARCHAR(255),
                numero VARCHAR(255),
                bairro VARCHAR(255),
                cidade VARCHAR(255),
                estado VARCHAR(255),
                cep VARCHAR(255),
                telefone VARCHAR(255),
                email VARCHAR(255),
                data_nascimento DATE,
                endereco VARCHAR(255),
                createdAt DATETIME NOT NULL,
                updatedAt DATETIME NOT NULL
            );
        `, { transaction });

        // 3. Migrate data if backup exists
        if (tableExists) {
            const [oldClients] = await sequelize.query('SELECT * FROM Clientes_Backup', { transaction });

            for (const client of oldClients) {
                // If CPF is missing, we might have an issue with UNIQUE constraint.
                // For migration purposes, if CPF is null/empty, we might need a dummy or skip uniqueness check temporarily
                // But user wants strict CPF. Let's try to keeping what we have.
                // If duplicates exist in backup, this might fail. We assume data is "clean enough" or we catch errors.

                await sequelize.query(`
                    INSERT INTO Clientes (
                        nome, ativo, cpf, rg, cnh, 
                        logradouro, numero, bairro, cidade, estado, cep, 
                        telefone, email, data_nascimento, endereco, 
                        createdAt, updatedAt
                    ) VALUES (
                        $nome, $ativo, $cpf, $rg, $cnh,
                        $logradouro, $numero, $bairro, $cidade, $estado, $cep,
                        $telefone, $email, $data_nascimento, $endereco,
                        $createdAt, $updatedAt
                    )
                `, {
                    bind: {
                        nome: client.nome,
                        ativo: client.ativo,
                        cpf: client.cpf || null, // Ensure null if empty string to avoid unique constraint on empty strings if DB treats them as values
                        rg: client.rg,
                        cnh: client.cnh,
                        logradouro: client.logradouro,
                        numero: client.numero,
                        bairro: client.bairro,
                        cidade: client.cidade,
                        estado: client.estado,
                        cep: client.cep,
                        telefone: client.telefone,
                        email: client.email,
                        data_nascimento: client.data_nascimento,
                        endereco: client.endereco,
                        createdAt: client.createdAt,
                        updatedAt: client.updatedAt
                    },
                    transaction
                });
            }

            // Optional: Drop backup if successful
            // await queryInterface.dropTable('Clientes_Backup', { transaction });
        }

        await transaction.commit();
        console.log('Migration for Client PK completed successfully.');

    } catch (error) {
        await transaction.rollback();
        console.error('Migration failed:', error);
        // Try to restore?
        // In a real scenario we might want to revert the rename.
        try {
            const tableExists = await queryInterface.tableExists('Clientes_Backup');
            if (tableExists) {
                await queryInterface.dropTable('Clientes'); // Drop incomplete new table
                await queryInterface.renameTable('Clientes_Backup', 'Clientes'); // Restore old
                console.log('Rolled back table rename.');
            }
        } catch (rbError) {
            console.error('Rollback failed:', rbError);
        }
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
