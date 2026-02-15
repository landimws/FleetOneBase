import { DataTypes } from 'sequelize';

/**
 * Tenant Model: CategoriaDespesa
 * Armazena categorias de despesas para compras/fornecedores
 * @param {import('sequelize').Sequelize} sequelize 
 */
export default (sequelize) => {
    return sequelize.define('CategoriaDespesa', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        nome: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true
        },
        descricao: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        ativo: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        tableName: 'CategoriasDespesas',
        timestamps: true
    });
};
