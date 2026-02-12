import { DataTypes } from 'sequelize';

/**
 * Tenant Model: LinhaSemana
 * @param {import('sequelize').Sequelize} sequelize 
 */
export default (sequelize) => {
    return sequelize.define('LinhaSemana', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        SemanaId: {
            type: DataTypes.INTEGER,
            allowNull: false
            // References definidas no momento do carregamento da conexão
            // references: { model: 'Semanas', key: 'id' } 
        },
        placa: {
            type: DataTypes.STRING,
            allowNull: false
        },
        tipo: {
            type: DataTypes.STRING,
            allowNull: false
        },
        cliente: { type: DataTypes.STRING, allowNull: true },
        cliente_id: { type: DataTypes.INTEGER, allowNull: true },

        // Dados Financeiros da Linha
        dias: { type: DataTypes.INTEGER, defaultValue: 0 },
        tabelado: { type: DataTypes.FLOAT, defaultValue: 0 },
        diaria: { type: DataTypes.FLOAT, defaultValue: 0 },
        semana: { type: DataTypes.FLOAT, defaultValue: 0 },
        p_premium: { type: DataTypes.FLOAT, defaultValue: 0 },
        protecao: { type: DataTypes.FLOAT, defaultValue: 0 },
        acordo: { type: DataTypes.FLOAT, defaultValue: 0 },
        ta_boleto: { type: DataTypes.FLOAT, defaultValue: 0 },
        desconto: { type: DataTypes.FLOAT, defaultValue: 0 },
        previsto: { type: DataTypes.FLOAT, defaultValue: 0 },
        recebido: { type: DataTypes.FLOAT, defaultValue: 0 },
        saldo: { type: DataTypes.FLOAT, defaultValue: 0 },

        // Flags
        BO: { type: DataTypes.BOOLEAN, defaultValue: false },
        CO: { type: DataTypes.BOOLEAN, defaultValue: false },
        observacoes: { type: DataTypes.TEXT },

        status_veiculo: { type: DataTypes.STRING },
        dias_selecionados: { type: DataTypes.TEXT },
        local_manutencao: { type: DataTypes.STRING },
        previsao_retorno: { type: DataTypes.DATEONLY },
        data_pagamento: { type: DataTypes.DATEONLY },
        valor_semanal: { type: DataTypes.REAL }
    }, {
        tableName: 'LinhaSemanas',
        timestamps: true
    });
};
