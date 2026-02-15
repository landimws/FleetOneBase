
import DatabaseFactory from '../config/DatabaseFactory.js';
import definePlano from '../models-sqlite/Plano.js';
import defineEmpresa from '../models-sqlite/Empresa.js';
import defineUsuario from '../models-sqlite/Usuario.js';

async function migrate() {
    console.log('🚀 Iniciando Migração de Planos...');

    try {
        const sequelize = await DatabaseFactory.initMaster();

        // Carregar Models
        const Plano = definePlano(sequelize);
        const Empresa = defineEmpresa(sequelize);
        const Usuario = defineUsuario(sequelize);

        // Definir Associações para o Sync entender a ordem
        Empresa.belongsTo(Plano, { foreignKey: 'planoId' });
        Plano.hasMany(Empresa, { foreignKey: 'planoId' });

        // 1. Criar Tabela Planos
        console.log('📦 Sincronizando tabela Planos...');
        await Plano.sync();

        // 2. Popular Planos Iniciais (Seed)
        console.log('🌱 Populando Planos Padrão...');
        const planosIniciais = [
            {
                nome: 'Gratuito (Trial)',
                descricao: 'Para testar o sistema',
                preco: 0.00,
                limite_veiculos: 5,
                limite_usuarios: 1,
                modulos_ativos: ['basico']
            },
            {
                nome: 'Básico',
                descricao: 'Pequenas frotas',
                preco: 99.00,
                limite_veiculos: 20,
                limite_usuarios: 3,
                modulos_ativos: ['basico', 'manutencao']
            },
            {
                nome: 'Pro',
                descricao: 'Gestão completa',
                preco: 199.00,
                limite_veiculos: 100,
                limite_usuarios: 10,
                modulos_ativos: ['basico', 'manutencao', 'financeiro']
            },
            {
                nome: 'Enterprise',
                descricao: 'Sem limites',
                preco: 499.00,
                limite_veiculos: -1, // Ilimitado
                limite_usuarios: -1,
                modulos_ativos: ['todos']
            }
        ];

        for (const p of planosIniciais) {
            const [plano, created] = await Plano.findOrCreate({
                where: { nome: p.nome },
                defaults: p
            });
            if (created) console.log(`   ✅ Plano "${p.nome}" criado.`);
            else console.log(`   ℹ️ Plano "${p.nome}" já existe.`);
        }

        // 3. Alterar Tabela Empresas (Adicionar Colunas)
        // O sync do Sequelize muitas vezes não faz ALTER TABLE automaticamente em SQLite de forma segura.
        // Vamos checar e fazer manualmente via query interface se necessário, ou usar sync({ alter: true }) com cuidado.
        console.log('🔄 Atualizando schema da tabela Empresas...');

        // Metodo seguro para SQLite: Ler colunas e adicionar se faltar
        const queryInterface = sequelize.getQueryInterface();
        const tableInfo = await queryInterface.describeTable('Empresas');

        if (!tableInfo.planoId) {
            console.log('   ➕ Adicionando coluna planoId...');
            await queryInterface.addColumn('Empresas', 'planoId', {
                type: sequelize.Sequelize.INTEGER,
                references: { model: 'Planos', key: 'id' },
                allowNull: true
            });
        }

        if (!tableInfo.status_assinatura) {
            console.log('   ➕ Adicionando coluna status_assinatura...');
            await queryInterface.addColumn('Empresas', 'status_assinatura', {
                type: sequelize.Sequelize.STRING,
                defaultValue: 'ativo'
            });
        }

        if (!tableInfo.data_renovacao) {
            console.log('   ➕ Adicionando coluna data_renovacao...');
            await queryInterface.addColumn('Empresas', 'data_renovacao', {
                type: sequelize.Sequelize.DATE,
                allowNull: true
            });
        }

        // 4. Migrar Empresas Existentes para o Plano Gratuito
        console.log('🔗 Vinculando empresas existentes ao Plano Gratuito...');
        const planoGratuito = await Plano.findOne({ where: { nome: 'Gratuito (Trial)' } });

        if (planoGratuito) {
            const empresasSemPlano = await Empresa.findAll({ where: { planoId: null } });
            console.log(`   Encontradas ${empresasSemPlano.length} empresas sem plano.`);

            for (const emp of empresasSemPlano) {
                // Se for a empresa do sistema (ID 1), pode ser Enterprise
                if (emp.id === 1) {
                    const planoEnt = await Plano.findOne({ where: { nome: 'Enterprise' } });
                    await emp.update({ planoId: planoEnt.id });
                    console.log(`   👑 Empresa System (ID 1) migrada para Enterprise.`);
                } else {
                    await emp.update({ planoId: planoGratuito.id });
                    console.log(`   📎 Empresa ${emp.nome} (ID ${emp.id}) migrada para Gratuito.`);
                }
            }
        }

        console.log('✅ Migração Concluída com Sucesso!');

    } catch (error) {
        console.error('❌ Erro na migração:', error);
    } finally {
        process.exit();
    }
}

migrate();
