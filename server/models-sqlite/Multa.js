import { DataTypes } from 'sequelize';

/**
 * Tenant Model: Multa
 * @param {import('sequelize').Sequelize} sequelize 
 */
export default (sequelize) => {
    return sequelize.define('Multa', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        veiculo_id: {
            type: DataTypes.STRING,
            allowNull: false
        },
        numero_auto: { type: DataTypes.STRING },
        renainf: { type: DataTypes.STRING },
        data_infracao: { type: DataTypes.DATEONLY },
        data_lancamento: { type: DataTypes.DATEONLY },
        valor_original: { type: DataTypes.DECIMAL(10, 2) },
        orgao_autuador: { type: DataTypes.STRING },
        data_vencimento: { type: DataTypes.DATEONLY },
        tipo_responsavel: { type: DataTypes.STRING },

        cliente_id: { type: DataTypes.INTEGER, allowNull: true },
        cliente_nome: { type: DataTypes.STRING }, // Legado/Cache

        foi_indicado: { type: DataTypes.BOOLEAN, defaultValue: false },
        reconheceu: { type: DataTypes.BOOLEAN, defaultValue: false },
        desconto_aplicado: { type: DataTypes.INTEGER, defaultValue: 0 },
        cobrar_taxa_administrativa: { type: DataTypes.BOOLEAN, defaultValue: false },

        data_pagamento_orgao: { type: DataTypes.DATEONLY },
        valor_pago_orgao: { type: DataTypes.DECIMAL(10, 2) },

        data_lancamento_carteira: { type: DataTypes.DATEONLY },
        valor_lancado_carteira: { type: DataTypes.DECIMAL(10, 2) },

        observacoes: { type: DataTypes.TEXT },
        search_text: { type: DataTypes.TEXT },
        convertido_advertencia: { type: DataTypes.BOOLEAN, defaultValue: false }
    }, {
        tableName: 'Multas',
        timestamps: true,
        underscored: true
    });
};
