import { DataTypes } from 'sequelize';

/**
 * Tenant Model: TemplatesDocumentoHistorico
 * Histórico de versões de templates
 * @param {import('sequelize').Sequelize} sequelize 
 */
export default (sequelize) => {
    return sequelize.define('TemplatesDocumentoHistorico', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        template_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: 'FK -> TemplatesDocumento'
        },

        versao: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        html_completo: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        css_customizado: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        alterado_por: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        motivo_alteracao: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Descrição da mudança'
        }
    }, {
        tableName: 'TemplatesDocumentoHistorico',
        timestamps: true
    });
};
