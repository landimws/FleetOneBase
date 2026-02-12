
import { DataTypes } from 'sequelize';
import sequelize from '../config/database-sqlite.js';

const Fornecedor = sequelize.define('Fornecedor', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nome: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    cnpj_cpf: {
        type: DataTypes.STRING,
        allowNull: true
    },
    telefone: {
        type: DataTypes.STRING,
        allowNull: true
    },
    ativo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: 'Fornecedores',
    timestamps: true,
    underscored: true
});

export default Fornecedor;
