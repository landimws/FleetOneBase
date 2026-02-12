import { formatMoeda } from '../utils/Formatters.js';

class MinutaService {

    /**
     * Gera o texto jurídico da confissão de dívida baseado nos lançamentos futuros
     * @param {Array} lancamentosFuturos - Lista de créditos futuros (parcelas)
     * @returns {string} Texto jurídico formatado
     */
    gerarTextoConfissao(lancamentosFuturos) {
        if (!lancamentosFuturos || lancamentosFuturos.length === 0) return '';

        // Ordenar por data
        const futuros = [...lancamentosFuturos].sort((a, b) => new Date(a.data) - new Date(b.data));

        const qtd = futuros.length;
        const valorParcela = parseFloat(futuros[0].valor);
        const valorOriginal = parseFloat(futuros[0].valor_original || futuros[0].valor);

        // Data formatada (DD/MM/YYYY)
        const [ano, mes, dia] = futuros[0].data.split('-');
        const inicio = `${dia}/${mes}/${ano}`;

        const valorDesconto = valorOriginal - valorParcela;
        let texto = '';

        // -- COM DESCONTO (PONTUALIDADE) --
        if (valorDesconto > 0.01) {
            const percentual = Math.round((valorDesconto / valorOriginal) * 100);

            // Detecção de Periodicidade
            let periodicidade = 'semanais';

            if (qtd > 1 && futuros.length >= 2) {
                const d1 = new Date(futuros[0].data);
                const d2 = new Date(futuros[1].data);
                const diffTime = Math.abs(d2 - d1);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays >= 28) {
                    periodicidade = 'mensais';
                }
            }

            texto = `O DEVEDOR confessa a dívida e compromete-se a quitá-la mediante o pagamento de ${qtd} parcelas ${periodicidade} e sucessivas, no valor nominal de ${formatMoeda(valorOriginal)} cada. `;
            texto += `Por mera liberalidade do CREDOR, será concedido desconto de pontualidade de ${percentual}% para pagamentos realizados estritamente até a data de vencimento, `;
            texto += `resultando no valor líquido a pagar de ${formatMoeda(valorParcela)} por parcela. `;
            texto += `O vencimento da primeira parcela dar-se-á em ${inicio}, e as demais seguirão a periodicidade ${periodicidade.slice(0, -1)} ajustada.\n\n`;
            texto += `PARÁGRAFO ÚNICO: O ATRASO ou NÃO PAGAMENTO de qualquer parcela na data aprazada importará na PERDA IMEDIATA DO DESCONTO de pontualidade ora concedido, retornando a parcela ao seu valor nominal, bem como o vencimento antecipado do saldo devedor remanescente.`;

        } else {
            // -- SEM DESCONTO --
            if (qtd === 1) {
                // Boleto Único
                texto = `O DEVEDOR confessa a dívida e compromete-se a quitá-la em uma única parcela no valor de ${formatMoeda(valorParcela)}, `;
                texto += `com vencimento em ${inicio}, dando plena e total quitação do débito após a compensação.`;
            } else {
                // Parcelado
                let termoPeriodo = 'semanal(is)';
                let termoSequencia = 'nas semanas seguintes';

                if (futuros.length >= 2) {
                    const d1 = new Date(futuros[0].data);
                    const d2 = new Date(futuros[1].data);
                    const diffDays = Math.ceil(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24));

                    if (diffDays >= 28) {
                        termoPeriodo = 'mensal(is)';
                        termoSequencia = 'nos meses seguintes';
                    }
                }

                texto = `O DEVEDOR confessa a dívida e compromete-se a quitá-la em ${qtd} parcela(s) ${termoPeriodo} e sucessiva(s) no valor fixo de ${formatMoeda(valorParcela)}, `;
                texto += `vencendo a primeira em ${inicio} e as demais sucessivamente ${termoSequencia}, até a liquidação integral do débito.`;
            }
        }

        return texto;
    }

    /**
     * Gera o texto de restituição de caução
     * @param {number} saldo - Valor do saldo credor (negativo ou positivo)
     * @param {Array} debitosFuturos - Lista de agendamentos de devolução
     * @returns {string} Texto jurídico
     */
    gerarTextoRestituicao(saldo, debitosFuturos) {
        const valorCredito = Math.abs(parseFloat(saldo));

        // Verifica se tem agendamento de devolução
        const agendamentos = debitosFuturos.filter(d => {
            if (!d.data_vencimento && !d.data_criacao) return false;
            // Considerando data futura simples
            return true;
        });

        if (agendamentos.length > 0) {
            agendamentos.sort((a, b) => new Date(a.data_vencimento || a.data_criacao) - new Date(b.data_vencimento || b.data_criacao));
            const primeira = agendamentos[0];

            const dtStr = primeira.data_vencimento || primeira.data_criacao.split('T')[0];
            const parts = dtStr.split('-');
            const dataFmt = `${parts[2]}/${parts[1]}/${parts[0]}`;

            return `O LOCADOR reconhece o crédito em favor do LOCATÁRIO no valor de ${formatMoeda(valorCredito)}, referente à devolução de caução/saldo remanescente, e compromete-se a restituí-lo integralmente na data de ${dataFmt}, mediante transferência bancária ou PIX.`;
        }

        // Padrão genérico
        return `O LOCADOR reconhece o crédito em favor do LOCATÁRIO no valor de ${formatMoeda(valorCredito)}, comprometendo-se a restituí-lo em até 5 dias úteis.`;
    }

    /**
     * Gera o texto padrão de dívida simples sem acordo
     * @param {number} saldo 
     */
    gerarTextoDividaSimples(saldo) {
        return `O DEVEDOR reconhece o saldo devedor líquido e certo de ${formatMoeda(saldo)}, comprometendo-se a quitá-lo conforme as condições estabelecidas em anexo ou termo aditivo.`;
    }
}

export default new MinutaService();
