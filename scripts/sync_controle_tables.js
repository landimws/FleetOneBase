
import DatabaseFactory from '../server/config/DatabaseFactory.js';
import defineControleVeiculo from '../server/models-sqlite/ControleVeiculo.js';
import defineControleRegistro from '../server/models-sqlite/ControleRegistro.js';
import defineControleKmHistorico from '../server/models-sqlite/ControleKmHistorico.js';
import defineControleServico from '../server/models-sqlite/ControleServico.js';
import defineVeiculo from '../server/models-sqlite/Veiculo.js';
import defineSemana from '../server/models-sqlite/Semana.js';

(async () => {
    try {
        console.log('🔄 Iniciando sincronização das tabelas do módulo CONTROLE...');

        // Vamos sincronizar para a empresa ID 1 (Padrão/Admin)
        // Se houver mais tenants, precisaria iterar. Mas o dev environment geralmente usa 1.
        // Vamos sincronizar para a empresa ID 2 (Principal agora)
        const tenantId = 2;
        const connection = await DatabaseFactory.getTenantConnection(tenantId);

        console.log(`📡 Conectado ao Tenant ${tenantId}`);

        // Definir Models Básicos para FKs
        const Veiculo = defineVeiculo(connection);
        const Semana = defineSemana(connection);

        // Definir Novos Models
        const ControleVeiculo = defineControleVeiculo(connection);
        const ControleRegistro = defineControleRegistro(connection);
        const ControleKmHistorico = defineControleKmHistorico(connection);
        const ControleServico = defineControleServico(connection);

        // Sincronizar (criar tabelas se não existirem)
        console.log('🛠️  Criando tabela ControleVeiculos...');
        await ControleVeiculo.sync({ alter: true });

        console.log('🛠️  Criando tabela ControleRegistros...');
        await ControleRegistro.sync({ alter: true });

        console.log('🛠️  Criando tabela ControleKmHistoricos...');
        await ControleKmHistorico.sync({ alter: true });

        console.log('🛠️  Criando tabela ControleServicos...');
        await ControleServico.sync({ alter: true });

        console.log('✅ Sincronização concluída com sucesso!');
        process.exit(0);

    } catch (e) {
        console.error('❌ Erro na sincronização:', e);
        process.exit(1);
    }
})();
