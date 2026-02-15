import { DataTypes } from 'sequelize';

/**
 * Tenant Model: CorVeiculo
 * Armazena cores de veículos disponíveis
 * @param {import('sequelize').Sequelize} sequelize 
 */
export default (sequelize) => {
    return sequelize.define('CorVeiculo', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        nome: {
            type: DataTypes.STRING(30),
            allowNull: false,
            unique: true
        },
        hex_code: {
            type: DataTypes.STRING(7),
            allowNull: true,
            comment: 'Código hexadecimal da cor (#FFFFFF)'
        },
        ativo: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        tableName: 'CoresVeiculos',
        timestamps: true
    });
};
