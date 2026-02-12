function gerarHtmlImpressaoEncerramento(tipo, dados, formato = 'web') {
    const estilo = `
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap');
            
            :root {
                --primary: #000000;
                --text: #1f2937;
                --text-light: #6b7280;
                --border: #d1d5db;
                --bg-light: #f9fafb;
                --success: #059669;
                --danger: #dc2626;
            }
            
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Open Sans', sans-serif;
                font-size: ${formato === 'print' ? '8pt' : '12px'};
                line-height: 1.3;
                color: var(--text);
                ${formato === 'print' ? 'padding: 0;' : 'padding: 0; background: #e5e7eb;'}
            }
            
            ${formato === 'web' ? `
            .container {
                max-width: 210mm;
                margin: 0 auto;
                background: white;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            
            .header-sticky {
                position: sticky;
                top: 0;
                z-index: 100;
                background: white;
                border-bottom: 2px solid var(--primary);
                padding: 12px 20px;
                display: grid;
                grid-template-columns: 1fr auto;
                gap: 20px;
                align-items: center;
            }
            
            .saldo-card {
                background: var(--bg-light);
                padding: 10px 16px;
                border-radius: 6px;
                text-align: right;
                border-left: 4px solid var(--primary);
            }
            
            .saldo-card .label {
                font-size: 10px;
                color: var(--text-light);
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .saldo-card .valor {
                font-size: 18px;
                font-weight: 700;
                margin-top: 2px;
            }
            
            .content {
                padding: 20px;
            }
            
            .btn-print {
                position: fixed;
                bottom: 24px;
                right: 24px;
                background: var(--primary);
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 6px;
                font-weight: 600;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(30,64,175,0.3);
                font-size: 13px;
            }
            
            .btn-print:hover {
                background: #1e3a8a;
            }
            ` : ''}
            
            /* CABEÇALHO */
            .cabecalho {
                ${formato === 'print' || formato === 'web' ? 'display: none;' : 'padding: 16px 20px; border-bottom: 1px solid var(--border);'}
            }
            
            .dados-empresa h1 {
                font-size: ${formato === 'print' ? '12pt' : '16px'};
                color: var(--primary);
                margin-bottom: 6px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.8px;
            }
            
            .dados-empresa p {
                font-size: ${formato === 'print' ? '8pt' : '12px'};
                color: var(--text-light);
                margin: 1px 0;
            }
            
            .protocolo-box {
                ${formato === 'print' ? 'text-align: right; padding: 10px 14px; background: var(--bg-light); border-left: 3px solid var(--primary);' : 'margin-top: 10px;'}
            }
            
            .protocolo-box .label {
                font-size: ${formato === 'print' ? '7pt' : '10px'};
                color: var(--text-light);
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .protocolo-box .numero {
                font-size: ${formato === 'print' ? '10pt' : '14px'};
                color: var(--primary);
                font-weight: 700;
                display: block;
                margin-top: 2px;
            }
            
            .protocolo-box .data-geracao {
                font-size: ${formato === 'print' ? '6pt' : '10px'};
                margin-top: 4px;
                color: var(--text-light);
            }
            
            /* TÍTULO */
            .titulo-documento {
                font-size: ${formato === 'print' ? '10pt' : '15px'};
                color: var(--primary);
                text-align: center;
                text-transform: uppercase;
                margin: ${formato === 'print' ? '0 0 6px 0' : '10px 0'};
                padding: ${formato === 'print' ? '6px 8px' : '10px 12px'};
                letter-spacing: 0.8px;
                font-weight: 700;
                line-height: 1.2;
            }
            
            /* SEÇÕES */
            .secao {
                background: var(--bg-light);
                border-left: 3px solid var(--primary);
                padding: ${formato === 'print' ? '8px 12px' : '12px 16px'};
                margin: ${formato === 'print' ? '6px 0' : '10px 0'};
                ${formato === 'print' ? 'page-break-inside: avoid;' : ''}
            }
            
            .secao-titulo {
                font-size: ${formato === 'print' ? '8pt' : '11px'};
                color: var(--primary);
                text-transform: uppercase;
                margin-bottom: 6px;
                font-weight: 700;
                letter-spacing: 0.3px;
                border-bottom: 1px solid var(--border);
                padding-bottom: 3px;
            }
            
            .secao p {
                margin: 4px 0;
                line-height: 1.5;
                text-align: justify;
            }
            
            .secao strong {
                color: var(--text);
                font-weight: 600;
            }
            
            /* CLÁUSULAS */
            .clausula {
                margin: ${formato === 'print' ? '4px 0' : '8px 0'};
                text-align: justify;
                ${formato === 'print' ? 'page-break-inside: avoid;' : ''}
            }
            
            .clausula-titulo {
                font-weight: 700;
                color: var(--primary);
                margin-bottom: 4px;
                font-size: ${formato === 'print' ? '8pt' : '11px'};
                text-transform: uppercase;
                letter-spacing: 0.2px;
            }
            
            .clausula-conteudo {
                text-indent: 25px;
                line-height: 1.4;
                text-align: justify;
            }
            
            /* TABELAS */
            table {
                width: 100%;
                border-collapse: collapse;
                margin: ${formato === 'print' ? '6px 0' : '12px 0'};
                font-size: ${formato === 'print' ? '7.5pt' : '12px'};
                ${formato === 'web' ? 'overflow-x: auto; display: block;' : ''}
            }
            
            thead {
                background: var(--primary);
                color: white;
            }
            
            th {
                padding: ${formato === 'print' ? '4px 6px' : '10px 8px'};
                text-align: left;
                font-weight: 600;
                text-transform: uppercase;
                font-size: ${formato === 'print' ? '8pt' : '11px'};
                letter-spacing: 0.3px;
            }
            
            td {
                padding: ${formato === 'print' ? '3px 6px' : '8px'};
                border-bottom: 1px solid var(--border);
            }
            
            tbody tr:nth-child(even) {
                background: var(--bg-light);
            }
            
            tfoot {
                background: #f1f5f9;
                font-weight: 600;
            }
            
            tfoot td {
                padding: ${formato === 'print' ? '5px 6px' : '10px 8px'};
                border-top: 2px solid var(--primary);
                border-bottom: none;
            }
            
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            
            .destaque-valor {
                font-size: ${formato === 'print' ? '10pt' : '15px'};
                font-weight: 700;
            }
            
            .valor-positivo { color: var(--success); }
            .valor-negativo { color: var(--danger); }
            
            /* DESTAQUE SALDO (apenas print) */
            ${formato === 'print' ? `
            .saldo-destaque {
                background: var(--bg-light);
                border: 2px solid var(--primary);
                padding: 12px 16px;
                margin: 12px 0;
                text-align: center;
                page-break-inside: avoid;
            }
            
            .saldo-destaque .label {
                font-size: 8pt;
                color: var(--text-light);
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 6px;
            }
            
            .saldo-destaque .valor {
                font-size: 16pt;
                font-weight: 700;
            }
            ` : ''}
            
            /* ASSINATURAS */
            .assinatura-container {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: ${formato === 'print' ? '25px' : '24px'};
                margin-top: ${formato === 'print' ? '10px' : '14px'};
                ${formato === 'print' ? 'page-break-inside: avoid;' : ''}
            }
            
            .assinatura-bloco {
                text-align: center;
            }
            
            .assinatura-linha {
                border-top: 2px solid var(--text);
                margin-top: ${formato === 'print' ? '12mm' : '30px'};
                padding-top: 8px;
            }
            
            .assinatura-nome {
                font-weight: 600;
                color: var(--text);
                font-size: ${formato === 'print' ? '8pt' : '12px'};
            }
            
            .assinatura-cpf {
                font-size: ${formato === 'print' ? '7pt' : '11px'};
                color: var(--text-light);
                margin-top: 1px;
            }
            
            .assinatura-data {
                display: none;
            }
            
            /* TESTEMUNHAS */
            .testemunhas-container {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: ${formato === 'print' ? '28px' : '20px'};
                margin-top: ${formato === 'print' ? '16px' : '16px'};
                ${formato === 'print' ? 'page-break-inside: avoid;' : ''}
            }
            
            .testemunha-bloco {
                text-align: center;
            }
            
            .testemunha-linha {
                border-top: 1px solid var(--text);
                margin-top: ${formato === 'print' ? '12mm' : '35px'};
                padding-top: 8px;
            }
            
            .testemunha-titulo {
                font-size: ${formato === 'print' ? '8pt' : '12px'};
                font-weight: 600;
                color: var(--text-light);
                text-transform: uppercase;
                letter-spacing: 0.3px;
            }
            
            .testemunha-dados {
                font-size: ${formato === 'print' ? '7pt' : '11px'};
                color: var(--text-light);
                margin-top: 5px;
                line-height: 1.5;
            }
            
            /* RODAPÉ */
            .rodape {
                margin-top: ${formato === 'print' ? '20px' : '30px'};
                padding-top: 12px;
                border-top: 1px solid var(--border);
                font-size: ${formato === 'print' ? '7pt' : '11px'};
                color: var(--text-light);
                text-align: center;
                line-height: 1.5;
            }
            
            .local-data {
                text-align: right;
                margin: ${formato === 'print' ? '8px 0 6px 0' : '10px 0'};
                font-size: ${formato === 'print' ? '8pt' : '12px'};
                color: var(--text);
            }
            
            /* IMPRESSÃO */
            @media print {
                body {
                    padding: 0;
                    background: white;
                }
                
                .header-sticky,
                .btn-print,
                .saldo-card {
                    display: none;
                }
                
                .container {
                    max-width: 100%;
                    box-shadow: none;
                }
                
                .content {
                    padding: 0;
                }
                
                @page {
                    margin: 12mm 15mm;
                    size: A4;
                }
                
                .assinatura-container,
                .testemunhas-container,
                .clausula,
                .secao,
                .saldo-destaque {
                    page-break-inside: avoid;
                }
                
                thead {
                    display: table-header-group;
                }
                
                tfoot {
                    display: table-footer-group;
                }
            }
        </style>
    `;

    // Gerar protocolo único
    function gerarProtocolo() {
        const ano = new Date().getFullYear();
        const mes = String(new Date().getMonth() + 1).padStart(2, '0');
        const numero = String(Math.floor(Math.random() * 99999)).padStart(5, '0');
        return `ENC-${ano}${mes}-${numero}`;
    }

    const protocolo = gerarProtocolo();
    const dataHoraGeracao = new Date().toLocaleString('pt-BR');

    // Usar data de encerramento do contrato (dataFim) ao invés da data atual
    const dataDocumento = dados.contrato?.dataFim || dados.hoje || new Date().toLocaleDateString('pt-BR');

    // Cabeçalho
    const cabecalho = `
        <div class="cabecalho">
            <div class="dados-empresa">
                <h1>JODAMA LOCADORA DE VEÍCULOS LTDA</h1>
                <p><strong>CNPJ:</strong> 39.807.718/0001-20</p>
            </div>
            <div class="protocolo-box">
                <span class="label">Protocolo</span>
                <span class="numero">${protocolo}</span>
                <div class="data-geracao">
                    Gerado em: ${dataHoraGeracao}
                </div>
            </div>
        </div>
    `;

    // Header sticky (apenas web)
    let headerSticky = '';
    if (formato === 'web') {
        const saldo = dados.financeiro.resumo.saldo_devedor;
        const saldoClasse = saldo > 0 ? 'valor-negativo' : 'valor-positivo';
        const saldoTexto = saldo > 0 ? `- ${formatMoeda(saldo)}` : `+ ${formatMoeda(Math.abs(saldo))}`;

        headerSticky = `
            <div class="header-sticky">
                <div>
                    <div style="font-weight: 700; font-size: 15px; color: var(--primary);">JODAMA LOCADORA</div>
                    <div style="font-size: 12px; color: var(--text-light); margin-top: 2px;">Protocolo: ${protocolo}</div>
                </div>
                <div class="saldo-card">
                    <div class="label">Saldo ${saldo > 0 ? 'Devedor' : 'a Favor'}</div>
                    <div class="valor ${saldoClasse}">${saldoTexto}</div>
                </div>
            </div>
        `;
    }

    const locadorInfo = `
        <p><strong>LOCADOR:</strong> JODAMA LOCADORA DE VEÍCULOS LTDA, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº 39.807.718/0001-20, com sede na Av. Visconde do Rio Branco, 4121, São João do Tauape, Fortaleza-CE.</p>
    `;

    const extra = dados.cliente_extra || {};

    // Formatar dados para parágrafo de contrato
    const docIdentidade = dados.cliente.rg ? `RG nº ${dados.cliente.rg}` : 'RG não informado';
    const docCpf = dados.cliente.cpf ? `CPF nº ${dados.cliente.cpf}` : 'CPF não informado';
    const docCnh = extra.cnh ? `portador(a) da CNH nº ${extra.cnh}` : 'CNH não informada';
    const dataNasc = extra.data_nascimento ? `nascido(a) em ${new Date(extra.data_nascimento).toLocaleDateString('pt-BR')}` : 'data de nascimento não informada';
    const contatos = [];
    if (extra.telefone) contatos.push(extra.telefone);
    if (extra.email) contatos.push(extra.email);
    const contatoTexto = contatos.length > 0 ? `Contatos: ${contatos.join(' / ')}` : 'Contatos não informados';

    const locatarioInfo = `
        <p style="line-height: 1.5;">
            <strong>LOCATÁRIO:</strong> <strong>${dados.cliente.nome}</strong>, inscrito(a) no ${docCpf}, ${docIdentidade}, ${docCnh}, ${dataNasc}, residente e domiciliado(a) em ${dados.cliente.endereco}. ${contatoTexto}.
        </p>
    `;

    let conteudo = '';
    if (tipo === 'termo') {
        const locadorInfoTermo = `
        <p><strong>LOCADOR:</strong> JODAMA LOCADORA DE VEÍCULOS LTDA, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº 39.807.718/0001-20, com sede na Av. Visconde do Rio Branco, 4121, São João do Tauape, Fortaleza-CE.</p>
    `;
        const locatarioInfoTermo = `
        <p style="line-height: 1.5;">
            <strong>LOCATÁRIO:</strong> <strong>${dados.cliente.nome}</strong>, inscrito(a) no ${docCpf}, ${docIdentidade}, ${docCnh}, ${dataNasc}, residente e domiciliado(a) em ${dados.cliente.endereco}. ${contatoTexto}.
        </p>
    `;
        conteudo = gerarConteudoTermo(dados, locadorInfoTermo, locatarioInfoTermo, formato, dataDocumento);
    } else if (tipo === 'confissao') {
        const credorInfo = `
        <p><strong>CREDOR:</strong> JODAMA LOCADORA DE VEÍCULOS LTDA, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº 39.807.718/0001-20, com sede na Av. Visconde do Rio Branco, 4121, São João do Tauape, Fortaleza-CE.</p>
    `;
        const devedorInfo = `
        <p style="line-height: 1.5;">
            <strong>DEVEDOR:</strong> <strong>${dados.cliente.nome}</strong>, inscrito(a) no ${docCpf}, ${docIdentidade}, ${docCnh}, ${dataNasc}, residente e domiciliado(a) em ${dados.cliente.endereco}. ${contatoTexto}.
        </p>
    `;
        conteudo = gerarConteudoConfissao(dados, credorInfo, devedorInfo, formato, dataDocumento);
    } else if (tipo === 'extrato') {
        conteudo = gerarConteudoExtrato(dados, locadorInfo, locatarioInfo, formato, dataDocumento);
    }

    // Rodapé
    const rodape = ``;

    // Botão imprimir (apenas web)
    const btnPrint = formato === 'web' ? `
        <button class="btn-print" onclick="window.print()">
            🖨️ Imprimir Documento
        </button>
    ` : '';

    const wrapper = formato === 'web'
        ? `<div class="container">${headerSticky}<div class="content">${cabecalho}${conteudo}${rodape}</div></div>${btnPrint}`
        : `${cabecalho}${conteudo}${rodape}`;

    return `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Documento - ${protocolo}</title>
            ${estilo}
        </head>
        <body>
            ${wrapper}
        </body>
        </html>
    `;
}

function gerarConteudoTermo(dados, locador, locatario, formato, dataDocumento) {
    let linhasHtml = '';
    const todosLancamentos = [];
    dados.financeiro.debitos.forEach(d => todosLancamentos.push({ ...d, tipo: 'debito', dataOrd: d.data || d.data_vencimento || d.data_criacao }));
    dados.financeiro.creditos.forEach(c => todosLancamentos.push({ ...c, tipo: 'credito', dataOrd: c.data }));

    todosLancamentos.sort((a, b) => new Date(a.dataOrd) - new Date(b.dataOrd));

    todosLancamentos.forEach(item => {
        const dataOriginal = item.dataOrd;
        let data = '-';
        if (dataOriginal) {
            const partes = dataOriginal.split('-');
            if (partes.length === 3) {
                data = `${partes[2]}/${partes[1]}/${partes[0]}`;
            } else {
                data = new Date(dataOriginal).toLocaleDateString('pt-BR');
            }
        }

        const desc = item.descricao || item.tipo_debito || 'Crédito';
        const valor = parseFloat(item.valor_total || item.valor);
        const classeValor = item.tipo === 'debito' ? 'valor-negativo' : 'valor-positivo';

        linhasHtml += `
            <tr>
                <td>${data}</td>
                <td>${item.placa || (item.veiculo_placa || '-')}</td>
                <td>${item.tipo === 'debito' ? (item.tipo_debito || 'Débito') : 'Pagamento'}</td>
                <td>${desc}</td>
                <td class="text-right ${classeValor}">${formatMoeda(valor)}</td>
            </tr>
        `;
    });

    const saldo = dados.financeiro.resumo.saldo_devedor;
    const saldoTexto = saldo > 0
        ? `<span class="valor-negativo">- ${formatMoeda(saldo)}</span>`
        : `<span class="valor-positivo">+ ${formatMoeda(Math.abs(saldo))}</span>`;

    // Gerar HTML dos Veículos
    let veiculosHtml = '';
    dados.veiculos.forEach(v => {
        veiculosHtml += `
            <tr>
                <td><strong>Placa:</strong> ${v.placa || '-'}</td>
                <td><strong>Modelo:</strong> ${v.modelo || '-'}</td>
                <td><strong>Ano:</strong> ${v.ano || '-'}</td>
            </tr>
        `;
    });

    // Destaque do saldo (apenas print)
    const saldoDestaque = formato === 'print' ? `
        <div class="saldo-destaque">
            <div class="label">SALDO ${saldo > 0 ? 'DEVEDOR' : 'A FAVOR DO CLIENTE'}</div>
            <div class="valor ${saldo > 0 ? 'valor-negativo' : 'valor-positivo'}">${saldoTexto}</div>
        </div>
    ` : '';

    return `
        <div class="titulo-documento">
            TERMO DE ENCERRAMENTO<br>DE CONTRATO DE LOCAÇÃO DE VEÍCULOS
        </div>

        <div class="secao">
            <div class="secao-titulo">QUALIFICAÇÃO DAS PARTES</div>
            ${locador}
            ${locatario}
        </div>

        <div class="secao">
            <div class="secao-titulo">OBJETO DO CONTRATO</div>
            <p>As partes acima qualificadas celebraram contrato de locação de veículo(s), conforme dados abaixo:</p>
            
            <table style="margin-bottom: 10px;">
                <thead>
                    <tr>
                        <th>Placa</th>
                        <th>Modelo</th>
                        <th>Ano</th>
                    </tr>
                </thead>
                <tbody>
                    ${veiculosHtml}
                </tbody>
            </table>
            
            <table>
                <tbody>
                    <tr>
                        <td><strong>Data Início:</strong> ${dados.contrato.dataInicio}</td>
                        <td><strong>Data Final:</strong> ${dados.contrato.dataFim}</td>
                        <td><strong>Km Inicial:</strong> ${dados.contrato.kmInicio}</td>
                    </tr>
                    <tr>
                        <td><strong>Periodicidade:</strong> Semanal</td>
                        <td><strong>Valor Semanal:</strong> ${dados.contrato.valorSemanal}</td>
                        <td><strong>Km Final:</strong> ${dados.contrato.kmFim}</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="clausula">
            <div class="clausula-titulo">CLÁUSULA PRIMEIRA - DO ENCERRAMENTO</div>
            <div class="clausula-conteudo">
                As partes acordam o encerramento do contrato de locação na data de ${dataDocumento}, tendo o(s) veículo(s) sido devolvido(s) ao LOCADOR em perfeitas condições de uso, ressalvados os desgastes naturais decorrentes do uso regular.
            </div>
        </div>

        <div class="clausula">
            <div class="clausula-titulo">CLÁUSULA SEGUNDA - DA SITUAÇÃO FINANCEIRA</div>
            <div class="clausula-conteudo">
                O demonstrativo financeiro abaixo discrimina todos os débitos e créditos referentes ao período de locação:
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Data</th>
                    <th>Placa</th>
                    <th>Tipo</th>
                    <th>Descrição</th>
                    <th class="text-right">Valor</th>
                </tr>
            </thead>
            <tbody>
                ${linhasHtml}
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="4" class="text-right"><strong>SALDO FINAL:</strong></td>
                    <td class="text-right destaque-valor">${saldoTexto}</td>
                </tr>
            </tfoot>
        </table>

        ${saldoDestaque}

        <div class="clausula">
            <div class="clausula-titulo">CLÁUSULA TERCEIRA - ${saldo > 0 ? 'DO PAGAMENTO' : (Math.abs(saldo) > 0.01 ? 'DA RESTITUIÇÃO DE VALORES' : 'DA QUITAÇÃO')}</div>
            <div class="clausula-conteudo">
                ${saldo > 0
            ? `O LOCATÁRIO reconhece como líquida, certa e exigível a dívida no valor de ${formatMoeda(saldo)}, comprometendo-se a quitá-la conforme acordo estabelecido. ${dados.acordo ? '<br><br><strong>ACORDO DE PAGAMENTO:</strong><br>' + dados.acordo : ''}`
            : (Math.abs(saldo) > 0.01
                ? `${(dados.acordo && !dados.acordo.includes('O DEVEDOR')) ? dados.acordo : `O LOCADOR reconhece o crédito de ${formatMoeda(Math.abs(saldo))} em favor do LOCATÁRIO e compromete-se a realizar a devolução.`}`
                : 'As partes dão plena, geral e irrevogável quitação financeira referente às diárias, obrigações e encargos até a presente data, nada mais havendo a reclamar uma da outra a título de valores decorrentes do contrato de locação ora encerrado.')
        }
            </div>
        </div>

        <div class="clausula">
            <div class="clausula-titulo">CLÁUSULA QUARTA - DAS RESPONSABILIDADES FUTURAS</div>
            <div class="clausula-conteudo">
                O LOCATÁRIO permanece responsável por eventuais multas de trânsito, infrações, danos ocultos ou quaisquer outros débitos que venham a ser apurados posteriormente, referentes ao período em que o(s) veículo(s) esteve(estiveram) sob sua posse, comprometendo-se a quitá-los no prazo de 10 (dez) dias corridos após notificação formal.
            </div>
        </div>

        <div class="clausula">
            <div class="clausula-titulo">CLÁUSULA QUINTA - DO FORO</div>
            <div class="clausula-conteudo">
                Fica eleito o foro da Comarca de Fortaleza-CE como único competente para dirimir quaisquer questões oriundas do presente instrumento, com renúncia expressa a qualquer outro, por mais privilegiado que seja.
            </div>
        </div>

        <div class="local-data">
            Fortaleza-CE, ${dataDocumento}
        </div>

        <div class="assinatura-container">
            <div class="assinatura-bloco">
                <div class="assinatura-linha">
                    <div class="assinatura-nome">JODAMA LOCADORA DE VEÍCULOS LTDA - CNPJ: 39.807.718/0001-20</div>
                </div>
            </div>
            <div class="assinatura-bloco">
                <div class="assinatura-linha">
                    <div class="assinatura-nome">${dados.cliente.nome} - CPF: ${dados.cliente.cpf}</div>
                </div>
            </div>
        </div>
    `;
}

function gerarConteudoConfissao(dados, locador, locatario, formato, dataDocumento) {
    const saldo = formatMoeda(dados.financeiro.resumo.saldo_devedor);
    const placas = dados.veiculos.map(v => v.placa).join(', ');

    // Destaque do saldo (apenas print)
    const saldoDestaque = formato === 'print' ? `
        <div class="saldo-destaque">
            <div class="label">VALOR CONFESSADO</div>
            <div class="valor valor-negativo">${saldo}</div>
        </div>
    ` : '';

    return `
        <div class="titulo-documento">
            INSTRUMENTO PARTICULAR DE<br>CONFISSÃO DE DÍVIDA COM NOVAÇÃO
        </div>

        <div class="secao">
            <div class="secao-titulo">QUALIFICAÇÃO DAS PARTES</div>
            ${locador}
            ${locatario}
        </div>

        ${saldoDestaque}

        <div class="clausula">
            <div class="clausula-titulo">CLÁUSULA PRIMEIRA - DA ORIGEM DA DÍVIDA</div>
            <div class="clausula-conteudo">
                O CREDOR é titular de crédito no valor total de <strong>${saldo}</strong> (valor por extenso), débito oriundo de contrato de locação de veículo(s) de placa(s) <strong>${placas}</strong>, conforme demonstrativo financeiro constante do Termo de Encerramento anexo, o qual o DEVEDOR reconhece como líquido, certo e exigível.
            </div>
        </div>

        <div class="clausula">
            <div class="clausula-titulo">CLÁUSULA SEGUNDA - DO RECONHECIMENTO DA DÍVIDA</div>
            <div class="clausula-conteudo">
                O DEVEDOR, neste ato, reconhece expressamente a dívida acima descrita, declarando-se ciente de que o presente instrumento constitui título executivo extrajudicial, nos termos do art. 784, inciso III, do Código de Processo Civil, renunciando a qualquer questionamento quanto à origem, valor ou exigibilidade do débito.
            </div>
        </div>

        <div class="clausula">
            <div class="clausula-titulo">CLÁUSULA TERCEIRA - DA FORMA DE PAGAMENTO (NOVAÇÃO)</div>
            <div class="clausula-conteudo">
                ${dados.acordo || 'As partes acordarão a forma de pagamento em instrumento apartado, mantendo-se a exigibilidade imediata do débito até a formalização do acordo.'}
            </div>
        </div>

        <div class="clausula">
            <div class="clausula-titulo">CLÁUSULA QUARTA - DA MORA E ENCARGOS</div>
            <div class="clausula-conteudo">
                Em caso de atraso no pagamento de qualquer parcela prevista neste instrumento ou em acordo posterior, a parte devedora ficará sujeita ao pagamento de:
                <br><br>
                <strong>a)</strong> Multa moratória de 2% (dois por cento) sobre o valor em atraso;<br>
                <strong>b)</strong> Juros de mora de 1% (um por cento) ao mês, calculados pro rata die;<br>
                <strong>c)</strong> Correção monetária pelo IPCA (Índice de Preços ao Consumidor Amplo);<br>
                <strong>d)</strong> Honorários advocatícios de 20% (vinte por cento) sobre o valor total do débito, em caso de execução judicial.
                <br><br>
                <strong>PARÁGRAFO ÚNICO:</strong> O atraso no pagamento de qualquer parcela implicará no vencimento antecipado de todo o saldo devedor remanescente, tornando-o imediatamente exigível.
            </div>
        </div>

        <div class="clausula">
            <div class="clausula-titulo">CLÁUSULA QUINTA - DA EXECUÇÃO</div>
            <div class="clausula-conteudo">
                O DEVEDOR declara-se ciente de que o presente instrumento constitui título executivo extrajudicial, podendo o CREDOR promover a execução judicial do débito independentemente de protesto ou qualquer outra formalidade, renunciando o DEVEDOR expressamente a embargos protelatórios.
            </div>
        </div>

        <div class="clausula">
            <div class="clausula-titulo">CLÁUSULA SEXTA - DO FORO</div>
            <div class="clausula-conteudo">
                Fica eleito o foro da Comarca de Fortaleza-CE como único competente para dirimir quaisquer questões oriundas do presente instrumento, com renúncia expressa a qualquer outro, por mais privilegiado que seja.
            </div>
        </div>

        <div class="local-data">
            Fortaleza-CE, ${dataDocumento}
        </div>

        <div class="assinatura-container">
            <div class="assinatura-bloco">
                <div class="assinatura-linha">
                    <div class="assinatura-nome">JODAMA LOCADORA DE VEÍCULOS LTDA - CNPJ: 39.807.718/0001-20</div>
                </div>
            </div>
            <div class="assinatura-bloco">
                <div class="assinatura-linha">
                    <div class="assinatura-nome">${dados.cliente.nome} - CPF: ${dados.cliente.cpf}</div>
                </div>
            </div>
        </div>

        <div class="testemunhas-container">
            <div class="testemunha-bloco">
                <div class="testemunha-linha">
                    <div class="testemunha-titulo">TESTEMUNHA 1</div>
                    <div class="testemunha-dados">
                        Nome: _________________________________<br>
                        CPF: __________________________________<br>
                        RG: ___________________________________
                    </div>
                </div>
            </div>
            <div class="testemunha-bloco">
                <div class="testemunha-linha">
                    <div class="testemunha-titulo">TESTEMUNHA 2</div>
                    <div class="testemunha-dados">
                        Nome: _________________________________<br>
                        CPF: __________________________________<br>
                        RG: ___________________________________
                    </div>
                </div>
            </div>
        </div>
    `;
}

function gerarConteudoExtrato(dados, locador, locatario, formato, dataDocumento) {
    let linhasHtml = '';
    const todosLancamentos = [];
    dados.financeiro.debitos.forEach(d => todosLancamentos.push({ ...d, tipo: 'debito', dataOrd: d.data || d.data_vencimento || d.data_criacao }));
    dados.financeiro.creditos.forEach(c => todosLancamentos.push({ ...c, tipo: 'credito', dataOrd: c.data }));

    todosLancamentos.sort((a, b) => new Date(a.dataOrd) - new Date(b.dataOrd));

    todosLancamentos.forEach(item => {
        const dataOriginal = item.dataOrd;
        let data = '-';
        if (dataOriginal) {
            const partes = dataOriginal.split('-');
            if (partes.length === 3) {
                data = `${partes[2]}/${partes[1]}/${partes[0]}`;
            } else {
                data = new Date(dataOriginal).toLocaleDateString('pt-BR');
            }
        }

        const desc = item.descricao || item.tipo_debito || 'Crédito';
        const valor = parseFloat(item.valor_total || item.valor);
        const classeValor = item.tipo === 'debito' ? 'valor-negativo' : 'valor-positivo';

        linhasHtml += `
            <tr>
                <td>${data}</td>
                <td>${item.placa || (item.veiculo_placa || '-')}</td>
                <td>${item.tipo === 'debito' ? (item.tipo_debito || 'Débito') : 'Pagamento'}</td>
                <td>${desc}</td>
                <td class="text-right ${classeValor}">${formatMoeda(valor)}</td>
            </tr>
        `;
    });

    const saldo = dados.financeiro.resumo.saldo_devedor;
    const saldoTexto = saldo > 0
        ? `<span class="valor-negativo">- ${formatMoeda(saldo)}</span>`
        : `<span class="valor-positivo">+ ${formatMoeda(Math.abs(saldo))}</span>`;

    let veiculosHtml = '';
    dados.veiculos.forEach(v => {
        veiculosHtml += `
            <tr>
                <td><strong>Placa:</strong> ${v.placa || '-'}</td>
                <td><strong>Modelo:</strong> ${v.modelo || '-'}</td>
                <td><strong>Ano:</strong> ${v.ano || '-'}</td>
            </tr>
        `;
    });

    const saldoDestaque = formato === 'print' ? `
        <div class="saldo-destaque">
            <div class="label">SALDO ${saldo > 0 ? 'DEVEDOR' : 'A FAVOR DO CLIENTE'}</div>
            <div class="valor ${saldo > 0 ? 'valor-negativo' : 'valor-positivo'}">${saldoTexto}</div>
        </div>
    ` : '';

    return `
        <div class="titulo-documento">
            EXTRATO FINANCEIRO DE CONTRATO
        </div>

        <div class="secao">
            <div class="secao-titulo">QUALIFICAÇÃO DAS PARTES</div>
            ${locador}
            ${locatario}
        </div>

        <div class="secao">
            <div class="secao-titulo">DADOS DO CONTRATO</div>
            
            <table style="margin-bottom: 10px;">
                <thead>
                    <tr>
                        <th>Placa</th>
                        <th>Modelo</th>
                        <th>Ano</th>
                    </tr>
                </thead>
                <tbody>
                    ${veiculosHtml}
                </tbody>
            </table>
            
            <table>
                <tbody>
                    <tr>
                        <td><strong>Data Início:</strong> ${dados.contrato.dataInicio}</td>
                        <td><strong>Data Final:</strong> ${dados.contrato.dataFim}</td>
                        <td><strong>Km Inicial:</strong> ${dados.contrato.kmInicio}</td>
                    </tr>
                    <tr>
                        <td><strong>Periodicidade:</strong> Semanal</td>
                        <td><strong>Valor Semanal:</strong> ${dados.contrato.valorSemanal}</td>
                        <td><strong>Km Final:</strong> ${dados.contrato.kmFim}</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="secao">
            <div class="secao-titulo">DEMONSTRATIVO FINANCEIRO</div>
            <p>Relação de débitos e créditos referentes ao período de locação:</p>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Data</th>
                    <th>Placa</th>
                    <th>Tipo</th>
                    <th>Descrição</th>
                    <th class="text-right">Valor</th>
                </tr>
            </thead>
            <tbody>
                ${linhasHtml}
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="4" class="text-right"><strong>SALDO FINAL:</strong></td>
                    <td class="text-right destaque-valor">${saldoTexto}</td>
                </tr>
            </tfoot>
        </table>

        ${saldoDestaque}

        <div class="local-data">
            Fortaleza-CE, ${dataDocumento}
        </div>
    `;
}

// Função auxiliar para formatação de moeda
function formatMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(valor);
}