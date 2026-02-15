import DatabaseFactory from '../config/DatabaseFactory.js';
import defineVeiculo from '../models-sqlite/Veiculo.js';
import defineCliente from '../models-sqlite/Cliente.js';
import defineSemana from '../models-sqlite/Semana.js';
import defineLinhaSemana from '../models-sqlite/LinhaSemana.js';
import defineMulta from '../models-sqlite/Multa.js';
import defineDebito from '../models-sqlite/Debito.js';
import defineCredito from '../models-sqlite/Credito.js';
import defineEncerramento from '../models-sqlite/Encerramento.js';
import defineFornecedor from '../models-sqlite/Fornecedor.js';
import defineCompra from '../models-sqlite/Compra.js';
import defineCompraItem from '../models-sqlite/CompraItem.js';
import defineContaPagar from '../models-sqlite/ContaPagar.js';

// [NEW] Módulo de Contratos
import defineContrato from '../models-sqlite/Contrato.js';
import defineContratoItem from '../models-sqlite/ContratoItem.js';
import defineConfiguracoesContrato from '../models-sqlite/ConfiguracoesContrato.js';
import defineItensContratoPadrao from '../models-sqlite/ItensContratoPadrao.js';
import defineTemplatesDocumento from '../models-sqlite/TemplatesDocumento.js';
import defineTemplatesDocumentoHistorico from '../models-sqlite/TemplatesDocumentoHistorico.js';

// Cache simples para models instanciados por conexão
// Map<connection, { Veiculo, Cliente, ... }>
const modelsCache = new WeakMap();

export default async (req, res, next) => {
    // Ignorar assets estáticos
    if (req.path.startsWith('/css') || req.path.startsWith('/js') || req.path.startsWith('/images')) {
        return next();
    }

    try {
        // 1. Identificar Tenant (Empresa)
        let tenantId = req.session?.empresaId;

        if (req.session?.impersonateTenantId) {
            tenantId = req.session.impersonateTenantId;
        }

        // Se não tem tenant definido, next
        if (!tenantId) {
            return next();
        }

        // 2. Obter Conexão do Tenant
        const connection = await DatabaseFactory.getTenantConnection(tenantId);

        // 3. Carregar/Recuperar Models do Cache
        if (!modelsCache.has(connection)) {
            // Instanciar Models
            // console.log('[TenantContext] Instanciando Models para Tenant:', tenantId);
            const Veiculo = defineVeiculo(connection);
            const Cliente = defineCliente(connection);
            const Semana = defineSemana(connection);

            if (!Semana || typeof Semana.findAll !== 'function') {
                console.error('CRITICAL: Semana Model failed to initialize correctly!', Semana);
            }

            const LinhaSemana = defineLinhaSemana(connection);
            const Multa = defineMulta(connection);
            const Debito = defineDebito(connection);
            const Credito = defineCredito(connection);
            const Encerramento = defineEncerramento(connection);
            const Fornecedor = defineFornecedor(connection);
            const Compra = defineCompra(connection);
            const CompraItem = defineCompraItem(connection);
            const ContaPagar = defineContaPagar(connection);

            // [NEW] Módulo Controle
            const ControleVeiculo = (await import('../models-sqlite/ControleVeiculo.js')).default(connection);
            const ControleRegistro = (await import('../models-sqlite/ControleRegistro.js')).default(connection);
            const ControleKmHistorico = (await import('../models-sqlite/ControleKmHistorico.js')).default(connection);
            const ControleServico = (await import('../models-sqlite/ControleServico.js')).default(connection);

            // [NEW] Módulo de Contratos
            const Contrato = defineContrato(connection);
            const ContratoItem = defineContratoItem(connection);
            const ConfiguracoesContrato = defineConfiguracoesContrato(connection);
            const ItensContratoPadrao = defineItensContratoPadrao(connection);
            const TemplatesDocumento = defineTemplatesDocumento(connection);
            const TemplatesDocumentoHistorico = defineTemplatesDocumentoHistorico(connection);

            // [NEW] Models Auxiliares (Dados Universais)
            const MarcaVeiculo = (await import('../models-sqlite/MarcaVeiculo.js')).default(connection);
            const ModeloVeiculo = (await import('../models-sqlite/ModeloVeiculo.js')).default(connection);
            const FormaPagamento = (await import('../models-sqlite/FormaPagamento.js')).default(connection);
            const TipoCombustivel = (await import('../models-sqlite/TipoCombustivel.js')).default(connection);
            const CorVeiculo = (await import('../models-sqlite/CorVeiculo.js')).default(connection);
            const CategoriaDespesa = (await import('../models-sqlite/CategoriaDespesa.js')).default(connection);

            // Associar Models (Relacionamentos)
            Semana.hasMany(LinhaSemana, { foreignKey: 'SemanaId', as: 'linhas' });
            LinhaSemana.belongsTo(Semana, { foreignKey: 'SemanaId', as: 'DadosSemana' });
            LinhaSemana.belongsTo(Veiculo, { foreignKey: 'placa', targetKey: 'placa', as: 'Veiculo' });

            Cliente.hasMany(Debito, { foreignKey: 'cliente_id' });
            Debito.belongsTo(Cliente, { foreignKey: 'cliente_id' });

            Cliente.hasMany(Credito, { foreignKey: 'cliente_id' });
            Credito.belongsTo(Cliente, { foreignKey: 'cliente_id' });

            Cliente.hasMany(Multa, { foreignKey: 'cliente_id', as: 'multas' });
            Multa.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'cliente' });

            Veiculo.hasMany(Multa, { foreignKey: 'veiculo_id', as: 'multas' });
            Multa.belongsTo(Veiculo, { foreignKey: 'veiculo_id', as: 'veiculo' });

            // Financeiro Contas a Pagar
            Compra.belongsTo(Fornecedor, { foreignKey: 'fornecedor_id' });
            Fornecedor.hasMany(Compra, { foreignKey: 'fornecedor_id' });

            ContaPagar.belongsTo(Compra, { foreignKey: 'compra_id', onDelete: 'CASCADE' });
            Compra.hasMany(ContaPagar, { foreignKey: 'compra_id', as: 'parcelas' });

            CompraItem.belongsTo(Compra, { foreignKey: 'compra_id', onDelete: 'CASCADE' });
            Compra.hasMany(CompraItem, { foreignKey: 'compra_id', as: 'itens' });

            CompraItem.belongsTo(Veiculo, { foreignKey: 'placa', targetKey: 'placa' });

            // [NEW] Associações Módulo Controle
            // ControleVeiculo -> Veiculo (1:1)
            ControleVeiculo.belongsTo(Veiculo, { foreignKey: 'placa', targetKey: 'placa' });
            Veiculo.hasOne(ControleVeiculo, { foreignKey: 'placa', sourceKey: 'placa' });

            // ControleRegistro -> Semana e Veiculo
            ControleRegistro.belongsTo(Semana, { foreignKey: 'SemanaId' });
            ControleRegistro.belongsTo(Veiculo, { foreignKey: 'veiculo_id', targetKey: 'placa' });

            // ControleKmHistorico -> ControleVeiculo
            ControleKmHistorico.belongsTo(ControleVeiculo, { foreignKey: 'controle_veiculo_placa', targetKey: 'placa' });

            // ControleServico -> Veiculo e Semana
            ControleServico.belongsTo(Veiculo, { foreignKey: 'veiculo_id', targetKey: 'placa' });
            ControleServico.belongsTo(Semana, { foreignKey: 'SemanaId' });

            // [DEV ONLY] Auto-sync para garantir a nova coluna `motivo`
            // Em produção, isso deve ser removido e usado migrations.
            // console.log(`[TenantContext] Sincronizando schema para Tenant ${tenantId}...`);
            await ControleKmHistorico.sync({ alter: true });


            // Salvar no cache
            modelsCache.set(connection, {
                Veiculo,
                Cliente,
                Semana,
                LinhaSemana,
                Multa,
                Debito,
                Credito,
                Encerramento,
                Fornecedor,
                Compra,
                CompraItem,
                ContaPagar,
                // [NEW]
                ControleVeiculo,
                ControleRegistro,
                ControleKmHistorico,
                ControleServico,
                // [NEW] Módulo de Contratos
                Contrato,
                ContratoItem,
                ConfiguracoesContrato,
                ItensContratoPadrao,
                TemplatesDocumento,
                TemplatesDocumentoHistorico,
                // [NEW] Models Auxiliares
                MarcaVeiculo,
                ModeloVeiculo,
                FormaPagamento,
                TipoCombustivel,
                CorVeiculo,
                CategoriaDespesa,
                sequelize: connection
            });
        }

        // 4. Injetar na Requisição
        req.models = modelsCache.get(connection);
        req.tenantId = tenantId;

        next();

    } catch (error) {
        console.error('❌ Erro no Tenant Middleware:', error);
        res.status(500).send('Erro ao carregar contexto da empresa.');
    }
};
