import DatabaseFactory from './DatabaseFactory.js';
import defineUsuario from '../models-sqlite/Usuario.js';
import defineEmpresa from '../models-sqlite/Empresa.js';
import definePlano from '../models-sqlite/Plano.js';

class MasterDatabase {
    constructor() {
        this.sequelize = null;
        this.Usuario = null;
        this.Empresa = null;
    }

    async init() {
        if (this.sequelize) return;

        this.sequelize = await DatabaseFactory.initMaster();

        // Inicializar Models do Master
        this.Empresa = defineEmpresa(this.sequelize);
        this.Usuario = defineUsuario(this.sequelize);
        this.Plano = definePlano(this.sequelize);

        // Definir Relacionamentos
        this.Empresa.hasMany(this.Usuario, { foreignKey: 'empresaId' });
        this.Usuario.belongsTo(this.Empresa, { foreignKey: 'empresaId' });

        // Relacionamento Empresa-Plano
        this.Plano.hasMany(this.Empresa, { foreignKey: 'planoId' });
        this.Empresa.belongsTo(this.Plano, { foreignKey: 'planoId' });

        // Sincronizar Master DB (Cria tabelas se não existirem)
        // Em produção, usar migrations! Aqui para MVP facilita.
        await this.sequelize.sync();

        console.log('✅ Master Database Inicializado (Models Carregados)');
    }
}

export default new MasterDatabase();
