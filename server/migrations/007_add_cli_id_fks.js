import { Sequelize } from 'sequelize';

export async function up(qi) {
    const t = await qi.sequelize.transaction();
    try {
        console.log('🔄 [M007] Add cliente_id...');
        const targets = [
            'Multas', 'debitos', 'creditos', 'Encerramentos', 'LinhaSemanas'
        ];

        for (const tbl of targets) {
            const colName = tbl === 'LinhaSemanas' ? 'cliente' : 'cliente_nome';

            try {
                await qi.addColumn(tbl, 'cliente_id',
                    { type: Sequelize.INTEGER, allowNull: true },
                    { transaction: t }
                );
            } catch (e) {
                // Ignore if exists
            }

            const sql = `UPDATE ${tbl} SET cliente_id = (SELECT id FROM Clientes WHERE nome = ${tbl}.${colName}) WHERE ${colName} IS NOT NULL AND cliente_id IS NULL`;
            await qi.sequelize.query(sql, { transaction: t });
            console.log(`✅ ${tbl} updated.`);
        }
        await t.commit();
    } catch (e) {
        await t.rollback();
        throw e;
    }
}
