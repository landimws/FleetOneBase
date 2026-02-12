import bcrypt from 'bcrypt';
import MasterDatabase from '../config/MasterDatabase.js';

/**
 * Script para popular o Master DB com dados iniciais
 * Uso: node server/scripts/seedMaster.js
 */
class MasterSeeder {
    constructor() {
        this.config = {
            // Configurações via ambiente ou defaults
            adminUsername: process.env.ADMIN_USERNAME || 'admin',
            adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
            adminNome: process.env.ADMIN_NOME || 'Super Administrador',
            empresaNome: process.env.EMPRESA_NOME || 'FleetOne Admin',
            empresaCnpj: process.env.EMPRESA_CNPJ || '00.000.000/0000-00'
        };
    }

    /**
     * Inicializa o Master DB
     */
    async init() {
        console.log('🔧 Inicializando Master Database...');
        await MasterDatabase.init();
        console.log('✅ Master Database inicializado.');
    }

    /**
     * Cria empresa FleetOne (ID fixo = 1)
     * Todos os usuários desta empresa são SuperAdmins
     */
    async createDefaultCompany() {
        console.log('\n📦 Criando empresa FleetOne (SuperAdmin)...');

        // Verificar se FleetOne já existe (ID = 1)
        const empresaExistente = await MasterDatabase.Empresa.findByPk(1);

        if (empresaExistente) {
            console.log(`⚠️  Empresa FleetOne já existe (ID: ${empresaExistente.id}).`);
            return empresaExistente;
        }

        // IMPORTANTE: Criar com ID = 1 (identificador único do FleetOne)
        const empresa = await MasterDatabase.Empresa.create({
            id: 1, // ID fixo para FleetOne
            nome: 'FleetOne - Administração',
            cnpj: '00.000.000/0000-00',
            email: 'admin@fleetone.com',
            telefone: '(00) 0000-0000',
            ativo: true
        });

        console.log(`✅ Empresa FleetOne criada (ID: ${empresa.id})`);
        console.log(`   ℹ️  Usuários desta empresa = SuperAdmins automáticos`);
        return empresa;
    }

    /**
     * Cria SuperAdmin inicial vinculado à empresa FleetOne
     * SuperAdmin = empresaId === 1
     */
    async createSuperAdmin(empresaId) {
        console.log('\n👤 Criando Super Administrador...');

        const usuarioExistente = await MasterDatabase.Usuario.findOne({
            where: { username: this.config.adminUsername }
        });

        if (usuarioExistente) {
            console.log(`⚠️  Usuário "${usuarioExistente.username}" já existe (ID: ${usuarioExistente.id}).`);

            // Garantir que está vinculado à empresa FleetOne
            if (usuarioExistente.empresaId !== empresaId) {
                await usuarioExistente.update({ empresaId });
                console.log('✅ Usuário vinculado à empresa FleetOne.');
            }

            return usuarioExistente;
        }

        // Hash da senha
        const passwordHash = await bcrypt.hash(this.config.adminPassword, 10);

        const usuario = await MasterDatabase.Usuario.create({
            nome: this.config.adminNome,
            username: this.config.adminUsername,
            password: passwordHash,
            role: 'admin',
            ativo: true,
            empresaId: empresaId // Vinculado à FleetOne (ID = 1)
        });

        console.log(`✅ SuperAdmin criado: "${usuario.username}" (ID: ${usuario.id})`);
        console.log(`   Nome: ${usuario.nome}`);
        console.log(`   Username: ${this.config.adminUsername}`);
        console.log(`   Password: ${this.config.adminPassword}`);
        console.log(`   Empresa: FleetOne (ID: ${empresaId})`);

        return usuario;
    }

    /**
     * Exibe resumo final
     */
    showSummary(empresa, usuario) {
        console.log('\n' + '='.repeat(60));
        console.log('✅ SEED DO MASTER DATABASE CONCLUÍDO');
        console.log('='.repeat(60));
        console.log('\n📊 Resumo:');
        console.log(`   Empresa FleetOne: ${empresa.nome} (ID: ${empresa.id})`);
        console.log(`   CNPJ: ${empresa.cnpj}`);
        console.log(`\n   SuperAdmin: ${usuario.nome} (ID: ${usuario.id})`);
        console.log(`   Username: ${usuario.username}`);
        console.log(`   Password: ${this.config.adminPassword}`);
        console.log(`   Empresa ID: ${usuario.empresaId} (FleetOne = SuperAdmin)`);
        console.log('\n💡 Regra: Todos os usuários com empresaId = 1 são SuperAdmins');
        console.log('\n🔐 Credenciais de acesso:');
        console.log(`   Username: ${this.config.adminUsername}`);
        console.log(`   Password: ${this.config.adminPassword}`);
        console.log('\n🌐 Acesse: http://localhost:3000/login');
        console.log('='.repeat(60) + '\n');
    }

    /**
     * Executa todo o processo de seed
     */
    async execute() {
        try {
            console.log('\n🚀 Iniciando seed do Master Database...\n');

            await this.init();
            const empresa = await this.createDefaultCompany();
            const usuario = await this.createSuperAdmin(empresa.id);
            this.showSummary(empresa, usuario);

            await MasterDatabase.sequelize.close();
            process.exit(0);
        } catch (error) {
            console.error('\n❌ Erro ao executar seed:', error);
            process.exit(1);
        }
    }
}

// Executar script
const seeder = new MasterSeeder();
seeder.execute();
