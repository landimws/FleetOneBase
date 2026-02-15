
import DatabaseFactory from '../server/config/DatabaseFactory.js';

(async () => {
    try {
        const tenantId = 1;
        const connection = await DatabaseFactory.getTenantConnection(tenantId);

        console.log('--- SCHEMA SEMANAS ---');
        const [results] = await connection.query("PRAGMA table_info(Semanas);");
        console.table(results);

        process.exit(0);
    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    }
})();
