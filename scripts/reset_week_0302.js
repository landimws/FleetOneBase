
import DatabaseFactory from '../server/config/DatabaseFactory.js';
import defineSemana from '../server/models-sqlite/Semana.js';
import defineControleRegistro from '../server/models-sqlite/ControleRegistro.js';
import defineControleKmHistorico from '../server/models-sqlite/ControleKmHistorico.js';
import defineControleServico from '../server/models-sqlite/ControleServico.js';

(async () => {
    try {
        console.log('🔄 Iniciando remoção da semana 03/02/2026 - 09/02/2026 APENAS do Controle...');

        const tenantId = 2; // Tenant 2
        const connection = await DatabaseFactory.getTenantConnection(tenantId);

        const Semana = defineSemana(connection);
        const ControleRegistro = defineControleRegistro(connection);
        const ControleKmHistorico = defineControleKmHistorico(connection);
        const ControleServico = defineControleServico(connection);

        // Buscar a semana pelo range de datas
        const semana = await Semana.findOne({
            where: { data_inicio: '2026-02-03' }
        });

        if (!semana) {
            console.error('❌ Semana de 03/02/2026 não encontrada no Grid Mestre.');
            process.exit(1);
        }

        console.log(`🔎 Semana encontrada: ID ${semana.id} (${semana.data_inicio} - ${semana.data_fim})`);

        // Excluir dados do Controle
        const countReg = await ControleRegistro.destroy({ where: { SemanaId: semana.id } });
        const countKm = await ControleKmHistorico.destroy({ where: { SemanaId: semana.id } });
        const countServ = await ControleServico.destroy({ where: { SemanaId: semana.id } });

        console.log(`✅ Dados do Controle excluídos para a semana ${semana.id}:`);
        console.log(`   - Registros: ${countReg}`);
        console.log(`   - Histórico KM: ${countKm}`);
        console.log(`   - Serviços: ${countServ}`);

        console.log('⚠️ A semana MANTÉM no Grid Mestre (Tabela Semanas) para poder ser reinicializada.');

        process.exit(0);

    } catch (e) {
        console.error('❌ Erro:', e);
        process.exit(1);
    }
})();
