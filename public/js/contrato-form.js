/**
 * JavaScript para formulário de contratos
 */

let itensContrato = [];
let itensPadrao = [];

document.addEventListener('DOMContentLoaded', async () => {
    await carregarDados();
    configurarEventos();
});

async function carregarDados() {
    try {
        // Carregar clientes
        const resClientes = await fetch('/api/clientes');
        const clientes = await resClientes.json();
        preencherSelect('cliente_id', clientes, 'id', 'nome');

        // Carregar veículos
        const resVeiculos = await fetch('/api/veiculos');
        const veiculos = await resVeiculos.json();
        preencherSelect('veiculo_placa', veiculos, 'placa', 'modelo');

        // Carregar itens padrão
        const resItens = await fetch('/api/contratos/itens-padrao/list?ativo=true');
        itensPadrao = await resItens.json();
        preencherSelect('item-padrao', itensPadrao, 'id', 'nome');
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
    }
}

function preencherSelect(selectId, dados, valorKey, textoKey) {
    const select = document.getElementById(selectId);
    if (!select) return;

    dados.forEach(item => {
        const option = document.createElement('option');
        option.value = item[valorKey];
        option.textContent = item[textoKey];
        select.appendChild(option);
    });
}

function configurarEventos() {
    // Forma de pagamento caução
    document.getElementById('caucao_forma_pagamento')?.addEventListener('change', (e) => {
        const divParcelas = document.getElementById('div-parcelas');
        divParcelas.style.display = e.target.value === 'parcelada' ? 'block' : 'none';
    });

    // Adicionar item
    document.getElementById('btn-adicionar-item')?.addEventListener('click', () => {
        const modal = new bootstrap.Modal(document.getElementById('modal-item'));
        modal.show();
    });

    // Confirmar item
    document.getElementById('btn-confirmar-item')?.addEventListener('click', adicionarItem);

    // Submissão do formulário
    document.getElementById('form-contrato')?.addEventListener('submit', salvarContrato);
}

function adicionarItem() {
    const itemId = document.getElementById('item-padrao').value;
    const quantidade = parseInt(document.getElementById('item-quantidade').value) || 1;
    const valor = parseFloat(document.getElementById('item-valor').value) || 0;

    if (!itemId) {
        alert('Selecione um item');
        return;
    }

    const itemPadrao = itensPadrao.find(i => i.id == itemId);
    if (!itemPadrao) return;

    itensContrato.push({
        item_padrao_id: itemId,
        nome: itemPadrao.nome,
        descricao: itemPadrao.descricao,
        tipo_item: itemPadrao.tipo_item,
        quantidade: quantidade,
        valor_unitario: valor,
        valor_total: quantidade * valor
    });

    atualizarTabelaItens();

    // Fechar modal
    bootstrap.Modal.getInstance(document.getElementById('modal-item')).hide();

    // Limpar campos
    document.getElementById('item-padrao').value = '';
    document.getElementById('item-quantidade').value = '1';
    document.getElementById('item-valor').value = '';
}

function atualizarTabelaItens() {
    const tbody = document.querySelector('#tabela-itens tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    let total = 0;

    itensContrato.forEach((item, index) => {
        total += item.valor_total;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.nome}</td>
            <td>${item.quantidade}</td>
            <td>R$ ${item.valor_unitario.toFixed(2)}</td>
            <td>R$ ${item.valor_total.toFixed(2)}</td>
            <td>
                <button type="button" class="btn btn-sm btn-danger" onclick="removerItem(${index})">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('total-itens').textContent = `R$ ${total.toFixed(2)}`;
}

function removerItem(index) {
    itensContrato.splice(index, 1);
    atualizarTabelaItens();
}

async function salvarContrato(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const dados = Object.fromEntries(formData.entries());

    // Adicionar itens
    dados.itens = itensContrato;

    // Calcular valor parcela se parcelado
    if (dados.caucao_forma_pagamento === 'parcelada') {
        const numParcelas = parseInt(dados.caucao_num_parcelas) || 1;
        dados.caucao_valor_parcela = parseFloat(dados.valor_caucao) / numParcelas;
    }

    try {
        const response = await fetch('/api/contratos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        if (response.ok) {
            alert('Contrato criado com sucesso!');
            window.location.href = '/contratos';
        } else {
            const error = await response.json();
            alert('Erro: ' + (error.error || 'Erro desconhecido'));
        }
    } catch (error) {
        console.error('Erro ao salvar:', error);
        alert('Erro ao salvar contrato');
    }
}
