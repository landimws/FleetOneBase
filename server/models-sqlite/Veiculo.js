import { DataTypes } from 'sequelize';

/**
 * Tenant Model: Veiculo
 * @param {import('sequelize').Sequelize} sequelize 
 */
export default (sequelize) => {
    return sequelize.define('Veiculo', {
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
        marca: {
            type: DataTypes.STRING,
            allowNull: true
        },
        cor: {
            type: DataTypes.STRING,
            allowNull: true
        },
        valor_fipe: {
            type: DataTypes.FLOAT,
            allowNull: true,
            defaultValue: 0
        },
        ativo: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        renavam: { type: DataTypes.STRING, allowNull: true },
        chassi: { type: DataTypes.STRING, allowNull: true },
        ipva_vencimento: { type: DataTypes.DATEONLY, allowNull: true },
        ipva_valor: { type: DataTypes.FLOAT, allowNull: true },
        ipva_pago: { type: DataTypes.BOOLEAN, defaultValue: false },
        licenciamento_vencimento: { type: DataTypes.DATEONLY, allowNull: true },
        licenciamento_valor: { type: DataTypes.FLOAT, allowNull: true },
        licenciamento_pago: { type: DataTypes.BOOLEAN, defaultValue: false },
        vistoria_vencimento: { type: DataTypes.DATEONLY, allowNull: true },
        vistoria_valor: { type: DataTypes.FLOAT, allowNull: true },
        vistoria_pago: { type: DataTypes.BOOLEAN, defaultValue: false },
        condutor_indicado: { type: DataTypes.BOOLEAN, defaultValue: false }
    }, {
        tableName: 'Veiculos',
        timestamps: true
    });
};
