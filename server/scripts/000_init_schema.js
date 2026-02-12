
import { Sequelize } from 'sequelize';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Importar definitions
import defineCliente from '../models-sqlite/Cliente.js';
import defineVeiculo from '../models-sqlite/Veiculo.js';
import defineMulta from '../models-sqlite/Multa.js';
import defineSemana from '../models-sqlite/Semana.js';
import defineLinhaSemana from '../models-sqlite/LinhaSemana.js';
import defineDebito from '../models-sqlite/Debito.js';
import defineCredito from '../models-sqlite/Credito.js';
import defineEncerramento from '../models-sqlite/Encerramento.js';
import defineCompra from '../models-sqlite/Compra.js';
import defineCompraItem from '../models-sqlite/CompraItem.js';
import defineContaPagar from '../models-sqlite/ContaPagar.js';
import defineFornecedor from '../models-sqlite/Fornecedor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initProdDb() {
    const dbPath = path.resolve(__dirname, '../../data/prod/database.sqlite');
    console.log(`🚀 Inicializando Schema em: ${dbPath}`);

    // Garantir diretório
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });

    const sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: dbPath,
        logging: false
    });

    // Definir Models
    const Cliente = defineCliente(sequelize);
    const Veiculo = defineVeiculo(sequelize);
    const Multa = defineMulta(sequelize);
    const Semana = defineSemana(sequelize);
    const LinhaSemana = defineLinhaSemana(sequelize);
    const Debito = defineDebito(sequelize);
    const Credito = defineCredito(sequelize);
    const Encerramento = defineEncerramento(sequelize);
    const Compra = defineCompra(sequelize);
    const CompraItem = defineCompraItem(sequelize);
    const ContaPagar = defineContaPagar(sequelize);
    const Fornecedor = defineFornecedor(sequelize);

    // Definir Relacionamentos (Copiado de tenantContext.js ou similar)
    // Multas
    Veiculo.hasMany(Multa, { foreignKey: 'veiculo_id', as: 'multas' });
    Multa.belongsTo(Veiculo, { foreignKey: 'veiculo_id', as: 'veiculo' });

    // Financeiro
    Compra.belongsTo(Fornecedor, { foreignKey: 'fornecedor_id' });
    Fornecedor.hasMany(Compra, { foreignKey: 'fornecedor_id' });

    ContaPagar.belongsTo(Compra, { foreignKey: 'compra_id', onDelete: 'CASCADE' });
    Compra.hasMany(ContaPagar, { foreignKey: 'compra_id', as: 'parcelas' });

    CompraItem.belongsTo(Compra, { foreignKey: 'compra_id', onDelete: 'CASCADE' });
    Compra.hasMany(CompraItem, { foreignKey: 'compra_id', as: 'itens' });

    CompraItem.belongsTo(Veiculo, { foreignKey: 'placa', targetKey: 'placa' });

    console.log('📦 Criando tabelas...');
    await sequelize.sync(); // Cria tabelas se não existirem
    console.log('✅ Schema criado com sucesso!');
}

initProdDb().catch(err => {
    console.error('❌ Erro ao inicializar DB:', err);
    process.exit(1);
});
