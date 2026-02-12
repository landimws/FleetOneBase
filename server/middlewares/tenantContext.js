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
            const Veiculo = defineVeiculo(connection);
            const Cliente = defineCliente(connection);
            const Semana = defineSemana(connection);
            const LinhaSemana = defineLinhaSemana(connection);
            const Multa = defineMulta(connection);
            const Debito = defineDebito(connection);
            const Credito = defineCredito(connection);
            const Encerramento = defineEncerramento(connection);
            const Fornecedor = defineFornecedor(connection);
            const Compra = defineCompra(connection);
            const CompraItem = defineCompraItem(connection);
            const ContaPagar = defineContaPagar(connection);

            // Associar Models (Relacionamentos)
            Semana.hasMany(LinhaSemana, { foreignKey: 'SemanaId' });
            LinhaSemana.belongsTo(Semana, { foreignKey: 'SemanaId' });
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
