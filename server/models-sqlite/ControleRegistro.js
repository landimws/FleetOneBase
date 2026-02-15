import { DataTypes } from 'sequelize';

/**
 * Tenant Model: ControleRegistro
 * Estado semanal do veículo no módulo de Controle
 * @param {import('sequelize').Sequelize} sequelize 
 */
export default (sequelize) => {
    return sequelize.define('ControleRegistro', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        SemanaId: {
            type: DataTypes.INTEGER,
            allowNull: false
            // FK para Semanas
        },
        veiculo_id: {
            type: DataTypes.STRING, // Placa
            allowNull: false
            // FK para Veiculos
        },
        km_anterior: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        km_atual: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        situacao: {
            type: DataTypes.ENUM('Solicitar', 'Normal', 'Agendar', 'Agendado', 'Na oficina', 'Revisado'),
            defaultValue: 'Solicitar'
        },
        cliente_atual: {
            type: DataTypes.STRING,
            allowNull: true
        },
        fechada: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        data_fechamento: {
            type: DataTypes.DATE,
            allowNull: true
        }
    }, {
        tableName: 'ControleRegistros',
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ['SemanaId', 'veiculo_id']
            },
            {
                fields: ['SemanaId']
            },
            {
                fields: ['veiculo_id']
            }
        ]
    });
};
