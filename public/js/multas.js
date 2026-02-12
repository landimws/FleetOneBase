/**
 * Lógica Frontend do Módulo de Multas
 */

document.addEventListener('DOMContentLoaded', async () => {
    await Constants.load();
    FIELDS_TO_LOCK = Constants.get('UI_CONFIG')?.CAMPOS_BLOQUEIO_MULTA_PAGA || [];

    DashboardModule.init();
    carregarListasAuxiliares();
    carregarLista();
    setupListeners();

    // [DataRefreshBus] Subscribe para atualizações
    if (window.DataRefreshBus) {
        DataRefreshBus.subscribe((dataType) => {
            if (dataType === 'all' || dataType === 'clientes' || dataType === 'veiculos') {
                console.log(`🔄 [Multas] Recebido evento de atualização: ${dataType}`);
                carregarListasAuxiliares(); // Atualiza dropdowns
            }
        });
    }
});

let currentMultaId = null; // Para controle de Edição
let currentSort = { col: 'data_infracao', order: 'desc' }; // State de Ordenação

// --- API Service ---
// API Service extracted to /js/services/MultasAPI.js (Globally available as window.API)

// --- Controllers ---

// Campos que devem ser travados quando "Pago Órgão" estiver marcado
let FIELDS_TO_LOCK = [];

function toggleFormLock(locked) {
    FIELDS_TO_LOCK.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            // Allow edit of observations always (or handle differently), but locking main fields
            if (id === 'observacoes') return; // Keep Obs open for appending if needed or handle logic above

            el.disabled = locked;
            // Opcional: Adicionar estilo visual de "readonly"
            if (locked) el.style.backgroundColor = '#f0f0f0';
            else el.style.backgroundColor = '';
        }
    });

    // Special handling for Observations: should be ReadOnly if locked, but script appends
    const obs = document.getElementById('observacoes');
    if (obs) {
        obs.readOnly = locked; // Use readOnly attribute instead of disabled for textareas usually
    }
}

// Dashboard Logic extracted to /js/modules/DashboardModule.js

// Function placeholder to support older calls if any remain (though init handles it)
function carregarDashboard() {
    return DashboardModule.carregar();
}

async function carregarListasAuxiliares() {
    try {
        const [veiculos, clientes] = await Promise.all([
            API.getVeiculos(),
            API.getClientes()
        ]);

        const dlVeiculos = document.getElementById('lista-veiculos');
        dlVeiculos.innerHTML = '';
        veiculos.forEach(v => {
            const op = document.createElement('option');
            op.value = v.placa;
            op.textContent = `${v.modelo} (${v.placa})`;
            dlVeiculos.appendChild(op);
        });

        const dlClientes = document.getElementById('lista-clientes');
        dlClientes.innerHTML = '';
        clientes.forEach(c => {
            const op = document.createElement('option');
            op.value = c.nome;
            dlClientes.appendChild(op);
        });

    } catch (e) {
        console.error('Erro ao carregar listas auxiliares:', e);
    }
}

async function carregarLista() {
    const tbody = document.getElementById('lista-multas');
    tbody.innerHTML = '<tr><td colspan="12">Carregando...</td></tr>';

    try {
        const searchInput = document.getElementById('smart-search-input');
        const activeFilterBtn = document.querySelector('.filter-chip.active'); // NEW: Get active filter

        const filters = {
            search: searchInput ? searchInput.value : '', // Busca global
            filtro_rapido: activeFilterBtn ? activeFilterBtn.dataset.filter : 'todos', // NEW: Send filter
            // Filtros de Data
            data_inicio: document.getElementById('list-data-inicio').value,
            data_fim: document.getElementById('list-data-fim').value,
            tipo_data: document.getElementById('list-tipo-data').value,
            // Ordenação
            sort_by: currentSort.col,
            order: currentSort.order
        };

        const lista = await API.getList(filters);

        // Atualizar Ícones de Ordenação Visualmente
        updateSortIcons();
        tbody.innerHTML = '';

        // Atualizar Contador
        const contador = document.getElementById('contador-multas');
        if (contador) contador.textContent = lista.length;

        if (lista.length === 0) {
            tbody.innerHTML = '<tr><td colspan="12" style="text-align:center;">Nenhuma multa encontrada com os filtros atuais.</td></tr>';
            return;
        }

        lista.forEach(m => {
            // ... (Render loop remains same)
            const tr = document.createElement('tr');
            tr.style.cursor = 'pointer'; // Indicar clicável
            tr.onclick = (e) => {
                // Ignorar clique se for no botão de excluir
                if (e.target.tagName === 'BUTTON') return;
                abrirModalDetalhes(m);
            };

            // Definir Status
            // Definir Status
            const S_LABELS = Constants.get('STATUS_MULTAS_LABELS');
            let statusBadge = `<span class="badge badge-open">${S_LABELS.aberto}</span>`;

            if (m.convertido_advertencia) statusBadge = `<span class="badge badge-exempt">${S_LABELS.isento || 'Isento'}</span>`;
            else if (m.data_pagamento_orgao) statusBadge = `<span class="badge badge-payed">${S_LABELS.pago}</span>`;
            else if (new Date(m.data_vencimento) < new Date()) statusBadge = `<span class="badge badge-late">${S_LABELS.vencido}</span>`;

            tr.innerHTML = `
                <td style="text-align:center;">${m.numero_auto}</td>
                <td style="text-align:center;">${m.renainf || '-'}</td>
                <td style="text-align:center;">${m.veiculo_id}</td>
                <td style="text-align:center;">${formatDate(m.data_infracao)}</td>
                <td style="text-align:center;">${formatDate(m.data_vencimento)}</td>
                <td style="text-align:center;">${formatCurrency(m.valor_original)}</td>
                <td style="text-align:center; font-weight: bold; color: #27ae60;">${formatCurrency(m.valor_com_desconto)}</td>
                <td>${m.tipo_responsavel === Constants.get('TIPOS_RESPONSAVEL').CLIENTE ? (m.cliente_nome || Constants.get('TIPOS_RESPONSAVEL_LABELS').cliente) : Constants.get('TIPOS_RESPONSAVEL_LABELS').locadora}</td>
                <td style="text-align:center;">${m.foi_indicado ? '✅' : '-'}</td>
                <td style="text-align:center;">${m.reconheceu ? '✅' : '-'}</td>
                <td style="text-align:center;">${m.data_lancamento_carteira ? '✅' : '-'}</td>
                <td style="text-align:center;">${statusBadge}</td>
                <td style="text-align:center;">
                    <button class="btn-icon-delete" title="Excluir Multa" onclick="excluirMulta(${m.id})">🗑️</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Atualizar Somatório (Rodapé de Impressão)
        const totalOriginal = lista.reduce((sum, m) => sum + parseFloat(m.valor_original || 0), 0);
        const totalPagar = lista.reduce((sum, m) => sum + parseFloat(m.valor_com_desconto || m.valor_original || 0), 0);

        const elTotalOrig = document.getElementById('total-valor-original');
        const elTotalPagar = document.getElementById('total-valor-pagar');

        if (elTotalOrig) elTotalOrig.textContent = formatCurrency(totalOriginal);
        if (elTotalPagar) elTotalPagar.textContent = formatCurrency(totalPagar);
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="12" style="color:red">Erro ao carregar</td></tr>';
    }
}

// Listeners Quick Filters (Moved to setupListeners) - Mantido comentário original
document.getElementById('btn-filtrar-lista').onclick = carregarLista;
document.getElementById('btn-limpar-filtros').onclick = () => {
    document.getElementById('list-data-inicio').value = '';
    document.getElementById('list-data-fim').value = '';
    document.getElementById('list-tipo-data').value = 'infracao';
    carregarLista();
};

// Função de Ordenação
window.changeSort = function (col) {
    if (currentSort.col === col) {
        // Toggle Order
        currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
    } else {
        // New Column
        currentSort.col = col;
        currentSort.order = 'asc'; // Default asc for new col
    }
    carregarLista();
};

function updateSortIcons() {
    // Limpar todos
    const icons = document.querySelectorAll('[id^=sort-icon-]');
    icons.forEach(el => el.textContent = '');

    // Setar atual
    const iconEl = document.getElementById(`sort-icon-${currentSort.col}`);
    if (iconEl) {
        iconEl.textContent = currentSort.order === 'asc' ? '▲' : '▼';
    }
}

// Listeners Analíticos
document.getElementById('btn-filtrar-analytics').onclick = carregarDashboard;




async function abrirModalDetalhes(mInput) {
    let m = mInput;
    // Se recebeu apenas ID, busca via API
    if (typeof mInput === 'number' || typeof mInput === 'string') {
        try {
            m = await API.getById(mInput);
        } catch (e) {
            console.error('Erro ao buscar detalhes:', e);
            alert('Erro ao carregar detalhes da multa.');
            return;
        }
    }
    // Popula Modal de Detalhes
    if (m && m.id) {
        document.getElementById('modal-detalhes').dataset.id = m.id;
    }
    document.getElementById('detalhe-titulo').textContent = `Multa ${m.numero_auto} `;
    document.getElementById('d-auto').textContent = m.numero_auto;
    document.getElementById('d-renainf').textContent = m.renainf || '-';
    document.getElementById('d-placa').textContent = m.veiculo_id;
    document.getElementById('d-infracao').textContent = formatDate(m.data_infracao);
    document.getElementById('d-vencimento').textContent = formatDate(m.data_vencimento);
    document.getElementById('d-orgao').textContent = m.orgao_autuador;
    document.getElementById('d-valor').textContent = formatCurrency(m.valor_original);
    document.getElementById('d-valor-desconto').textContent = formatCurrency(m.valor_com_desconto || m.valor_original);
    document.getElementById('d-valor-cobrar').textContent = formatCurrency(m.valor_a_cobrar || m.valor_original);
    document.getElementById('d-responsavel').textContent = m.tipo_responsavel === Constants.get('TIPOS_RESPONSAVEL').CLIENTE ? Constants.get('TIPOS_RESPONSAVEL_LABELS').cliente : Constants.get('TIPOS_RESPONSAVEL_LABELS').locadora;
    document.getElementById('d-condutor').textContent = m.cliente_nome || '-';

    const isLocadora = m.tipo_responsavel === Constants.get('TIPOS_RESPONSAVEL').LOCADORA;

    // Toggle Visual Elements based on Responsibility
    const divIndicado = document.getElementById('div-indicado');
    const divTaxa = document.getElementById('div-taxa'); // Assuming parent div exists with ID
    const containerCobrar = document.getElementById('container-valor-cobrar');
    const labelResponsavel = document.getElementById('d-responsavel');
    const containerCondutor = document.getElementById('container-condutor');
    const containerCobrado = document.getElementById('container-cobrado-cliente');

    // Values
    document.getElementById('d-indicado').textContent = m.foi_indicado ? 'Sim' : 'Não';
    document.getElementById('d-reconheceu').textContent = m.reconheceu ? 'Sim' : 'Não';
    document.getElementById('d-taxa').textContent = m.cobrar_taxa_administrativa ? 'Sim' : 'Não';

    if (isLocadora) {
        if (divIndicado) divIndicado.style.display = 'none';
        if (divTaxa) divTaxa.style.display = 'none';
        if (containerCobrar) containerCobrar.style.visibility = 'hidden';
        if (labelResponsavel) labelResponsavel.style.color = '#e44d26';

        // Hide Conductor and Client Charge for Locadora
        if (containerCondutor) containerCondutor.style.visibility = 'hidden';
        if (containerCobrado) containerCobrado.style.display = 'none';
    } else {
        if (divIndicado) divIndicado.style.display = 'block';
        if (divTaxa) divTaxa.style.display = 'block';
        if (containerCobrar) containerCobrar.style.visibility = 'visible';
        if (labelResponsavel) labelResponsavel.style.color = '';

        if (containerCondutor) containerCondutor.style.visibility = 'visible';
        if (containerCobrado) containerCobrado.style.display = 'block'; // Or flex/grid depending on CSS, but block usually works for div visibility toggle
        // Resetting display style to empty string is safer to revert to stylesheet
        if (containerCobrado) containerCobrado.style.display = '';
    }

    // Badge Status
    const statusEl = document.getElementById('detalhe-status');
    const S_LABELS_DET = Constants.get('STATUS_MULTAS_LABELS');

    if (m.convertido_advertencia) {
        statusEl.className = 'badge badge-exempt';
        statusEl.textContent = S_LABELS_DET.isento || 'Isento';
    } else if (m.data_pagamento_orgao) {
        statusEl.className = 'badge badge-payed';
        statusEl.textContent = S_LABELS_DET.pago;
    } else if (new Date(m.data_vencimento) < new Date()) {
        statusEl.className = 'badge badge-late';
        statusEl.textContent = S_LABELS_DET.vencido;
    } else {
        statusEl.className = 'badge badge-open';
        statusEl.textContent = S_LABELS_DET.aberto;
    }

    // Financeiro Details Logic
    const dPagoStatus = document.getElementById('d-pago-status');
    const dPagoDetalhes = document.getElementById('d-pago-detalhes');
    if (m.data_pagamento_orgao) {
        dPagoStatus.textContent = 'Sim (Pago)';
        dPagoStatus.style.color = 'green';
        document.getElementById('d-pago-data').textContent = formatDate(m.data_pagamento_orgao);
        document.getElementById('d-pago-valor').textContent = formatCurrency(m.valor_pago_orgao);
        dPagoDetalhes.style.display = 'block';
    } else {
        dPagoStatus.textContent = 'Não';
        dPagoStatus.style.color = '#c0392b';
        dPagoDetalhes.style.display = 'none';
    }

    const dCobradoStatus = document.getElementById('d-cobrado-status');
    const dCobradoDetalhes = document.getElementById('d-cobrado-detalhes');
    const dCobradoActions = document.getElementById('d-cobrado-actions');

    // Reset previous state
    if (dCobradoActions) {
        dCobradoActions.innerHTML = '';
        dCobradoActions.style.display = 'none';
    }
    dCobradoDetalhes.style.display = 'none';

    if (m.data_lancamento_carteira) {
        dCobradoStatus.textContent = 'Sim (Lançado)';
        dCobradoStatus.style.color = 'blue';
        document.getElementById('d-cobrado-data').textContent = formatDate(m.data_lancamento_carteira);
        document.getElementById('d-cobrado-valor').textContent = formatCurrency(m.valor_lancado_carteira);
        dCobradoDetalhes.style.display = 'block';
    } else {
        dCobradoStatus.textContent = 'Pendente';
        dCobradoStatus.style.color = '#f39c12';

        // Inject Launch Button if Client responsible and not yet launched AND not warning
        const isAdvertencia = !!m.convertido_advertencia;
        const temValorACobrar = (m.valor_a_cobrar || 0) > 0;

        if (m.tipo_responsavel === 'cliente' && dCobradoActions && !isAdvertencia && temValorACobrar) {
            dCobradoActions.innerHTML = `<button class="btn-sm" style="margin-top:5px; background:#e67e22; color:white; border:none;" onclick='window.abrirModalLancamento(${JSON.stringify(m).replace(/'/g, "&#39;")})'>💸 Lançar na Carteira</button>`;
            dCobradoActions.style.display = 'block';
        }
    }

    // Botão Editar
    document.getElementById('btn-editar-visual').onclick = () => {
        document.getElementById('modal-detalhes').style.display = 'none';
        setTimeout(() => {
            try {
                abrirModalEdicao(m);
            } catch (e) {
                alert('Erro ao abrir edição: ' + e.message);
                console.error(e);
            }
        }, 200);
    };

    document.getElementById('modal-detalhes').style.display = 'flex';
}

function abrirModalEdicao(m) {
    currentMultaId = m.id;
    const tituloEl = document.getElementById('modal-titulo');
    if (tituloEl) tituloEl.textContent = 'Editar Multa';

    document.getElementById('placa').value = m.veiculo_id;
    document.getElementById('numero_auto').value = m.numero_auto;
    document.getElementById('renainf').value = m.renainf || '';
    document.getElementById('data_infracao').value = m.data_infracao; // Assumindo YYYY-MM-DD do servidor
    document.getElementById('valor_original').value = m.valor_original;
    document.getElementById('orgao_autuador').value = m.orgao_autuador;
    document.getElementById('data_vencimento').value = m.data_vencimento;
    document.getElementById('tipo_responsavel').value = m.tipo_responsavel;
    document.getElementById('cliente_nome').value = m.cliente_nome || '';
    document.getElementById('observacoes').value = m.observacoes || '';

    // Visibilidade inicial do condutor
    // Configurar visibilidade baseada no responsável (Locadora vs Cliente)
    toggleClienteInput(m.tipo_responsavel);

    // LOGIC: Lock fields if launched to wallet
    const isLaunched = !!m.data_lancamento_carteira;
    const formFields = document.querySelectorAll('#form-multa input, #form-multa select, #form-multa textarea');
    const btnSalvar = document.querySelector('#form-multa button[type="submit"]');

    formFields.forEach(field => {
        // EXCEPTION: Allow changing Payment Status (for audit/reopen) even if launched
        // EXCEPTION: Allow editing RENAINF (often added later)
        if (field.id === 'check-pago-orgao' || field.id === 'renainf') return;

        field.disabled = isLaunched;
    });

    if (btnSalvar) {
        // Allow save button to remain visible so we can save the payment status change
        // But maybe we should block other edits in backend? 
        // For now, let's keep it visible but maybe validation on submit will handle.
        // Actually, if we disable all other fields, the submit will only send enabled ones usually, 
        // but let's ensure the user can actually click save.
        // If isLaunched, we usually hide it. Let's SHOW it if we want to allow uncheck payment.
        // BUT, if we uncheck payment, we might want to uncheck launched? No, that's complex.
        // Let's just allow the button to be visible.
        btnSalvar.style.display = 'block';
        if (isLaunched) {
            btnSalvar.textContent = 'Salvar Alteração de Pagamento';
        } else {
            btnSalvar.textContent = 'Salvar';
        }
    }

    if (isLaunched && typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'Multa Lançada',
            text: 'Esta multa já foi lançada na carteira e não pode ser editada na origem.',
            icon: 'info',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
        });
    }

    document.getElementById('foi_indicado').checked = !!m.foi_indicado;
    document.getElementById('reconheceu').checked = !!m.reconheceu;
    // (O toggleClienteInput já cuida do display base dos containers, mas garantimos o estado dos inputs acima)

    document.getElementById('desconto_aplicado').value = (m.desconto_aplicado !== undefined && m.desconto_aplicado !== null) ? m.desconto_aplicado : 0;
    // Marcar como modificado pelo usuário se já tiver valor, para evitar recálculo automático
    if (m.desconto_aplicado !== undefined) {
        document.getElementById('desconto_aplicado').dataset.userModified = 'true';
    }
    document.getElementById('cobrar_taxa').checked = !!m.cobrar_taxa_administrativa;
    document.getElementById('convertido_advertencia').checked = !!m.convertido_advertencia;
    updateAdvertenciaUi(!!m.convertido_advertencia);

    // Forçar recálculo APENAS se for nova multa ou sem desconto definido
    if (!currentMultaId) {
        setTimeout(() => {
            document.getElementById('data_vencimento').dispatchEvent(new Event('change'));
        }, 100);
    } else {
        // Se for edição, apenas atualizar os totais visuais sem mudar a %
        setTimeout(() => {
            atualizarTotaisPreview();
        }, 100);
    }

    // Financeiro (Toggle & Populate)
    const checkPagoOrgao = document.getElementById('check-pago-orgao');
    const containerPagoOrgao = document.getElementById('container-pago-orgao');

    // Event listener is handled centrally in setupListeners()
    // Initial state setup is below
    const checkCarteira = document.getElementById('check-lancado-carteira');
    const containerCarteira = document.getElementById('container-lancado-carteira');

    // Reset fields se vazio
    document.getElementById('data_pagamento_orgao').value = m.data_pagamento_orgao || '';
    document.getElementById('valor_pago_orgao').value = m.valor_pago_orgao || '';
    document.getElementById('data_lancamento_carteira').value = m.data_lancamento_carteira || '';
    document.getElementById('valor_lancado_carteira').value = m.valor_lancado_carteira || '';

    // Estado inicial dos checkers
    checkPagoOrgao.checked = !!m.data_pagamento_orgao;
    containerPagoOrgao.style.display = checkPagoOrgao.checked ? 'block' : 'none';

    // Aplicar bloqueio inicial se já estiver pago
    toggleFormLock(checkPagoOrgao.checked);

    checkCarteira.checked = !!m.data_lancamento_carteira;
    containerCarteira.style.display = checkCarteira.checked ? 'flex' : 'none';

    // Guardar dados para auto-fill
    // (Poderíamos usar atributos data- ou variaveis globais temporarias)
    document.getElementById('form-multa').dataset.valorOriginal = m.valor_original;
    document.getElementById('form-multa').dataset.valorCobrar = m.valor_a_cobrar || m.valor_original; // valor_a_cobrar vem do toJSON se disponível, senão original

    document.getElementById('modal-multa').style.display = 'flex';
}

// Helper Toggle Cliente (e UI Responsável)
function toggleClienteInput(tipo) {
    const groupCliente = document.getElementById('group-cliente');
    const inputCliente = document.getElementById('cliente_nome');
    const containerIndicado = document.getElementById('container-indicado');
    const containerReconheceu = document.getElementById('container-reconheceu');
    const checkIndicado = document.getElementById('foi_indicado');

    // Novos grupos para toggle
    const groupTaxas = document.getElementById('group-taxas');
    const groupCobrar = document.getElementById('group-cobrar-preview');

    // Toggle Carteira (Locadora não tem carteira)
    const wrapperCarteira = document.getElementById('wrapper-check-carteira');
    const checkCarteira = document.getElementById('check-lancado-carteira');
    const containerCarteira = document.getElementById('container-lancado-carteira');

    if (tipo === Constants.get('TIPOS_RESPONSAVEL').CLIENTE) {
        // Modo Cliente
        groupCliente.style.visibility = 'visible';
        containerIndicado.style.display = 'inline';

        // Agora Reconheceu fica sempre ativo para Clientes (Skip workflow obrigatório)
        containerReconheceu.style.display = 'inline-block';

        // Mostra Financeiro Cliente e Opção de Lançar na Carteira
        if (groupTaxas) groupTaxas.style.display = 'flex';
        if (groupCobrar) groupCobrar.style.visibility = 'visible';
        if (wrapperCarteira) wrapperCarteira.style.display = 'block';

    } else {
        // Modo Locadora
        groupCliente.style.visibility = 'hidden';
        inputCliente.value = ''; // Limpa nome

        // Esconde "Indicado" e mostra "Reconheceu" direto
        containerIndicado.style.display = 'none';
        checkIndicado.checked = false; // Locadora não é "indicada", ela assume direto
        containerReconheceu.style.display = 'inline-block';

        // Esconde Financeiro Cliente
        if (groupTaxas) groupTaxas.style.display = 'none';
        if (groupCobrar) groupCobrar.style.visibility = 'hidden';

        // Esconde Lançamento na Carteira
        if (wrapperCarteira) wrapperCarteira.style.display = 'none';
        if (checkCarteira) {
            checkCarteira.checked = false;
            // Dispara evento para esconder o container de inputs (data/ valor)
            checkCarteira.dispatchEvent(new Event('change'));
        }
    }

    // Recalcular totais (pois se virou locadora, cobrar deve ir pra 0)
    if (typeof atualizarTotaisPreview === 'function') {
        atualizarTotaisPreview();
    }
}

// [REMOVED] recalcularDesconto: Regras de negócio movidas para o Backend (MultaService). 
// O frontend não deve alterar valores automaticamente com base em regras.

function atualizarTotaisPreview() {
    const valorOriginal = parseFloat(document.getElementById('valor_original').value) || 0;
    const desconto = parseInt(document.getElementById('desconto_aplicado').value) || 0;
    const cobrarTaxa = document.getElementById('cobrar_taxa').checked;
    const tipoResponsavel = document.getElementById('tipo_responsavel').value;
    const isAdvertencia = document.getElementById('convertido_advertencia').checked;

    let valComDesconto = valorOriginal * (1 - desconto / 100);
    let valACobrar = valComDesconto;

    if (cobrarTaxa) {
        valACobrar += (valComDesconto * 0.15);
    }

    if (tipoResponsavel === Constants.get('TIPOS_RESPONSAVEL').LOCADORA) {
        valACobrar = 0;
    }

    // Logic Advertência
    if (isAdvertencia) {
        valComDesconto = 0;
        valACobrar = 0;
    }

    document.getElementById('calc_valor_desconto').value = formatCurrency(valComDesconto);
    document.getElementById('calc_valor_cobrar').value = formatCurrency(valACobrar);

    // Updates Visual styles
    const prevBoxes = document.querySelectorAll('.preview-box');
    prevBoxes.forEach(b => {
        if (isAdvertencia) b.style.opacity = '0.5';
        else b.style.opacity = '1';
    });

    document.getElementById('form-multa').dataset.valorOriginal = valorOriginal;
    document.getElementById('form-multa').dataset.valorPagar = valComDesconto.toFixed(2);
    document.getElementById('form-multa').dataset.valorCobrar = valACobrar.toFixed(2);
}

function updateAdvertenciaUi(isChecked) {
    const sectionBaixa = document.getElementById('section-baixa-financeira');
    const groupDesconto = document.getElementById('group-desconto');
    const groupTaxas = document.getElementById('group-taxas');
    const groupPagar = document.getElementById('group-pagar-preview');
    const groupCobrar = document.getElementById('group-cobrar-preview');

    // Elements to reset/disable
    const checkPago = document.getElementById('check-pago-orgao');
    const checkTaxa = document.getElementById('cobrar_taxa');
    const checkReconheceu = document.getElementById('reconheceu');
    const selDesconto = document.getElementById('desconto_aplicado');
    const checkCarteira = document.getElementById('check-lancado-carteira');

    if (isChecked) {
        // HIDE SECTIONS
        if (sectionBaixa) sectionBaixa.style.display = 'none';
        if (groupDesconto) groupDesconto.style.display = 'none';
        if (groupTaxas) groupTaxas.style.display = 'none';
        if (groupPagar) groupPagar.style.display = 'none';
        if (groupCobrar) groupCobrar.style.display = 'none';

        // Desabilitar e Limpar tudo (Dados)
        if (checkPago) {
            checkPago.checked = false;
            checkPago.disabled = true;
            // Container logic handled by hiding the whole section, so internal toggle is redundant but safe
            const containerPago = document.getElementById('container-pago-orgao');
            if (containerPago) containerPago.style.display = 'none';
        }

        if (checkTaxa) {
            checkTaxa.checked = false;
            checkTaxa.disabled = true;
        }

        if (checkReconheceu) {
            checkReconheceu.checked = false;
            checkReconheceu.disabled = true;
            const containerRec = document.getElementById('container-reconheceu');
            if (containerRec) containerRec.style.display = 'none';
        }

        if (selDesconto) {
            selDesconto.value = "0";
            selDesconto.disabled = true;
        }

        if (checkCarteira) {
            checkCarteira.checked = false;
            checkCarteira.disabled = true;
            const containerCart = document.getElementById('container-lancado-carteira');
            if (containerCart) containerCart.style.display = 'none';
        }

    } else {
        // SHOW SECTIONS
        if (sectionBaixa) sectionBaixa.style.display = 'block';
        if (groupDesconto) groupDesconto.style.display = 'block';
        if (groupTaxas) groupTaxas.style.display = 'block';
        if (groupPagar) groupPagar.style.display = '';
        if (groupCobrar) groupCobrar.style.display = '';

        // Logic for 'A Cobrar' visibility specifically relies on Client vs Locadora too.
        // So we shouldn't force it to 'block' if it should be hidden by Locadora logic.
        // Calling toggleClienteInput again might be overkill or safe?
        // Let's just reset the "force hide" from warning.
        // Use visibility hidden for layout preservation? Or display none?
        // User asked to hide.
        // We set display=''. 
        // If Locadora logic hid it (visibility:hidden usually in toggleClienteInput), we should respect that.
        // toggleClienteInput sets visibility, not display usually.
        // Let's trigger a logic refresh for visibility
        const tipo = document.getElementById('tipo_responsavel').value;
        toggleClienteInput(tipo); // This re-applies Client/Locadora visibility rules

        // Reabilitar Inputs
        if (checkPago) checkPago.disabled = false;
        if (checkTaxa) checkTaxa.disabled = false;
        if (checkReconheceu) checkReconheceu.disabled = false;
        if (selDesconto) selDesconto.disabled = false;

        if (checkCarteira) {
            checkCarteira.disabled = false;
        }
    }
}

function setupListeners() {
    // Toggles Financeiros
    document.getElementById('check-pago-orgao').onchange = (e) => {
        const isChecked = e.target.checked;
        const container = document.getElementById('container-pago-orgao');

        // REOPEN CHECK (Audit Trail)
        // REOPEN CHECK (Audit Trail)
        if (!isChecked && currentMultaId) {
            // Use setTimeout to allow UI to update before blocking with prompt
            // and to ensure rollback works if cancelled
            setTimeout(() => {
                const motivo = prompt("Qual o motivo para reabrir este pagamento? (Ficará registrado)");
                if (!motivo || motivo.trim() === "") {
                    // Rollback
                    document.getElementById('check-pago-orgao').checked = true;
                    document.getElementById('container-pago-orgao').style.display = 'flex'; // Ensure container stays visible
                    return;
                }

                // Audit Log
                const obsInput = document.getElementById('observacoes');
                const now = new Date().toLocaleString('pt-BR');
                const log = `\n[REABERTO EM ${now}] Motivo: ${motivo}`;
                obsInput.value += log;
                toggleFormLock(false);
            }, 10);

            // Initial visual hide (will be reverted if prompt cancelled)
            container.style.display = 'none';
        } else if (isChecked) {
            container.style.display = 'flex';
            toggleFormLock(true);
        }

        if (isChecked) {
            // Auto-fill se vazio
            const dtInput = document.getElementById('data_pagamento_orgao');
            const valInput = document.getElementById('valor_pago_orgao');

            if (!dtInput.value) {
                const vencimento = document.getElementById('data_vencimento').value;
                if (vencimento) {
                    dtInput.value = vencimento;
                } else {
                    dtInput.value = new Date().toISOString().split('T')[0];
                }
            }
            if (!valInput.value) {
                // Traz o valor calculado com desconto (valor a pagar)
                valInput.value = document.getElementById('form-multa').dataset.valorPagar;
            }
        }
    };

    /* 
    // REMOVED MANUAL TOGGLE: Lançamento deve ser feito via botão dedicado para gerar Débito
    document.getElementById('check-lancado-carteira').onchange = (e) => {
       // ... logic removed ...
    };
    */


    // Listeners para Desconto e Totais
    const elValorOriginal = document.getElementById('valor_original');
    const elCobrarTaxa = document.getElementById('cobrar_taxa');

    if (elValorOriginal) elValorOriginal.addEventListener('input', atualizarTotaisPreview);
    if (elCobrarTaxa) elCobrarTaxa.addEventListener('change', atualizarTotaisPreview);

    // Listeners para Desconto
    const elVencimento = document.getElementById('data_vencimento');
    const elReconheceu = document.getElementById('reconheceu');
    const elIndicado = document.getElementById('foi_indicado'); // NEW

    // [REMOVED] Listeners de regras automáticas (backend validation only)

    const elDesconto = document.getElementById('desconto_aplicado');
    if (elDesconto) {
        elDesconto.onchange = () => {
            elDesconto.dataset.userModified = 'true';
            atualizarTotaisPreview();
        };
    }

    // Listener Dependência Indicado -> Reconheceu
    if (elIndicado) {
        elIndicado.onchange = (e) => {
            const container = document.getElementById('container-reconheceu');
            const checkReconheceu = document.getElementById('reconheceu');

            if (e.target.checked) {
                container.style.display = 'inline-block';
            } else {
                // Para clientes, o campo permanece ativo mesmo desmarcando 'Indicado'
                const tipo = document.getElementById('tipo_responsavel').value;
                if (tipo !== Constants.get('TIPOS_RESPONSAVEL').CLIENTE) {
                    container.style.display = 'none';
                    checkReconheceu.checked = false;
                    checkReconheceu.dispatchEvent(new Event('change'));
                }
            }
        };
    }

    // Listener para Advertência
    const elAdvertencia = document.getElementById('convertido_advertencia');
    if (elAdvertencia) {
        elAdvertencia.addEventListener('change', (e) => {
            const isChecked = e.target.checked;

            // Campos afetados
            const checkPago = document.getElementById('check-pago-orgao');
            updateAdvertenciaUi(isChecked);
            atualizarTotaisPreview();

            // Auto-append observation if checked and not already present
            const obsInput = document.getElementById('observacoes');
            const suffix = " [CONVERTIDO EM ADVERTÊNCIA]";
            if (isChecked) {
                if (!obsInput.value.includes(suffix)) {
                    obsInput.value = (obsInput.value + suffix).trim();
                }
            } else {
                obsInput.value = obsInput.value.replace(suffix, '').trim();
            }

            atualizarTotaisPreview();
        });
    }

    // Toggle Responsável -> Cliente Input

    // Toggle Responsável -> Cliente Input
    const elTipoResponsavel = document.getElementById('tipo_responsavel');
    if (elTipoResponsavel) {
        elTipoResponsavel.onchange = (e) => {
            toggleClienteInput(e.target.value);
        };
    }
}

document.getElementById('btn-nova-multa').onclick = () => {
    currentMultaId = null;
    document.getElementById('modal-titulo').textContent = 'Nova Multa';
    document.getElementById('form-multa').reset();

    const selectDesconto = document.getElementById('desconto_aplicado');
    if (selectDesconto) selectDesconto.dataset.userModified = 'false';

    // Reset Visuals
    document.getElementById('container-reconheceu').style.display = 'none';
    toggleClienteInput(Constants.get('TIPOS_RESPONSAVEL').CLIENTE); // Default é cliente

    // Reset Toggles
    document.getElementById('check-pago-orgao').checked = false;
    document.getElementById('container-pago-orgao').style.display = 'none';
    document.getElementById('check-lancado-carteira').checked = false;
    document.getElementById('container-lancado-carteira').style.display = 'none';

    // Unlock form and Reset Button
    toggleFormLock(false);
    const formFields = document.querySelectorAll('#form-multa input, #form-multa select, #form-multa textarea');
    formFields.forEach(f => f.disabled = false); // Force enable all just in case

    const btnSalvar = document.querySelector('#form-multa button[type="submit"]');
    if (btnSalvar) {
        btnSalvar.style.display = 'block';
        btnSalvar.textContent = 'Salvar';
    }

    document.getElementById('modal-multa').style.display = 'flex';
};

document.getElementById('form-multa').onsubmit = async (e) => {
    e.preventDefault();

    // Se checkbox desmarcado, enviar null
    const isPago = document.getElementById('check-pago-orgao').checked;
    const isLancado = document.getElementById('check-lancado-carteira').checked;

    const data = {
        veiculo_id: document.getElementById('placa').value,
        numero_auto: document.getElementById('numero_auto').value,
        renainf: document.getElementById('renainf').value,
        data_infracao: document.getElementById('data_infracao').value,
        valor_original: parseFloat(document.getElementById('valor_original').value),
        orgao_autuador: document.getElementById('orgao_autuador').value,
        data_vencimento: document.getElementById('data_vencimento').value,
        tipo_responsavel: document.getElementById('tipo_responsavel').value,
        cliente_nome: document.getElementById('cliente_nome').value || null,
        foi_indicado: document.getElementById('foi_indicado').checked,
        reconheceu: document.getElementById('reconheceu').checked,
        observacoes: document.getElementById('observacoes').value,
        desconto_aplicado: parseInt(document.getElementById('desconto_aplicado').value),
        desconto_aplicado: parseInt(document.getElementById('desconto_aplicado').value),
        cobrar_taxa_administrativa: document.getElementById('cobrar_taxa').checked,
        convertido_advertencia: document.getElementById('convertido_advertencia').checked,
        // Financeiro condicional
        data_pagamento_orgao: isPago ? document.getElementById('data_pagamento_orgao').value : null,
        valor_pago_orgao: isPago ? parseFloat(document.getElementById('valor_pago_orgao').value) : null,
        data_lancamento_carteira: isLancado ? document.getElementById('data_lancamento_carteira').value : null,
        valor_lancado_carteira: isLancado ? parseFloat(document.getElementById('valor_lancado_carteira').value) : null
    };

    try {
        console.log('Dados a serem enviados:', data);

        if (currentMultaId) {
            await API.update(currentMultaId, data);
        } else {
            await API.create(data);
        }

        console.log('Salvamento concluído no servidor.');

        // Feedback Visual imediato: fechar modal e recarregar dados
        window.closeModal();
        carregarLista();
        carregarDashboard();

    } catch (err) {
        console.error('Erro no fluxo de salvamento:', err);
        let msg = err.message;
        try {
            const errorObj = JSON.parse(err.message);
            if (errorObj.errors) {
                msg = errorObj.errors.map(e => e.msg).join('\n');
            } else if (errorObj.error) {
                msg = errorObj.error;
            }
        } catch (e) { }

        if (window.SystemAlert) {
            if (msg.toLowerCase().includes('unique') || msg.toLowerCase().includes('já existe')) {
                window.SystemAlert.warning('Atenção: ' + msg);
            } else {
                window.SystemAlert.error('Erro ao salvar: ' + msg);
            }
        } else {
            alert('Erro ao salvar: ' + msg);
        }
    }
};

// Listeners Analíticos
document.getElementById('btn-filtrar-analytics').onclick = carregarDashboard;

// Listeners Busca Inteligente
const smartInput = document.getElementById('smart-search-input');
const smartBtn = document.getElementById('btn-smart-search');

if (smartInput) {
    const handleContextSearch = () => {
        const dashboardTab = document.getElementById('tab-dashboard');
        if (dashboardTab && dashboardTab.classList.contains('active')) {
            carregarDashboard();
        } else {
            // Se estiver na Lista e digitou algo, limpar filtros de data para não restringir
            if (smartInput.value.trim() !== '') {
                document.getElementById('list-data-inicio').value = '';
                document.getElementById('list-data-fim').value = '';

                // Resetar Filtros Rápidos para 'Todos'
                document.querySelectorAll('.filter-chip').forEach(btn => btn.classList.remove('active'));
                const btnTodos = document.querySelector('.filter-chip[data-filter="todos"]');
                if (btnTodos) btnTodos.classList.add('active');
            }
            carregarLista();
        }
    };

    if (smartInput) {
        smartInput.onkeypress = (e) => {
            if (e.key === 'Enter') handleContextSearch();
        };
    }

    if (smartBtn) {
        smartBtn.onclick = handleContextSearch;
    }

    // Reports Drawer
    const btnRelatorios = document.getElementById('btn-relatorios');
    const drawerRelatorios = document.getElementById('drawer-relatorios');
    if (btnRelatorios) {
        btnRelatorios.onclick = () => drawerRelatorios.style.display = 'flex';
    }
}

// Quick Filters Listeners (Removed - Using Event Delegation below)

window.closeModal = () => {
    document.getElementById('modal-multa').style.display = 'none';
    document.getElementById('form-multa').reset();
    currentMultaId = null;
};

window.excluirMulta = async (id) => {
    // Stop propagation handled in onclick wrapper
    if (confirm('Confirmar exclusão?')) {
        await API.delete(id);
        carregarLista();
        carregarDashboard();
    }
};

window.switchTab = (tabName) => {
    // Remove active from all tabs
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    // Activate specific tab
    // Find button (by onclick text logic or simple order? Better to use querySelector if I could, but here relies on onclick context or index. 
    // Actually, to keep simple, I'll select by text content or index?
    // Let's assume the button calling this adds 'active' to itself? No, simpler:
    // Adding ID to buttons would be best, but let's iterate.

    // Better strategy: Add event click logic in setupListeners instead of inline onclick? 
    // The user provided inline onclick="switchTab('lista')".
    // So I need to find the button that called it? No, passed arg.

    // Let's just activate content by ID
    const contentId = `tab-${tabName}`;
    document.getElementById(contentId).classList.add('active');

    // Activate Button? I need to know which button.
    // Let's iterate buttons and check their onclick attribute text? Hacky.
    // Let's add IDs to buttons in the view? Or just use text.

    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(btn => {
        if (btn.getAttribute('onclick').includes(tabName)) {
            btn.classList.add('active');
        }
    });

    // Se tab for dashboard, carrega dados e esconde controles de lista
    const btnNova = document.getElementById('btn-nova-multa');
    const searchBar = document.querySelector('.smart-search'); // Wrapper class

    if (tabName === 'dashboard') {
        carregarDashboard();
        if (btnNova) btnNova.style.display = 'none';
        // if (searchBar) searchBar.style.display = 'none'; // User wants filter on dashboard
    } else {
        if (btnNova) btnNova.style.display = 'block';
        if (searchBar) searchBar.style.display = 'block';
    }
};

// Formatters extracted to /js/utils/Formatters.js

// Formatters extracted to /js/utils/Formatters.js

window.executarImpressao = async () => {
    const tipo = document.getElementById('print-tipo').value;
    const grouping = document.getElementById('print-group').value;
    const statusChecked = Array.from(document.querySelectorAll('.print-status:checked')).map(cb => cb.value);

    // Pegar filtros atuais de data
    const inicio = document.getElementById('filtro-inicio').value;
    const fim = document.getElementById('filtro-fim').value;

    try {
        // Fetch full data for report (we might need a "list all" instead of dash view)
        // For simplicity, let's list multas with existing filters
        const multas = await API.listar({ data_inicio: inicio, data_fim: fim, search: '' });

        // Filtrar por status selecionados
        let filtradas = multas.filter(m => {
            if (statusChecked.includes('pago') && m.data_pagamento_orgao) return true;
            if (statusChecked.includes('vencido') && !m.data_pagamento_orgao && new Date(m.data_vencimento) < new Date()) return true;
            if (statusChecked.includes('aberto') && !m.data_pagamento_orgao && new Date(m.data_vencimento) >= new Date()) return true;
            return false;
        });

        if (tipo === 'imminentes') {
            filtradas = filtradas.filter(m => !m.foi_indicado && !m.data_pagamento_orgao);
        }

        // Agrupar se necessário
        let content = '';
        if (grouping === 'veiculo') {
            const grupos = {};
            filtradas.forEach(m => {
                if (!grupos[m.veiculo_id]) grupos[m.veiculo_id] = [];
                grupos[m.veiculo_id].push(m);
            });
            for (const placa in grupos) {
                content += renderPrintTable(grupos[placa], `Veículo: ${placa} (${grupos[placa][0].Veiculo?.modelo || 'N/A'})`);
            }
        } else {
            content = renderPrintTable(filtradas, 'Relatório Analítico de Multas');
        }

        const container = document.getElementById('print-report-container');
        container.innerHTML = `
            < div class="print-header" >
                <div>
                    <h1>Relatório de Multas</h1>
                    <p>${tipo.toUpperCase()} - ${statusChecked.join(', ').toUpperCase()}</p>
                </div>
                <div class="print-meta">
                    Gerado em: ${new Date().toLocaleString('pt-BR')}<br>
                    Período: ${formatDate(inicio)} a ${formatDate(fim)}
                </div>
            </div >
            ${content}
        <div class="print-footer">
            <div>Total de Multas: ${filtradas.length}</div>
            <div>Valor Total: ${formatCurrency(filtradas.reduce((acc, m) => acc + m.valor_original, 0))}</div>
        </div>
        `;

        window.print();
        document.getElementById('drawer-relatorios').style.display = 'none';

    } catch (err) {
        alert('Erro ao gerar relatório: ' + err.message);
    }
};

function renderPrintTable(multas, title) {
    return `
            < h2 style = "font-size: 16px; margin: 20px 0 10px 0; color: #444;" > ${title}</h2 >
                <table class="print-table">
                    <thead>
                        <tr>
                            <th>Auto</th>
                            <th>Placa</th>
                            <th>Vencimento</th>
                            <th>Valor</th>
                            <th>Responsável</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${multas.map(m => {
        let st = 'Aberto';
        let cls = 'aberto';
        if (m.data_pagamento_orgao) { st = 'Pago'; cls = 'pago'; }
        else if (new Date(m.data_vencimento) < new Date()) { st = 'Vencido'; cls = 'vencido'; }

        return `
                        <tr>
                            <td>${m.numero_auto}</td>
                            <td>${m.veiculo_id}</td>
                            <td>${formatDate(m.data_vencimento)}</td>
                            <td>${formatCurrency(m.valor_original)}</td>
                            <td>${m.tipo_responsavel.toUpperCase()}</td>
                            <td><span class="badge-print ${cls}">${st}</span></td>
                        </tr>
                    `;
    }).join('')}
                    </tbody>
                </table>
        `;
}

// Event Delegation para Filtros (Infalível)
document.addEventListener('click', (e) => {
    // Verifica se clicou no botão ou dentro dele
    const target = e.target.closest('.filter-chip');

    if (target) {
        console.log('Filtro clicado (Delegation):', target.dataset.filter);

        // Remove active from all
        document.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));

        // Add active to clicked
        target.classList.add('active');

        carregarLista();
    }
});

// --- Integração Manual Carteira (MODAL) ---

window.abrirModalLancamento = (multa) => {
    // Verificar se pode lançar
    if (multa.tipo_responsavel !== 'cliente') {
        Swal.fire('Não permitido', 'Apenas multas de clientes podem ser lançadas na carteira.', 'warning');
        return;
    }
    if (multa.data_lancamento_carteira) {
        Swal.fire('Já Lançado', 'Esta multa já foi lançada na carteira.', 'info');
        return;
    }

    // Populate Modal fields
    const saldo = parseFloat(multa.valor_original || 0);
    const desconto = parseFloat(multa.desconto_aplicado || 0);
    const base = saldo * (1 - desconto / 100);

    document.getElementById('lancar-multa-id').value = multa.id;
    document.getElementById('lancar-cliente').value = multa.cliente_nome || 'Cliente não identificado';
    document.getElementById('lancar-veiculo').value = multa.veiculo_id;

    // User Request: Data = data da infração
    document.getElementById('lancar-data').value = multa.data_infracao;

    // User Request: Descrição = Auto + Infração (Assuming Observacoes is Infração desc)
    // Fix: Remove redundant "Condutor original" info if client matches
    const descAuto = multa.numero_auto || 'S/N';
    let descInfra = multa.observacoes || '';

    // Simple heuristic to clean up "Condutor original" redundancy
    if (descInfra.includes('Condutor original') || descInfra.includes('Condutor:')) {
        // If the observation is practically just the driver info, we default to generic
        // Or we try to maintain other parts. For safety and cleanliness:
        descInfra = 'Infração de Trânsito';
    }

    document.getElementById('lancar-descricao').value = `Auto: ${descAuto} - ${descInfra}`;

    document.getElementById('lancar-valor-unit').value = base.toFixed(2);

    const checkTaxa = document.getElementById('lancar-taxa');
    checkTaxa.checked = !!multa.cobrar_taxa_administrativa;

    // Update Total trigger
    const calcTotal = () => {
        const valBase = parseFloat(document.getElementById('lancar-valor-unit').value) || 0;
        let total = valBase;
        if (document.getElementById('lancar-taxa').checked) {
            total += (valBase * 0.15);
        }
        document.getElementById('lancar-total').value = total.toFixed(2);
    };

    checkTaxa.onchange = calcTotal;
    calcTotal(); // Init

    document.getElementById('modal-lancamento-carteira').style.display = 'flex';
};

window.fecharModalLancamento = () => {
    document.getElementById('modal-lancamento-carteira').style.display = 'none';
};

document.getElementById('form-lancar-carteira').onsubmit = async (e) => {
    e.preventDefault();

    const id = document.getElementById('lancar-multa-id').value;
    const payload = {
        cliente_nome: document.getElementById('lancar-cliente').value,
        veiculo_placa: document.getElementById('lancar-veiculo').value,
        data: document.getElementById('lancar-data').value,
        descricao: document.getElementById('lancar-descricao').value,
        valor_unitario: parseFloat(document.getElementById('lancar-valor-unit').value),
        cobra_taxa_adm: document.getElementById('lancar-taxa').checked,
        // valor_taxa calculated by backend primarily but we can send if needed, 
        // backend should trust its calc or ours? Let's send what we see.
        valor_total: parseFloat(document.getElementById('lancar-total').value),
        observacao: 'Lançamento manual via Multas'
    };

    console.log('Enviando Payload Launch:', payload); // DEBUG

    try {
        await API.lancarCarteira(id, payload);
        /*
        const res = await fetch(`/api/multas/${id}/lancar-carteira`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }); */

        /* 
        if (!res.ok) {
            const err = await res.json();
            console.error('Erro Backend Launch:', err); // DEBUG
            throw new Error(err.error || 'Erro ao lançar');
        } */

        // Success handled below

        if (typeof Swal !== 'undefined') {
            Swal.fire('Sucesso', 'Débito lançado na carteira!', 'success');
        } else {
            alert('Sucesso: Débito lançado na carteira!');
        }

        fecharModalLancamento();
        document.getElementById('modal-detalhes').style.display = 'none'; // Close details too to refresh
        carregarLista();

    } catch (error) {
        console.error('Launch Error Catch:', error);
        if (typeof Swal !== 'undefined') {
            Swal.fire('Erro', error.message, 'error');
        } else {
            alert('Erro: ' + error.message);
        }
    }
};

// End of multas.js logic

