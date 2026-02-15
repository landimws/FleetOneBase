import { DataTypes } from 'sequelize';

/**
 * Tenant Model: ConfiguracoesContrato
 * Armazena configurações globais para contratos (taxas, multas, padrões)
 * @param {import('sequelize').Sequelize} sequelize 
 */
export default (sequelize) => {
    return sequelize.define('ConfiguracoesContrato', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        empresa_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'Referência para multi-empresa (futuro)'
        },

        // Taxas (valores monetários ou percentuais)
        taxa_administrativa: {
            type: DataTypes.FLOAT,
            defaultValue: 0.15,
            comment: '15%'
        },
        taxa_retorno: {
            type: DataTypes.FLOAT,
            defaultValue: 0
        },
        taxa_limpeza_basica: {
            type: DataTypes.FLOAT,
            defaultValue: 0
        },
        taxa_limpeza_especial: {
            type: DataTypes.FLOAT,
            defaultValue: 0
        },

        // Multas e Juros (percentuais)
        percentual_multa_atraso: {
            type: DataTypes.FLOAT,
            defaultValue: 0.02,
            comment: '2%'
        },
        percentual_juros_mora: {
            type: DataTypes.FLOAT,
            defaultValue: 0.01,
            comment: '1% ao dia'
        },
        percentual_multa_rescisao: {
            type: DataTypes.FLOAT,
            defaultValue: 0.10,
            comment: '10%'
        },
        multa_arrependimento: {
            type: DataTypes.FLOAT,
            defaultValue: 0
        },
        multa_km_nao_revisao: {
            type: DataTypes.FLOAT,
            defaultValue: 0
        },

        // Padrões de Contrato
        vigencia_padrao_dias: {
            type: DataTypes.INTEGER,
            defaultValue: 30
        },
        km_franquia_padrao: {
            type: DataTypes.INTEGER,
            defaultValue: 100,
            comment: 'KM por dia'
        },
        valor_km_excedente_padrao: {
            type: DataTypes.FLOAT,
            defaultValue: 0.5
        },
        valor_avaria_padrao: {
            type: DataTypes.FLOAT,
            defaultValue: 0
        }
    }, {
        tableName: 'ConfiguracoesContrato',
        timestamps: true
    });
};
