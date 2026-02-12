
// Estado Global gerenciado por CarteiraStore.js

document.addEventListener('DOMContentLoaded', () => {
    carregarClientes();
    carregarVeiculos();

    // [DataRefreshBus] Subscribe para atualizações
    if (window.DataRefreshBus) {
        DataRefreshBus.subscribe((dataType) => {
            if (dataType === 'all' || dataType === 'clientes') {
                console.log(`🔄 [Carteira] Recebido evento de atualização: ${dataType}`);
                carregarClientes();
            }
            if (dataType === 'all' || dataType === 'veiculos') {
                console.log(`🔄 [Carteira] Recebido evento de atualização: ${dataType}`);
                carregarVeiculos();
            }
        });
    }

    // Filtro de clientes
    document.getElementById('buscaCliente').addEventListener('input', (e) => {
        const termo = e.target.value.toLowerCase();
        // Usa Store
        const filtrados = CarteiraStore.state.clientes.filter(c => c.nome.toLowerCase().includes(termo));
        renderizarListaClientes(filtrados);
    });
});

async function carregarClientes() {
    try {
        const lista = await CarteiraAPI.getClientes();
        CarteiraStore.setClientes(lista);
        renderizarListaClientes(lista);
    } catch (error) {
        console.error('Erro ao carregar clientes:', error);
    }
}

async function carregarVeiculos() {
    try {
        const lista = await CarteiraAPI.getVeiculos();
        CarteiraStore.setVeiculos(lista);

        const datalist = document.getElementById('dlVeiculos');
        datalist.innerHTML = '';
        lista.forEach(v => {
            const option = document.createElement('option');
            option.value = v.placa;
            option.label = `${v.modelo} - ${v.combustivel}`;
            datalist.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar veículos:', error);
    }
}

function renderizarListaClientes(lista) {
    const container = document.getElementById('listaClientes');
    container.innerHTML = '';

    lista.forEach(c => {
        const div = document.createElement('div');
        div.className = 'cliente-item';
        if (CarteiraStore.state.clienteSelecionado === c.nome) {
            div.classList.add('active');
        }

        div.innerHTML = `
            <span class="nome">${c.nome}</span>
            <span class="seta">➜</span>
        `;
        div.onclick = () => selecionarCliente(c.nome);
        container.appendChild(div);
    });
}

function abrirModalLancamento(tipo) {
    const modal = document.getElementById('modalLancamento');
    const formDebito = document.getElementById('formDebito');
    const formCredito = document.getElementById('formCredito');
    const titulo = document.getElementById('tituloModal');

    modal.classList.remove('hidden');

    if (tipo === 'debito') {
        titulo.innerText = 'Novo Débito';
        titulo.style.color = '#e74c3c';
        formDebito.classList.remove('hidden');
        formCredito.classList.add('hidden');

        // Data de hoje
        formDebito.data.valueAsDate = new Date();
    } else {
        titulo.innerText = 'Novo Crédito';
        titulo.style.color = '#27ae60';
        formCredito.classList.remove('hidden');
        formDebito.classList.add('hidden');

        formCredito.data.valueAsDate = new Date();
    }
}

function fecharModalLancamento() {
    document.getElementById('modalLancamento').classList.add('hidden');
    document.getElementById('formDebito').reset();
    document.getElementById('formCredito').reset();
    itemEmEdicao = null; // Resetar
}

// --- LOGICA DE SELEÇÃO E VISUALIZAÇÃO ---

async function selecionarCliente(nome) {
    CarteiraStore.selecionarCliente(nome);

    // Atualizar UI da lista (Active State)
    document.querySelectorAll('.cliente-item').forEach(el => {
        el.classList.remove('active');
        if (el.querySelector('.nome').innerText === nome) {
            el.classList.add('active');
            el.style.backgroundColor = '#e8eff5';
            el.style.borderLeft = '4px solid #9d00ff';
        } else {
            el.style.backgroundColor = '';
            el.style.borderLeft = '';
        }
    });

    // Alternar Vizualização
    document.getElementById('placeholderView').classList.add('hidden');
    const detalhesView = document.getElementById('detalhesView');
    detalhesView.classList.remove('hidden');
    detalhesView.style.display = 'flex';

    document.getElementById('carteiraNomeCliente').innerText = nome;

    await atualizarDadosCarteira();
}

async function atualizarDadosCarteira() {
    const nome = CarteiraStore.state.clienteSelecionado;
    if (!nome) return;

    try {
        const dados = await CarteiraAPI.getResumoFinanceiro(nome);

        // Atualizar Store
        CarteiraStore.setDadosFinanceiros(dados);

        document.getElementById('txTotalDebitos').innerText = formatMoeda(dados.resumo.total_debitos);
        document.getElementById('txTotalCreditos').innerText = formatMoeda(dados.resumo.total_creditos);

        // Atualizar campo de descontos
        const elDescontos = document.getElementById('txTotalDescontos');
        if (elDescontos) {
            elDescontos.innerText = formatMoeda(dados.resumo.total_descontos || 0);
        }

        const saldo = dados.resumo.saldo_devedor;
        const elSaldo = document.getElementById('txSaldoDevedor');
        elSaldo.innerText = formatMoeda(saldo);
        if (saldo > 0) elSaldo.style.color = '#e74c3c';
        else elSaldo.style.color = '#27ae60';

        renderizarDebitos(dados.debitos);
        renderizarCreditos(dados.creditos);
        renderizarResumoVeiculos(dados.resumo.por_veiculo);

        // Verificar status de encerramento
        verificarStatusEncerramento();

    } catch (error) {
        console.error('Erro ao carregar carteira:', error);
    }
}

function renderizarResumoVeiculos(lista) {
    const container = document.getElementById('resumoVeiculosPanel');
    container.innerHTML = '';

    if (!lista || lista.length === 0) return;

    lista.forEach(v => {
        const div = document.createElement('div');
        div.className = 'veiculo-badge';
        div.innerHTML = `
            <span class="placa">${v.placa || 'Sem Placa'}</span>
            <span class="divider"></span>
            <span class="valor">${formatMoeda(v.valor)}</span>
        `;
        container.appendChild(div);
    });
}

function renderizarDebitos(lista) {
    const container = document.getElementById('listaDebitos');

    if (lista.length === 0) {
        container.innerHTML = '<div style="padding:10px; color:#95a5a6; text-align:center;">Nenhum débito registrado</div>';
        return;
    }

    let html = `
        <table class="transacao-table">
            <thead>
                <tr>
                    <th width="85">Data</th>
                    <th width="85">Placa</th>
                    <th>Descrição</th>
                    <th width="90">Tipo</th>
                    <th width="50">Qtd</th>
                    <th width="140">Valor</th>
                </tr>
            </thead>
            <tbody>
    `;

    lista.forEach(d => {
        let badgeClass = 'bg-red-light';
        if (d.tipo === 'Reembolso') badgeClass = 'bg-blue-light';

        html += `
            <tr onclick="verDetalhes('debito', ${d.id})" style="cursor: pointer;">
                <td>${formatData(d.data)}</td>
                <td><span style="font-weight:600; color:#2c3e50;">${d.veiculo_placa}</span></td>
                <td><span style="color:#2c3e50;">${d.descricao}</span></td>
                <td><span class="badge-tipo ${badgeClass}">${d.tipo}</span></td>
                <td style="text-align:center;">${d.quantidade}</td>
                <td class="text-danger font-bold">
                    - ${formatMoeda(d.valor_total)}
                </td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

function renderizarCreditos(lista) {
    const container = document.getElementById('listaCreditos');

    if (lista.length === 0) {
        container.innerHTML = '<div style="padding:10px; color:#95a5a6; text-align:center;">Nenhum crédito registrado</div>';
        return;
    }

    let html = `
        <table class="transacao-table">
            <thead>
                <tr>
                    <th width="15%">Data</th>
                    <th width="20%">Banco</th>
                    <th width="25%">Descrição</th>
                    <th width="12%">Forma</th>
                    <th width="8%" title="Confirmado" style="text-align:center;">Conf.</th>
                    <th width="20%" style="text-align: right;">Valor</th>
                </tr>
            </thead>
            <tbody>
    `;

    lista.forEach(c => {
        // Verificar Atraso
        const hoje = new Date().toISOString().split('T')[0];
        const isAtrasado = !c.banco_confirmado && c.data < hoje;

        const statusIcon = c.banco_confirmado
            ? '<span style="color: #27ae60; font-size: 18px;">✓</span>'
            : (isAtrasado
                ? '<span style="color: #c0392b; font-size: 18px; font-weight:bold;">!</span>'
                : '<span style="color: #95a5a6; font-size: 18px;">○</span>');

        const rowStyle = isAtrasado ? 'background-color: #fff5f5;' : '';
        const dataStyle = isAtrasado ? 'color: #c0392b; font-weight: 700;' : '';

        html += `
            <tr style="${rowStyle}">
                <td onclick="verDetalhes('credito', ${c.id})" style="cursor: pointer; ${dataStyle}">${formatData(c.data)}</td>
                <td onclick="verDetalhes('credito', ${c.id})" style="cursor: pointer;"><span style="color:#2c3e50; font-weight:500;">${c.banco || '-'}</span></td>
                <td onclick="verDetalhes('credito', ${c.id})" style="cursor: pointer;"><span style="color:#2c3e50;">${c.descricao || '-'}</span></td>
                <td onclick="verDetalhes('credito', ${c.id})" style="cursor: pointer;">${c.tipo}</td>
                <td style="text-align:center; padding: 8px;">
                    <button 
                        onclick="toggleConfirmacao(event, ${c.id})"
                        style="
                            background: ${c.banco_confirmado ? '#27ae60' : (isAtrasado ? '#c0392b' : '#ecf0f1')};
                            border: 1px solid ${c.banco_confirmado ? '#27ae60' : (isAtrasado ? '#c0392b' : '#bdc3c7')};
                            color: ${c.banco_confirmado ? 'white' : (isAtrasado ? 'white' : '#7f8c8d')};
                            border-radius: 3px;
                            padding: 2px 6px;
                            cursor: pointer;
                            font-size: 10px;
                            font-weight: 600;
                            transition: all 0.2s;
                            width: 20px;
                            height: 18px;
                            display: inline-flex;
                            align-items: center;
                            justify-content: center;
                        "
                        onmouseover="this.style.transform='scale(1.1)'"
                        onmouseout="this.style.transform='scale(1)'"
                        title="${c.banco_confirmado ? 'Confirmado' : (isAtrasado ? 'ATRASADO - Clique para confirmar' : 'Pendente')}"
                    >
                        ${c.banco_confirmado ? '✓' : (isAtrasado ? '!' : '○')}
                    </button>
                </td>
                <td onclick="verDetalhes('credito', ${c.id})" class="text-green font-bold" style="text-align: right; cursor: pointer;">
                    + ${formatMoeda(c.banco_confirmado ? c.valor : (c.valor_original || c.valor))}
                </td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

async function salvarDebito(e) {
    e.preventDefault();
    const clienteSelecionado = CarteiraStore.state.clienteSelecionado;
    if (!clienteSelecionado) return;

    const form = e.target;
    // ... (rest of getting values is fine)

    const body = {
        cliente_nome: clienteSelecionado,
        veiculo_placa: form.veiculo_placa.value.toUpperCase(),
        data: form.data.value,
        tipo: form.tipo.value,
        descricao: form.descricao.value,
        quantidade: form.quantidade.value,
        valor_unitario: form.valor_unitario.value,
        cobra_taxa_adm: form.cobra_taxa_adm.checked,
        observacao: form.observacao.value
    };

    try {
        let url = '/api/carteira/debitos';
        let method = 'POST';

        // Se estiver editando
        if (itemEmEdicao && itemEmEdicao.tipoLancamento === 'debito') {
            url = `/api/carteira/debitos/${itemEmEdicao.id}`;
            method = 'PUT';
        }

        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        // Verificar Content-Type antes de parsear JSON
        const contentType = res.headers.get("content-type");
        let data;
        if (contentType && contentType.indexOf("application/json") !== -1) {
            data = await res.json();
        } else {
            const text = await res.text();
            console.error('Resposta não-JSON:', text);
            throw new Error(`Erro no servidor (Status ${res.status}). Verifique se o backend foi reiniciado.`);
        }

        if (res.ok) {
            Swal.fire({
                title: 'Salvo!',
                icon: 'success',
                timer: 1000,
                showConfirmButton: false,
                toast: true,
                position: 'top-end'
            });
            form.reset();
            itemEmEdicao = null; // Limpar estado
            document.getElementById('previewTotalDebito').innerText = 'Total: R$ 0,00';
            fecharModalLancamento();
            atualizarDadosCarteira();
        } else {
            let msg = 'Falha ao salvar';
            if (data.error) msg = data.error;
            throw new Error(msg);
        }
    } catch (error) {
        Swal.fire('Erro', error.message || 'Error', 'error');
    }
}

async function salvarCredito(e) {
    e.preventDefault();
    const clienteSelecionado = CarteiraStore.state.clienteSelecionado;
    if (!clienteSelecionado) return;

    const form = e.target;
    const recorrente = form.recorrente.checked;

    // Se recorrente, mostrar confirmação
    if (recorrente && !itemEmEdicao) {
        const numParcelas = parseInt(form.num_parcelas.value);
        const valorParcela = parseFloat(form.valor.value);
        const desconto = parseFloat(form.desconto_percentual.value) || 0;

        const result = await Swal.fire({
            title: '⚠️ Confirmar Lançamento Recorrente',
            html: `
                <div style="text-align: left; padding: 10px;">
                    <p><strong>Cliente:</strong> ${clienteSelecionado}</p>
                    <p><strong>Valor por parcela:</strong> ${formatMoeda(valorParcela)}</p>
                    ${desconto > 0 ? `<p><strong>Desconto:</strong> ${desconto}%</p>` : ''}
                    <p><strong>Quantidade:</strong> ${numParcelas} créditos</p>
                    <p><strong>Total geral:</strong> ${formatMoeda(valorParcela * numParcelas)}</p>
                    <br>
                    <p style="color: #e67e22;"><strong>⚠️ Aviso:</strong> Esta ação criará ${numParcelas} lançamentos separados.<br>
                    Cada um poderá ser editado/excluído individualmente.</p>
                </div>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Confirmar',
            cancelButtonText: 'Cancelar'
        });

        if (!result.isConfirmed) return;
    }

    const body = {
        cliente_nome: clienteSelecionado,
        data: form.data.value,
        valor_original: form.valor_original.value,
        valor: form.valor.value,
        tipo: form.tipo.value,
        descricao: form.descricao.value,
        // Only apply discount if checkbox is checked
        desconto_percentual: (document.getElementById('chkAplicarDesconto')?.checked) ? (form.desconto_percentual.value || 0) : 0,
        desconto_tipo: form.desconto_tipo.value || 'percentual',
        banco: form.banco.value,
        banco_confirmado: form.banco_confirmado.checked,
        observacao: form.observacao.value,

        // Dados de recorrência
        recorrente: recorrente,
        num_parcelas: recorrente ? form.num_parcelas.value : 1,
        periodicidade: recorrente ? form.periodicidade.value : null
    };

    try {
        let url = '/api/carteira/creditos';
        let method = 'POST';

        if (itemEmEdicao && itemEmEdicao.tipoLancamento === 'credito') {
            url = `/api/carteira/creditos/${itemEmEdicao.id}`;
            method = 'PUT';
        }

        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const contentType = res.headers.get("content-type");
        let data;
        if (contentType && contentType.indexOf("application/json") !== -1) {
            data = await res.json();
        } else {
            const text = await res.text();
            console.error('Resposta não-JSON:', text);
            throw new Error(`Erro no servidor (Status ${res.status}). Verifique se o backend foi reiniciado.`);
        }

        if (res.ok) {
            Swal.fire({
                title: recorrente ? `${body.num_parcelas} Créditos Criados!` : 'Salvo!',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false,
                toast: true,
                position: 'top-end'
            });
            form.reset();
            itemEmEdicao = null;
            fecharModalLancamento();
            atualizarDadosCarteira();
        } else {
            throw new Error(data.error || 'Falha ao salvar');
        }
    } catch (error) {
        Swal.fire('Erro', error.message || 'Não foi possível salvar o crédito.', 'error');
    }
}

async function excluirItem(tipo, id) {
    const result = await Swal.fire({
        title: 'Excluir registro?',
        text: "Não será possível reverter.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sim',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        try {
            const res = await fetch(`/api/carteira/${tipo}/${id}`, { method: 'DELETE' });
            if (res.ok) {
                atualizarDadosCarteira();
                Swal.fire({
                    title: 'Excluído!',
                    icon: 'success',
                    timer: 1000,
                    showConfirmButton: false,
                    toast: true,
                    position: 'top-end'
                });
            }
        } catch (error) {
            Swal.fire('Erro', 'Erro ao excluir.', 'error');
        }
    }
}

// UTILS
function calcTotalDebito() {
    const qtd = parseFloat(document.querySelector('[name=quantidade]').value) || 0;
    const unit = parseFloat(document.querySelector('[name=valor_unitario]').value) || 0;
    const comTaxa = document.querySelector('[name=cobra_taxa_adm]').checked;

    let total = qtd * unit;
    if (comTaxa) {
        total = total * 1.15; // +15%
    }

    document.getElementById('previewTotalDebito').innerText = 'Total: ' + formatMoeda(total);
}

function formatMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

function formatData(dataIso) {
    if (!dataIso) return '-';
    const [ano, mes, dia] = dataIso.split('-');
    return `${dia}/${mes}/${ano}`;
}

// --- DETALHES E EDIÇÃO ---

let itemEmEdicao = null; // { tipo: 'debito'|'credito', id: 1, ... }

function verDetalhes(tipo, id) {
    // Buscar item no cache (precisamos ter certeza que o cache está atualizado ou buscar do array renderizado)
    // Como simplificação, vou varrer o HTML ou buscar do servidor? 
    // Melhor: No renderizar, já temos o objeto. Vou salvar no elemento ou buscar da API se precisar.
    // Para ser rápido: vamos buscar nos arrays que vieram do servidor.
    // Precisamos guardar o ultimo response em uma variável global.

    const item = window.ultimoDadosCache[tipo === 'debito' ? 'debitos' : 'creditos'].find(i => i.id === id);
    if (!item) return;

    itemEmEdicao = { ...item, tipoLancamento: tipo };

    const modal = document.getElementById('modalDetalhes');
    const conteudo = document.getElementById('conteudoDetalhes');
    const titulo = document.getElementById('tituloDetalhes');

    modal.classList.remove('hidden');

    // Configurar Botões
    document.getElementById('btnExcluirDetalhe').onclick = () => {
        excluirItem(tipo === 'debito' ? 'debitos' : 'creditos', id);
        fecharModalDetalhes();
    };

    document.getElementById('btnEditarDetalhe').onclick = () => {
        fecharModalDetalhes();
        prepararEdicao(tipo, item);
    };

    // Renderizar Conteúdo
    if (tipo === 'debito') {
        titulo.innerText = 'Detalhes do Débito';
        titulo.style.color = '#e74c3c';

        conteudo.innerHTML = `
            <p><strong>Data:</strong> ${formatData(item.data)}</p>
            <p><strong>Veículo:</strong> ${item.veiculo_placa}</p>
            <p><strong>Tipo:</strong> ${item.tipo}</p>
            <p><strong>Descrição:</strong> ${item.descricao}</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 10px 0;">
            <p><strong>Qtd:</strong> ${item.quantidade}</p>
            <p><strong>Valor Unit.:</strong> ${formatMoeda(item.valor_unitario)}</p>
            <p><strong>Taxa 15%:</strong> ${item.cobra_taxa_adm ? 'Sim (' + formatMoeda(item.valor_taxa) + ')' : 'Não'}</p>
            <p style="font-size: 16px; color: #c0392b; margin-top: 10px;"><strong>Total:</strong> ${formatMoeda(item.valor_total)}</p>
            
            <div style="background: #f9f9f9; padding: 10px; border-radius: 4px; margin-top: 15px;">
                <strong>Observação Interna:</strong><br>
                <span style="color: #666; font-style: italic;">${item.observacao || 'Nenhuma observação.'}</span>
            </div>
        `;
    } else {
        titulo.innerText = 'Detalhes do Crédito';
        titulo.style.color = '#27ae60';

        const bancoInfo = item.banco ? `${item.banco}` : '-';
        const status = item.banco_confirmado ? '<span style="color:#27ae60; font-weight:bold;">Confirmado</span>' : '<span style="color:#f39c12; font-weight:bold;">Pendente</span>';

        conteudo.innerHTML = `
            <p><strong>Data:</strong> ${formatData(item.data)}</p>
            <p><strong>Banco:</strong> ${bancoInfo}</p>
            <p><strong>Meio de Pagamento:</strong> ${item.tipo}</p>
            <p><strong>Descrição:</strong> ${item.descricao || '-'}</p>
            <p><strong>Status:</strong> ${status}</p>
            <p style="font-size: 16px; color: #27ae60; margin-top: 10px;"><strong>Valor:</strong> ${formatMoeda(item.valor)}</p>
            
            <div style="background: #f9f9f9; padding: 10px; border-radius: 4px; margin-top: 15px;">
                <strong>Observação Interna:</strong><br>
                <span style="color: #666; font-style: italic;">${item.observacao || 'Nenhuma observação.'}</span>
            </div>
        `;
    }
}

function fecharModalDetalhes() {
    document.getElementById('modalDetalhes').classList.add('hidden');
    itemEmEdicao = null;
}

function prepararEdicao(tipo, item) {
    abrirModalLancamento(tipo); // Reusa a abertura

    // Sobrescrever estado para edição
    itemEmEdicao = { ...item, tipoLancamento: tipo };

    const titulo = document.getElementById('tituloModal');
    titulo.innerText = `Editando ${tipo === 'debito' ? 'Débito' : 'Crédito'}`;

    // Preencher Campos
    if (tipo === 'debito') {
        const form = document.getElementById('formDebito');
        form.data.value = item.data;
        form.veiculo_placa.value = item.veiculo_placa;
        form.tipo.value = item.tipo;
        form.descricao.value = item.descricao;
        form.quantidade.value = item.quantidade;
        form.valor_unitario.value = item.valor_unitario;
        form.cobra_taxa_adm.checked = item.cobra_taxa_adm;
        form.observacao.value = item.observacao || '';
        calcTotalDebito();
    } else {
        const form = document.getElementById('formCredito');
        form.data.value = item.data;
        form.tipo.value = item.tipo;
        form.descricao.value = item.descricao || '';

        // Calcular valor original baseado no valor final e desconto
        const valorFinal = parseFloat(item.valor) || 0;
        const desconto = parseFloat(item.desconto_percentual) || 0;
        const tipoDesconto = item.desconto_tipo || 'percentual';
        let valorOriginal = valorFinal;

        if (desconto > 0) {
            if (tipoDesconto === 'percentual') {
                // valorFinal = valorOriginal - (valorOriginal * desconto / 100)
                // valorFinal = valorOriginal * (1 - desconto/100)
                // valorOriginal = valorFinal / (1 - desconto/100)
                valorOriginal = valorFinal / (1 - desconto / 100);
            } else {
                // valorFinal = valorOriginal - desconto
                // valorOriginal = valorFinal + desconto
                valorOriginal = valorFinal + desconto;
            }
        }

        form.valor_original.value = valorOriginal.toFixed(2);
        form.valor.value = valorFinal.toFixed(2);
        form.desconto_percentual.value = desconto;
        form.desconto_tipo.value = tipoDesconto;

        form.banco.value = item.banco || '';
        form.banco_confirmado.checked = item.banco_confirmado;
        form.observacao.value = item.observacao || '';

        // Handle Discount Toggle State
        const hasDiscount = desconto > 0;
        const chkDesconto = document.getElementById('chkAplicarDesconto');
        if (chkDesconto) {
            chkDesconto.checked = hasDiscount;
            toggleDescontoFields(); // Trigger visibility
        }
    }
}

window.toggleDescontoFields = function () {
    const chk = document.getElementById('chkAplicarDesconto');
    const container = document.getElementById('containerDescontos');
    const containerFinal = document.getElementById('containerValorFinal');
    const inputDesconto = document.getElementById('inputDesconto');

    if (chk && container) {
        if (chk.checked) {
            container.classList.remove('hidden');
            container.style.display = 'flex'; // Ensure flex layout
            if (containerFinal) {
                containerFinal.classList.remove('hidden');
                containerFinal.style.display = 'block';
            }
        } else {
            container.classList.add('hidden');
            container.style.display = 'none';
            if (containerFinal) {
                containerFinal.classList.add('hidden');
                containerFinal.style.display = 'none';
            }
            // Reset discount if unchecked?
            // Better to just set to 0 strictly when saving if unchecked, 
            // but user might want to keep value while toggling.
            // Visual reset:
            if (inputDesconto) inputDesconto.value = 0;
            calcularValorFinal();
        }
    }
};

// --- IMPRESSÃO ---
async function imprimirRelatorio() {
    const clienteSelecionado = CarteiraStore.state.clienteSelecionado;
    if (!clienteSelecionado || !window.ultimoDadosCache) {
        Swal.fire('Aviso', 'Selecione um cliente primeiro.', 'warning');
        return;
    }

    // Verificar se existe encerramento salvo no Banco de Dados
    let dadosEncerramento = null;
    try {
        const res = await fetch(`/api/encerramento/${encodeURIComponent(clienteSelecionado)}`);
        if (res.ok) {
            dadosEncerramento = await res.json();
        }
    } catch (e) {
        console.error('Erro ao buscar encerramento:', e);
    }

    // LOGICA INTELIGENTE: Se não tem encerramento, imprime extrato direto
    if (!dadosEncerramento) {
        gerarExtratoPadrao();
        return;
    }

    // Se tiver mais opções, mostra o modal
    // Construção das opções em HTML para o SweetAlert
    let htmlOpcoes = `
        <div style="display: flex; flex-direction: column; gap: 10px;">
            <button id="btnExtrato" class="swal2-confirm swal2-styled" style="background-color: #34495e; width: 100%; margin: 0;">
                <i class="ph ph-list-dashes" style="margin-right: 8px;"></i> Extrato de Conta Corrente
            </button>
    `;

    if (dadosEncerramento) {
        const dataEnc = new Date(dadosEncerramento.data_encerramento).toLocaleDateString('pt-BR');

        htmlOpcoes += `
            <hr style="width: 100%; border: 0; border-top: 1px solid #eee; margin: 5px 0;">
            <div style="text-align: left; font-size: 13px; color: #c0392b; margin-bottom: 5px;">
                <strong>Encerramento Detectado (${dataEnc})</strong>
            </div>
            <button id="btnTermo" class="swal2-confirm swal2-styled" style="background-color: #e67e22; width: 100%; margin: 0;">
                <i class="ph ph-file-text" style="margin-right: 8px;"></i> Termo de Encerramento
            </button>
            <button id="btnConfissao" class="swal2-confirm swal2-styled" style="background-color: #c0392b; width: 100%; margin: 0;">
                <i class="ph ph-gavel" style="margin-right: 8px;"></i> Confissão de Dívida
            </button>
        `;
    }

    htmlOpcoes += `</div>`;

    Swal.fire({
        title: 'Imprimir Documento',
        html: htmlOpcoes,
        showConfirmButton: false,
        showCloseButton: true,
        didOpen: () => {
            // Bind events manualmente
            const btnExt = document.getElementById('btnExtrato');
            const btnTermo = document.getElementById('btnTermo');
            const btnConf = document.getElementById('btnConfissao');

            if (btnExt) btnExt.onclick = () => { Swal.close(); gerarExtratoPadrao(); };
            if (btnTermo) btnTermo.onclick = () => { Swal.close(); window.gerarDocumentoEncerramento('termo'); };
            if (btnConf) btnConf.onclick = () => { Swal.close(); window.gerarDocumentoEncerramento('confissao'); };
        }
    });
}

function gerarExtratoPadrao() {
    const clienteSelecionado = CarteiraStore.state.clienteSelecionado;
    if (!clienteSelecionado || !window.ultimoDadosCache) {
        Swal.fire('Aviso', 'Selecione um cliente primeiro.', 'warning');
        return;
    }

    const { debitos, creditos, resumo } = window.ultimoDadosCache;
    const dataHoje = new Date().toLocaleDateString('pt-BR');

    // Separar créditos confirmados e pendentes
    const creditosConfirmados = creditos.filter(c => c.banco_confirmado);
    const creditosPendentes = creditos.filter(c => !c.banco_confirmado);

    // Calcular totais (pendentes = valor original que deve receber)
    const totalCreditosPendentes = creditosPendentes.reduce((sum, c) => sum + parseFloat(c.valor_original || c.valor), 0);
    const saldoProjetado = resumo.saldo_devedor - totalCreditosPendentes;

    // Juntar tudo em uma linha do tempo única (TODOS os créditos)
    const extrato = [
        ...debitos.map(d => ({ ...d, tipoLancamento: 'DEBITO' })),
        ...creditos.map(c => ({ ...c, tipoLancamento: 'CREDITO' }))
    ].sort((a, b) => new Date(a.data) - new Date(b.data));

    let linhasHtml = '';
    let saldoAcumulado = 0;

    extrato.forEach(item => {
        const isDebito = item.tipoLancamento === 'DEBITO';
        const isPendente = !isDebito && !item.banco_confirmado;

        // Check for overdue (only for unconfirmed credits)
        const hoje = new Date().toISOString().split('T')[0];
        const isAtrasado = isPendente && item.data < hoje;

        // Cor base
        let cor = isDebito ? '#c0392b' : '#27ae60';
        if (isPendente) cor = '#f39c12'; // Laranja para pendentes
        if (isAtrasado) cor = '#e74c3c'; // Vermelho para atrasados

        // Valor a exibir: pendente = valor original, confirmado = valor pago com desconto
        let valor;
        if (isDebito) {
            valor = parseFloat(item.valor_total);
        } else {
            // Pendente mostra valor original (quanto deve receber)
            // Confirmado mostra valor final (quanto foi realmente pago)
            valor = item.banco_confirmado
                ? parseFloat(item.valor)
                : parseFloat(item.valor_original || item.valor);
        }

        // Calculo do Saldo Devedor
        if (isDebito) {
            saldoAcumulado += valor;
        } else if (item.banco_confirmado) {
            // Abate apenas o valor PAGO
            // O desconto será abatido na próxima linha (se houver)
            // Assim soma: Valor Pago + Valor Desconto = Valor Original
            saldoAcumulado -= valor;
        }

        // Campos separados
        const veiculo = (isDebito && item.veiculo_placa) ? item.veiculo_placa : '-';

        // Tipo (sem redundância)
        let tipoDesc = isDebito ? item.tipo : item.tipo;

        const Obs = item.observacao ? `<br><small style="color:#7f8c8d; font-style:italic;">${item.observacao}</small>` : '';

        // Definir cor do saldo (Positivo = Divida, Negativo = Crédito Sobrando)
        // Lógica visual invertida: Dívida (saldoAcumulado > 0) = Vermelho e Negativo
        const corSaldo = saldoAcumulado > 0 ? '#c0392b' : '#27ae60';
        const sinalSaldo = saldoAcumulado > 0 ? '- ' : (saldoAcumulado < 0 ? '+ ' : '');
        const valSaldo = Math.abs(saldoAcumulado);

        // Estilo especial para linhas pendentes
        const bgPendente = isPendente ? 'background-color: #fff9e6;' : '';

        linhasHtml += `
            <tr style="border-bottom: 1px solid #eee; ${bgPendente}">
                <td style="padding: 6px;">${formatData(item.data)}</td>
                <td style="padding: 6px; font-weight:600;">${veiculo}</td>
                <td style="padding: 6px;">
                    ${item.descricao || (isDebito ? '' : 'Crédito em Conta')}
                    ${Obs}
                </td>
                <td style="padding: 6px; font-size:11px;">${tipoDesc}</td>
                <td style="padding: 6px; text-align: right; color: ${cor}; font-weight: bold;">
                    ${isDebito ? '- ' : '+ '} ${formatMoeda(valor)}
                </td>
                <td style="padding: 6px; text-align: right; font-weight: bold; color: ${corSaldo}; background-color: #f8f9fa;">
                    ${sinalSaldo}${formatMoeda(valSaldo)}
                </td>
            </tr>
        `;

        // Se houver desconto e for crédito confirmado, adicionar linha de desconto
        if (!isDebito && item.banco_confirmado && item.desconto_percentual && parseFloat(item.desconto_percentual) > 0) {
            const valorDesconto = parseFloat(item.valor_original || item.valor) - parseFloat(item.valor);

            if (valorDesconto > 0) {
                // Abater o desconto do saldo
                saldoAcumulado -= valorDesconto;
                const corSaldoDesconto = saldoAcumulado > 0 ? '#c0392b' : '#27ae60';
                const sinalSaldoDesc = saldoAcumulado > 0 ? '- ' : (saldoAcumulado < 0 ? '+ ' : '');
                const valSaldoDesc = Math.abs(saldoAcumulado);

                const tipoDesc = item.desconto_tipo === 'percentual' ? `${parseFloat(item.desconto_percentual).toFixed(0)}%` : '';

                linhasHtml += `
                    <tr style="border-bottom: 1px solid #eee; background-color: #fff3e0;">
                        <td style="padding: 6px; color: #999;">${formatData(item.data)}</td>
                        <td style="padding: 6px; color: #999;">-</td>
                        <td style="padding: 6px; color: #e67e22; font-style: italic;">
                            💰 Desconto Concedido ${tipoDesc}
                        </td>
                        <td style="padding: 6px; font-size:11px; color: #999;">Desconto</td>
                        <td style="padding: 6px; text-align: right; color: #e67e22; font-weight: bold;">
                            - ${formatMoeda(valorDesconto)}
                        </td>
                        <td style="padding: 6px; text-align: right; font-weight: bold; color: ${corSaldoDesconto}; background-color: #f8f9fa;">
                            ${sinalSaldoDesc}${formatMoeda(valSaldoDesc)}
                        </td>
                    </tr>
                `;
            }
        }
    });

    // Janela de Impressão
    const win = window.open('', '_blank');
    win.document.write(`
        <html>
        <head>
            <title>Relatório Financeiro - ${clienteSelecionado}</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; padding: 20px; font-size: 12px; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
                .header h1 { margin: 0; font-size: 20px; color: #2c3e50; }
                .header p { margin: 5px 0 0; color: #7f8c8d; }
                
                .resumo-box { display: flex; justify-content: space-between; margin-bottom: 20px; background: #f8f9fa; padding: 10px; border-radius: 5px; border: 1px solid #ddd; }
                .resumo-item { text-align: center; }
                .resumo-label { font-size: 10px; text-transform: uppercase; color: #7f8c8d; }
                .resumo-valor { font-size: 14px; font-weight: bold; }
                .debt { color: #c0392b; }
                .credit { color: #27ae60; }
                
                table { width: 100%; border-collapse: collapse; font-size: 11px; }
                th { text-align: left; background: #eee; padding: 6px; border-bottom: 2px solid #ccc; font-size: 11px; }
                td { vertical-align: top; }
                
                .footer { margin-top: 30px; display: flex; justify-content: space-between; page-break-inside: avoid; }
                .assinatura { width: 40%; border-top: 1px solid #333; text-align: center; padding-top: 5px; font-size: 11px; }
                
                @media print {
                    .no-print { display: none; }
                    body { padding: 0; }
                    .resumo-box { background: none; border: 1px solid #000; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Extrato de Conta Corrente</h1>
                <p>Cliente: <strong>${clienteSelecionado}</strong> | Data Emissão: ${dataHoje}</p>
            </div>

            <div class="resumo-box">
                <div class="resumo-item">
                    <div class="resumo-label">Total Serviços</div>
                    <div class="resumo-valor debt">${formatMoeda(resumo.total_debitos)}</div>
                </div>
                <div class="resumo-item">
                    <div class="resumo-label">Total Pago</div>
                    <div class="resumo-valor credit">${formatMoeda(resumo.total_creditos)}</div>
                </div>
                ${(resumo.total_descontos && resumo.total_descontos > 0) ? `
                <div class="resumo-item">
                    <div class="resumo-label">Total Descontos</div>
                    <div class="resumo-valor" style="color: #e67e22;">${formatMoeda(resumo.total_descontos)}</div>
                </div>
                ` : ''}
                <div class="resumo-item">
                    <div class="resumo-label">Saldo Atual</div>
                    <div class="resumo-valor" style="color: ${resumo.saldo_devedor > 0 ? '#c0392b' : '#27ae60'}">
                        ${resumo.saldo_devedor > 0 ? '- ' : (resumo.saldo_devedor < 0 ? '+ ' : '')}${formatMoeda(Math.abs(resumo.saldo_devedor))}
                    </div>
                </div>
                ${totalCreditosPendentes > 0 ? `
                <div class="resumo-item">
                    <div class="resumo-label">A Receber</div>
                    <div class="resumo-valor" style="color: #f39c12">+ ${formatMoeda(totalCreditosPendentes)}</div>
                </div>
                <div class="resumo-item">
                    <div class="resumo-label">Saldo Projetado</div>
                    <div class="resumo-valor" style="color: ${saldoProjetado > 0 ? '#c0392b' : '#27ae60'}">
                        ${saldoProjetado > 0 ? '- ' : (saldoProjetado < 0 ? '+ ' : '')}${formatMoeda(Math.abs(saldoProjetado))}
                    </div>
                </div>
                ` : ''}
            </div>

            ${totalCreditosPendentes > 0 ? `
            <div style="background: #fff9e6; border-left: 4px solid #f39c12; padding: 10px; margin-bottom: 20px; font-size: 11px;">
                <strong style="color: #e67e22;">⚠️ AVISO IMPORTANTE:</strong><br>
                Este extrato contém <strong>${creditosPendentes.length} crédito(s) pendente(s)</strong> no valor total de <strong>${formatMoeda(totalCreditosPendentes)}</strong>.<br>
                <strong>A quitação só será efetivada após a confirmação destes recebimentos bancários.</strong>
            </div>
            ` : ''}

            <div style="margin-bottom: 20px;">
                <h3 style="font-size: 12px; margin-bottom: 5px; color: #2c3e50; border-bottom: 1px solid #ccc; padding-bottom: 2px;">Resumo por Veículo</h3>
                
                ${(!resumo.por_veiculo || resumo.por_veiculo.length === 0) ?
            '<p style="color:#999; font-style:italic; font-size:10px;">Nenhum detalhe de veículo.</p>' :
            `<table style="width: auto; margin-bottom: 10px;">
                        <tbody>
                            ${resumo.por_veiculo.map(v => `
                                <tr>
                                    <td style="padding: 2px 15px 2px 0;"><strong>${v.placa || 'Sem Placa'}</strong></td>
                                    <td style="padding: 2px 0; color: #c0392b;">${formatMoeda(v.valor)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>`
        }
            </div>

            <table>
                <thead>
                    <tr>
                        <th width="70">Data</th>
                        <th width="70">Veículo</th>
                        <th>Descrição</th>
                        <th width="100">Tipo</th>
                        <th width="80" style="text-align: right;">Valor</th>
                        <th width="80" style="text-align: right;">Saldo</th>
                    </tr>
                </thead>
                <tbody>
                    ${linhasHtml}
                </tbody>
            </table>

            <div style="margin-top: 20px; text-align: right; font-size: 11px; color: #999;">
                Relatório gerado automaticamente pelo sistema.
            </div>

            <div class="footer">
                <div class="assinatura">
                    Assinatura da Locadora
                </div>
                <div class="assinatura">
                    ${clienteSelecionado}
                </div>
            </div>

            <script>
                window.onload = function() { window.print(); }
            </script>
        </body>
        </html>
    `);
    win.document.close();
}

// Alterar salvarDebito e salvarCredito para suportar edição
// (Isso requer modificar as funções existentes. Vou fazer um replace nelas abaixo)

// --- FUNÇÕES AUXILIARES ---

// Atualizar label do desconto baseado no tipo selecionado e calcular valor final
function calcularValorFinal() {
    const form = document.getElementById('formCredito');
    if (!form) return;

    const valorOriginalInput = form.valor_original;
    const descontoInput = form.desconto_percentual;
    const tipoSelect = form.desconto_tipo;
    const valorFinalInput = form.valor;
    const label = document.getElementById('labelDesconto');
    const inputDesconto = document.getElementById('inputDesconto');

    if (!valorOriginalInput || !descontoInput || !tipoSelect || !valorFinalInput) return;

    // Atualizar label do desconto
    if (tipoSelect.value === 'percentual') {
        label.textContent = 'Desconto (%)';
        inputDesconto.placeholder = 'Ex: 50';
        inputDesconto.max = 100;
    } else {
        label.textContent = 'Desconto (R$)';
        inputDesconto.placeholder = 'Ex: 25.00';
        inputDesconto.removeAttribute('max');
    }

    // Calcular valor final
    const valorOriginal = parseFloat(valorOriginalInput.value) || 0;
    const desconto = parseFloat(descontoInput.value) || 0;
    let valorFinal = valorOriginal;

    if (desconto > 0) {
        if (tipoSelect.value === 'percentual') {
            // Desconto percentual
            const valorDesconto = (valorOriginal * desconto) / 100;
            valorFinal = valorOriginal - valorDesconto;
        } else {
            // Desconto em valor absoluto
            valorFinal = valorOriginal - desconto;
        }
    }

    // Garantir que não seja negativo
    if (valorFinal < 0) valorFinal = 0;

    // Atualizar campo de valor final
    valorFinalInput.value = valorFinal.toFixed(2);
}

// Função antiga renomeada para compatibilidade
function atualizarLabelDesconto() {
    calcularValorFinal();
}

// Toggle rápido de confirmação de crédito
async function toggleConfirmacao(event, creditoId) {
    event.stopPropagation(); // Impede de abrir o modal de detalhes

    const button = event.target;
    const estadoAtual = button.textContent.trim() === '✓';
    const novoEstado = !estadoAtual;

    // Feedback visual imediato
    button.style.opacity = '0.5';
    button.disabled = true;

    try {
        const res = await fetch(`/api/carteira/creditos/${creditoId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ banco_confirmado: novoEstado })
        });

        if (res.ok) {
            // Atualizar dados para refletir mudança
            await atualizarDadosCarteira();
        } else {
            // Reverter visual se der erro
            button.style.opacity = '1';
            button.disabled = false;
            Swal.fire('Erro', 'Não foi possível atualizar o status.', 'error');
        }
    } catch (error) {
        button.style.opacity = '1';
        button.disabled = false;
        Swal.fire('Erro', 'Falha na comunicação com o servidor.', 'error');
    }
}

// Toggle de campos de recorrência
function toggleRecorrencia() {
    const checkbox = document.getElementById('chkRecorrente');
    const fields = document.getElementById('recorrenciaFields');

    if (checkbox.checked) {
        fields.classList.remove('hidden');
        atualizarPreviewParcelas();
    } else {
        fields.classList.add('hidden');
    }
}

// Atualizar preview de parcelas
function atualizarPreviewParcelas() {
    const form = document.getElementById('formCredito');
    const dataInicial = form.data.value;
    const numParcelas = parseInt(form.num_parcelas.value) || 7;
    const periodicidade = form.periodicidade.value;
    const valor = parseFloat(form.valor.value) || 0;

    if (!dataInicial) {
        document.getElementById('previewParcelas').innerHTML = '<em>Informe a data inicial</em>';
        return;
    }

    const dias = periodicidade === 'semanal' ? 7 : 30;
    const dataBase = new Date(dataInicial + 'T00:00:00');

    let html = `<strong>📅 Preview (${numParcelas} parcelas):</strong><br>`;

    const maxPreview = Math.min(numParcelas, 5);
    for (let i = 0; i < maxPreview; i++) {
        const dataAtual = new Date(dataBase);
        dataAtual.setDate(dataBase.getDate() + (i * dias));
        html += `• ${formatData(dataAtual.toISOString().split('T')[0])} - ${formatMoeda(valor)}<br>`;
    }

    if (numParcelas > 5) {
        html += `<em>... e mais ${numParcelas - 5} parcelas</em>`;
    }

    document.getElementById('previewParcelas').innerHTML = html;
}

// ============================================================================
// CONTROLE DE ENCERRAMENTO DE CONTRATO
// ============================================================================

async function verificarStatusEncerramento() {
    const nome = CarteiraStore.state.clienteSelecionado;
    if (!nome) return;

    try {
        const encerramento = await CarteiraAPI.getStatusEncerramento(nome);

        if (encerramento) {
            CarteiraStore.setStatusEncerramento(true, encerramento);
            atualizarInterfaceEncerramento(encerramento);
        } else {
            CarteiraStore.setStatusEncerramento(false, null);
            atualizarInterfaceEncerramento(null);
        }
    } catch (error) {
        console.error('Erro ao verificar encerramento:', error);
        CarteiraStore.setStatusEncerramento(false, null);
        atualizarInterfaceEncerramento(null);
    }
}

function atualizarInterfaceEncerramento(encerramento) {
    const badge = document.getElementById('badgeEncerrado');
    const btnEncerrar = document.getElementById('btnEncerrarContrato');
    const btnReabrir = document.getElementById('btnReabrirContrato');
    const btnDebito = document.querySelector('button[onclick="abrirModalLancamento(\'debito\')"]');

    if (encerramento) {
        // Mostrar badge
        badge.style.display = 'block';
        const dataEnc = formatData(encerramento.data_encerramento.split('T')[0]);
        badge.innerHTML = `⚠️ CONTRATO ENCERRADO em ${dataEnc} - Débitos bloqueados`;

        // Trocar botões
        btnEncerrar.style.display = 'none';
        btnReabrir.style.display = 'inline-block';

        // BLOQUEAR APENAS DÉBITOS
        if (btnDebito) {
            btnDebito.disabled = true;
            btnDebito.title = 'Não é possível lançar débitos em contrato encerrado';
            btnDebito.style.opacity = '0.5';
            btnDebito.style.cursor = 'not-allowed';
        }

        // CRÉDITOS CONTINUAM HABILITADOS (não fazer nada)

    } else {
        // Contrato ativo
        badge.style.display = 'none';
        btnEncerrar.style.display = 'inline-block';
        btnReabrir.style.display = 'none';

        // Habilitar débitos
        if (btnDebito) {
            btnDebito.disabled = false;
            btnDebito.title = '';
            btnDebito.style.opacity = '1';
            btnDebito.style.cursor = 'pointer';
        }
    }
}

async function reabrirContrato() {
    const { value: motivo } = await Swal.fire({
        title: 'Reabrir Contrato',
        html: `
            <p style="margin-bottom: 15px;">Por que este contrato está sendo reaberto?</p>
            <textarea id="motivoReabertura" class="swal2-textarea" 
                placeholder="Descreva o motivo da reabertura (mínimo 10 caracteres)"
                style="width: 100%; min-height: 100px;"></textarea>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Reabrir Contrato',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#3498db',
        preConfirm: () => {
            const motivo = document.getElementById('motivoReabertura').value;
            if (!motivo || motivo.trim().length < 10) {
                Swal.showValidationMessage('O motivo deve ter no mínimo 10 caracteres');
                return false;
            }
            return motivo;
        }
    });

    if (!motivo) return;

    try {
        await CarteiraAPI.reabrirContrato(CarteiraStore.state.clienteSelecionado, motivo);

        await Swal.fire({
            title: 'Contrato Reaberto',
            text: 'O contrato foi reaberto com sucesso. Você pode lançar novos débitos agora.',
            icon: 'success',
            confirmButtonColor: '#27ae60'
        });

        // Recarregar dados
        await atualizarDadosCarteira();

    } catch (error) {
        console.error(error);
        Swal.fire('Erro', error.message, 'error');
    }
}

