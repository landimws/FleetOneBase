
import { DataTypes } from 'sequelize';
import sequelize from '../config/database-sqlite.js';
import Cliente from './Cliente.js';
import Veiculo from './Veiculo.js';

const Debito = sequelize.define('Debito', {
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
    veiculo_placa: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: Veiculo,
            key: 'placa'
        }
    },
    data: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    tipo: {
        type: DataTypes.STRING,
        allowNull: false
    },
    descricao: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    observacao: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    quantidade: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 1
    },
    valor_unitario: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    cobra_taxa_adm: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    percentual_taxa: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.00
    },
    valor_taxa: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
    },
    valor_total: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    }
}, {
    tableName: 'debitos'
});

// Relacionamentos
Debito.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'cliente' });
Debito.belongsTo(Veiculo, { foreignKey: 'veiculo_placa', targetKey: 'placa', as: 'veiculo' });

export default Debito;
