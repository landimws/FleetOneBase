/* =========================================================================
   MÓDULO ENCERRAMENTO DE CONTRATO
   ========================================================================= */

window.abrirModalEncerramento = function () {
    console.log('--- abrirModalEncerramento chamado ---');
    // Limpar cache de dados do cliente ao abrir
    window.clienteDadosCompletos = {};

    const clienteSelecionado = CarteiraStore.state.clienteSelecionado;
    if (!clienteSelecionado || !window.ultimoDadosCache) {
        console.warn('Cliente não selecionado ou cache vazio');
        Swal.fire('Erro', 'Selecione um cliente e aguarde o carregamento.', 'error');
        return;
    }

    // Debug: Verificar estado do cache
    console.log('Cache OK:', window.ultimoDadosCache);

    // --- VALIDAÇÃO & WIZARD ---
    const resumo = window.ultimoDadosCache.resumo;
    const saldoAtual = parseFloat(resumo.saldo_devedor || 0);

    // Calcular soma futura usando dados do cache (poderia ir para um Service de Calculo também)
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const parse = (d) => d ? new Date(d.split('-')[0], d.split('-')[1] - 1, d.split('-')[2]) : null;

    let somaFutura = 0;
    let tipoPendencia = saldoAtual > 0 ? 'Dívida' : 'Saldo Credor';

    if (Math.abs(saldoAtual) > 0.01) {
        if (saldoAtual > 0) {
            // Se Saldo > 0 (Dívida), buscamos CRÉDITOS futuros (Acordos) que ABATEM a dívida
            // IMPORTANTE: Apenas os NÃO CONFIRMADOS, pois os confirmados já foram abatidos no saldoAtual pelo backend
            const creditos = window.ultimoDadosCache.creditos.filter(c => {
                const isFuturo = parse(c.data) >= hoje;
                return isFuturo && !c.banco_confirmado;
            });
            somaFutura = creditos.reduce((acc, c) => acc + parseFloat(c.valor_original || c.valor), 0);
        } else {
            // Se Saldo < 0 (Crédito), buscamos DÉBITOS futuros (Devoluções/Despesas) que consomem esse crédito
            const debitos = window.ultimoDadosCache.debitos.filter(d => {
                const dt = parse(d.data_vencimento || d.data_criacao?.split('T')[0]);
                return dt >= hoje;
            });
            somaFutura = debitos.reduce((acc, d) => acc + parseFloat(d.valor_total || d.valor || 0), 0);
        }

        const diferenca = Math.abs(saldoAtual) - somaFutura;

        if (diferenca > 1.00) {
            Swal.fire({
                title: 'Pendência Financeira Identificada',
                html: `
                    <div style="text-align:left; font-size:14px; line-height:1.5;">
                        O saldo do cliente é: <strong>${formatMoeda(saldoAtual)}</strong> (${tipoPendencia})<br>
                        Lançamentos futuros encontrados: <strong>${formatMoeda(somaFutura)}</strong><br>
                        <hr style="margin:10px 0;">
                        <span style="color:#c0392b; font-weight:bold;">Diferença: ${formatMoeda(diferenca)}</span>
                    </div>
                `,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: '🤝 Resolver (Assistente)',
                cancelButtonText: 'Voltar',
                confirmButtonColor: '#27ae60'
            }).then((result) => {
                if (result.isConfirmed) {
                    // Usar o novo Módulo Wizard
                    NegociacaoWizard.abrir(saldoAtual, somaFutura, async () => {
                        // Callback de sucesso: Recarregar dados e reabrir
                        console.log('Negociação concluída. Recarregando dados...');
                        if (typeof atualizarDadosCarteira === 'function') {
                            await atualizarDadosCarteira();
                            // Reabrir o modal de encerramento para verificar novamente
                            // Pequeno delay para garantir que a UI atualizou
                            setTimeout(() => {
                                abrirModalEncerramento();
                            }, 500);
                        }
                    });
                }
            });
            return; // Bloqueia
        }
    }

    // --- UI SETUP ---
    const modal = document.getElementById('modalEncerramento');
    if (modal) modal.style.display = 'flex';

    // Buscar dados Cliente (via Service)
    EncerramentoAPI.getDadosCliente(clienteSelecionado).then(cliente => {
        if (cliente) {
            document.getElementById('encCpf').value = cliente.cpf || '';
            document.getElementById('encRg').value = cliente.rg || '';

            const enderecoParts = [cliente.logradouro, cliente.numero ? `nº ${cliente.numero}` : '', cliente.complemento, cliente.bairro, cliente.cidade, cliente.estado, cliente.cep ? `CEP: ${cliente.cep}` : ''].filter(Boolean);
            document.getElementById('encEndereco').value = enderecoParts.join(', ');

            window.clienteDadosCompletos = cliente; // Cache global ainda usado no snapshot
        }
    });

    // Preencher Financeiro
    document.getElementById('encTotalDebitos').innerText = formatMoeda(resumo.total_debitos);
    document.getElementById('encTotalPagos').innerText = formatMoeda(resumo.total_creditos);
    document.getElementById('encSaldoFinal').innerText = formatMoeda(resumo.saldo_devedor);

    // Cores e Texto Automático (via Service)
    const elSaldo = document.getElementById('encSaldoFinal');
    elSaldo.style.color = resumo.saldo_devedor > 0 ? '#c0392b' : '#27ae60';

    // IMPORTANTE: Aqui chamamos a geração de texto via API
    if (Math.abs(resumo.saldo_devedor) > 0.01 || resumo.saldo_devedor === 0) {
        preencherSugestaoAcordo(); // Essa função agora usa EncerramentoAPI internamente (já refatoramos no passo anterior, mas vamos garantir que ela use o service novo também)
    } else {
        document.getElementById('boxAcordoDivida').style.display = 'none';
    }



    // 2. Detectar Veículos Únicos nos Débitos/Créditos
    const placas = new Set();
    window.ultimoDadosCache.debitos.forEach(d => { if (d.veiculo_placa) placas.add(d.veiculo_placa); });
    window.ultimoDadosCache.creditos.forEach(c => { if (c.veiculo_placa) placas.add(c.veiculo_placa); });

    const listaPlacas = Array.from(placas).sort();
    window.veiculosEncerramento = [];

    const selectPlaca = document.getElementById('encPlaca');
    selectPlaca.innerHTML = '';

    if (listaPlacas.length > 0) {
        // 1. Inicializar Cache IMEDIATAMENTE com dados básicos (fallback)
        window.veiculosEncerramento = listaPlacas.map(p => ({ placa: p, modelo: '...', ano: '' }));

        // 2. Popular Select
        listaPlacas.forEach(placa => {
            const opt = document.createElement('option');
            opt.value = placa;
            opt.text = placa;
            selectPlaca.appendChild(opt);
        });

        // 3. Buscar Detalhes em Background (Progressivo) usando API Service se quiser,
        // mas aqui já estava usando fetch hardcoded. Como é lista, podemos deixar o fetch
        // ou criar um método de lote no Service. Vamos manter fetch simples por enquanto para não complicar demais,
        // ou usar EncerramentoAPI.getDadosVeiculo em loop.
        Promise.all(listaPlacas.map(placa => EncerramentoAPI.getDadosVeiculo(placa)))
            .then(resultados => {
                resultados.forEach((v, index) => {
                    if (v) {
                        window.veiculosEncerramento[index] = {
                            placa: v.placa,
                            modelo: v.modelo || 'Não identificado',
                            ano: (v.ano !== null && v.ano !== undefined) ? v.ano : ''
                        };
                    }
                });
                // Atualizar UI com dados ricos
                if (listaPlacas.length === 1) {
                    selectPlaca.value = listaPlacas[0];
                }
                atualizarDadosVeiculoSelecionado();
            });

        // Se houver apenas 1 veículo (Seleção Imediata síncrona enquanto carrega detalhes)
        if (listaPlacas.length === 1) {
            selectPlaca.value = listaPlacas[0];
            atualizarDadosVeiculoSelecionado();
        }

        // Tentar pegar valor semanal do último débito lançado como referência
        const ultimoLanc = window.ultimoDadosCache.debitos.filter(d => d.valor_total).pop();
        if (ultimoLanc) document.getElementById('encValorSemanal').value = ultimoLanc.valor_total;
    } else {
        // Se nÃ£o achar veÃ­culos no histÃ³rico, talvez limpar ou avisar?
        // Por hora, apenas deixa vazio.
    }
}

window.atualizarDadosVeiculoSelecionado = function () {
    const placaSelecionada = document.getElementById('encPlaca').value;
    if (!placaSelecionada || !window.veiculosEncerramento) return;

    const veiculo = window.veiculosEncerramento.find(v => v.placa === placaSelecionada);

    if (veiculo) {
        document.getElementById('encModelo').value = veiculo.modelo || '...';
        document.getElementById('encAno').value = (veiculo.ano !== null && veiculo.ano !== undefined) ? veiculo.ano : '';
    }
}

// --- REFATORADO: Lógica movida para Backend (Encerramento/NegociacaoController) ---
async function preencherSugestaoAcordo() {
    const inputTexto = document.getElementById('encTextoAcordo');
    inputTexto.value = 'Gerando minuta jurídica... aguarde...';
    inputTexto.disabled = true;

    try {
        const resumo = window.ultimoDadosCache.resumo;

        // Filtrar lançamentos futuros para enviar ao backend
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        const parseData = (str) => {
            const p = str.split('-');
            return new Date(p[0], p[1] - 1, p[2]);
        }

        const creditosFuturos = window.ultimoDadosCache.creditos.filter(c => {
            return c.data && parseData(c.data) >= hoje && !c.banco_confirmado;
        });

        const debitosFuturos = window.ultimoDadosCache.debitos.filter(d => {
            const dt = d.data_vencimento || d.data_criacao?.split('T')[0];
            return dt && parseData(dt) >= hoje;
        });

        const payload = {
            saldo: resumo.saldo_devedor,
            futuros_creditos: creditosFuturos,
            futuros_debitos: debitosFuturos
        };

        // Usa EncerramentoAPI
        const json = await EncerramentoAPI.simularMinuta(payload);

        if (json.texto) {
            inputTexto.value = json.texto;
            if (Math.abs(resumo.saldo_devedor) > 0.01) {
                document.getElementById('boxAcordoDivida').style.display = 'block';
            }
        } else {
            inputTexto.value = '';
        }

    } catch (e) {
        console.error('Erro ao gerar minuta:', e);
        inputTexto.value = 'Erro ao gerar texto automático.';
    } finally {
        inputTexto.disabled = false;
    }
}

window.confirmarEncerramento = async function () {
    console.log('--- confirmarEncerramento chamado ---');
    const clienteSelecionado = CarteiraStore.state.clienteSelecionado;
    const dadosForm = {
        cliente_nome: clienteSelecionado,
        placa: document.getElementById('encPlaca').value,
        modelo: document.getElementById('encModelo').value, // Não salvo no banco, mas usado em validação
        km_final: document.getElementById('encKmFim').value,
        data_encerramento: new Date().toISOString().split('T')[0],
        acordo_texto: document.getElementById('encTextoAcordo').value,

        // Snapshot para reconstruir termo
        snapshot_financeiro: {
            financeiro: window.ultimoDadosCache,
            veiculos: window.veiculosEncerramento,
            form: {
                cpf: document.getElementById('encCpf').value,
                rg: document.getElementById('encRg').value,
                endereco: document.getElementById('encEndereco').value,
                ano: document.getElementById('encAno').value,
                modelo: document.getElementById('encModelo').value,
                kmInicio: document.getElementById('encKmInicio').value,
                valorSemanal: document.getElementById('encValorSemanal').value,
                dataInicio: document.getElementById('encDataInicio').value,
                dataFim: document.getElementById('encDataFim').value
            },
            // Dados enriquecidos que não estão no form visível
            cliente_extra: window.clienteDadosCompletos || {}
        }
    };

    if (!document.getElementById('encCpf').value) {
        Swal.fire('Atenção', 'Informe o CPF do cliente para prosseguir.', 'warning');
        return;
    }

    if (!dadosForm.placa) {
        Swal.fire('Atenção', 'Selecione um veículo para o encerramento.', 'warning');
        return;
    }

    if (!dadosForm.placa) {
        Swal.fire('Atenção', 'Selecione um veículo para o encerramento.', 'warning');
        return;
    }

    try {
        // EncerramentoAPI
        await EncerramentoAPI.salvarEncerramento(dadosForm);

        if (window.fecharModalEncerramento) {
            window.fecharModalEncerramento();
        }

        localStorage.removeItem('status_encerramento_' + clienteSelecionado);

        Swal.fire({
            title: 'Encerramento Registrado',
            text: 'Dados salvos com sucesso.',
            icon: 'success',
            confirmButtonColor: '#27ae60'
        }).then(async () => {
            if (typeof atualizarDadosCarteira === 'function') {
                await atualizarDadosCarteira();
            }
        });

    } catch (error) {
        console.error(error);
        Swal.fire('Erro', error.message, 'error');
    }
}

window.gerarDocumentoEncerramento = async function (tipo) {
    try {
        const clienteSelecionado = CarteiraStore.state.clienteSelecionado;
        // API Call
        const encerramento = await EncerramentoAPI.getEncerramento(clienteSelecionado);

        if (!encerramento) {
            Swal.fire('Erro', 'Não há dados de encerramento.', 'error');
            return;
        }

        const snapshot = encerramento.snapshot_financeiro;
        if (!snapshot) return;

        let clienteExtra = snapshot.cliente_extra || {};

        if (!clienteExtra.cnh && !clienteExtra.telefone) {
            // Tentar enriquecer
            const dadosAtuais = await EncerramentoAPI.getDadosCliente(clienteSelecionado);
            if (dadosAtuais) {
                clienteExtra = dadosAtuais;
            }
        }

        const dadosForm = snapshot.form;
        const cacheVeiculos = snapshot.veiculos || [];
        const cacheFinanceiro = snapshot.financeiro;

        // Reconstrução de Objetos...
        let veiculoPrincipal = {
            placa: encerramento.placa,
            modelo: dadosForm.modelo,
            ano: dadosForm.ano
        };

        const veiculosLista = cacheVeiculos.length > 0 ? cacheVeiculos : [veiculoPrincipal];

        const dadosImpressao = {
            cliente: {
                nome: clienteSelecionado,
                cpf: dadosForm.cpf,
                rg: dadosForm.rg,
                endereco: dadosForm.endereco
            },
            veiculo: veiculoPrincipal,
            veiculos: veiculosLista,
            contrato: {
                dataInicio: dadosForm.dataInicio ? new Date(dadosForm.dataInicio).toLocaleDateString('pt-BR') : '-',
                dataFim: dadosForm.dataFim ? new Date(dadosForm.dataFim).toLocaleDateString('pt-BR') : '-',
                valorSemanal: formatMoeda(parseFloat(dadosForm.valorSemanal || 0)),
                kmInicio: dadosForm.kmInicio || '-',
                kmFim: encerramento.km_final || '-'
            },
            financeiro: cacheFinanceiro,
            acordo: encerramento.acordo_texto,
            hoje: new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }),
            cliente_extra: clienteExtra
        };

        const html = gerarHtmlImpressaoEncerramento(tipo, dadosImpressao, 'web');

        const janela = window.open('', 'Print', 'height=800,width=1000');
        if (janela) {
            janela.document.write(html);
            janela.document.close();
        }

    } catch (error) {
        console.error(error);
        Swal.fire('Erro', 'Erro ao gerar documento.', 'error');
    }
}






// Removida: WIZARD DE NEGOCIAÇÃO (Agora está em modules/NegociacaoWizard.js)

window.fecharModalEncerramento = function () {
    const modal = document.getElementById('modalEncerramento');
    if (modal) modal.style.display = 'none';
}
