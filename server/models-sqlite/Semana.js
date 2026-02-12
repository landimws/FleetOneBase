import { DataTypes } from 'sequelize';
import sequelize from '../config/database-sqlite.js';

/**
 * Model Semana - Reescrito do zero
 * Representa um período semanal de controle
 */
const Semana = sequelize.define('Semana', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    data_inicio: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    data_fim: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'aberta',
        allowNull: false,
        validate: {
            isIn: [['aberta', 'fechada']]
        }
    },
    data_fechamento: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'Semanas',
    timestamps: false,
    freezeTableName: true
});

export default Semana;
