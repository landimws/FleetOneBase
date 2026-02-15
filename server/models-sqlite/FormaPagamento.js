import { DataTypes } from 'sequelize';

/**
 * Tenant Model: FormaPagamento
 * Armazena formas de pagamento disponíveis
 * @param {import('sequelize').Sequelize} sequelize 
 */
export default (sequelize) => {
    return sequelize.define('FormaPagamento', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        nome: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true
        },
        aceita_parcelamento: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        ativo: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        tableName: 'FormasPagamento',
        timestamps: true
    });
};
