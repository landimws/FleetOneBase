import { DataTypes } from 'sequelize';

/**
 * Tenant Model: ModeloVeiculo
 * Armazena modelos de veículos por marca
 * @param {import('sequelize').Sequelize} sequelize 
 */
export default (sequelize) => {
    return sequelize.define('ModeloVeiculo', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        marca_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'MarcasVeiculos',
                key: 'id'
            }
        },
        nome: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        ativo: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        tableName: 'ModelosVeiculos',
        timestamps: true
    });
};
