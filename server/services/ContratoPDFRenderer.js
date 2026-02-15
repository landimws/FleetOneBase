import puppeteer from 'puppeteer';
import ContratoService from './ContratoService.js';
import path from 'path';
import fs from 'fs/promises';

/**
 * Renderizador PDF para Contratos
 * Gera PDF usando Puppeteer
 */
class ContratoPDFRenderer {

    /**
     * Renderiza contrato em PDF
     * @param {Object} models - Models do Sequelize
     * @param {number} contratoId - ID do contrato
     * @param {string} templateHtml - HTML do template
     * @returns {Buffer} PDF em buffer
     */
    async render(models, contratoId, templateHtml) {
        let browser = null;

        try {
            // 1. Preparar dados completos
            const dados = await ContratoService.prepararDadosContrato(models, contratoId);

            // 2. Processar variáveis
            const variaveis = ContratoService.processarVariaveis(dados);

            // 3. Processar diretivas condicionais (@if)
            let html = ContratoService.processarDiretivasCondicionais(templateHtml, variaveis);

            // 4. Substituir variáveis ({{VARIAVEL}})
            html = ContratoService.substituirVariaveis(html, variaveis);

            // 5. Aplicar layout PDF
            const htmlFinal = this._aplicarLayoutPDF(html, dados);

            // 6. Gerar PDF com Puppeteer
            browser = await puppeteer.launch({
                headless: 'new',
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });

            const page = await browser.newPage();
            await page.setContent(htmlFinal, {
                waitUntil: 'networkidle0'
            });

            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '20mm',
                    right: '15mm',
                    bottom: '20mm',
                    left: '15mm'
                }
            });

            return pdfBuffer;

        } catch (error) {
            console.error('Erro ao renderizar contrato (PDF):', error);
            throw new Error(`Falha na geração do PDF: ${error.message}`);
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }

    /**
     * Gera PDF e salva em arquivo
     * @param {Object} models - Models do Sequelize
     * @param {number} contratoId - ID do contrato
     * @param {string} templateHtml - HTML do template
     * @param {string} outputPath - Caminho completo do arquivo de saída
     * @returns {string} Caminho do arquivo salvo
     */
    async renderToFile(models, contratoId, templateHtml, outputPath) {
        const pdfBuffer = await this.render(models, contratoId, templateHtml);

        // Garantir que o diretório existe
        const dir = path.dirname(outputPath);
        await fs.mkdir(dir, { recursive: true });

        // Salvar arquivo
        await fs.writeFile(outputPath, pdfBuffer);

        return outputPath;
    }

    /**
     * Aplica layout PDF (formal, sem botões)
     * @param {string} conteudo - HTML do contrato processado
     * @param {Object} dados - Dados do contrato
     * @returns {string} HTML com layout PDF
     */
    _aplicarLayoutPDF(conteudo, dados) {
        return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Contrato ${dados.contrato.numero_contrato}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Times New Roman', serif;
            font-size: 11pt;
            line-height: 1.5;
            color: #000;
        }
        
        .header {
            text-align: center;
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 2px solid #000;
        }
        
        .header h1 {
            font-size: 16pt;
            margin-bottom: 8px;
            text-transform: uppercase;
        }
        
        .header p {
            font-size: 10pt;
            margin: 3px 0;
        }
        
        .contrato-numero {
            text-align: right;
            font-weight: bold;
            margin-bottom: 15px;
        }
        
        .clausula {
            margin-bottom: 15px;
            text-align: justify;
        }
        
        .clausula-titulo {
            font-weight: bold;
            margin-bottom: 8px;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 12px 0;
            font-size: 10pt;
        }
        
        table th,
        table td {
            border: 1px solid #000;
            padding: 6px;
        }
        
        table th {
            background-color: #e0e0e0;
            font-weight: bold;
            text-align: center;
        }
        
        .assinaturas {
            margin-top: 50px;
            page-break-inside: avoid;
        }
        
        .assinatura {
            display: inline-block;
            width: 48%;
            text-align: center;
            margin-top: 30px;
        }
        
        .linha-assinatura {
            border-top: 1px solid #000;
            margin-top: 50px;
            padding-top: 8px;
            font-size: 10pt;
        }
        
        .rodape {
            position: fixed;
            bottom: 0;
            width: 100%;
            text-align: center;
            font-size: 9pt;
            color: #666;
            padding-top: 10px;
            border-top: 1px solid #ccc;
        }
        
        @page {
            margin: 20mm 15mm;
        }
        
        @media print {
            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
        }
    </style>
</head>
<body>
    ${conteudo}
    
    <div class="rodape">
        Documento gerado eletronicamente em ${new Date().toLocaleDateString('pt-BR')}
    </div>
</body>
</html>`;
    }
}

export default new ContratoPDFRenderer();
