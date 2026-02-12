
import { DataTypes } from 'sequelize';

/**
 * Tenant Model: CompraItem
 * @param {import('sequelize').Sequelize} sequelize 
 */
export default (sequelize) => {
    return sequelize.define('CompraItem', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        compra_id: {
            type: DataTypes.INTEGER,
            allowNull: false
            // References set at runtime
        },
        descricao: {
            type: DataTypes.STRING,
            allowNull: false
        },
        tipo: {
            type: DataTypes.ENUM('PECA', 'SERVICO', 'AVULSO', 'TAXA'),
            allowNull: false,
            defaultValue: 'PECA'
        },
        quantidade: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 1
        },
        valor_unitario: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0
        },
        valor_subtotal: {
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
        valor_final: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0
        },
        placa: {
            type: DataTypes.STRING,
            allowNull: true
            // References set at runtime
        },
        numero_os: {
            type: DataTypes.STRING,
            allowNull: true
        },
        observacoes: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    }, {
        tableName: 'CompraItens',
        timestamps: true,
        underscored: true
    });
};
