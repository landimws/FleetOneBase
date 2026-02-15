import { DataTypes } from 'sequelize';

/**
 * Tenant Model: ContratoItem
 * Itens selecionados de cada contrato
 * @param {import('sequelize').Sequelize} sequelize 
 */
export default (sequelize) => {
    return sequelize.define('ContratoItem', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        contrato_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        item_padrao_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: 'FK -> ItensContratoPadrao'
        },

        // Descrição do Item (copiada do padrão no momento da criação)
        nome: {
            type: DataTypes.STRING,
            comment: 'Ex: Locação Semanal'
        },
        descricao: {
            type: DataTypes.STRING,
            comment: 'Descrição do item'
        },
        tipo_item: {
            type: DataTypes.STRING,
            comment: 'Copiado do padrão'
        },

        quantidade: {
            type: DataTypes.INTEGER,
            defaultValue: 1
        },
        valor_unitario: {
            type: DataTypes.FLOAT,
            allowNull: false
        },
        valor_total: {
            type: DataTypes.FLOAT,
            allowNull: false
        }
    }, {
        tableName: 'ContratoItens',
        timestamps: true
    });
};
