
import { DataTypes } from 'sequelize';
import sequelize from '../config/database-sqlite.js';

const Usuario = sequelize.define('Usuario', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nome: {
        type: DataTypes.STRING,
        allowNull: false
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    role: {
        type: DataTypes.STRING,
        defaultValue: 'admin' // admin, operador
    },
    ativo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    empresaId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'Empresas',
            key: 'id'
        }
    }
}, {
    tableName: 'Usuarios',
    timestamps: true
});

export default Usuario;
