import { Sequelize } from 'sequelize';

export async function up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
        console.log('🔄 [MIGRATION] Adicionando coluna id na tabela Clientes...');

        // 1. Adicionar coluna id
        await queryInterface.addColumn('Clientes', 'id', {
            type: Sequelize.INTEGER,
            allowNull: true
        }, { transaction });

        // 2. Popular IDs sequenciais
        console.log('🔄 [MIGRATION] Populando IDs sequenciais...');
        const [clientes] = await queryInterface.sequelize.query(
            'SELECT nome FROM Clientes ORDER BY nome',
            { transaction }
        );

        for (let i = 0; i < clientes.length; i++) {
            await queryInterface.sequelize.query(
                'UPDATE Clientes SET id = :id WHERE nome = :nome',
                {
                    replacements: { id: i + 1, nome: clientes[i].nome },
                    transaction
                }
            );
        }

        console.log(`✅ [MIGRATION] IDs gerados para ${clientes.length} clientes.`);
        await transaction.commit();
    } catch (err) {
        console.error('❌ [MIGRATION] Erro:', err);
        await transaction.rollback();
        throw err;
    }
}

export async function down(queryInterface) {
    try {
        await queryInterface.removeColumn('Clientes', 'id');
    } catch (e) {
        console.error('Erro ao reverter migration:', e);
    }
}
