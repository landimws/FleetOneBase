
import { DataTypes } from 'sequelize';
import sequelize from '../config/database-sqlite.js';

const Veiculo = sequelize.define('Veiculo', {
    placa: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false
    },
    modelo: {
        type: DataTypes.STRING,
        allowNull: false
    },
    ano: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    combustivel: {
        type: DataTypes.STRING,
        allowNull: false
    },
    preco_base: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    ativo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    // Novos Campos
    renavam: {
        type: DataTypes.STRING,
        allowNull: true
    },
    chassi: {
        type: DataTypes.STRING,
        allowNull: true
    },
    ipva_vencimento: {
        type: DataTypes.DATEONLY, // YYYY-MM-DD
        allowNull: true
    },
    ipva_valor: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    ipva_pago: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    licenciamento_vencimento: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    licenciamento_valor: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    licenciamento_pago: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    vistoria_vencimento: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    vistoria_valor: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    vistoria_pago: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    condutor_indicado: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    timestamps: false
});

export default Veiculo;
