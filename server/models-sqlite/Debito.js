import { DataTypes } from 'sequelize';

/**
 * Tenant Model: Debito
 * @param {import('sequelize').Sequelize} sequelize 
 */
export default (sequelize) => {
    return sequelize.define('Debito', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        cliente_id: { type: DataTypes.INTEGER, allowNull: true },
        cliente_nome: { type: DataTypes.STRING, allowNull: false },
        veiculo_placa: { type: DataTypes.STRING, allowNull: true },

        data: { type: DataTypes.DATEONLY, allowNull: false },
        tipo: { type: DataTypes.STRING(50), allowNull: false },
        descricao: { type: DataTypes.TEXT, allowNull: false },

        quantidade: { type: DataTypes.DECIMAL(10, 2), defaultValue: 1 },
        valor_unitario: { type: DataTypes.DECIMAL(10, 2), allowNull: false },

        cobra_taxa_adm: { type: DataTypes.BOOLEAN, defaultValue: false },
        percentual_taxa: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
        valor_taxa: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },

        valor_total: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
        observacao: { type: DataTypes.TEXT }
    }, {
        tableName: 'debitos',
        timestamps: true
    });
};
