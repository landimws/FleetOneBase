
import { DataTypes } from 'sequelize';
import sequelize from '../config/database-sqlite.js';
import Fornecedor from './Fornecedor.js';

const Compra = sequelize.define('Compra', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    fornecedor_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Fornecedor,
            key: 'id'
        }
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

Compra.belongsTo(Fornecedor, { foreignKey: 'fornecedor_id' });
Fornecedor.hasMany(Compra, { foreignKey: 'fornecedor_id' });

export default Compra;
