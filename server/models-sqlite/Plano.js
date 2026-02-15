
import { DataTypes } from 'sequelize';

/**
 * Schema do Model Plano (Master DB)
 * @param {import('sequelize').Sequelize} sequelize Instância do Master DB
 */
export default (sequelize) => {
    return sequelize.define('Plano', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        nome: {
            type: DataTypes.STRING,
            allowNull: false
        },
        descricao: {
            type: DataTypes.STRING,
            allowNull: true
        },
        preco: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0.00
        },
        limite_veiculos: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 5,
            comment: '-1 para ilimitado'
        },
        limite_usuarios: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1,
            comment: '-1 para ilimitado'
        },
        modulos_ativos: {
            type: DataTypes.JSON, // Armazena array de strings ex: ['financeiro', 'manutencao']
            allowNull: true,
            defaultValue: []
        },
        ativo: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        tableName: 'Planos',
        timestamps: true
    });
};
