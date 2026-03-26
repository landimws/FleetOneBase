import fs from 'fs';
import path from 'path';
import DatabaseFactory from './server/config/DatabaseFactory.js';
import defineVeiculo from './server/models-sqlite/Veiculo.js';
import defineLinhaSemana from './server/models-sqlite/LinhaSemana.js';

(async () => {
    try {
        const dataPath = path.resolve(process.cwd(), 'data');
        const files = fs.readdirSync(dataPath).filter(f => f.startsWith('empresa_') && f.endsWith('.sqlite'));
        
        console.log(`Encontrados ${files.length} bancos de dados de empresas.`);
        
        for (const file of files) {
            const tenantId = file.replace('empresa_', '').replace('.sqlite', '');
            console.log(`\n🔄 Sincronizando schema da Empresa ${tenantId}...`);
            
            const conn = await DatabaseFactory.getTenantConnection(tenantId);
            
            // Instanciar modelos críticos que podem estar desatualizados
            const Veiculo = defineVeiculo(conn);
            const LinhaSemana = defineLinhaSemana(conn);
            
            // Aplicar as alterações pendentes no banco
            await Veiculo.sync({ alter: true });
            await LinhaSemana.sync({ alter: true });
            
            console.log(`✅ Empresa ${tenantId} sincronizada.`);
        }
        console.log('\n🚀 Sincronização de todos os tenants concluída!');
    } catch (e) {
        console.error('❌ Erro na sincronização:', e);
    }
    process.exit(0);
})();
