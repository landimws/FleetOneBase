/**
 * Runner para seeds de tenant
 * Executa seeds específicos de cada banco tenant
 */

import TenantConnection from '../config/TenantConnection.js';
import { seed as contratosSeed } from './contratos-seed.js';

async function runTenantSeeds(empresaId) {
    try {
        console.log(`\n🌱 Executando seeds para Empresa ID: ${empresaId}`);

        // Conectar ao banco tenant
        const models = await TenantConnection.getModels(empresaId);

        // Executar seeds do módulo de contratos
        await contratosSeed(models);

        console.log(`✅ Seeds da Empresa ${empresaId} concluídos!\n`);
    } catch (error) {
        console.error(`❌ Erro ao executar seeds da Empresa ${empresaId}:`, error);
        throw error;
    }
}

// Executar para empresa ID 1 (padrão)
const empresaId = process.argv[2] ? parseInt(process.argv[2]) : 1;

runTenantSeeds(empresaId)
    .then(() => {
        console.log('🎉 Todos os seeds foram executados com sucesso!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Erro fatal:', error);
        process.exit(1);
    });
