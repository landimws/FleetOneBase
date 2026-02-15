import { DataTypes } from 'sequelize';

/**
 * Tenant Model: TemplatesDocumento
 * Templates editáveis de documentos (contratos, vistorias, recibos)
 * @param {import('sequelize').Sequelize} sequelize 
 */
export default (sequelize) => {
    return sequelize.define('TemplatesDocumento', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },

        // Identificação
        nome: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'Contrato de Locação, Termo de Vistoria, Recibo'
        },
        tipo: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'contrato, vistoria, recibo'
        },
        descricao: {
            type: DataTypes.TEXT,
            allowNull: true
        },

        // Conteúdo Editável (Modo Documento Completo)
        html_completo: {
            type: DataTypes.TEXT,
            allowNull: false,
            comment: 'HTML completo com todas as cláusulas e variáveis {{VARIAVEL}}'
        },
        css_customizado: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'CSS específico do template'
        },

        // Metadados
        versao: {
            type: DataTypes.INTEGER,
            defaultValue: 1,
            comment: 'Controle de versão'
        },
        ativo: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        criado_por: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'FK -> Usuario'
        },
        atualizado_por: {
            type: DataTypes.INTEGER,
            allowNull: true
        },

        // Ajuda ao Editor
        variaveis_disponiveis: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'JSON: ["CLIENTE_NOME", "VEICULO_PLACA", ...]'
        },
        exemplo_dados: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'JSON com dados de exemplo para preview'
        }
    }, {
        tableName: 'TemplatesDocumento',
        timestamps: true
    });
};
