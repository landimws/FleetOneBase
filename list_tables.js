import sequelize from './server/config/database-sqlite.js';

(async () => {
    try {
        const [results] = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table';");
        console.log('--- TABLES IN DATABASE ---');
        results.forEach(r => console.log(r.name));
        process.exit(0);
    } catch (e) {
        console.error('Error listing tables:', e);
        process.exit(1);
    }
})();
