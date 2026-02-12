
import { DataTypes } from 'sequelize';

/**
 * Tenant Model: Compra
 * @param {import('sequelize').Sequelize} sequelize 
 */
export default (sequelize) => {
    return sequelize.define('Compra', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        fornecedor_id: {
            type: DataTypes.INTEGER,
            allowNull: false
            // References set at runtime
        },
        data_emissao: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        numero_nota: {
            type: DataTypes.STRING,
            allowNull: false
        },
        valor_bruto: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0
        },
        desconto_percentual: {
            type: DataTypes.DECIMAL(5, 2),
            defaultValue: 0
        },
        desconto_valor: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0
        },
        valor_liquido: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0
        },
        observacoes: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    }, {
        tableName: 'Compras',
        timestamps: true,
        underscored: true
    });
};
