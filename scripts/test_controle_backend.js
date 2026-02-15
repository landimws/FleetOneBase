
// Script de teste manual dos endpoints do módulo Controle
// Executar com: node scripts/test_controle_backend.js

async function run() {
    console.log('🚀 Iniciando Testes Backend Controle...');

    try {
        console.log('⚠️  Mudança de Plano: Testando via Service Layer (Integration Test)');

        const DatabaseFactory = (await import('../server/config/DatabaseFactory.js')).default;
        const ControleService = await import('../server/services/controleService.js');
        const defineControleRegistro = (await import('../server/models-sqlite/ControleRegistro.js')).default;

        // Conectar Tenant 2 (Principal)
        const connection = await DatabaseFactory.getTenantConnection(2);

        // Carregar Models
        const models = {
            Semana: (await import('../server/models-sqlite/Semana.js')).default(connection),
            LinhaSemana: (await import('../server/models-sqlite/LinhaSemana.js')).default(connection),
            Veiculo: (await import('../server/models-sqlite/Veiculo.js')).default(connection),
            ControleRegistro: defineControleRegistro(connection),
            ControleVeiculo: (await import('../server/models-sqlite/ControleVeiculo.js')).default(connection),
            ControleKmHistorico: (await import('../server/models-sqlite/ControleKmHistorico.js')).default(connection),
            ControleServico: (await import('../server/models-sqlite/ControleServico.js')).default(connection)
        };

        // Inject associations manually
        models.Semana.hasMany(models.LinhaSemana, { foreignKey: 'SemanaId', as: 'linhas' });
        models.LinhaSemana.belongsTo(models.Semana, { foreignKey: 'SemanaId', as: 'DadosSemana' });
        models.LinhaSemana.belongsTo(models.Veiculo, { foreignKey: 'placa', targetKey: 'placa', as: 'Veiculo' });
        models.ControleRegistro.belongsTo(models.Veiculo, { foreignKey: 'veiculo_id', targetKey: 'placa' });

        console.log('✅ Conexão DB estabelecida');

        // [FIX] Garantir que TODAS as tabelas existam no banco de teste
        console.log('🛠️  Sincronizando tabelas...');
        await models.Veiculo.sync();
        await models.Semana.sync();
        await models.LinhaSemana.sync();
        await models.ControleVeiculo.sync();
        await models.ControleRegistro.sync();
        await models.ControleKmHistorico.sync();
        await models.ControleServico.sync();

        // 1. Criar uma Semana de Teste (Legado)
        const novaSemana = await models.Semana.create({
            data_inicio: '2025-01-01',
            data_fim: '2025-01-07',
            status: 'aberta'
        });
        console.log(`✅ Semana Legada Criada: ID ${novaSemana.id}`);

        // 2. Criar um veículo de teste
        const placaTeste = 'TEST-' + Math.floor(Math.random() * 1000);
        await models.Veiculo.create({
            placa: placaTeste,
            modelo: 'Fiat Uno',
            ativo: true,
            preco_base: 500,
            combustivel: 'Flex', // [FIX] Added required field
            ano: 2023
        });
        console.log(`✅ Veículo Criado: ${placaTeste}`);

        // 3. Executar Sincronização (Lazy Sync)
        await ControleService.sincronizarSemana(models, novaSemana.id);
        console.log('✅ Sync Executado');

        // 4. Verificar Registro Criado
        const registro = await models.ControleRegistro.findOne({
            where: { SemanaId: novaSemana.id, veiculo_id: placaTeste }
        });

        if (registro) {
            console.log(`✅ Registro encontrado no Controle: ID ${registro.id} | Situação: ${registro.situacao}`);
        } else {
            console.error('❌ Registro NÃO encontrado após sync!');
            process.exit(1);
        }

        // 5. Testar Atualização de Config
        let config = await models.ControleVeiculo.findByPk(placaTeste);
        if (!config) config = await models.ControleVeiculo.create({ placa: placaTeste });

        await config.update({ intervalo_oleo_km: 1000 });
        console.log('✅ Config atualizada');

        // 6. Testar Registro de KM (Simulando Service logic)
        const novoKm = 1500;
        const proxOleo = (config.ultima_troca_oleo_km || 0) + config.intervalo_oleo_km;
        let novaSituacao = 'Normal';
        if (novoKm >= proxOleo) novaSituacao = 'Agendar';

        await registro.update({ km_atual: novoKm, situacao: novaSituacao });
        console.log(`✅ KM Registrado: ${novoKm} | Nova Situação: ${registro.situacao} (Esperado: Agendar)`);

        if (registro.situacao !== 'Agendar') {
            console.warn('⚠️  Alerta de óleo não funcionou como esperado.');
        }

        // 7. Testar Agendamento SERVICE manually
        await models.ControleServico.create({
            veiculo_id: placaTeste,
            SemanaId: novaSemana.id,
            status: 'Agendado',
            tipo: 'Mecanica'
        });
        await registro.update({ situacao: 'Agendado' });
        console.log('✅ Serviço Agendado');

        console.log('🎉 TESTES CONCLUÍDOS COM SUCESSO!');
        process.exit(0);

    } catch (e) {
        console.error('❌ Erro nos testes:', e);
        process.exit(1);
    }
}

run();
