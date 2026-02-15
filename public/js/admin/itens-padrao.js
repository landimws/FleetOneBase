/**
 * JavaScript para gerenciar itens padrão
 */

document.addEventListener('DOMContentLoaded', () => {
    carregarItens();
    configurarEventos();
});

async function carregarItens() {
    try {
        const response = await fetch('/api/contratos/itens-padrao/list');
        const itens = await response.json();
        renderizarTabela(itens);
    } catch (error) {
        console.error('Erro ao carregar itens:', error);
    }
}

function renderizarTabela(itens) {
    const tbody = document.querySelector('#tabela-itens-padrao tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    itens.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.nome}</td>
            <td>${item.tipo_item}</td>
            <td>R$ ${(item.valor_padrao || 0).toFixed(2)}</td>
            <td>
                <span class="badge ${item.ativo ? 'bg-success' : 'bg-secondary'}">
                    ${item.ativo ? 'Ativo' : 'Inativo'}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editarItem(${item.id})">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="desativarItem(${item.id})">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function configurarEventos() {
    document.getElementById('btn-novo-item')?.addEventListener('click', () => {
        limparFormulario();
        const modal = new bootstrap.Modal(document.getElementById('modal-item'));
        modal.show();
    });

    document.getElementById('form-item')?.addEventListener('submit', salvarItem);
}

function limparFormulario() {
    document.getElementById('item-id').value = '';
    document.getElementById('item-nome').value = '';
    document.getElementById('item-descricao').value = '';
    document.getElementById('item-tipo').value = 'locacao';
    document.getElementById('item-valor').value = '';
}

async function editarItem(id) {
    try {
        const response = await fetch(`/api/contratos/itens-padrao/${id}`);
        const item = await response.json();

        document.getElementById('item-id').value = item.id;
        document.getElementById('item-nome').value = item.nome;
        document.getElementById('item-descricao').value = item.descricao || '';
        document.getElementById('item-tipo').value = item.tipo_item;
        document.getElementById('item-valor').value = item.valor_padrao;

        const modal = new bootstrap.Modal(document.getElementById('modal-item'));
        modal.show();
    } catch (error) {
        console.error('Erro ao carregar item:', error);
    }
}

async function salvarItem(e) {
    e.preventDefault();

    const id = document.getElementById('item-id').value;
    const dados = {
        nome: document.getElementById('item-nome').value,
        descricao: document.getElementById('item-descricao').value,
        tipo_item: document.getElementById('item-tipo').value,
        valor_padrao: parseFloat(document.getElementById('item-valor').value) || 0,
        ativo: true
    };

    try {
        const url = id ? `/api/contratos/itens-padrao/${id}` : '/api/contratos/itens-padrao';
        const method = id ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        if (response.ok) {
            alert('Item salvo com sucesso!');
            bootstrap.Modal.getInstance(document.getElementById('modal-item')).hide();
            carregarItens();
        } else {
            alert('Erro ao salvar item');
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao salvar item');
    }
}

async function desativarItem(id) {
    if (!confirm('Deseja realmente desativar este item?')) return;

    try {
        const response = await fetch(`/api/contratos/itens-padrao/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            alert('Item desativado com sucesso!');
            carregarItens();
        } else {
            alert('Erro ao desativar item');
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao desativar item');
    }
}
