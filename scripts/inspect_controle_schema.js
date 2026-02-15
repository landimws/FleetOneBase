
import DatabaseFactory from '../server/config/DatabaseFactory.js';

(async () => {
    try {
        const tenantId = 1;
        const connection = await DatabaseFactory.getTenantConnection(tenantId);

        console.log('--- SCHEMA ControleRegistros ---');
        const [results1] = await connection.query("PRAGMA table_info(ControleRegistros);");
        console.table(results1);

        console.log('--- SCHEMA Veiculos ---');
        const [results2] = await connection.query("PRAGMA table_info(Veiculos);");
        console.table(results2);

        process.exit(0);
    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    }
})();
