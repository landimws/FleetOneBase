import DatabaseFactory from './server/config/DatabaseFactory.js';
import defineVeiculo from './server/models-sqlite/Veiculo.js';

(async () => {
    try {
        const conn = await DatabaseFactory.getTenantConnection(2); // Testing tenant 2
        const Veiculo = defineVeiculo(conn);

        // Try reading before syncing
        try {
            const veiculos = await Veiculo.findAll({ order: [['placa', 'ASC']] });
            console.log("SUCCESS - veiculos count:", veiculos.length);
        } catch (e) {
            console.error("ERROR na busca da Empresa 2:", e.message);
            console.error(e.sql);
        }

    } catch(e) {
        console.error("FATAL ERROR CAUGHT:", e);
    }
    process.exit(0);
})();
