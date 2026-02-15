
import DatabaseFactory from '../server/config/DatabaseFactory.js';
import defineControleVeiculo from '../server/models-sqlite/ControleVeiculo.js';
import defineControleRegistro from '../server/models-sqlite/ControleRegistro.js';
import defineControleKmHistorico from '../server/models-sqlite/ControleKmHistorico.js';
import defineControleServico from '../server/models-sqlite/ControleServico.js';

(async () => {
    try {
        console.log('🔄 Iniciando RESET das tabelas do módulo CONTROLE...');

        // Vamos sincronizar para a empresa ID 2 (Principal)
        const tenantId = 2;
        const connection = await DatabaseFactory.getTenantConnection(tenantId);

        console.log(`📡 Conectado ao Tenant ${tenantId}`);

        // Definir Novos Models
        const ControleVeiculo = defineControleVeiculo(connection);
        const ControleRegistro = defineControleRegistro(connection);
        const ControleKmHistorico = defineControleKmHistorico(connection);
        const ControleServico = defineControleServico(connection);

        // Resetar (DELETE)
        console.log('💥 Resetando ControleKmHistoricos...');
        await ControleKmHistorico.destroy({ where: {}, truncate: false });

        console.log('💥 Resetando ControleServicos...');
        await ControleServico.destroy({ where: {}, truncate: false });

        console.log('💥 Resetando ControleRegistros...');
        await ControleRegistro.destroy({ where: {}, truncate: false });

        console.log('💥 Resetando ControleVeiculos...');
        await ControleVeiculo.destroy({ where: {}, truncate: false });

        console.log('✅ RESET concluído com sucesso!');
        process.exit(0);

    } catch (e) {
        console.error('❌ Erro no reset:', e);
        process.exit(1);
    }
})();
