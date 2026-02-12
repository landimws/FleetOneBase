/**
 * NegociacaoWizard.js
 * Gerencia a interface do Assistente de Negociação (Modal)
 * HTML definido em: views/partials/modals/negociacao.ejs
 */
const NegociacaoWizard = {
    state: {
        saldo: 0,
        pendencia: 0,
        callbackSucesso: null
    },

    abrir(saldoAtual, somaFutura, onSucesso) {
        const diferenca = Math.abs(saldoAtual) - somaFutura;
        this.state.saldo = saldoAtual;
        this.state.pendencia = diferenca;
        this.state.callbackSucesso = onSucesso;

        const modal = document.getElementById('modalNegociacao');
        const modalContent = document.getElementById('modalNegociacaoContent');
        const hoje = new Date().toISOString().split('T')[0];

        if (!modal) {
            console.error('Modal de Negociação não encontrado no DOM. Verifique o include do EJS.');
            return;
        }

        modal.style.display = 'flex';
        setTimeout(() => {
            modal.style.opacity = '1';
            modalContent.style.transform = 'scale(1)';
        }, 10);

        // Reset inputs
        const elDataInicio = document.getElementById('negDataInicio');
        if (elDataInicio) elDataInicio.value = hoje;

        const elDataDev = document.getElementById('negDataDevolucao');
        if (elDataDev) elDataDev.value = hoje;

        const elQtd = document.getElementById('negQtdParcelas');
        if (elQtd) {
            elQtd.value = 1;
            elQtd.disabled = false;
        }

        if (saldoAtual > 0) {
            this._configurarModoDivida();
        } else {
            this._configurarModoCredito();
        }
    },

    fechar() {
        const modal = document.getElementById('modalNegociacao');
        const modalContent = document.getElementById('modalNegociacaoContent');

        if (!modal) return;

        modal.style.opacity = '0';
        modalContent.style.transform = 'scale(0.9)';

        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    },

    simular() {
        const valorTotal = this.state.pendencia;
        const periodicidade = document.getElementById('negPeriodicidade').value;
        const elQtd = document.getElementById('negQtdParcelas');

        // Lógica de Pagamento Único
        if (periodicidade === 'unico') {
            elQtd.value = 1;
            elQtd.disabled = true;
        } else {
            elQtd.disabled = false;
        }

        const qtd = parseInt(elQtd.value) || 1;
        const valorParcela = valorTotal / qtd;

        // Formatação usando Intl
        const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

        document.getElementById('negValorTotal').innerText = fmt(valorTotal);

        if (periodicidade === 'unico') {
            document.getElementById('negResumoParcelas').innerText = `Pagamento Único de ${fmt(valorParcela)}`;
        } else {
            document.getElementById('negResumoParcelas').innerText = `${qtd}x de ${fmt(valorParcela)} (${periodicidade})`;
        }
    },

    async salvar() {
        const btn = document.getElementById('btnConfirmarNegociacao');
        const originalText = btn.innerText;
        btn.innerText = 'Processando...';
        btn.disabled = true;

        try {
            const payload = {
                cliente_nome: CarteiraStore.state.clienteSelecionado,
                tipo: document.getElementById('negTipo').value,
                valor_total: this.state.pendencia,
                detalhes: {}
            };

            if (payload.tipo === 'divida') {
                payload.detalhes = {
                    forma_pagamento: document.getElementById('negFormaPagamento').value,
                    qtd_parcelas: parseInt(document.getElementById('negQtdParcelas').value),
                    data_inicio: document.getElementById('negDataInicio').value,
                    periodicidade: document.getElementById('negPeriodicidade').value
                };
            } else {
                payload.detalhes = {
                    data_devolucao: document.getElementById('negDataDevolucao').value,
                    dados_bancarios: document.getElementById('negDadosBancarios').value
                };
            }

            // Usar o Service API
            const json = await EncerramentoAPI.salvarNegociacao(payload);

            Swal.fire({
                icon: 'success',
                title: 'Negociação Registrada',
                text: `Sucesso! ${json.lancamentos} lançamentos gerados.`,
                timer: 2000,
                showConfirmButton: false
            });

            this.fechar();

            if (this.state.callbackSucesso) {
                await this.state.callbackSucesso();
            }

        } catch (e) {
            console.error(e);
            Swal.fire('Erro', 'Falha ao registrar negociação: ' + e.message, 'error');
        } finally {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    },

    _configurarModoDivida() {
        const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

        document.getElementById('tituloNegociacao').innerText = 'Negociar Dívida (Recebimento)';
        document.getElementById('camposDivida').style.display = 'block';
        document.getElementById('camposCredito').style.display = 'none';
        document.getElementById('negTipo').value = 'divida';

        document.getElementById('resumoNegociacao').innerHTML = `
            O cliente deve <strong>${fmt(this.state.pendencia)}</strong>.
            Defina como esse valor será pago para gerar a Confissão de Dívida.
        `;
        this.simular();
    },

    _configurarModoCredito() {
        const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

        document.getElementById('tituloNegociacao').innerText = 'Agendar Devolução (Pagamento)';
        document.getElementById('camposDivida').style.display = 'none';
        document.getElementById('camposCredito').style.display = 'block';
        document.getElementById('negTipo').value = 'credito';

        document.getElementById('resumoNegociacao').innerHTML = `
            A empresa deve devolver <strong>${fmt(this.state.pendencia)}</strong> ao cliente.
            Agende a data e informe os dados para o Termo de Encerramento.
        `;
        document.getElementById('negValorTotal').innerText = fmt(this.state.pendencia);
        document.getElementById('negResumoParcelas').innerText = `Devolução Única`;
    }
};

window.NegociacaoWizard = NegociacaoWizard;

// Bind functions to window to work with inline HTML onclicks
// (Legacy pattern pending full migration to addEventListener)
window.fecharModalNegociacao = NegociacaoWizard.fechar.bind(NegociacaoWizard);
window.salvarNegociacao = NegociacaoWizard.salvar.bind(NegociacaoWizard);
window.simularNegociacao = NegociacaoWizard.simular.bind(NegociacaoWizard);
