
import { DataTypes } from 'sequelize';
import sequelize from '../config/database-sqlite.js';

const Empresa = sequelize.define('Empresa', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nome: {
        type: DataTypes.STRING,
        allowNull: false
    },
    cnpj: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
    },
    endereco: {
        type: DataTypes.STRING,
        allowNull: true
    },
    telefone: {
        type: DataTypes.STRING,
        allowNull: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: true
    },
    responsavel: {
        type: DataTypes.STRING,
        allowNull: true
    },
    // Endereço Estruturado
    cep: { type: DataTypes.STRING, allowNull: true },
    logradouro: { type: DataTypes.STRING, allowNull: true },
    numero: { type: DataTypes.STRING, allowNull: true },
    bairro: { type: DataTypes.STRING, allowNull: true },
    cidade: { type: DataTypes.STRING, allowNull: true },
    estado: { type: DataTypes.STRING, allowNull: true }
}, {
    tableName: 'Empresas',
    timestamps: true
});

export default Empresa;
