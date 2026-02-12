// ========================================
// PÁGINA DE VEÍCULOS
// ========================================

let veiculos = [];
let veiculoEditando = null;

// constantsCache removido - usando window.Constants

// Carregar veículos
async function carregarVeiculos(busca = '') {
    try {
        const url = busca
            ? `/api/veiculos?busca=${encodeURIComponent(busca)}`
            : '/api/veiculos';

        const response = await fetch(url);
        veiculos = await response.json();
        renderizarLista();
    } catch (error) {
        console.error('Erro ao carregar veículos:', error);
        veiculos = [];
        renderizarLista();
    }
}

// Carregar constantes do sistema (modelos, combustíveis, etc)
// carregarConstantes removido - usando window.Constants

// Helper para popular um select com opções
function popularSelect(selectId, opcoes) {
    const select = document.getElementById(selectId);
    if (!select || !opcoes) return;

    // Manter apenas a primeira opção (placeholder "Selecione...")
    while (select.options.length > 1) {
        select.remove(1);
    }

    // Adicionar opções dinamicamente
    opcoes.forEach(opcao => {
        const option = document.createElement('option');
        option.value = opcao;
        option.textContent = opcao;
        select.appendChild(option);
    });
}

// Renderizar lista
// Renderizar lista
function renderizarLista() {
    const tbody = document.querySelector('#lista-veiculos tbody');
    tbody.innerHTML = '';

    // Filtro Condutor
    const filtroTipo = document.getElementById('filtro-condutor')?.value || 'todos';

    const veiculosFiltrados = veiculos.filter(v => {
        if (filtroTipo === 'todos') return true;
        if (filtroTipo === 'sem-condutor') return !v.condutor_atual;
        if (filtroTipo === 'indicado') return v.condutor_atual && v.condutor_indicado;
        if (filtroTipo === 'nao-indicado') return v.condutor_atual && !v.condutor_indicado;
        return true;
    });

    if (veiculosFiltrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 40px; color: #7f8c8d;">Nenhum veículo encontrado com este filtro</td></tr>';
        return;
    }

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const [y, m, d] = dateString.split('-');
        return `${d}/${m}/${y}`;
    };

    const statusBadge = (label, vencimento, pago) => {
        if (pago) return `<span class="badge badge-success" title="Pago (Venc: ${formatDate(vencimento)})">OK</span>`;
        if (!vencimento) return `<span class="badge" style="background:#eee; color:#777;">-</span>`;

        const hoje = new Date().toISOString().split('T')[0];
        const vencido = vencimento < hoje;
        const style = vencido ? 'badge-danger' : 'badge-warning';
        return `<span class="badge ${style}" title="Vence em ${formatDate(vencimento)}">${vencido ? 'Vencido' : 'Pendente'}</span>`;
    };

    veiculosFiltrados.forEach(veiculo => {
        const tr = document.createElement('tr');

        // Renavam abaixo da placa se existir
        const placaHtml = `
            <strong>${veiculo.placa}</strong>
            ${!veiculo.ativo ? ' <span style="font-size:10px; color:red;">(Inativo)</span>' : ''}
            ${veiculo.renavam ? `<div style="font-size: 10px; color: #666;">Renavam: ${veiculo.renavam}</div>` : ''}
        `;

        // Coluna Condutor (Apenas nome)
        const condutorHtml = veiculo.condutor_atual
            ? `<div style="font-weight: 500; color: #2c3e50;">${veiculo.condutor_atual}</div>`
            : '<span style="color: #ccc;">-</span>';

        // Coluna Indicado (Badge Padrão)
        let indicadoHtml = '<span class="badge" style="background:#eee; color:#777;">-</span>';
        if (veiculo.condutor_atual) {
            if (veiculo.condutor_indicado) {
                indicadoHtml = '<span class="badge badge-success">OK</span>';
            } else {
                indicadoHtml = '<span class="badge badge-danger">NÃO</span>';
            }
        }

        // Tornar linha clicável
        tr.style.cursor = 'pointer';
        tr.onclick = (e) => {
            if (e.target.closest('.btn-danger')) return;
            abrirModalDetalhes(veiculo.placa);
        };

        tr.innerHTML = `
            <td>${placaHtml}</td>
            <td>${veiculo.modelo}</td>
            <td>${veiculo.ano || '-'}</td>
            <td>${veiculo.combustivel}</td>
            <td>${condutorHtml}</td>
            <td style="text-align: center;">${indicadoHtml}</td>
            <td>${statusBadge('IPVA', veiculo.ipva_vencimento, veiculo.ipva_pago)}</td>
            <td>${statusBadge('Lic', veiculo.licenciamento_vencimento, veiculo.licenciamento_pago)}</td>
            <td>${statusBadge('Selo', veiculo.vistoria_vencimento, veiculo.vistoria_pago)}</td>
            <td>
                <button class="btn-table btn-danger" onclick="excluirVeiculo('${veiculo.placa}'); event.stopPropagation();">Excluir</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Abrir modal para novo veículo
function novoVeiculo() {
    console.log('Novo veículo');
    veiculoEditando = null;
    document.getElementById('modal-title').textContent = 'Novo Veículo';

    // Campos Básicos
    document.getElementById('input-placa').value = '';
    document.getElementById('input-modelo').value = '';
    document.getElementById('input-ano').value = '';
    document.getElementById('input-combustivel').value = '';
    document.getElementById('input-preco-base').value = '';
    document.getElementById('input-ativo').checked = true;
    document.getElementById('input-placa').disabled = false;

    // Campos Novos
    document.getElementById('input-renavam').value = '';
    document.getElementById('input-chassi').value = '';

    // Condutor Indicado
    document.getElementById('wrapper-condutor-indicado').style.display = 'none';
    document.getElementById('input-condutor-indicado').checked = false;

    document.getElementById('input-ipva-venc').value = '';
    document.getElementById('input-ipva-valor').value = '';
    document.getElementById('input-ipva-pago').checked = false;

    document.getElementById('input-licenciamento-venc').value = '';
    document.getElementById('input-licenciamento-valor').value = '';
    document.getElementById('input-licenciamento-pago').checked = false;

    document.getElementById('input-vistoria-venc').value = '';
    document.getElementById('input-vistoria-valor').value = '';
    document.getElementById('input-vistoria-pago').checked = false;

    abrirModal();
}

// Editar veículo
function editarVeiculo(placa) {
    console.log('Editando:', placa);
    const veiculo = veiculos.find(v => v.placa === placa);
    if (!veiculo) {
        console.error('Veículo não encontrado no array:', placa);
        return;
    }

    veiculoEditando = veiculo;
    document.getElementById('modal-title').textContent = 'Editar Veículo';

    // Básicos
    document.getElementById('input-placa').value = veiculo.placa;
    document.getElementById('input-modelo').value = veiculo.modelo;
    document.getElementById('input-ano').value = veiculo.ano || ''; // Novo
    document.getElementById('input-combustivel').value = veiculo.combustivel;
    document.getElementById('input-preco-base').value = veiculo.preco_base;
    document.getElementById('input-ativo').checked = veiculo.ativo;
    document.getElementById('input-placa').disabled = true;

    // Novos
    document.getElementById('input-renavam').value = veiculo.renavam || '';
    document.getElementById('input-chassi').value = veiculo.chassi || '';

    // Condutor Indicado (CheckBox)
    const wrapperIndicado = document.getElementById('wrapper-condutor-indicado');
    const checkIndicado = document.getElementById('input-condutor-indicado');

    // [LOGIC] Só mostra se tiver condutor atual
    if (veiculo.condutor_atual) {
        wrapperIndicado.style.display = 'block';
        checkIndicado.checked = !!veiculo.condutor_indicado;
    } else {
        wrapperIndicado.style.display = 'none';
        checkIndicado.checked = false;
    }

    // Helper simples para formatar na edição
    const toBR = (isoDate) => {
        if (!isoDate) return '';
        const [y, m, d] = isoDate.split('-');
        return `${d}/${m}/${y}`;
    };
    const formatMoney = (val) => {
        if (!val && val !== 0) return '';
        return val.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    };

    document.getElementById('input-ipva-venc').value = toBR(veiculo.ipva_vencimento);
    document.getElementById('input-ipva-valor').value = formatMoney(veiculo.ipva_valor);
    document.getElementById('input-ipva-pago').checked = veiculo.ipva_pago || false;

    document.getElementById('input-licenciamento-venc').value = toBR(veiculo.licenciamento_vencimento);
    document.getElementById('input-licenciamento-valor').value = formatMoney(veiculo.licenciamento_valor);
    document.getElementById('input-licenciamento-pago').checked = veiculo.licenciamento_pago || false;

    document.getElementById('input-vistoria-venc').value = toBR(veiculo.vistoria_vencimento);
    document.getElementById('input-vistoria-valor').value = formatMoney(veiculo.vistoria_valor);
    document.getElementById('input-vistoria-pago').checked = veiculo.vistoria_pago || false;

    abrirModal();
}

// Salvar veículo
async function salvarVeiculo() {
    const placa = document.getElementById('input-placa').value.trim().toUpperCase();
    const modelo = document.getElementById('input-modelo').value;
    const ano = document.getElementById('input-ano').value;
    const combustivel = document.getElementById('input-combustivel').value;
    const preco_base = parseFloat(document.getElementById('input-preco-base').value);
    const ativo = document.getElementById('input-ativo').checked;

    // formatar data BR para ISO (e vice-versa helper)
    const toISO = (brDate) => {
        if (!brDate || brDate.length !== 10) return null;
        const [d, m, y] = brDate.split('/');
        return `${y}-${m}-${d}`;
    };

    // Novos
    const renavam = document.getElementById('input-renavam').value.replace(/\D/g, ''); // Garantir apenas números
    const chassi = document.getElementById('input-chassi').value.trim().toUpperCase();

    // Converter DD/MM/AAAA para YYYY-MM-DD
    const ipva_vencimento = toISO(document.getElementById('input-ipva-venc').value);
    const ipva_valor = document.getElementById('input-ipva-valor').value;
    const ipva_pago = document.getElementById('input-ipva-pago').checked;

    const licenciamento_vencimento = toISO(document.getElementById('input-licenciamento-venc').value);
    const licenciamento_valor = document.getElementById('input-licenciamento-valor').value;
    const licenciamento_pago = document.getElementById('input-licenciamento-pago').checked;

    const vistoria_vencimento = toISO(document.getElementById('input-vistoria-venc').value);
    const vistoria_valor = document.getElementById('input-vistoria-valor').value;
    const vistoria_pago = document.getElementById('input-vistoria-pago').checked;

    const condutor_indicado = document.getElementById('input-condutor-indicado').checked;

    if (!placa || !modelo || !combustivel || isNaN(preco_base)) {
        alert('Preencha todos os campos obrigatórios');
        return;
    }

    try {
        const dados = {
            placa, modelo, ano, combustivel, preco_base, ativo,
            renavam, chassi,
            ipva_vencimento, ipva_valor, ipva_pago,
            licenciamento_vencimento, licenciamento_valor, licenciamento_pago,
            vistoria_vencimento, vistoria_valor, vistoria_pago,
            condutor_indicado
        };


        let response;
        if (veiculoEditando) {
            // Atualizar
            response = await fetch(`/api/veiculos/${placa}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados)
            });
        } else {
            // Criar
            response = await fetch('/api/veiculos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados)
            });
        }

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao salvar veículo');
        }

        await carregarVeiculos();

        // [DataRefreshBus] Notificar outros módulos
        if (window.DataRefreshBus) {
            DataRefreshBus.notifyDataChanged('veiculos');
        }

        fecharModal();
        alert('Veículo salvo com sucesso!');
    } catch (error) {
        console.error('Erro ao salvar veículo:', error);
        alert(error.message);
    }
}

// Excluir veículo
async function excluirVeiculo(placa) {
    if (!confirm(`Deseja realmente excluir o veículo ${placa}?`)) {
        return;
    }

    try {
        const response = await fetch(`/api/veiculos/${placa}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao excluir veículo');
        }

        await carregarVeiculos();
        alert('Veículo excluído com sucesso!');
    } catch (error) {
        console.error('Erro ao excluir veículo:', error);
        alert(error.message);
    }
}

// Abrir modal
function abrirModal() {
    document.getElementById('modal-form-veiculo').style.display = 'flex';
}

// Fechar modal
function fecharModal() {
    document.getElementById('modal-form-veiculo').style.display = 'none';
    veiculoEditando = null;
}

// Event Listeners
document.addEventListener('DOMContentLoaded', async () => {
    // Carregar constantes primeiro (modelos, combustíveis, etc)
    // Carregar constantes primeiro (modelos, combustíveis, etc)
    const consts = await Constants.load();
    if (consts) {
        popularSelect('input-modelo', consts.MODELOS_VEICULOS);
        popularSelect('input-combustivel', consts.TIPOS_COMBUSTIVEL);
    }

    // Depois carregar veículos
    carregarVeiculos();

    // [DataRefreshBus] Subscribe para atualizações
    if (window.DataRefreshBus) {
        DataRefreshBus.subscribe((dataType) => {
            if (dataType === 'all' || dataType === 'veiculos') {
                console.log(`🔄 [Veículos] Recebido evento de atualização: ${dataType}`);
                carregarVeiculos();
            }
        });
    }

    // Busca
    document.getElementById('busca-veiculo').addEventListener('input', (e) => {
        carregarVeiculos(e.target.value);
    });

    // Filtro Condutor
    const filtroCondutor = document.getElementById('filtro-condutor');
    if (filtroCondutor) {
        filtroCondutor.addEventListener('change', () => {
            renderizarLista();
        });
    }

    // Botão Novo
    document.getElementById('btn-novo-veiculo').addEventListener('click', novoVeiculo);

    // Botão Salvar
    document.getElementById('btn-salvar').addEventListener('click', salvarVeiculo);

    // Botão Cancelar
    document.getElementById('btn-cancelar').addEventListener('click', fecharModal);

    // Botão Fechar (X)
    document.getElementById('close-modal').addEventListener('click', fecharModal);

    // Fechar ao clicar fora
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('modal-form-veiculo');
        if (e.target === modal) {
            fecharModal();
        }
    });

    // Enter no formulário
    document.getElementById('form-veiculo').addEventListener('submit', (e) => {
        e.preventDefault();
        salvarVeiculo();
    });

    // MÁSCARAS DE ENTRADA

    // 1. Renavam: Somente Números
    document.getElementById('input-renavam').addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '');
    });

    // 2. Datas: Formatação automática DD/MM/AAAA
    const mascaraData = (e) => {
        let v = e.target.value.replace(/\D/g, '');
        if (v.length > 2) v = v.replace(/^(\d{2})(\d)/, '$1/$2');
        if (v.length > 5) v = v.replace(/^(\d{2})\/(\d{2})(\d)/, '$1/$2/$3');
        e.target.value = v.slice(0, 10);
    };

    ['input-ipva-venc', 'input-licenciamento-venc', 'input-vistoria-venc'].forEach(id => {
        document.getElementById(id).addEventListener('input', mascaraData);
    });

    // 3. Moedas:
    const mascaraMoeda = (e) => {
        let v = e.target.value.replace(/\D/g, '');
        v = (parseFloat(v) / 100).toFixed(2);
        v = v.replace('.', ',');
        v = v.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        if (v === 'NaN') v = '';
        e.target.value = v;
    };

    document.querySelectorAll('.input-money').forEach(el => {
        el.addEventListener('input', mascaraMoeda);
    });
});

// ==========================================
// MODAL DE DETALHES (LEITURA)
// ==========================================
function abrirModalDetalhes(placa) {
    const veiculo = veiculos.find(v => v.placa === placa);
    if (!veiculo) return;

    // Elementos
    const setTxt = (id, txt) => document.getElementById(id).textContent = txt || '-';
    const fmtMoney = (val) => (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const fmtDate = (iso) => {
        if (!iso) return '-';
        const [y, m, d] = iso.split('-');
        return `${d}/${m}/${y}`;
    };

    // Preencher Topo
    setTxt('det-placa', veiculo.placa);
    setTxt('det-modelo', veiculo.modelo);

    // Badge Ativo
    const divAtivo = document.getElementById('det-ativo-badge');
    if (veiculo.ativo) {
        divAtivo.innerHTML = '<span class="badge badge-success" style="font-size:12px;">ATIVO</span>';
    } else {
        divAtivo.innerHTML = '<span class="badge badge-danger" style="font-size:12px;">INATIVO</span>';
    }

    // Grid Principal
    setTxt('det-combustivel', veiculo.combustivel);
    setTxt('det-ano__view', veiculo.ano);
    setTxt('det-preco', fmtMoney(veiculo.preco_base));
    setTxt('det-renavam', veiculo.renavam);
    setTxt('det-chassi', veiculo.chassi);

    // Helper Status Regularização
    const renderRegLine = (prefix, venc, valor, pago) => {
        const dadosSpan = document.getElementById(`${prefix}-dados`);
        const statusSpan = document.getElementById(`${prefix}-status`);

        // Texto de dados: "10/05/2024 - R$ 1.200,00"
        let txt = fmtDate(venc);
        if (valor) txt += ` • ${fmtMoney(valor)}`;
        dadosSpan.textContent = txt;
        dadosSpan.style.color = '#555';

        // Status Badge
        if (pago) {
            statusSpan.innerHTML = '<span class="badge badge-success">PAGO</span>';
        } else if (!venc) {
            statusSpan.innerHTML = '<span class="badge" style="background:#eee; color:#aaa;">-</span>';
        } else {
            const hoje = new Date().toISOString().split('T')[0];
            const vencido = venc < hoje;
            if (vencido) {
                statusSpan.innerHTML = '<span class="badge badge-danger">VENCIDO</span>';
            } else {
                statusSpan.innerHTML = '<span class="badge badge-warning">PENDENTE</span>';
            }
        }
    };

    renderRegLine('det-ipva', veiculo.ipva_vencimento, veiculo.ipva_valor, veiculo.ipva_pago);
    renderRegLine('det-lic', veiculo.licenciamento_vencimento, veiculo.licenciamento_valor, veiculo.licenciamento_pago);
    renderRegLine('det-vistoria', veiculo.vistoria_vencimento, veiculo.vistoria_valor, veiculo.vistoria_pago);

    // Botão de Editar (Link para o outro modal)
    document.getElementById('btn-det-editar').onclick = () => {
        document.getElementById('modal-detalhes-veiculo').style.display = 'none';
        editarVeiculo(placa);
    };

    // [NEW] Buscar Último Cliente
    const divCliente = document.getElementById('det-cliente-box');
    const spanCliente = document.getElementById('det-cliente');

    // Reset visual
    divCliente.style.display = 'none';
    spanCliente.textContent = 'Carregando...';

    fetch(`/api/veiculos/${placa}/ultimo-cliente`)
        .then(r => r.json())
        .then(data => {
            if (data && data.cliente) {
                spanCliente.textContent = data.cliente;
                divCliente.style.display = 'block'; // Mostra só se tiver cliente
            }
        })
        .catch(err => console.error('Erro ao buscar cliente:', err));

    document.getElementById('modal-detalhes-veiculo').style.display = 'flex';
}

// Fechar modal detalhes
document.getElementById('close-modal-detalhes').onclick = () => {
    document.getElementById('modal-detalhes-veiculo').style.display = 'none';
};
document.getElementById('btn-det-fechar').onclick = () => {
    document.getElementById('modal-detalhes-veiculo').style.display = 'none';
};
