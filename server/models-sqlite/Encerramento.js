
import { DataTypes } from 'sequelize';
import sequelize from '../config/database-sqlite.js';

const Encerramento = sequelize.define('Encerramento', {
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
    placa: {
        type: DataTypes.STRING,
        allowNull: false
    },
    data_encerramento: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    km_final: {
        type: DataTypes.INTEGER
    },
    acordo_texto: {
        type: DataTypes.TEXT
    },
    snapshot_financeiro: {
        type: DataTypes.JSON
    },
    reaberto: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    },
    data_reabertura: {
        type: DataTypes.DATE,
        allowNull: true
    },
    motivo_reabertura: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    ativo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
});

import Cliente from './Cliente.js';
Encerramento.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'cliente' });

export default Encerramento;
