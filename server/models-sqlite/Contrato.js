import { DataTypes } from 'sequelize';

/**
 * Tenant Model: Contrato
 * Armazena dados principais dos contratos de locação
 * @param {import('sequelize').Sequelize} sequelize 
 */
export default (sequelize) => {
    return sequelize.define('Contrato', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        numero_contrato: {
            type: DataTypes.STRING,
            unique: true,
            comment: 'Ex: CONT-2026-001'
        },

        // Relacionamentos (FK)
        cliente_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        veiculo_placa: {
            type: DataTypes.STRING,
            allowNull: false
        },

        // Período do Contrato
        data_assinatura: {
            type: DataTypes.DATEONLY,
            allowNull: true
        },
        data_inicio: {
            type: DataTypes.DATEONLY,
            allowNull: true
        },
        data_fim: {
            type: DataTypes.DATEONLY,
            allowNull: true
        },
        vigencia_dias: {
            type: DataTypes.INTEGER,
            allowNull: true
        },

        // Termos Financeiros
        dia_pagamento: {
            type: DataTypes.STRING,
            comment: 'segunda-feira, terça-feira, etc.'
        },
        km_franquia: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        valor_km_excedente: {
            type: DataTypes.FLOAT,
            allowNull: true
        },
        valor_avaria: {
            type: DataTypes.FLOAT,
            allowNull: true
        },

        // Caução
        valor_caucao: {
            type: DataTypes.FLOAT,
            allowNull: true
        },
        caucao_forma_pagamento: {
            type: DataTypes.STRING,
            comment: 'a_vista ou parcelada'
        },
        caucao_num_parcelas: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'Se parcelada'
        },
        caucao_valor_parcela: {
            type: DataTypes.FLOAT,
            allowNull: true,
            comment: 'Se parcelada'
        },

        // Valores do Veículo (snapshot no momento do contrato)
        veiculo_valor_fipe: {
            type: DataTypes.FLOAT,
            allowNull: true
        },
        veiculo_cor: {
            type: DataTypes.STRING,
            allowNull: true
        },
        veiculo_marca: {
            type: DataTypes.STRING,
            allowNull: true
        },

        // Status do Contrato
        status: {
            type: DataTypes.STRING,
            defaultValue: 'ativo',
            comment: 'ativo, encerrado, rescindido'
        },

        // Dados processados (JSON)
        dados_processados: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'JSON com todas as variáveis e textos processados'
        },
        pdf_url: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: 'Caminho do PDF gerado'
        },

        // Observações
        observacoes: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    }, {
        tableName: 'Contratos',
        timestamps: true
    });
};
