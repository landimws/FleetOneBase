
import { DataTypes } from 'sequelize';
import sequelize from '../config/database-sqlite.js';
import Cliente from './Cliente.js';

const Credito = sequelize.define('Credito', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    cliente_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'Clientes',
            key: 'id'
        }
    },
    // Legacy support
    cliente_nome: {
        type: DataTypes.STRING,
        allowNull: false
    },
    data: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    valor_original: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    valor: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    tipo: {
        type: DataTypes.STRING, // 'Boleto', 'PIX', 'Dinheiro'
        allowNull: false
    },
    descricao: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    desconto_percentual: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 0
    },
    desconto_tipo: {
        type: DataTypes.STRING(10),
        allowNull: true,
        defaultValue: 'percentual'
    },
    banco: {
        type: DataTypes.STRING,
        allowNull: true
    },
    banco_confirmado: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    observacao: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'creditos'
});

// Relacionamentos
Credito.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'cliente' });

export default Credito;
