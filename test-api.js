import DatabaseFactory from './server/config/DatabaseFactory.js';
import defineVeiculo from './server/models-sqlite/Veiculo.js';

(async () => {
    try {
        const conn = await DatabaseFactory.getTenantConnection(1);
        const Veiculo = defineVeiculo(conn);

        // Sync first to apply the fix
        await Veiculo.sync({ alter: true });
        console.log("Sync complete");

        const veiculos = await Veiculo.findAll({ order: [['placa', 'ASC']] });
        console.log("SUCCESS - veiculos count:", veiculos.length);

    } catch(e) {
        console.error("ERROR CAUGHT:");
        console.error("Name:", e.name);
        console.error("Message:", e.message);
        console.error("SQL:", e.sql);
    }
    process.exit(0);
})();
