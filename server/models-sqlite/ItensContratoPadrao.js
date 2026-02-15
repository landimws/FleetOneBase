import { DataTypes } from 'sequelize';

/**
 * Tenant Model: ItensContratoPadrao
 * Catálogo de itens disponíveis para contratos
 * @param {import('sequelize').Sequelize} sequelize 
 */
export default (sequelize) => {
    return sequelize.define('ItensContratoPadrao', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },

        // Identificação do Item
        nome: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'Ex: Locação Semanal, Pacote Premium, Proteção Extra'
        },
        descricao: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Descrição detalhada do item'
        },

        // Categoria
        tipo_item: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: 'locacao, protecao, taxa, adicional'
        },

        // Valores
        valor_padrao: {
            type: DataTypes.FLOAT,
            defaultValue: 0,
            comment: 'Valor padrão sugerido'
        },
        permite_edicao_valor: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: 'Permite alterar valor no contrato?'
        },

        // Controle
        ativo: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        ordem_exibicao: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            comment: 'Ordem na lista de seleção'
        }
    }, {
        tableName: 'ItensContratoPadrao',
        timestamps: true
    });
};
