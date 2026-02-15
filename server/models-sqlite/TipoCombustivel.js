import { DataTypes } from 'sequelize';

/**
 * Tenant Model: TipoCombustivel
 * Armazena tipos de combustível disponíveis
 * @param {import('sequelize').Sequelize} sequelize 
 */
export default (sequelize) => {
    return sequelize.define('TipoCombustivel', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        nome: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true
        },
        ativo: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        tableName: 'TiposCombustivel',
        timestamps: true
    });
};
