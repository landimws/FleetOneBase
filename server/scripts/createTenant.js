import { Sequelize } from 'sequelize';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Importar todos os models do Tenant
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

/**
 * Script para criar banco de dados isolado de um Tenant
 * Uso: node server/scripts/createTenant.js <empresaId>
 */
class TenantCreator {
    constructor(empresaId) {
        this.empresaId = empresaId;
        this.sequelize = null;
        this.models = {};
    }

    /**
     * Cria conexão com o banco do tenant
     */
    async createConnection() {
        const storagePath = `data/empresa_${this.empresaId}.sqlite`;
        const fullPath = path.resolve(process.cwd(), storagePath);

        // Garantir que diretório existe
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Verificar se banco já existe
        if (fs.existsSync(fullPath)) {
            console.log(`⚠️  Banco já existe: ${fullPath}`);
            const response = await this.promptOverwrite();
            if (!response) {
                console.log('❌ Operação cancelada.');
                process.exit(0);
            }
            fs.unlinkSync(fullPath);
            console.log('🗑️  Banco anterior removido.');
        }

        console.log(`📦 Criando banco Tenant ${this.empresaId}: ${fullPath}`);

        this.sequelize = new Sequelize({
            dialect: 'sqlite',
            storage: fullPath,
            logging: false
        });

        await this.sequelize.authenticate();
        console.log('✅ Conexão estabelecida.');
    }

    /**
     * Carrega todos os models do tenant
     */
    loadModels() {
        console.log('📋 Carregando models...');

        // Definir todos os models
        this.models.Cliente = defineCliente(this.sequelize);
        this.models.Veiculo = defineVeiculo(this.sequelize);
        this.models.Multa = defineMulta(this.sequelize);
        this.models.Semana = defineSemana(this.sequelize);
        this.models.LinhaSemana = defineLinhaSemana(this.sequelize);
        this.models.Debito = defineDebito(this.sequelize);
        this.models.Credito = defineCredito(this.sequelize);
        this.models.Encerramento = defineEncerramento(this.sequelize);
        this.models.Compra = defineCompra(this.sequelize);
        this.models.CompraItem = defineCompraItem(this.sequelize);
        this.models.ContaPagar = defineContaPagar(this.sequelize);
        this.models.Fornecedor = defineFornecedor(this.sequelize);

        // Verificar se todos os models foram carregados
        for (const [name, model] of Object.entries(this.models)) {
            if (!model) {
                console.error(`❌ Erro: Model ${name} não foi carregado corretamente.`);
                process.exit(1);
            }
        }

        // Definir relacionamentos
        console.log('🔗 Configurando relacionamentos...');
        try {
            this.setupRelationships();
        } catch (error) {
            console.error('❌ Erro ao configurar relacionamentos:', error);
            console.error(error.stack);
            process.exit(1);
        }

        console.log(`✅ ${Object.keys(this.models).length} models carregados.`);
    }

    /**
     * Define os relacionamentos entre models
     */
    setupRelationships() {
        const { Cliente, Veiculo, Multa, Semana, LinhaSemana, Debito, Credito,
            Encerramento, Compra, CompraItem, ContaPagar, Fornecedor } = this.models;

        // Cliente -> Veiculo (1:N)
        // Veiculo não tem FK explicita, Sequelize cria clienteId
        Cliente.hasMany(Veiculo, { foreignKey: 'clienteId', as: 'veiculos' });
        Veiculo.belongsTo(Cliente, { foreignKey: 'clienteId', as: 'cliente' });

        // Veiculo -> Multa (1:N)
        // Multa tem veiculo_id
        Veiculo.hasMany(Multa, { foreignKey: 'veiculo_id', as: 'multas' });
        Multa.belongsTo(Veiculo, { foreignKey: 'veiculo_id', as: 'veiculo' });

        // Cliente -> Multa (1:N)
        // Multa tem cliente_id
        Cliente.hasMany(Multa, { foreignKey: 'cliente_id', as: 'multas' });
        Multa.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'cliente' });

        // Semana -> LinhaSemana (1:N)
        // LinhaSemana tem SemanaId (PascalCase) e alias corrigido 'semanaRef'
        Semana.hasMany(LinhaSemana, { foreignKey: 'SemanaId', as: 'linhas' });
        LinhaSemana.belongsTo(Semana, { foreignKey: 'SemanaId', as: 'semanaRef' });

        // Cliente -> LinhaSemana (1:N)
        // LinhaSemana tem cliente_id e alias corrigido 'clienteRef'
        Cliente.hasMany(LinhaSemana, { foreignKey: 'cliente_id', as: 'linhasSemanas' });
        LinhaSemana.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'clienteRef' });

        // Cliente -> Debito (1:N) 
        // Debito tem cliente_id
        Cliente.hasMany(Debito, { foreignKey: 'cliente_id', as: 'debitos' });
        Debito.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'cliente' });

        // Cliente -> Credito (1:N)
        // Credito tem cliente_id
        Cliente.hasMany(Credito, { foreignKey: 'cliente_id', as: 'creditos' });
        Credito.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'cliente' });

        // Cliente -> Encerramento (1:N)
        // Encerramento tem cliente_id
        Cliente.hasMany(Encerramento, { foreignKey: 'cliente_id', as: 'encerramentos' });
        Encerramento.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'cliente' });

        // Fornecedor -> Compra (1:N)
        // Compra tem fornecedor_id
        Fornecedor.hasMany(Compra, { foreignKey: 'fornecedor_id', as: 'compras' });
        Compra.belongsTo(Fornecedor, { foreignKey: 'fornecedor_id', as: 'fornecedor' });

        // Compra -> CompraItem (1:N)
        // CompraItem tem compra_id
        Compra.hasMany(CompraItem, { foreignKey: 'compra_id', as: 'itens' });
        CompraItem.belongsTo(Compra, { foreignKey: 'compra_id', as: 'compra' });

        // Fornecedor -> ContaPagar (1:N)
        // ContaPagar não tem FK explicita, mas é underscored. Vamos manter padrão.
        Fornecedor.hasMany(ContaPagar, { foreignKey: 'fornecedorId', as: 'contas' });
        ContaPagar.belongsTo(Fornecedor, { foreignKey: 'fornecedorId', as: 'fornecedor' });
    }

    /**
     * Sincroniza estrutura do banco (cria tabelas)
     */
    async syncDatabase() {
        console.log('🔨 Criando estrutura de tabelas...');
        try {
            await this.sequelize.sync({ force: false });
            console.log('✅ Estrutura criada.');
        } catch (error) {
            console.error('❌ Erro no sync do banco de dados:');
            console.error(error.message);
            // Logar detalhes se disponível (alguns erros do sequelize tem .sql)
            if (error.sql) console.error('SQL:', error.sql);
            throw error; // Re-throw para ser pego no execute()
        }
    }

    /**
     * Insere dados seed padrão
     */
    async insertSeeds() {
        console.log('🌱 Inserindo dados seed...');

        // Seeds não são necessários para este sistema
        // Cada empresa começa com banco vazio e popula conforme necessidade

        console.log('✅ Seeds inseridos (nenhum seed padrão configurado).');
    }

    /**
     * Prompt para confirmar sobrescrita
     */
    async promptOverwrite() {
        // Em ambiente de script CLI, sempre sobrescrever
        // Em produção, adicionar readline para confirmação manual
        return true;
    }

    /**
     * Executa todo o processo de criação
     */
    async execute() {
        try {
            console.log(`\n🚀 Iniciando criação de Tenant ${this.empresaId}...\n`);

            await this.createConnection();
            this.loadModels();
            await this.syncDatabase();
            await this.insertSeeds();

            console.log(`\n✅ Tenant ${this.empresaId} criado com sucesso!`);
            console.log(`📁 Arquivo: data/empresa_${this.empresaId}.sqlite\n`);

            await this.sequelize.close();
            process.exit(0);
        } catch (error) {
            console.error('\nERROR DETASILS:');
            console.error(error.message);
            console.error(error.stack);
            process.exit(1);
        }
    }
}

// Executar script
const empresaId = process.argv[2];

if (!empresaId) {
    console.error('❌ Uso: node server/scripts/createTenant.js <empresaId>');
    console.error('   Exemplo: node server/scripts/createTenant.js 1');
    process.exit(1);
}

const creator = new TenantCreator(empresaId);
creator.execute();
