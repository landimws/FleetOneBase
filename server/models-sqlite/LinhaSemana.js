import { DataTypes } from 'sequelize';
import sequelize from '../config/database-sqlite.js';
import Semana from './Semana.js';
import Veiculo from './Veiculo.js';
import Cliente from './Cliente.js';

/**
 * Model LinhaSemana - Reescrito do zero
 * Representa uma linha no grid semanal (um veículo em uma semana específica)
 */
const LinhaSemana = sequelize.define('LinhaSemana', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },

    // Foreign Key para Semana (EXPLÍCITA)
    SemanaId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Semanas',
            key: 'id'
        }
    },

    // Dados do Veículo
    placa: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: 'Veiculos',
            key: 'placa'
        }
    },

    status_veiculo: {
        type: DataTypes.STRING,
        defaultValue: 'disponivel',
        allowNull: false,
        validate: {
            isIn: [['alugado', 'disponivel', 'manutencao', 'validar']]
        }
    },

    // Dados do Cliente
    cliente: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Nome do cliente (legacy/display)'
    },

    cliente_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'Clientes',
            key: 'id'
        }
    },

    // Tipo de locação
    tipo: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Tipo: Diária, Semanal, etc.'
    },

    // Dias
    dias: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },

    dias_selecionados: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: '[]',
        get() {
            const rawValue = this.getDataValue('dias_selecionados');
            return rawValue ? JSON.parse(rawValue) : [];
        },
        set(value) {
            this.setDataValue('dias_selecionados', JSON.stringify(value || []));
        }
    },

    // Valores financeiros
    tabelado: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },

    valor_semanal: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },

    diaria: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },

    semana: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },

    p_premium: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },

    protecao: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },

    acordo: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },

    ta_boleto: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },

    desconto: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },

    previsto: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },

    recebido: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },

    saldo: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },

    // Flags booleanas
    AS: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Assinatura'
    },

    BO: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Boleto'
    },

    CO: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Conciliado'
    },

    // Datas
    data_pagamento: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },

    // Manutenção
    local_manutencao: {
        type: DataTypes.STRING,
        allowNull: true
    },

    previsao_retorno: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },

    // Observações
    observacoes: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'LinhaSemanas',
    timestamps: false,
    freezeTableName: true,
    indexes: [
        { fields: ['SemanaId'] },
        { fields: ['placa'] }
    ]
});

// ============================================
// RELACIONAMENTOS - TODOS EXPLÍCITOS
// ============================================

// Semana hasMany LinhaSemana
Semana.hasMany(LinhaSemana, {
    foreignKey: 'SemanaId',  // EXPLÍCITO
    as: 'linhas',
    onDelete: 'CASCADE'
});

// LinhaSemana belongsTo Semana
LinhaSemana.belongsTo(Semana, {
    foreignKey: 'SemanaId',  // EXPLÍCITO
    as: 'Semana'
});

// LinhaSemana belongsTo Veiculo
LinhaSemana.belongsTo(Veiculo, {
    foreignKey: 'placa',     // EXPLÍCITO
    targetKey: 'placa',      // EXPLÍCITO
    as: 'Veiculo'
});

// LinhaSemana belongsTo Cliente
LinhaSemana.belongsTo(Cliente, {
    foreignKey: 'cliente_id',  // EXPLÍCITO
    as: 'ClienteRel'
});

export default LinhaSemana;
