import CarteiraService from '../services/CarteiraService.js';

import MinutaService from '../services/MinutaService.js';

export const simularMinuta = async (req, res) => {
    try {
        const { saldo, futuros_creditos, futuros_debitos } = req.body;

        let texto = '';
        const saldoValor = parseFloat(saldo);

        if (Math.abs(saldoValor) <= 0.01) {
            // Zero
            texto = 'As partes dão plena, geral e irrevogável quitação financeira...';
        } else if (saldoValor > 0) {
            // Dívida
            if (futuros_creditos && futuros_creditos.length > 0) {
                texto = MinutaService.gerarTextoConfissao(futuros_creditos);
            } else {
                texto = MinutaService.gerarTextoDividaSimples(saldoValor);
            }
        } else {
            // Crédito (Haver)
            texto = MinutaService.gerarTextoRestituicao(saldoValor, futuros_debitos || []);
        }

        res.json({ texto });

    } catch (error) {
        console.error('Erro ao simular minuta:', error);
        res.status(500).json({ error: 'Erro ao gerar texto jurídico' });
    }
};

export const processarNegociacao = async (req, res) => {
    try {
        const { cliente_id, cliente_nome, tipo, valor_total, detalhes } = req.body;
        console.log('Processando Negociação:', { cliente_nome, tipo });

        if (!cliente_id && !cliente_nome) throw new Error('Cliente não informado');

        const resultados = [];

        if (tipo === 'divida') {
            // CRIAR PARCELAS DE RECEBIMENTO (CRÉDITO)
            const { qtd_parcelas, forma_pagamento, data_inicio, periodicidade } = detalhes;
            const valorParcela = parseFloat(valor_total) / parseInt(qtd_parcelas);

            // Definição de Data base
            let dataVencimento = new Date(data_inicio);
            // Ajustar fuso horário (simples) para garantir dia correto strings YYYY-MM-DD
            if (data_inicio.includes('T')) dataVencimento = new Date(data_inicio.split('T')[0] + 'T12:00:00');
            else dataVencimento = new Date(data_inicio + 'T12:00:00');

            for (let i = 1; i <= qtd_parcelas; i++) {
                const dataIso = dataVencimento.toISOString().split('T')[0];

                const payload = {
                    cliente_id: cliente_id,
                    cliente_nome: cliente_nome,
                    data: dataIso,
                    descricao: `Acordo Parc. ${i}/${qtd_parcelas} (${forma_pagamento})`,
                    valor: valorParcela.toFixed(2),
                    tipo: 'Acordo', // FIX: Model expects 'tipo', not 'tipo_credito'. Using 'Acordo' to identify source.
                    veiculo_placa: null,
                    observacao: 'Gerado via Assistente de Negociação'
                };

                const credito = await CarteiraService.createCredito(payload);
                resultados.push(credito);

                // Incrementar Data
                if (periodicidade === 'semanal') {
                    dataVencimento.setDate(dataVencimento.getDate() + 7);
                } else if (periodicidade === 'mensal') {
                    dataVencimento.setMonth(dataVencimento.getMonth() + 1);
                }
            }

        } else if (tipo === 'credito') {
            // CRIAR AGENDAMENTO DE DEVOLUÇÃO (DÉBITO)
            const { data_devolucao, dados_bancarios } = detalhes;

            const payload = {
                cliente_id: cliente_id,
                cliente_nome: cliente_nome,
                data: null, // Débito usa data_vencimento
                data_vencimento: data_devolucao,
                descricao: `Devolução Caução (${dados_bancarios})`,
                valor_total: parseFloat(valor_total).toFixed(2),
                tipo: 'Devolução', // FIX: Model expects 'tipo'
                veiculo_placa: null,
                observacao: 'Agendado via Assistente de Encerrramento'
            };

            const debito = await CarteiraService.createDebito(payload);
            resultados.push(debito);
        }

        res.status(201).json({
            success: true,
            message: 'Negociação processada com sucesso',
            lancamentos: resultados.length
        });

    } catch (error) {
        console.error('Erro ao processar negociação:', error);
        res.status(500).json({ error: 'Erro ao processar negociação: ' + error.message });
    }
};
