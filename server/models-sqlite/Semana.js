import { DataTypes } from 'sequelize';

/**
 * Tenant Model: Semana
 * @param {import('sequelize').Sequelize} sequelize 
 */
export default (sequelize) => {
    return sequelize.define('Semana', {
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
        timestamps: true,
        freezeTableName: true
    });
};
