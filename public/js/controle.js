
// Controle Module Frontend Logic

let currentSemanaId = null;
let currentGridData = [];

document.addEventListener('DOMContentLoaded', () => {
    initSemanaSelector();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('selectSemana').addEventListener('change', (e) => {
        const id = e.target.value;
        if (id) loadGrid(id);
    });

    document.getElementById('btnNovaSemana').addEventListener('click', novaSemana);
    document.getElementById('btnExcluirSemana').addEventListener('click', excluirSemana);
    document.getElementById('btnInicializarSemana').addEventListener('click', inicializarSemana); // [NEW]

    document.getElementById('btnSalvarKm').addEventListener('click', salvarKm);
    document.getElementById('searchInput').addEventListener('input', filtrarGrid);

    // Form Serviço
    document.getElementById('formServico').addEventListener('submit', salvarServico);
}

// === SEMANAS ===

async function inicializarSemana() {
    if (!currentSemanaId) return;

    const confirmacao = confirm('Deseja iniciar o controle para esta semana? Isso irá importar todos os veículos ativos.');
    if (!confirmacao) return;

    try {
        const res = await fetch(`/api/controle/semanas/${currentSemanaId}/criar`, { method: 'POST' });
        const json = await res.json();

        if (!json.success) throw new Error(json.error);

        alert('Semana inicializada com sucesso!');
        await initSemanaSelector();
        loadGrid(currentSemanaId);
    } catch (e) {
        alert('Erro ao inicializar: ' + e.message);
    }
}

async function initSemanaSelector() {
    try {
        const res = await fetch('/api/controle/semanas');
        const semanas = await res.json();

        const select = document.getElementById('selectSemana');
        select.innerHTML = '<option value="">Selecione uma semana...</option>';

        semanas.forEach(s => {
            const label = `${formatDate(s.data_inicio)} a ${formatDate(s.data_fim)} (${s.status_controle})`;
            const option = document.createElement('option');
            option.value = s.id;
            option.textContent = label;
            select.appendChild(option);
        });

        // Selecionar a primeira (mais recente)
        if (semanas.length > 0) {
            select.value = semanas[0].id;
            // Se já tem ID no select, mantem?
            if (currentSemanaId && semanas.find(s => s.id == currentSemanaId)) {
                select.value = currentSemanaId;
            } else {
                loadGrid(semanas[0].id);
                select.value = semanas[0].id;
            }
        }
    } catch (e) {
        console.error('Erro ao carregar semanas', e);
    }
}

let pendingSemanaId = null; // Store ID for modal confirmation

async function novaSemana() {
    try {
        // Verificar qual é a próxima semana disponível
        const check = await fetch('/api/controle/semanas/proxima');
        const json = await check.json();

        if (!json.success) {
            alert(json.message || 'Não há semanas disponíveis para iniciar.');
            return;
        }

        const s = json.semana;
        pendingSemanaId = s.id;

        // Preencher Modal
        document.getElementById('modalNovaSemanaDate').textContent = `${formatDate(s.data_inicio)} a ${formatDate(s.data_fim)}`;

        // Show Modal
        document.getElementById('modalNovaSemana').classList.remove('hidden');

        // Setup One-time click listener for confirm button to avoid duplicates? 
        // Better to assign it once in setupEventListeners, but we need the ID.
        // Solution: Use a global variable `pendingSemanaId` or Re-assign onclick here.

        const btnConfirm = document.getElementById('btnConfirmarNovaSemana');
        btnConfirm.onclick = async () => {
            btnConfirm.disabled = true;
            btnConfirm.textContent = 'Iniciando...';
            await confirmarNovaSemana(s.id);
            btnConfirm.disabled = false;
            btnConfirm.textContent = 'Iniciar';
        };

    } catch (e) {
        alert('Erro: ' + e.message);
    }
}

async function confirmarNovaSemana(id) {
    try {
        const res = await fetch(`/api/controle/semanas/${id}/criar`, { method: 'POST' });
        const resJson = await res.json();

        if (!resJson.success) throw new Error(resJson.error);

        closeModal('modalNovaSemana');

        // Success Feedback (Toast substitute)
        // alert('Semana iniciada com sucesso!'); 

        await initSemanaSelector();
        // O selector já vai carregar a nova semana se for a mais recente
    } catch (e) {
        alert('Erro ao criar semana: ' + e.message);
    }
}

async function excluirSemana() {
    if (!currentSemanaId) return;
    if (!confirm('ATENÇÃO: Deseja realmente excluir esta semana e TODOS os registros dela?')) return;

    try {
        const res = await fetch(`/api/controle/semanas/${currentSemanaId}`, { method: 'DELETE' });
        const data = await res.json();

        if (!data.success) throw new Error(data.error);

        alert('Semana excluída do Controle.');
        // Reset
        currentSemanaId = null;
        document.getElementById('controleBody').innerHTML = '';
        document.getElementById('emptyState').classList.remove('hidden');
        document.getElementById('btnInicializarSemana').classList.add('hidden');
        document.getElementById('emptyStateTitle').textContent = 'Selecione uma semana';
        document.getElementById('emptyStateMsg').textContent = 'Escolha uma semana existente no topo ou crie uma nova para começar.';

        initSemanaSelector();
    } catch (e) {
        alert('Erro: ' + e.message);
    }
}

// === GRID ===

async function loadGrid(id) {
    currentSemanaId = id;
    document.getElementById('emptyState').classList.add('hidden');
    document.getElementById('controleBody').innerHTML = '<tr><td colspan="8" class="text-center py-4">Carregando...</td></tr>';

    document.getElementById('btnExcluirSemana').classList.add('hidden'); // Hide until loaded
    document.getElementById('btnInicializarSemana').classList.add('hidden');

    try {
        const res = await fetch(`/api/controle/semanas/${id}`);
        const json = await res.json();

        if (!json.success) throw new Error(json.error);

        currentGridData = json.data;

        // Se array vazio, pode ser que a semana exista no legado mas não foi inicializada no controle
        if (currentGridData.length === 0) {
            document.getElementById('controleBody').innerHTML = '';
            document.getElementById('emptyState').classList.remove('hidden');
            document.getElementById('emptyStateTitle').textContent = 'Semana não inicializada';
            document.getElementById('emptyStateMsg').textContent = 'Esta semana existe no sistema mas ainda não possui controle operacional.';
            document.getElementById('btnInicializarSemana').classList.remove('hidden');
            updateStats();
            return;
        }

        document.getElementById('btnExcluirSemana').classList.remove('hidden');
        renderGrid(currentGridData);
        updateStats();
    } catch (e) {
        console.error(e);
        document.getElementById('controleBody').innerHTML = `<tr><td colspan="8" class="text-center py-4 text-red-500">Erro: ${e.message}</td></tr>`;
    }
}

function renderGrid(data) {
    const tbody = document.getElementById('controleBody');
    tbody.innerHTML = '';

    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50 transition-colors duration-150 group cursor-pointer';
        tr.onclick = () => openDetalhesModal(row.veiculo_id);

        if (row.situacao === 'Agendar' || (row.alertas && row.alertas.length > 0)) {
            tr.classList.add('bg-red-50'); // Highlight row lightly
        }

        // Situação Badge
        let situacaoClass = 'bg-gray-100 text-gray-800';
        if (row.situacao === 'Solicitar') situacaoClass = 'bg-blue-100 text-blue-800';
        if (row.situacao === 'Normal') situacaoClass = 'bg-green-100 text-green-800';
        if (row.situacao === 'Agendar') situacaoClass = 'bg-red-100 text-red-800 animate-pulse';
        if (row.situacao === 'Agendado') situacaoClass = 'bg-yellow-100 text-yellow-800';
        if (row.situacao === 'Na oficina') situacaoClass = 'bg-orange-100 text-orange-800 ring-2 ring-orange-300';
        if (row.situacao === 'Revisado') situacaoClass = 'bg-teal-100 text-teal-800';

        const excedeuPacote = row.alertas && row.alertas.includes('excedente');
        const rodadosClass = excedeuPacote ? 'text-red-600 font-bold' : 'text-gray-500';
        const rodadosIcon = excedeuPacote ? '<i class="ph-fill ph-warning-circle text-red-600 ml-1" title="Pacote Excedido"></i>' : '';

        tr.innerHTML = `
            <td class="px-3 py-1 whitespace-nowrap text-sm font-medium text-gray-900">${row.veiculo_id}</td>
            <td class="px-3 py-1 whitespace-nowrap text-sm text-gray-500">${row.modelo}</td>
            <td class="px-3 py-1 whitespace-nowrap text-sm text-gray-900 font-medium">${row.cliente || '<span class="text-gray-400">-</span>'}</td>
            <td class="px-3 py-1 whitespace-nowrap text-sm text-gray-500 text-center">${row.km_anterior.toLocaleString('pt-BR')}</td>
            <td class="px-3 py-1 whitespace-nowrap text-sm text-gray-900 text-center font-bold relative">
                ${row.km_atual > 0 ? row.km_atual.toLocaleString('pt-BR') : '<span class="text-gray-300">-</span>'}
                ${row.alertas.includes('oleo') ? '<span class="absolute top-2 right-4 w-2 h-2 bg-red-500 rounded-full" title="Troca de Óleo"></span>' : ''}
                ${row.alertas.includes('correia') ? '<span class="absolute top-2 right-2 w-2 h-2 bg-purple-500 rounded-full" title="Troca de Correia"></span>' : ''}
            </td>
            <td class="px-3 py-1 whitespace-nowrap text-sm ${rodadosClass} text-center">
                ${row.km_rodados > 0 ? `+${row.km_rodados.toLocaleString('pt-BR')}` : '-'}
                ${rodadosIcon}
            </td>
            <td class="px-3 py-1 whitespace-nowrap text-center">
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${situacaoClass}">
                    ${row.situacao}
                </span>
            </td>
            <td class="px-3 py-1 whitespace-nowrap text-sm text-gray-500">
                <div class="flex gap-2" onclick="event.stopPropagation()">
                     <button onclick="openKmModal('${row.id}', ${row.km_anterior}, ${row.km_atual})" class="text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded" title="Registrar Km">
                        <i class="ph ph-gauge text-xl"></i>
                     </button>
                     <button onclick="openServicoModal('${row.id}', '${row.situacao}')" class="text-orange-600 hover:text-orange-900 p-1 hover:bg-orange-50 rounded" title="Serviços">
                        <i class="ph ph-wrench text-xl"></i>
                     </button>
                     <button onclick="openConfigModal('${row.veiculo_id}')" class="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-50 rounded" title="Configurações">
                        <i class="ph ph-gear text-xl"></i>
                     </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function updateStats() {
    const total = currentGridData.length;
    const oficina = currentGridData.filter(r => r.situacao === 'Na oficina').length;
    const revisar = currentGridData.filter(r => r.situacao === 'Agendar').length;

    document.getElementById('gridStats').textContent = `Total: ${total} | Oficina: ${oficina} | Revisar: ${revisar}`;
}

function filtrarGrid(e) {
    const term = e.target.value.toLowerCase();
    const filtered = currentGridData.filter(r =>
        r.veiculo_id.toLowerCase().includes(term) ||
        r.modelo.toLowerCase().includes(term) ||
        (r.cliente && r.cliente.toLowerCase().includes(term))
    );
    renderGrid(filtered);
}

// === MODAL KM ===

function openKmModal(id, anterior, atual) {
    document.getElementById('kmRegistroId').value = id;
    // Se atual > 0, preenche. Se não, vazio.
    document.getElementById('inputKmAtual').value = atual > 0 ? atual.toLocaleString('pt-BR') : '';
    document.getElementById('labelKmAnterior').innerText = anterior.toLocaleString('pt-BR');

    // Set to Local Time manually (toISOString is UTC)
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('inputDataKm').value = now.toISOString().slice(0, 16);

    // Lógica de Correção
    const title = document.getElementById('modal-title-km');
    const fieldMotivo = document.getElementById('fieldMotivoKm');
    const inputMotivo = document.getElementById('inputMotivoKm');

    inputMotivo.value = ''; // Reset

    if (atual > 0) {
        title.innerText = 'Corrigir Km';
        fieldMotivo.classList.remove('hidden');
        // Opcional: focar no motivo se quiser, mas melhor focar no km para editar
    } else {
        title.innerText = 'Registrar Km';
        fieldMotivo.classList.add('hidden');
    }

    document.getElementById('modalKm').classList.remove('hidden');
    document.getElementById('inputKmAtual').focus();
}

function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
}

async function salvarKm() {
    const id = document.getElementById('kmRegistroId').value;
    const kmInput = document.getElementById('inputKmAtual').value;
    const km = unmaskNumber(kmInput);
    const data = document.getElementById('inputDataKm').value;
    const motivo = document.getElementById('inputMotivoKm').value;

    const isCorrection = document.getElementById('fieldMotivoKm').classList.contains('hidden') === false;

    if (!km) return alert('Informe o Km');
    if (isCorrection && !motivo) return alert('Informe o motivo da correção');

    try {
        const res = await fetch(`/api/controle/registro/${id}/km`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ km_atual: km, data_registro: data, motivo: motivo })
        });

        if (!res.ok) throw new Error('Erro ao salvar');

        closeModal('modalKm');
        loadGrid(currentSemanaId); // Refresh
    } catch (e) {
        alert(e.message);
    }
}

// === MODAL SERVIÇO ===

function openServicoModal(id, situacao) {
    document.getElementById('servicoRegistroId').value = id;
    document.getElementById('modalServico').classList.remove('hidden');
    resetServicoModal();
}

function resetServicoModal() {
    document.getElementById('servicoStep1').classList.remove('hidden');
    document.getElementById('formServico').classList.add('hidden');
}

function showServicoForm(acao) {
    document.getElementById('servicoStep1').classList.add('hidden');
    document.getElementById('formServico').classList.remove('hidden');
    document.getElementById('servicoTipoAcao').value = acao;

    const fieldData = document.getElementById('fieldData');
    const fieldKm = document.getElementById('fieldKmSaida');
    const fieldChecks = document.getElementById('fieldCheckboxes');

    fieldData.classList.remove('hidden');
    fieldKm.classList.add('hidden');
    fieldChecks.classList.add('hidden');

    if (acao === 'saida') {
        fieldKm.classList.remove('hidden');
        fieldChecks.classList.remove('hidden');
    }
}

async function salvarServico(e) {
    e.preventDefault();
    const id = document.getElementById('servicoRegistroId').value;
    const acao = document.getElementById('servicoTipoAcao').value;
    const data = document.getElementById('inputServicoData').value;
    const obs = document.getElementById('inputServicoObs').value;

    let url = '';
    let body = { observacao: obs };

    if (acao === 'agendar') {
        url = `/api/controle/registro/${id}/servico/agendar`;
        body.data_agendamento = data;
    } else if (acao === 'entrada') {
        url = `/api/controle/registro/${id}/servico/entrada`;
        body.data_entrada = data;
    } else if (acao === 'saida') {
        url = `/api/controle/registro/${id}/servico/saida`;
        body.data_saida = data;
        body.km_saida = unmaskNumber(document.getElementById('inputServicoKm').value);
        body.trocou_oleo = document.getElementById('checkOleo').checked;
        body.trocou_correia = document.getElementById('checkCorreia').checked;
    }

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!res.ok) throw new Error('Erro ao salvar serviço');

        closeModal('modalServico');
        loadGrid(currentSemanaId);
    } catch (e) {
        alert(e.message);
    }
}

// === MODAL CONFIG ===

async function openConfigModal(placa) {
    document.getElementById('configPlaca').value = placa;
    document.getElementById('modalConfigTitle').textContent = `Configurações - ${placa}`;
    document.getElementById('modalConfig').classList.remove('hidden');

    // Carregar dados atuais
    try {
        // Encontrar no currentGridData
        const row = currentGridData.find(r => r.veiculo_id === placa);
        if (row && row.configs) {
            document.getElementById('confPacoteKm').value = row.configs.pacote_km_semana ? row.configs.pacote_km_semana.toLocaleString('pt-BR') : '1.000';
            document.getElementById('confIntervOleo').value = row.configs.intervalo_oleo_km ? row.configs.intervalo_oleo_km.toLocaleString('pt-BR') : '5.000';

            // Novos Campos
            document.getElementById('confUltOleoKm').value = row.configs.ultima_troca_oleo_km ? row.configs.ultima_troca_oleo_km.toLocaleString('pt-BR') : '';
            document.getElementById('confUltOleoData').value = row.configs.ultima_troca_oleo_data || '';

            document.getElementById('confIntervCorreia').value = row.configs.intervalo_correia_km ? row.configs.intervalo_correia_km.toLocaleString('pt-BR') : '60.000';
            document.getElementById('confUsaCorreia').checked = row.configs.usa_correia ? true : false;

            document.getElementById('confUltCorreiaKm').value = row.configs.ultima_troca_correia_km ? row.configs.ultima_troca_correia_km.toLocaleString('pt-BR') : '';
            document.getElementById('confUltCorreiaData').value = row.configs.ultima_troca_correia_data || '';
        }
    } catch (e) {
        console.error(e);
        alert('Erro ao abrir modal: ' + e.message);
    }
}

async function salvarConfig() {
    const placa = document.getElementById('configPlaca').value;

    // Coletar valores
    const payload = {
        pacote_km_semana: unmaskNumber(document.getElementById('confPacoteKm').value),
        intervalo_oleo_km: unmaskNumber(document.getElementById('confIntervOleo').value),
        intervalo_correia_km: unmaskNumber(document.getElementById('confIntervCorreia').value),
        usa_correia: document.getElementById('confUsaCorreia').checked,

        // Novos
        ultima_troca_oleo_km: unmaskNumber(document.getElementById('confUltOleoKm').value),
        ultima_troca_oleo_data: document.getElementById('confUltOleoData').value,
        ultima_troca_correia_km: unmaskNumber(document.getElementById('confUltCorreiaKm').value),
        ultima_troca_correia_data: document.getElementById('confUltCorreiaData').value
    };

    try {
        const res = await fetch(`/api/controle/veiculo/${placa}/config`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error('Erro ao salvar configurações');

        closeModal('modalConfig');
        loadGrid(currentSemanaId); // Refresh para atualizar ícones/alertas
    } catch (e) {
        alert(e.message);
    }
}

// === MODAL DETALHES ===

function openDetalhesModal(placa) {
    const row = currentGridData.find(r => r.veiculo_id === placa);
    if (!row) return;

    // Header
    document.getElementById('detalhesPlaca').textContent = row.veiculo_id;
    document.getElementById('detalhesModelo').textContent = row.modelo;
    document.getElementById('detalhesCliente').textContent = row.cliente || 'Sem cliente alocado';
    document.getElementById('detalhesKmAtual').textContent = row.km_atual > 0 ? `${row.km_atual.toLocaleString('pt-BR')} km` : '---';

    // Data Atualização
    if (row.km_atual > 0 && row.data_atualizacao) {
        const date = new Date(row.data_atualizacao);
        const formatted = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        document.getElementById('detalhesDataAtualizacao').textContent = `Atualizado em: ${formatted}`;
        document.getElementById('detalhesDataAtualizacao').classList.remove('hidden');
    } else {
        document.getElementById('detalhesDataAtualizacao').classList.add('hidden');
    }

    // Configs
    const conf = row.configs || {};

    // --- Resumo da Semana ---
    document.getElementById('detalhesKmAnterior').textContent = row.km_anterior.toLocaleString('pt-BR') + ' km';

    const kmRodado = row.km_rodados > 0 ? row.km_rodados : 0;
    document.getElementById('detalhesKmRodado').textContent = kmRodado > 0 ? `+${kmRodado.toLocaleString('pt-BR')} km` : '-';

    const pacote = conf.pacote_km_semana || 1000;
    document.getElementById('detalhesPacote').textContent = pacote.toLocaleString('pt-BR') + ' km';

    if (kmRodado > pacote) {
        document.getElementById('detalhesPacoteStatus').classList.remove('hidden');
        document.getElementById('detalhesKmRodado').classList.add('text-red-600');
        document.getElementById('detalhesKmRodado').classList.remove('text-blue-600');
    } else {
        document.getElementById('detalhesPacoteStatus').classList.add('hidden');
        document.getElementById('detalhesKmRodado').classList.add('text-blue-600');
        document.getElementById('detalhesKmRodado').classList.remove('text-red-600');
    }

    // Situação
    const badge = document.getElementById('detalhesSituacao');
    badge.textContent = row.situacao;
    badge.className = 'px-3 py-1 rounded-full text-xs font-bold uppercase';

    // Copy-paste styling logic from renderGrid
    if (row.situacao === 'Solicitar') badge.classList.add('bg-blue-100', 'text-blue-800');
    else if (row.situacao === 'Normal') badge.classList.add('bg-green-100', 'text-green-800');
    else if (row.situacao === 'Agendar') badge.classList.add('bg-red-100', 'text-red-800');
    else if (row.situacao === 'Agendado') badge.classList.add('bg-yellow-100', 'text-yellow-800');
    else if (row.situacao === 'Na oficina') badge.classList.add('bg-orange-100', 'text-orange-800');
    else if (row.situacao === 'Revisado') badge.classList.add('bg-teal-100', 'text-teal-800');
    else badge.classList.add('bg-gray-100', 'text-gray-800');

    // Configs (Reusing variable from above)
    // const conf = row.configs || {};

    // --- ÓLEO ---
    const ultOleo = conf.ultima_troca_oleo_km || 0;
    const intervOleo = conf.intervalo_oleo_km || 5000;
    const proxOleo = ultOleo + intervOleo;
    const kmAtual = row.km_atual || 0;

    document.getElementById('detalhesUltOleo').textContent = ultOleo > 0 ? `${ultOleo.toLocaleString('pt-BR')} km` : '-';
    document.getElementById('detalhesProxOleo').textContent = `${proxOleo.toLocaleString('pt-BR')} km`;

    // Progress Bar Logic
    let percOleo = 0;
    let restanteOleo = proxOleo - kmAtual;

    if (kmAtual >= ultOleo) {
        const rodado = kmAtual - ultOleo;
        percOleo = Math.min((rodado / intervOleo) * 100, 100);
    }

    document.getElementById('progressoOleo').style.width = `${percOleo}%`;

    if (restanteOleo < 0) {
        document.getElementById('detalhesOleoRestante').textContent = `Passou ${Math.abs(restanteOleo).toLocaleString('pt-BR')} km`;
        document.getElementById('detalhesOleoRestante').classList.replace('text-gray-400', 'text-red-500');
        document.getElementById('progressoOleo').classList.replace('bg-yellow-400', 'bg-red-500');
    } else {
        document.getElementById('detalhesOleoRestante').textContent = `Restam ${restanteOleo.toLocaleString('pt-BR')} km`;
        document.getElementById('detalhesOleoRestante').classList.replace('text-red-500', 'text-gray-400'); // Reset
        document.getElementById('progressoOleo').classList.replace('bg-red-500', 'bg-yellow-400'); // Reset
    }

    // --- CORREIA ---
    const cardCorreia = document.getElementById('cardCorreia');
    if (!conf.usa_correia) {
        cardCorreia.classList.add('opacity-50', 'pointer-events-none', 'grayscale');
        // Or hide it? User might want to know it's disabled. Let's dim it.
        document.getElementById('detalhesUltCorreia').textContent = '-';
        document.getElementById('detalhesProxCorreia').textContent = '-';
        document.getElementById('progressoCorreia').style.width = '0%';
        document.getElementById('detalhesCorreiaRestante').textContent = 'Não monitorado';
    } else {
        cardCorreia.classList.remove('opacity-50', 'pointer-events-none', 'grayscale');

        const ultCorreia = conf.ultima_troca_correia_km || 0;
        const intervCorreia = conf.intervalo_correia_km || 60000;
        const proxCorreia = ultCorreia + intervCorreia;

        document.getElementById('detalhesUltCorreia').textContent = ultCorreia > 0 ? `${ultCorreia.toLocaleString('pt-BR')} km` : '-';
        document.getElementById('detalhesProxCorreia').textContent = `${proxCorreia.toLocaleString('pt-BR')} km`;

        let percCorreia = 0;
        let restanteCorreia = proxCorreia - kmAtual;

        if (kmAtual >= ultCorreia) {
            const rodado = kmAtual - ultCorreia;
            percCorreia = Math.min((rodado / intervCorreia) * 100, 100);
        }

        document.getElementById('progressoCorreia').style.width = `${percCorreia}%`;

        if (restanteCorreia < 0) {
            document.getElementById('detalhesCorreiaRestante').textContent = `Passou ${Math.abs(restanteCorreia).toLocaleString('pt-BR')} km`;
            document.getElementById('detalhesCorreiaRestante').classList.replace('text-gray-400', 'text-red-500');
            document.getElementById('progressoCorreia').classList.replace('bg-purple-500', 'bg-red-500');
        } else {
            document.getElementById('detalhesCorreiaRestante').textContent = `Restam ${restanteCorreia.toLocaleString('pt-BR')} km`;
            document.getElementById('detalhesCorreiaRestante').classList.replace('text-red-500', 'text-gray-400');
            document.getElementById('progressoCorreia').classList.replace('bg-red-500', 'bg-purple-500');
        }
    }

    document.getElementById('modalDetalhes').classList.remove('hidden');
}

// Helpers
// Helpers
function formatDate(iso) {
    if (!iso) return '-';
    // Adiciona T12:00:00 para garantir que caia no mesmo dia independente do fuso (Brasil é -3)
    // Se a string já vier com T, usa direto. Se for YYYY-MM-DD, adiciona.
    const dateStr = iso.includes('T') ? iso : `${iso}T12:00:00`;
    return new Date(dateStr).toLocaleDateString('pt-BR');
}

function maskNumber(input) {
    let value = input.value.replace(/\D/g, '');
    if (value === '') {
        input.value = '';
        return;
    }
    input.value = parseInt(value).toLocaleString('pt-BR');
}

function unmaskNumber(value) {
    if (!value) return 0;
    if (typeof value === 'number') return value;
    return parseInt(value.replace(/\./g, '')) || 0;
}

// Expose functions to global scope for inline onclicks
window.openKmModal = openKmModal;
window.openServicoModal = openServicoModal;
window.openConfigModal = openConfigModal;
window.closeModal = closeModal;
window.salvarConfig = salvarConfig;

// === TABS & DASHBOARD ===

let currentTab = 'controle';
let chartTopKmInstance = null;
let chartStatusInstance = null;

function switchTab(tab) {
    currentTab = tab;

    // Toggle Content
    if (tab === 'controle') {
        document.getElementById('tab-controle').classList.remove('hidden');
        document.getElementById('tab-analises').classList.add('hidden');
    } else {
        document.getElementById('tab-controle').classList.add('hidden');
        document.getElementById('tab-analises').classList.remove('hidden');
        updateDashboard(); // Refresh data
    }

    // Toggle Buttons
    const btnControle = document.getElementById('tabBtnControle');
    const btnAnalises = document.getElementById('tabBtnAnalises');

    if (tab === 'controle') {
        btnControle.className = 'px-4 py-2 text-sm font-medium rounded-md bg-white text-blue-600 shadow-sm transition-all flex items-center gap-2';
        btnAnalises.className = 'px-4 py-2 text-sm font-medium rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-200/50 transition-all flex items-center gap-2';
    } else {
        btnControle.className = 'px-4 py-2 text-sm font-medium rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-200/50 transition-all flex items-center gap-2';
        btnAnalises.className = 'px-4 py-2 text-sm font-medium rounded-md bg-white text-blue-600 shadow-sm transition-all flex items-center gap-2';
    }
}

function updateDashboard() {
    if (!currentGridData || currentGridData.length === 0) return;

    // 1. KPIs
    const totalKm = currentGridData.reduce((acc, r) => acc + (r.km_rodados || 0), 0);
    const mediaKm = Math.round(totalKm / currentGridData.length);
    const ativos = currentGridData.filter(r => r.situacao !== 'Inativo').length; // Assuming Inativo exists, or just total
    const alertas = currentGridData.filter(r => r.alertas && r.alertas.length > 0).length;

    document.getElementById('kpiTotalKm').innerText = totalKm.toLocaleString('pt-BR');
    document.getElementById('kpiMediaKm').innerText = mediaKm.toLocaleString('pt-BR');
    document.getElementById('kpiAtivos').innerText = currentGridData.length; // Total loaded
    document.getElementById('kpiAlertas').innerText = alertas;

    // 2. Tabela de Manutenções (Top 10 Críticas)
    // Prioridade: Alertas > Agendar > Próximos
    const criticos = currentGridData
        .filter(r => (r.alertas && r.alertas.length > 0) || r.situacao === 'Agendar' || r.situacao === 'Na oficina')
        .sort((a, b) => {
            // Sort logic: Alerta first
            const aScore = (a.alertas.length * 2) + (a.situacao === 'Agendar' ? 1 : 0);
            const bScore = (b.alertas.length * 2) + (b.situacao === 'Agendar' ? 1 : 0);
            return bScore - aScore;
        })
        .slice(0, 10);

    const tbody = document.getElementById('tabelaManutencoes');
    tbody.innerHTML = '';

    criticos.forEach(r => {
        let labels = [];
        if (r.alertas.includes('oleo')) labels.push('<span class="text-xs font-bold text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded">Óleo</span>');
        if (r.alertas.includes('correia')) labels.push('<span class="text-xs font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded">Correia</span>');
        if (r.alertas.includes('excedente')) labels.push('<span class="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded">Pacote</span>');
        if (labels.length === 0) labels.push('<span class="text-xs text-gray-500">Manutenção</span>');

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50';
        tr.innerHTML = `
            <td class="px-6 py-3 font-medium text-gray-900">${r.veiculo_id}</td>
            <td class="px-6 py-3">${labels.join(' ')}</td>
            <td class="px-6 py-3 text-gray-500">${r.km_atual.toLocaleString('pt-BR')} km</td>
            <td class="px-6 py-3 text-gray-500">
                ${r.configs?.proxima_troca_oleo ? r.configs.proxima_troca_oleo.toLocaleString('pt-BR') : '-'}
            </td>
            <td class="px-6 py-3">
                 <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    ${r.situacao}
                </span>
            </td>
        `;
        tbody.appendChild(tr);
    });

    if (criticos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">Nenhum alerta crítico no momento.</td></tr>';
    }

    // 3. Charts
    renderCharts();
}

function renderCharts() {
    if (typeof Chart === 'undefined') return;

    // --- Chart 1: Top 5 Km ---
    const top5 = [...currentGridData].sort((a, b) => b.km_rodados - a.km_rodados).slice(0, 5);
    const labelsKm = top5.map(r => r.veiculo_id);
    const dataKm = top5.map(r => r.km_rodados);

    const ctxKm = document.getElementById('chartTopKm').getContext('2d');

    if (chartTopKmInstance) chartTopKmInstance.destroy();

    chartTopKmInstance = new Chart(ctxKm, {
        type: 'bar',
        data: {
            labels: labelsKm,
            datasets: [{
                label: 'Km Rodados',
                data: dataKm,
                backgroundColor: 'rgba(59, 130, 246, 0.8)',
                borderRadius: 4,
                barThickness: 30
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: '#f3f4f6' } },
                x: { grid: { display: false } }
            }
        }
    });

    // --- Chart 2: Situação ---
    const statusCounts = {};
    currentGridData.forEach(r => {
        statusCounts[r.situacao] = (statusCounts[r.situacao] || 0) + 1;
    });

    const labelsStatus = Object.keys(statusCounts);
    const dataStatus = Object.values(statusCounts);
    const colors = {
        'Normal': '#10b981',
        'Solicitar': '#3b82f6',
        'Agendar': '#ef4444',
        'Agendado': '#eab308',
        'Na oficina': '#f97316',
        'Revisado': '#14b8a6'
    };
    const bgColors = labelsStatus.map(s => colors[s] || '#9ca3af');

    const ctxStatus = document.getElementById('chartStatus').getContext('2d');

    if (chartStatusInstance) chartStatusInstance.destroy();

    chartStatusInstance = new Chart(ctxStatus, {
        type: 'doughnut',
        data: {
            labels: labelsStatus,
            datasets: [{
                data: dataStatus,
                backgroundColor: bgColors,
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right' }
            },
            cutout: '70%'
        }
    });
}

// Global exposure
window.switchTab = switchTab;
window.maskNumber = maskNumber; // Already there, but safe to repeat if needed (it was at the end)
