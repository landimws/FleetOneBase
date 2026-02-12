import { DataTypes } from 'sequelize';

/**
 * Tenant Model: Credito
 * @param {import('sequelize').Sequelize} sequelize 
 */
export default (sequelize) => {
    return sequelize.define('Credito', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        cliente_id: { type: DataTypes.INTEGER, allowNull: true },
        cliente_nome: { type: DataTypes.STRING, allowNull: false },

        data: { type: DataTypes.DATEONLY, allowNull: false },
        tipo: { type: DataTypes.STRING(50), allowNull: false },
        descricao: { type: DataTypes.TEXT, allowNull: false },
        valor: { type: DataTypes.DECIMAL(10, 2), allowNull: false },

        forma_pagamento: { type: DataTypes.STRING(50) },
        observacao: { type: DataTypes.TEXT }
    }, {
        tableName: 'creditos',
        timestamps: true
    });
};
