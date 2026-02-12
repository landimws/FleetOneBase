import { DataTypes } from 'sequelize';
import sequelize from '../config/database-sqlite.js';
import Veiculo from './Veiculo.js';
import Cliente from './Cliente.js';

const Multa = sequelize.define('Multa', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    veiculo_id: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: 'Veiculos',
            key: 'placa'
        }
    },
    numero_auto: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    renainf: {
        type: DataTypes.STRING,
        allowNull: true
    },
    data_infracao: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    data_lancamento: {
        type: DataTypes.DATEONLY,
        defaultValue: DataTypes.NOW
    },
    valor_original: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    orgao_autuador: {
        type: DataTypes.STRING,
        allowNull: false
    },
    data_vencimento: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    tipo_responsavel: {
        type: DataTypes.ENUM('cliente', 'locadora'),
        allowNull: false
    },
    cliente_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'Clientes',
            key: 'id'
        }
    },
    // Deprecated: kept for safety during migration
    cliente_nome: {
        type: DataTypes.STRING,
        allowNull: true
    },
    // ...
}, {
    tableName: 'Multas',
    timestamps: true,
    underscored: true
});

// Relacionamentos
Multa.belongsTo(Veiculo, { foreignKey: 'veiculo_id', as: 'veiculo' });
Multa.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'cliente' });

// Getters Calculados (Virtuais)
// Nota: Em Sequelize, getters podem ser definidos aqui ou como VIRTUAL fields.
// Vamos usar prototype methods ou Getters no define se precisarmos serializar.
// Por consistência com a solicitação, vamos garantir que existam.

// Adicionando Virtual Fields para facilitar acesso JSON
Multa.prototype.toJSON = function () {
    const values = { ...this.get() };

    // Calcular valores virtuais
    const descontoPercentual = this.desconto_aplicado || 0;
    const valorOriginal = parseFloat(this.valor_original) || 0;

    let valorComDesconto = valorOriginal * (1 - descontoPercentual / 100);
    let valorTaxaAdmin = this.cobrar_taxa_administrativa ? (valorComDesconto * 0.15) : 0;
    let valorACobrar = valorComDesconto + valorTaxaAdmin;

    // Se for advertência, valores a cobrar zeram
    if (this.convertido_advertencia) {
        valorComDesconto = 0;
        valorTaxaAdmin = 0;
        valorACobrar = 0;
    }

    values.valor_com_desconto = parseFloat(valorComDesconto.toFixed(2));
    values.valor_taxa_administrativa = parseFloat(valorTaxaAdmin.toFixed(2));
    values.valor_a_cobrar = parseFloat(valorACobrar.toFixed(2));

    return values;
};

export default Multa;
