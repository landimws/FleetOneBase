import { Sequelize } from 'sequelize';

export async function up(qi) {
    // PRAGMA foreign_keys = OFF deve ser executado fora de transação em alguns drivers,
    // mas no SQLite via Sequelize pode ser tricky. Vamos tentar direto.
    // Melhor fazer raw query.

    const sequelize = qi.sequelize;

    try {
        console.log('🔄 [M008] Recriando Tabela Clientes...');

        await sequelize.query('PRAGMA foreign_keys = OFF');

        // 1. Criar tabela nova com estrutura CORRETA (ID PK AI)
        // Copiada do Model (simplificada para SQL)
        await sequelize.query(`
            CREATE TABLE Clientes_new (
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
                createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('   ✅ Tabela nova criada.');

        // 2. Copiar dados
        // Precisamos mapear colunas exatas.
        // Assumindo que Clientes antigo tem todas essas colunas (analisado antes).
        // Importante: Manter o ID que acabamos de gerar na Fase 1.
        await sequelize.query(`
            INSERT INTO Clientes_new (
                id, nome, ativo, cpf, rg, cnh, 
                logradouro, numero, bairro, cidade, estado, cep, 
                telefone, email, data_nascimento, endereco, 
                createdAt, updatedAt
            )
            SELECT 
                id, nome, ativo, cpf, rg, cnh, 
                logradouro, numero, bairro, cidade, estado, cep, 
                telefone, email, data_nascimento, endereco, 
                createdAt, updatedAt
            FROM Clientes
        `);
        console.log('   ✅ Dados copiados.');

        // 3. Trocar tabelas
        await sequelize.query('DROP TABLE Clientes');
        await sequelize.query('ALTER TABLE Clientes_new RENAME TO Clientes');
        console.log('   ✅ Tabela trocada.');

        await sequelize.query('PRAGMA foreign_keys = ON');

    } catch (e) {
        console.error('❌ Erro na M008:', e);
        try {
            await sequelize.query('PRAGMA foreign_keys = ON');
        } catch (e2) { }
        throw e;
    }
}
