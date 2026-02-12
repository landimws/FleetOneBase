import { DataTypes } from 'sequelize';

/**
 * Schema do Model Usuario (Master DB)
 * @param {import('sequelize').Sequelize} sequelize Instância do Master DB
 */
export default (sequelize) => {
    return sequelize.define('Usuario', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        nome: {
            type: DataTypes.STRING,
            allowNull: false
        },
        username: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false
        },
        role: {
            type: DataTypes.STRING,
            defaultValue: 'admin' // admin_master, admin_tenant, operador
        },
        ativo: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        empresaId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'Empresas',
                key: 'id'
            }
        },
        // [NEW] Para identificar se é usuário Super Admin do FleetOne
        isSuperAdmin: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        }
    }, {
        tableName: 'Usuarios',
        timestamps: true
    });
};
