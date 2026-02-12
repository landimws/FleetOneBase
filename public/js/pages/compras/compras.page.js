import { ComprasAPI } from './compras.api.js?v=2';
import { Mask } from '/js/utils/mask.js';
import { ComprasCalculo } from './compras.calculo.js';
import { ComprasItens } from './compras.itens.js';
import { ComprasPagamento } from './compras.pagamento.js';

// --- Estado da Página ---
const Filtros = {
    inicio: document.getElementById('filtroInicio'),
    fim: document.getElementById('filtroFim'),
    fornecedor: document.getElementById('filtroFornecedor')
};

let editItemIndex = null; // Índice do item sendo editado na lista local

// --- Inicialização ---
document.addEventListener('DOMContentLoaded', async () => {
    inicializarDatas();
    await carregarFornecedores();
    await carregarVeiculos();
    carregarLista();
    configurarEventos();
    ComprasPagamento.init();
});

function inicializarDatas() {
    const now = new Date();
    const isoStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const isoEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    if (Filtros.inicio) Filtros.inicio.value = isoStart;
    if (Filtros.fim) Filtros.fim.value = isoEnd;
}

async function carregarFornecedores() {
    try {
        const lista = await ComprasAPI.obterFornecedores();
        const opts = lista.map(f => `<option value="${f.id}">${f.nome}</option>`).join('');

        // Filtro
        Filtros.fornecedor.innerHTML = '<option value="">Todos Fornecedores</option>' + opts;

        // Modal
        document.getElementById('fornecedor_id').innerHTML = '<option value="">Selecione...</option>' + opts;
    } catch (e) {
        console.error(e);
        alert('Erro ao carregar fornecedores');
    }
}

async function carregarVeiculos() {
    try {
        const veiculos = await ComprasAPI.obterVeiculos();
        const dl = document.getElementById('listaVeiculos');
        if (dl) {
            dl.innerHTML = veiculos.map(v => `<option value="${v.placa}">${v.placa} - ${v.modelo}</option>`).join('');
        }
    } catch (e) {
        console.error('Erro ao carregar veículos:', e);
    }
}

async function carregarLista() {
    try {
        const dados = await ComprasAPI.listar({
            start: Filtros.inicio.value,
            end: Filtros.fim.value,
            fornecedor_id: Filtros.fornecedor.value
        });

        renderizarTabela(dados);
    } catch (e) {
        console.error(e);
        alert('Erro ao carregar lista de compras');
    }
}

function renderizarTabela(compras) {
    const tbody = document.getElementById('tabelaCompras');
    if (!compras.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center p-4 text-muted">Nenhum registro encontrado.</td></tr>';
        return;
    }

    tbody.innerHTML = compras.map(c => `
        <tr style="cursor:pointer;" onclick="visualizarCompra(${c.id})">
            <td class="text-center">${new Date(c.data_emissao).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
            <td>${c.Fornecedor?.nome || '-'}</td>
            <td class="text-center">${c.numero_nota || ''}</td>
            <td class="text-right" style="font-weight: 600;">${ComprasCalculo.formatarMoeda(c.valor_liquido)}</td>
            <td class="text-center">
                 <button class="btn-sm-ghost text-primary" onclick="event.stopPropagation(); editarCompra(${c.id})" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-sm-ghost text-danger" onclick="event.stopPropagation(); excluirCompra(${c.id})" title="Excluir">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');

    tbody.querySelectorAll('.btn-excluir').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Double safety
            excluirCompra(btn.dataset.id);
        });
    });
}

// --- Eventos e Modais ---

function configurarEventos() {
    // Botão Nova Compra
    document.querySelector('.btn-nova-compra').addEventListener('click', abrirModalCompra);

    // Botão Add Item
    document.querySelector('.btn-add-item').addEventListener('click', abrirModalItem);
    document.querySelector('.btn-add-item-empty').addEventListener('click', abrirModalItem);

    // Salvar Item
    document.getElementById('btnSalvarItem').addEventListener('click', salvarItem);

    // Toggle Desconto
    document.querySelector('.discount-toggle').addEventListener('click', () => {
        document.getElementById('discountArea').classList.toggle('active');
    });

    // Filtros
    document.querySelector('.btn-filtrar').addEventListener('click', carregarLista);

    // Atualização de Totais (Evento Customizado)
    document.addEventListener('compras:itensAtualizados', atualizarTotaisPagina);
    document.addEventListener('compras:editarItem', (e) => {
        abrirModalItem(e.detail.item, e.detail.index);
    });

    // Inputs que afetam totais
    ['desconto_global_valor', 'desconto_global_perc'].forEach(id => {
        document.getElementById(id).addEventListener('input', (e) => {
            if (id === 'desconto_global_valor') e.target.value = Mask.currency(e.target.value);
            atualizarTotaisPagina();
        });
    });

    // Form Submit
    document.getElementById('formCompra').addEventListener('submit', salvarCompra);
}

// --- Lógica de Modais ---

// --- Edição ---
window.editarCompra = async (id) => {
    try {
        const compra = await ComprasAPI.getCompra(id);

        // 1. Populate Header
        document.getElementById('compra_id').value = compra.id;
        document.getElementById('fornecedor_id').value = compra.fornecedor_id;
        document.getElementById('data_emissao').value = compra.data_emissao;
        document.getElementById('numero_nota').value = compra.numero_nota;
        document.getElementById('observacoes').value = compra.observacoes;

        // 2. Populate Discounts
        if (compra.desconto_percentual > 0) {
            document.getElementById('desconto_global_perc').value = compra.desconto_percentual;
            document.getElementById('desconto_global_valor').value = 0;
            document.getElementById('discountArea').classList.add('active');
        } else if (compra.desconto_valor > 0) {
            document.getElementById('desconto_global_perc').value = 0;
            document.getElementById('desconto_global_valor').value = Mask.currency(compra.desconto_valor.toString());
            document.getElementById('discountArea').classList.add('active');
        }

        // 3. Populate Items
        ComprasItens.limpar();
        compra.itens.forEach(item => {
            ComprasItens.adicionar({
                descricao: item.descricao,
                tipo: item.tipo, // Corrigido: Passando o tipo que estava faltando
                quantidade: item.quantidade,
                valor_unitario: item.valor_unitario,
                desconto_valor: item.desconto_valor,
                placa: item.placa,
                numero_os: item.numero_os
            });
        });

        // 4. Populate Payment
        // We need to infer payment condition based on installments
        const parcelas = compra.parcelas || [];
        if (parcelas.length === 1 && parcelas[0].vencimento === compra.data_emissao) {
            // Likely Avista (but let's check logic) -> simplifies to just setting fields
            document.getElementById('condicao_pagamento').value = 'avista';
        } else {
            document.getElementById('condicao_pagamento').value = 'prazo';
        }
        // Force change event to show/hide fields
        document.getElementById('condicao_pagamento').dispatchEvent(new Event('change'));

        // Set installments data explicitly if needed, or let user regenerate. 
        // For simplicity in MVP editing, we load the list of parcels into the payment module if possible,
        // OR we just set the 'first due date' and let the user re-generate if they change values.
        // Better: Set the "Qtd Parcelas" and "Primeiro Vencimento" based on existing data.
        if (parcelas.length > 0) {
            document.getElementById('qtd_parcelas').value = parcelas.length;
            document.getElementById('primeiro_vencimento').value = parcelas[0].vencimento;
            // Trigger generation to visually match (user can adjust if needed)
            // Note: Exact reconstruction of varying dates might be lost if we just auto-generate, 
            // but since our Create logic is auto-generate, this matches the capabilities.
            ComprasPagamento.gerarParcelasUI();
        }

        // 5. Open Modal
        document.getElementById('modalCompraLabel').innerText = 'Editar Compra'; // Update Title
        document.getElementById('modalCompra').style.display = 'block';
        atualizarTotaisPagina();

    } catch (e) {
        console.error(e);
        alert(e.message || 'Erro ao carregar para edição');
    }
};

window.abrirModalCompra = () => { // Override/Ensure original reset
    document.getElementById('formCompra').reset();
    document.getElementById('compra_id').value = ''; // Clear ID
    document.getElementById('modalCompraLabel').innerText = 'Nova Compra';
    ComprasItens.limpar();
    document.getElementById('data_emissao').value = new Date().toISOString().split('T')[0];
    document.getElementById('primeiro_vencimento').value = new Date().toISOString().split('T')[0];
    document.getElementById('modalCompra').style.display = 'block';
    document.getElementById('discountArea').classList.remove('active');
    atualizarTotaisPagina();
}

function abrirModalItem(item = null, index = null) {
    document.getElementById('formItem').reset();
    editItemIndex = index;

    // Se item for um Evento (chamado via listener), resetar para null
    if (item instanceof Event) item = null;

    if (item && item.descricao !== undefined) {
        document.getElementById('modalItemCompraTitulo').innerText = 'Editar Item';
        document.getElementById('btnSalvarItem').innerText = 'Salvar Alterações';

        document.getElementById('item_desc').value = item.descricao;
        document.getElementById('item_tipo').value = item.tipo || 'PECA'; // Garantir fallback
        document.getElementById('item_qtd').value = item.quantidade;

        // Fix: Valores já são float/number, formatar corretamente sem dividir por 100
        const formatMoney = (v) => parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        document.getElementById('item_unit').value = formatMoney(item.valor_unitario);
        document.getElementById('item_desc_val').value = formatMoney(item.desconto_valor);
        document.getElementById('item_placa').value = item.placa || '';
        document.getElementById('item_os').value = item.numero_os || '';
    } else {
        document.getElementById('modalItemCompraTitulo').innerText = 'Adicionar Item';
        document.getElementById('btnSalvarItem').innerText = 'Adicionar';
        document.getElementById('item_qtd').value = 1;
    }

    document.getElementById('item_total_display').innerText = 'R$ 0,00';
    if (item) updateTotal(); // Preencher o total se for edição

    document.getElementById('modalItemCompra').style.display = 'block';
    setTimeout(() => document.getElementById('item_desc').focus(), 100);


    // Apply Masks
    // Apply Masks (Change event instead of Input to avoid "ATM" confusion and decimal loss)
    ['item_unit', 'item_desc_val'].forEach(id => {
        const el = document.getElementById(id);

        // Formatar apenas ao sair do campo
        el.addEventListener('change', (e) => {
            e.target.value = Mask.currency(e.target.value);
            updateTotal();
        });

        // Permitir apenas números e vírgula/ponto durante digitação
        el.addEventListener('input', (e) => {
            // Remove caracteres inválidos mas deixa o usuário digitar
            const val = e.target.value.replace(/[^0-9,.]/g, '');
            if (val !== e.target.value) e.target.value = val;
            updateTotal(); // Calcula realtime sem formatar
        });
    });

    document.getElementById('item_qtd').addEventListener('input', updateTotal);

    function updateTotal() {
        const qtd = parseFloat(document.getElementById('item_qtd').value) || 0;
        const unit = Mask.unmaskCurrency(document.getElementById('item_unit').value);
        const desc = Mask.unmaskCurrency(document.getElementById('item_desc_val').value);

        const tot = ComprasCalculo.calcularItem(qtd, unit, desc);
        document.getElementById('item_total_display').innerText = ComprasCalculo.formatarMoeda(tot);
    }
}

// --- Ações ---

function salvarItem() {
    const item = {
        descricao: document.getElementById('item_desc').value,
        tipo: document.getElementById('item_tipo').value,
        quantidade: parseFloat(document.getElementById('item_qtd').value),
        valor_unitario: Mask.unmaskCurrency(document.getElementById('item_unit').value),
        desconto_valor: Mask.unmaskCurrency(document.getElementById('item_desc_val').value),
        placa: document.getElementById('item_placa').value,
        numero_os: document.getElementById('item_os').value
    };

    let sucesso = false;
    if (editItemIndex !== null) {
        sucesso = ComprasItens.atualizar(editItemIndex, item);
    } else {
        sucesso = ComprasItens.adicionar(item);
    }

    if (sucesso) {
        document.getElementById('modalItemCompra').style.display = 'none';
        atualizarTotaisPagina();
    }
}

function atualizarTotaisPagina() {
    const itens = ComprasItens.obterTodos();
    const totais = ComprasCalculo.calcularTotalCompra(
        itens,
        Mask.unmaskCurrency(document.getElementById('desconto_global_valor').value),
        document.getElementById('desconto_global_perc').value
    );

    document.getElementById('totalItens').innerText = ComprasCalculo.formatarMoeda(totais.bruto);
    document.getElementById('valor_liquido_display').innerText = ComprasCalculo.formatarMoeda(totais.liquido);

    // Hidden fields for reference
    document.getElementById('valor_liquido').value = totais.liquido;

    // Update installments if needed
    ComprasPagamento.atualizarValores(totais.liquido);
}

async function salvarCompra(e) {
    e.preventDefault();
    const itens = ComprasItens.obterTodos();

    const id = document.getElementById('compra_id').value;
    const isEdit = !!id;

    const dados = {
        fornecedor_id: document.getElementById('fornecedor_id').value,
        data_emissao: document.getElementById('data_emissao').value,
        numero_nota: document.getElementById('numero_nota').value,
        observacoes: document.getElementById('observacoes').value,
        desconto_percentual: document.getElementById('desconto_global_perc').value,
        desconto_valor: Mask.unmaskCurrency(document.getElementById('desconto_global_valor').value),
        itens: ComprasItens.obterTodos(),
        parcelas: ComprasPagamento.obterParcelas()
    };

    try {
        if (isEdit) {
            await ComprasAPI.atualizar(id, dados);
        } else {
            await ComprasAPI.salvar(dados);
        }

        document.getElementById('modalCompra').style.display = 'none';
        carregarLista();
    } catch (err) {
        alert('Erro ao salvar: ' + (err.message || err));
    }
}

async function excluirCompra(id) {
    if (!confirm('Deseja excluir esta compra?')) return;
    try {
        await ComprasAPI.excluir(id);
        carregarLista();
    } catch (e) {
        alert(e.message);
    }
}

// Global exposing for inline onclicks (if any remain, though we tried to remove them)
// Global exposing for inline onclicks (if any remain, though we tried to remove them)
window.fecharModalCompra = () => document.getElementById('modalCompra').style.display = 'none';
window.fecharModalItem = () => document.getElementById('modalItemCompra').style.display = 'none';

window.visualizarCompra = async (id) => {
    try {
        const res = await fetch(`/api/financeiro/compras/${id}`);
        const c = await res.json();
        if (!res.ok) throw new Error(c.error || 'Erro ao carregar detalhes');

        // Header
        const container = document.getElementById('conteudoDetalhesCompra');
        container.innerHTML = `
            <div class="financial-card">
                <div class="financial-title">
                    <i class="fas fa-file-invoice-dollar"></i> Dados da Compra
                </div>
                <div class="financial-grid">
                    <div class="financial-item">
                        <div class="financial-label">Fornecedor</div>
                        <div class="financial-status" style="color:#2c3e50;">
                            ${c.Fornecedor?.nome || 'N/A'}
                            <small style="display:block; color:#64748b; font-size:0.75rem;">
                                ${c.Fornecedor?.cnpj_cpf ? Mask.cpfCnpj(c.Fornecedor.cnpj_cpf) : ''}
                            </small>
                        </div>
                    </div>
                    <div class="financial-item">
                        <div class="financial-label">Nota Fiscal</div>
                        <div class="financial-status">${c.numero_nota || 'S/N'}</div>
                    </div>
                    <div class="financial-item">
                        <div class="financial-label">Data Emissão</div>
                        <div class="financial-status">${new Date(c.data_emissao).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</div>
                    </div>
                    <div class="financial-item">
                        <div class="financial-label">Valor Original</div>
                        <div class="financial-status" style="color:#27ae60;">${parseFloat(c.valor_liquido).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                    </div>
                </div>
            </div>
            
            <div class="financial-card">
                <div class="financial-title">
                    <i class="fas fa-boxes"></i> Itens da Nota
                </div>
                <table class="data-table" style="width:100%;">
                    <thead>
                        <tr>
                            <th style="text-align:left;">Produto/Serviço</th>
                            <th style="text-align:center;">Qtd</th>
                            <th style="text-align:right;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(c.itens || []).map(i => `
                            <tr>
                                <td>${i.descricao}</td>
                                <td style="text-align:center;">${i.quantidade}</td>
                                <td style="text-align:right;">${parseFloat(i.valor_final).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <div class="financial-card">
                <div class="financial-title">
                    <i class="fas fa-calendar-alt"></i> Parcelamento
                </div>
                 <table class="data-table" style="width:100%;">
                    <thead>
                        <tr>
                            <th style="text-align:center;">#</th>
                            <th style="text-align:center;">Vencimento</th>
                            <th style="text-align:right;">Valor</th>
                            <th style="text-align:center;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(c.parcelas || []).map(p => `
                            <tr>
                                <td style="text-align:center;">${p.numero_parcela}/${p.total_parcelas}</td>
                                <td style="text-align:center;">${new Date(p.vencimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                                <td style="text-align:right;">${parseFloat(p.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                <td style="text-align:center;"><span class="badge badge-${p.status === 'PAGO' ? 'success' : 'secondary'}">${p.status}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        document.getElementById('modalDetalhesCompra').style.display = 'flex';
        document.getElementById('modalDetalhesCompra').classList.remove('hidden');
    } catch (e) {
        console.error(e);
        alert('Erro ao carregar detalhes');
    }
};

window.fecharModalDetalhesCompra = () => {
    document.getElementById('modalDetalhesCompra').style.display = 'none';
    document.getElementById('modalDetalhesCompra').classList.add('hidden');
};
