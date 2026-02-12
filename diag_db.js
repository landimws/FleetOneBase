import sequelize from './server/config/database-sqlite.js';
import Semana from './server/models-sqlite/Semana.js';

(async () => {
    try {
        const weeks = await Semana.findAll({
            where: { id: [5, 6] }
        });
        console.log('--- DIAGNOSTIC DATA ---');
        console.log('Records found:', weeks.length);
        weeks.forEach(w => console.log(`ID: ${w.id}, Start: ${w.data_inicio}, End: ${w.data_fim}, Status: ${w.status}`));
        process.exit(0);
    } catch (e) {
        console.error('Error in diagnosis:', e);
        process.exit(1);
    }
})();
