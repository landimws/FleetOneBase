
import { DataTypes } from 'sequelize';
import sequelize from '../config/database-sqlite.js';
import Compra from './Compra.js';

const ContaPagar = sequelize.define('ContaPagar', {
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
    numero_parcela: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    total_parcelas: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    valor: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    vencimento: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    data_pagamento: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    forma_pagamento: {
        type: DataTypes.STRING,
        allowNull: true
    },
    valor_pago: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('EM_ABERTO', 'PAGO', 'ATRASADO'),
        defaultValue: 'EM_ABERTO'
    },
    confirmado: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    observacoes: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'ContasPagar',
    timestamps: true,
    underscored: true
});

ContaPagar.belongsTo(Compra, { foreignKey: 'compra_id', onDelete: 'CASCADE' });
Compra.hasMany(ContaPagar, { foreignKey: 'compra_id', as: 'parcelas' });

export default ContaPagar;
