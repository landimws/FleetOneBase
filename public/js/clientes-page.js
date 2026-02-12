// ========================================
// PÁGINA DE CLIENTES
// ========================================

let clientes = [];
let clienteEditando = null;

// Carregar clientes
async function carregarClientes(busca = '') {
    try {
        const url = busca
            ? `/api/clientes?busca=${encodeURIComponent(busca)}`
            : '/api/clientes';

        const response = await fetch(url);
        clientes = await response.json();
        renderizarLista();
    } catch (error) {
        console.error('Erro ao carregar clientes:', error);
        clientes = [];
        renderizarLista();
    }
}

// Renderizar lista
function renderizarLista() {
    const tbody = document.querySelector('#lista-clientes tbody');
    tbody.innerHTML = '';

    if (clientes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 48px; color: #6b7280;">Nenhum cliente encontrado.</td></tr>';
        return;
    }

    clientes.forEach(cliente => {
        const tr = document.createElement('tr');

        // Address summary
        let location = '-';
        if (cliente.cidade) {
            location = `${cliente.cidade} - ${cliente.estado || ''}`;
        } else if (cliente.endereco) {
            location = 'Ver cadastro';
        }

        tr.innerHTML = `
            <td>
                <div class="client-name">${cliente.nome}</div>
            </td>
            <td>
                <span style="font-family:monospace; color:#4b5563; font-size:13px;">${cliente.cpf || '-'}</span>
            </td>
            <td>
                <span style="color:#4b5563; font-size:13px;">${cliente.telefone || '-'}</span>
            </td>
            <td>
                <span style="color:#4b5563; font-size:13px;">${location}</span>
            </td>
             <td>
                <span class="badge ${cliente.ativo ? 'badge-success' : 'badge-danger'}">
                    ${cliente.ativo ? 'Ativo' : 'Inativo'}
                </span>
            </td>
            <td style="text-align: right;">
                <button class="btn-icon" title="Editar" onclick="editarCliente(${cliente.id})">
                    <i class="ph ph-pencil-simple"></i>
                </button>
                <button class="btn-icon delete" title="Excluir" onclick="excluirCliente(${cliente.id})">
                    <i class="ph ph-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Abrir modal para novo cliente
function novoCliente() {
    clienteEditando = null;
    document.getElementById('modal-title').textContent = 'Novo Cliente';
    document.getElementById('input-nome').value = '';
    document.getElementById('input-cpf').value = '';
    document.getElementById('input-rg').value = '';
    document.getElementById('input-cnh').value = '';

    // Reset Endereço Estruturado
    document.getElementById('input-cep').value = '';
    document.getElementById('input-logradouro').value = '';
    document.getElementById('input-numero').value = '';
    document.getElementById('input-bairro').value = '';
    document.getElementById('input-cidade').value = '';
    document.getElementById('input-estado').value = '';

    // Contato
    document.getElementById('input-telefone').value = '';
    document.getElementById('input-email').value = '';
    document.getElementById('input-nascimento').value = '';

    document.getElementById('input-ativo').checked = true;
    abrirModal();
}

// Editar cliente
function editarCliente(id) {
    const cliente = clientes.find(c => c.id === id);
    if (!cliente) return;

    clienteEditando = cliente;
    document.getElementById('modal-title').textContent = 'Editar Cliente';
    document.getElementById('input-nome').value = cliente.nome;
    document.getElementById('input-cpf').value = cliente.cpf || '';
    document.getElementById('input-rg').value = cliente.rg || '';

    // Address values are handled by value injection but let's ensure they are set if using the partial's IDs
    // The partial uses prefix="input-" so IDs are input-cep, input-logradouro etc.
    document.getElementById('input-cep').value = cliente.cep || '';
    document.getElementById('input-logradouro').value = cliente.logradouro || '';
    document.getElementById('input-numero').value = cliente.numero || '';
    document.getElementById('input-bairro').value = cliente.bairro || '';
    document.getElementById('input-cidade').value = cliente.cidade || '';
    document.getElementById('input-estado').value = cliente.estado || '';

    document.getElementById('input-cnh').value = cliente.cnh || '';

    // Contato
    document.getElementById('input-telefone').value = cliente.telefone || '';
    document.getElementById('input-email').value = cliente.email || '';

    // Data YYYY-MM-DD -> DD/MM/AAAA
    let nasc = '';
    if (cliente.data_nascimento) {
        const [y, m, d] = cliente.data_nascimento.split('-');
        nasc = `${d}/${m}/${y}`;
    }
    document.getElementById('input-nascimento').value = nasc;

    // Compatibilidade: Se tem endereco string mas não tem logradouro, tenta jogar no logradouro para edicao
    if (!cliente.logradouro && cliente.endereco) {
        document.getElementById('input-logradouro').value = cliente.endereco;
    }

    document.getElementById('input-ativo').checked = cliente.ativo;

    // Re-apply masks to ensure formatting
    if (typeof Masks !== 'undefined') {
        Masks.apply(document.getElementById('input-cpf'), 'cpf');
        Masks.apply(document.getElementById('input-telefone'), 'phone');
        Masks.apply(document.getElementById('input-cep'), 'cep');
        Masks.apply(document.getElementById('input-nascimento'), 'date');
    }

    abrirModal();
}

// Salvar cliente
async function salvarCliente() {
    const nome = document.getElementById('input-nome').value.trim();
    const documento = document.getElementById('input-cpf').value.trim(); // Renomeado localmente para evitar conflito se houver
    const rg = document.getElementById('input-rg').value.trim();
    const cnh = document.getElementById('input-cnh').value.trim();

    const cep = document.getElementById('input-cep').value.replace(/\D/g, '');
    const logradouro = document.getElementById('input-logradouro').value.trim();
    const numero = document.getElementById('input-numero').value.trim();
    const bairro = document.getElementById('input-bairro').value.trim();
    const cidade = document.getElementById('input-cidade').value.trim();
    const estado = document.getElementById('input-estado').value.trim().toUpperCase();

    const telefone = document.getElementById('input-telefone').value.trim();
    const email = document.getElementById('input-email').value.trim();
    const nascimentoBr = document.getElementById('input-nascimento').value.trim();

    let data_nascimento = null;
    if (nascimentoBr && nascimentoBr.length === 10) {
        const [d, m, y] = nascimentoBr.split('/');
        data_nascimento = `${y}-${m}-${d}`;
    }

    const ativo = document.getElementById('input-ativo').checked;

    if (!nome) {
        alert('Preencha o nome do cliente');
        return;
    }

    try {
        const dados = {
            nome, cpf: documento, rg, cnh, ativo,
            logradouro, numero, bairro, cidade, estado, cep,
            telefone, email, data_nascimento
        };

        let response;
        if (clienteEditando) {
            // Atualizar
            response = await fetch(`/api/clientes/${clienteEditando.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados)
            });
        } else {
            // Criar
            response = await fetch('/api/clientes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados)
            });
        }

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao salvar cliente');
        }

        await carregarClientes();

        // [DataRefreshBus] Notificar outros módulos
        if (window.DataRefreshBus) {
            DataRefreshBus.notifyDataChanged('clientes');
        }

        fecharModal();
        alert('Cliente salvo com sucesso!');
    } catch (error) {
        console.error('Erro ao salvar cliente:', error);
        alert(error.message);
    }
}

// Excluir cliente
async function excluirCliente(id) {
    const cliente = clientes.find(c => c.id === id);
    if (!cliente) return;

    if (!confirm(`Deseja realmente excluir o cliente ${cliente.nome}?`)) {
        return;
    }

    try {
        const response = await fetch(`/api/clientes/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao excluir cliente');
        }

        await carregarClientes();
        alert('Cliente excluído com sucesso!');
    } catch (error) {
        console.error('Erro ao excluir cliente:', error);
        alert(error.message);
    }
}

// Abrir modal
function abrirModal() {
    document.getElementById('modal-form-cliente').style.display = 'flex';
}

// Fechar modal
function fecharModal() {
    document.getElementById('modal-form-cliente').style.display = 'none';
    clienteEditando = null;
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Carregar clientes
    carregarClientes();

    // [DataRefreshBus] Subscribe para atualizações
    if (window.DataRefreshBus) {
        DataRefreshBus.subscribe((dataType) => {
            if (dataType === 'all' || dataType === 'clientes') {
                console.log(`🔄 [Clientes] Recebido evento de atualização: ${dataType}`);
                carregarClientes();
            }
        });
    }

    // Busca
    document.getElementById('busca-cliente').addEventListener('input', (e) => {
        carregarClientes(e.target.value);
    });

    // Botão Novo
    document.getElementById('btn-novo-cliente').addEventListener('click', novoCliente);

    // Botão Salvar
    document.getElementById('btn-salvar').addEventListener('click', salvarCliente);

    // Botão Cancelar
    document.getElementById('btn-cancelar').addEventListener('click', fecharModal);

    // Botão Fechar (X)
    document.getElementById('close-modal').addEventListener('click', fecharModal);

    // Fechar ao clicar fora
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('modal-form-cliente');
        if (e.target === modal) {
            fecharModal();
        }
    });

    // Enter no formulário
    document.getElementById('form-cliente').addEventListener('submit', (e) => {
        e.preventDefault();
        salvarCliente();
    });

    // Initialize Universal Masks if available
    // Also attach manual listeners if Masks isn't loaded yet for some reason, or rely on Masks.init()
    // The Masks.js script is loaded in layout, so it should be available.
    // Masks.init() runs on DOMContentLoaded, applying to data-mask attributes.
    // However, the modal fields might not have data-mask attributes in the EJS? 
    // Let's assume we should add data-mask to the input fields in the EJS file as well, 
    // OR we can manually apply them here.

    const cpfInput = document.getElementById('input-cpf');
    const phoneInput = document.getElementById('input-telefone');
    const dateInput = document.getElementById('input-nascimento');
    const cepInput = document.getElementById('input-cep');

    if (typeof Masks !== 'undefined') {
        if (cpfInput) Masks.apply(cpfInput, 'cpf');
        if (phoneInput) Masks.apply(phoneInput, 'phone');
        if (dateInput) Masks.apply(dateInput, 'date');
        // CEP is handled by partial? partial has its own script. 
        // asking address-form partial to handle masking via data-mask="cep" would be better, 
        // but for now let's apply here too to be safe.
        if (cepInput) Masks.apply(cepInput, 'cep');
    }
});

console.log('Página de clientes carregada');
