
import { DataTypes } from 'sequelize';
import sequelize from '../config/database-sqlite.js';

const Cliente = sequelize.define('Cliente', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nome: {
        type: DataTypes.STRING,
        allowNull: false
    },
    ativo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    cpf: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: true // Allow null for legacy data migration, but validation should enforce it for new ones
    },
    rg: { type: DataTypes.STRING },
    cnh: { type: DataTypes.STRING },
    // Endereço Estruturado
    logradouro: { type: DataTypes.STRING },
    numero: { type: DataTypes.STRING },
    bairro: { type: DataTypes.STRING },
    cidade: { type: DataTypes.STRING },
    estado: { type: DataTypes.STRING },
    cep: { type: DataTypes.STRING },

    // Contato e Pessoal
    telefone: { type: DataTypes.STRING },
    email: { type: DataTypes.STRING },
    data_nascimento: { type: DataTypes.DATEONLY }, // YYYY-MM-DD

    // Mantendo campo legado para compatibilidade se necessário, ou uso interno
    endereco: { type: DataTypes.STRING }
});

export default Cliente;
