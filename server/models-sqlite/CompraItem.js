
import { DataTypes } from 'sequelize';
import sequelize from '../config/database-sqlite.js';
import Compra from './Compra.js';
import Veiculo from './Veiculo.js';

const CompraItem = sequelize.define('CompraItem', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    compra_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Compra,
            key: 'id'
        }
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
        allowNull: true,
        references: {
            model: Veiculo,
            key: 'placa'
        }
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

CompraItem.belongsTo(Compra, { foreignKey: 'compra_id', onDelete: 'CASCADE' });
Compra.hasMany(CompraItem, { foreignKey: 'compra_id', as: 'itens' });

CompraItem.belongsTo(Veiculo, { foreignKey: 'placa', targetKey: 'placa' });

export default CompraItem;
