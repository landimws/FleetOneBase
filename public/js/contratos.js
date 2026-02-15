/**
 * JavaScript para listagem de contratos
 */

let tabelaContratos;

document.addEventListener('DOMContentLoaded', () => {
    carregarContratos();
    configurarFiltros();
});

async function carregarContratos() {
    try {
        const filtros = obterFiltros();
        const queryString = new URLSearchParams(filtros).toString();

        const response = await fetch(`/api/contratos?${queryString}`);
        const data = await response.json();

        // Verificar se há erro ou se data é array
        if (!response.ok || data.error) {
            console.error('Erro da API:', data.error || 'Erro desconhecido');
            renderizarTabela([]);
            return;
        }

        renderizarTabela(Array.isArray(data) ? data : []);
    } catch (error) {
        console.error('Erro ao carregar contratos:', error);
        renderizarTabela([]);
    }
}

function obterFiltros() {
    return {
        cliente_id: document.getElementById('filtro-cliente')?.value || '',
        veiculo_placa: document.getElementById('filtro-veiculo')?.value || '',
        status: document.getElementById('filtro-status')?.value || ''
    };
}

function configurarFiltros() {
    document.getElementById('btn-filtrar')?.addEventListener('click', carregarContratos);
}

function renderizarTabela(contratos) {
    const tbody = document.querySelector('#tabela-contratos tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    contratos.forEach(contrato => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${contrato.numero_contrato || '-'}</td>
            <td>${contrato.cliente_nome || '-'}</td>
            <td>${contrato.veiculo_placa || '-'}</td>
            <td>${formatarData(contrato.data_inicio)} - ${formatarData(contrato.data_fim)}</td>
            <td>R$ ${(contrato.valor_mensal || 0).toFixed(2)}</td>
            <td><span class="badge-status status-${contrato.status}">${contrato.status}</span></td>
            <td>
                <button class="btn btn-sm btn-info" onclick="visualizarContrato(${contrato.id})">
                    <i class="bi bi-eye"></i>
                </button>
                <button class="btn btn-sm btn-primary" onclick="editarContrato(${contrato.id})">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="gerarPDF(${contrato.id})">
                    <i class="bi bi-file-pdf"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function formatarData(data) {
    if (!data) return '-';
    return new Date(data).toLocaleDateString('pt-BR');
}

function visualizarContrato(id) {
    window.open(`/api/contratos/${id}/web`, '_blank');
}

function editarContrato(id) {
    window.location.href = `/contratos/editar/${id}`;
}

function gerarPDF(id) {
    window.open(`/api/contratos/${id}/pdf`, '_blank');
}
