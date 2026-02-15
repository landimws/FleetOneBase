import { DataTypes } from 'sequelize';

/**
 * Tenant Model: ControleKmHistorico
 * Log imutável de registros de quilometragem
 * @param {import('sequelize').Sequelize} sequelize 
 */
export default (sequelize) => {
    return sequelize.define('ControleKmHistorico', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        controle_veiculo_placa: {
            type: DataTypes.STRING,
            allowNull: false
            // FK para ControleVeiculo
        },
        SemanaId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        data_registro: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        km_registrado: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        km_anterior: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        motivo: {
            type: DataTypes.STRING,
            allowNull: true
        }
    }, {
        tableName: 'ControleKmHistoricos',
        timestamps: true,
        updatedAt: false // Imutável
    });
};
