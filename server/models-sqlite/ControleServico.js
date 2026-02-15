import { DataTypes } from 'sequelize';

/**
 * Tenant Model: ControleServico
 * Histórico de serviços e manutenções
 * @param {import('sequelize').Sequelize} sequelize 
 */
export default (sequelize) => {
    return sequelize.define('ControleServico', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        veiculo_id: {
            type: DataTypes.STRING, // Placa
            allowNull: false
        },
        SemanaId: {
            type: DataTypes.INTEGER, // Semana de referência
            allowNull: true
        },
        tipo: {
            type: DataTypes.ENUM('Oleo', 'Correia', 'Mecanica', 'Outros'),
            defaultValue: 'Mecanica'
        },
        data_agendamento: {
            type: DataTypes.DATEONLY,
            allowNull: true
        },
        data_entrada: {
            type: DataTypes.DATEONLY,
            allowNull: true
        },
        data_saida: {
            type: DataTypes.DATEONLY,
            allowNull: true
        },
        km_saida: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        observacao: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        trocou_oleo: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        trocou_correia: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        }
    }, {
        tableName: 'ControleServicos',
        timestamps: true
    });
};
