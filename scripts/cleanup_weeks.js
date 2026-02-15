
import DatabaseFactory from '../server/config/DatabaseFactory.js';
import defineSemana from '../server/models-sqlite/Semana.js';
import defineLinhaSemana from '../server/models-sqlite/LinhaSemana.js';
import defineControleRegistro from '../server/models-sqlite/ControleRegistro.js';

(async () => {
    try {
        console.log('🔄 Iniciando limpeza de semanas duplicadas (13/02/2026)...');

        const tenantId = 2; // Tenant 2
        const connection = await DatabaseFactory.getTenantConnection(tenantId);
        console.log(`📡 Conectado ao Tenant ${tenantId}`);

        const Semana = defineSemana(connection);
        const LinhaSemana = defineLinhaSemana(connection);
        const ControleRegistro = defineControleRegistro(connection);

        // Buscar semanas de 13/02/2026
        // Data no banco geralmente é YYYY-MM-DD
        const targetDate = '2026-02-13';

        const semanas = await Semana.findAll({
            where: { data_inicio: targetDate }
        });

        console.log(`🔎 Encontradas ${semanas.length} semanas com início em ${targetDate}`);

        for (const s of semanas) {
            console.log(`🗑️  Excluindo Semana ID: ${s.id} (${s.data_inicio} - ${s.data_fim})...`);

            // Excluir LinhaSemana (Legado)
            await LinhaSemana.destroy({ where: { SemanaId: s.id } });

            // Excluir ControleRegistro (Novo)
            await ControleRegistro.destroy({ where: { SemanaId: s.id } });

            // Excluir a Semana
            await s.destroy();
        }

        console.log('✅ Limpeza concluída!');
        process.exit(0);

    } catch (e) {
        console.error('❌ Erro na limpeza:', e);
        process.exit(1);
    }
})();
