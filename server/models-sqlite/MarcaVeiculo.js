import { DataTypes } from 'sequelize';

/**
 * Tenant Model: MarcaVeiculo
 * Armazena marcas de veículos disponíveis para o sistema
 * @param {import('sequelize').Sequelize} sequelize 
 */
export default (sequelize) => {
    return sequelize.define('MarcaVeiculo', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        nome: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true
        },
        ativo: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        tableName: 'MarcasVeiculos',
        timestamps: true
    });
};
