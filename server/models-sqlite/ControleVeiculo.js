import { DataTypes } from 'sequelize';

/**
 * Tenant Model: ControleVeiculo
 * Configurações e estado persistente do veículo para o módulo de Controle
 * @param {import('sequelize').Sequelize} sequelize 
 */
export default (sequelize) => {
    return sequelize.define('ControleVeiculo', {
        placa: {
            type: DataTypes.STRING,
            primaryKey: true,
            allowNull: false,
            // References definidas no index (Veiculo)
        },
        pacote_km_semana: {
            type: DataTypes.INTEGER,
            defaultValue: 1000
        },
        intervalo_oleo_km: {
            type: DataTypes.INTEGER,
            defaultValue: 5000
        },
        intervalo_correia_km: {
            type: DataTypes.INTEGER,
            defaultValue: 60000
        },
        usa_correia: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        ultima_troca_oleo_km: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        ultima_troca_oleo_data: {
            type: DataTypes.DATEONLY,
            allowNull: true
        },
        ultima_troca_correia_km: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        ultima_troca_correia_data: {
            type: DataTypes.DATEONLY,
            allowNull: true
        }
    }, {
        tableName: 'ControleVeiculos',
        timestamps: true,
        // Hooks ou Indexes podem ser adicionados aqui
    });
};
