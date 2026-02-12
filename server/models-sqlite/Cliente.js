import { DataTypes } from 'sequelize';

/**
 * Tenant Model: Cliente
 * @param {import('sequelize').Sequelize} sequelize 
 */
export default (sequelize) => {
    return sequelize.define('Cliente', {
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
            allowNull: true
        },
        rg: { type: DataTypes.STRING },
        cnh: { type: DataTypes.STRING },
        logradouro: { type: DataTypes.STRING },
        numero: { type: DataTypes.STRING },
        bairro: { type: DataTypes.STRING },
        cidade: { type: DataTypes.STRING },
        estado: { type: DataTypes.STRING },
        cep: { type: DataTypes.STRING },
        telefone: { type: DataTypes.STRING },
        email: { type: DataTypes.STRING },
        data_nascimento: { type: DataTypes.DATEONLY },
        endereco: { type: DataTypes.STRING } // Legado
    }, {
        tableName: 'Clientes',
        timestamps: true
    });
};
