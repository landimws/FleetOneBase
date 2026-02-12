import { DataTypes } from 'sequelize';

/**
 * Tenant Model: Encerramento
 * @param {import('sequelize').Sequelize} sequelize 
 */
export default (sequelize) => {
    return sequelize.define('Encerramento', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        cliente_id: { type: DataTypes.INTEGER, allowNull: true },
        cliente_nome: { type: DataTypes.STRING, allowNull: false },
        placa: { type: DataTypes.STRING, allowNull: false },

        data_encerramento: { type: DataTypes.DATEONLY, allowNull: false },
        km_final: { type: DataTypes.INTEGER },
        acordo_texto: { type: DataTypes.TEXT },

        snapshot_financeiro: { type: DataTypes.JSON }, // Resumo financeiro no momento

        ativo: { type: DataTypes.BOOLEAN, defaultValue: true },
        reaberto: { type: DataTypes.BOOLEAN, defaultValue: false },
        data_reabertura: { type: DataTypes.DATE },
        motivo_reabertura: { type: DataTypes.TEXT }
    }, {
        tableName: 'Encerramentos',
        timestamps: true
    });
};
