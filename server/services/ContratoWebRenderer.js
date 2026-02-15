import ContratoService from './ContratoService.js';

/**
 * Renderizador Web para Contratos
 * Gera HTML para exibição em navegador
 */
class ContratoWebRenderer {

    /**
     * Renderiza contrato para exibição web
     * @param {Object} models - Models do Sequelize
     * @param {number} contratoId - ID do contrato
     * @param {string} templateHtml - HTML do template (de TemplatesDocumento)
     * @returns {string} HTML finalizado
     */
    async render(models, contratoId, templateHtml) {
        try {
            // 1. Preparar dados completos
            const dados = await ContratoService.prepararDadosContrato(models, contratoId);

            // 2. Processar variáveis
            const variaveis = ContratoService.processarVariaveis(dados);

            // 3. Processar diretivas condicionais (@if)
            let html = ContratoService.processarDiretivasCondicionais(templateHtml, variaveis);

            // 4. Substituir variáveis ({{VARIAVEL}})
            html = ContratoService.substituirVariaveis(html, variaveis);

            // 5. Envolver em layout web
            const htmlFinal = this._aplicarLayoutWeb(html, dados);

            return htmlFinal;

        } catch (error) {
            console.error('Erro ao renderizar contrato (Web):', error);
            throw new Error(`Falha na renderização: ${error.message}`);
        }
    }

    /**
     * Aplica layout web (header, navbar, footer)
     * @param {string} conteudo - HTML do contrato processado
     * @param {Object} dados - Dados do contrato
     * @returns {string} HTML com layout
     */
    _aplicarLayoutWeb(conteudo, dados) {
        return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Contrato ${dados.contrato.numero_contrato}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
            padding: 20px;
        }
        
        .container {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #333;
        }
        
        .header h1 {
            font-size: 24px;
            margin-bottom: 10px;
        }
        
        .clausula {
            margin-bottom: 20px;
        }
        
        .clausula-titulo {
            font-weight: bold;
            margin-bottom: 10px;
            color: #1a1a1a;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }
        
        table th,
        table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        
        table th {
            background-color: #f2f2f2;
            font-weight: bold;
        }
        
        .assinaturas {
            margin-top: 60px;
            display: flex;
            justify-content: space-between;
        }
        
        .assinatura {
            text-align: center;
            width: 45%;
        }
        
        .linha-assinatura {
            border-top: 1px solid #333;
            margin-top: 50px;
            padding-top: 10px;
        }
        
        .actions {
            margin-top: 30px;
            text-align: center;
            padding: 20px;
            background: #f9f9f9;
        }
        
        .btn {
            display: inline-block;
            padding: 12px 24px;
            margin: 0 10px;
            background: #007bff;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            font-weight: bold;
            transition: background 0.3s;
        }
        
        .btn:hover {
            background: #0056b3;
        }
        
        .btn-secondary {
            background: #6c757d;
        }
        
        .btn-secondary:hover {
            background: #545b62;
        }
        
        @media print {
            body {
                background: white;
                padding: 0;
            }
            
            .actions {
                display: none !important;
            }
            
            .container {
                box-shadow: none;
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        ${conteudo}
    </div>
    
    <div class="actions">
        <a href="/api/contratos/${dados.contrato.id}/pdf" class="btn" target="_blank">
            📄 Baixar PDF
        </a>
        <button onclick="window.print()" class="btn btn-secondary">
            🖨️ Imprimir
        </button>
        <a href="/contratos" class="btn btn-secondary">
            ← Voltar
        </a>
    </div>
</body>
</html>`;
    }
}

export default new ContratoWebRenderer();
