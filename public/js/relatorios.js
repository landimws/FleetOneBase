
const Relatorios = {
    dadosLista: [], // Cache local para filtro
    tipoAtual: 'clientes',

    init() {
        this.cacheDOM();
        this.bindEvents();
        // Carregar Clientes por padrão
        this.carregarLista('clientes');
    },

    cacheDOM() {
        this.dom = {
            // Navegação
            tabs: {
                clientes: document.getElementById('tab-clientes'),
                veiculos: document.getElementById('tab-veiculos')
            },
            inputFiltro: document.getElementById('input-filtro-lista'),
            tbodyLista: document.getElementById('tbody-lista'),

            // Modal
            modal: document.getElementById('modal-detalhes'),
            modalTitulo: document.getElementById('modal-titulo'),
            btnFechar: document.getElementById('btn-fechar-modal'),

            // Conteudo Modal
            timeline: document.getElementById('timeline-container'),
            resumo: document.getElementById('resumo-container'), // Container todo
            totalPrevisto: document.getElementById('res-total-previsto'),
            totalPago: document.getElementById('res-total-pago'),
            totalSaldo: document.getElementById('res-total-saldo'),
            totalSemanas: document.getElementById('res-td-semanas')
        };
    },

    bindEvents() {
        // Abas
        this.dom.tabs.clientes.addEventListener('click', () => this.carregarLista('clientes'));
        this.dom.tabs.veiculos.addEventListener('click', () => this.carregarLista('veiculos'));

        // Filtro
        this.dom.inputFiltro.addEventListener('input', (e) => this.filtrarLista(e.target.value));

        // Modal
        this.dom.btnFechar.addEventListener('click', () => this.fecharModal());

        // Fechar ao clicar fora
        this.dom.modal.addEventListener('click', (e) => {
            if (e.target === this.dom.modal) this.fecharModal();
        });

        // ESC para fechar
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.fecharModal();
        });
    },

    async carregarLista(tipo) {
        this.tipoAtual = tipo;

        // UI Tabs
        this.dom.tabs.clientes.classList.toggle('active', tipo === 'clientes');
        this.dom.tabs.veiculos.classList.toggle('active', tipo === 'veiculos');

        // Loading
        this.dom.tbodyLista.innerHTML = '<tr><td colspan="10" style="text-align:center; padding:20px;">Carregando...</td></tr>';

        try {
            const res = await fetch(`/api/relatorios/listar?tipo=${tipo}`);
            this.dadosLista = await res.json();

            // Renderiza tudo inicialmente
            this.renderizarTabela(this.dadosLista);
            this.dom.inputFiltro.value = ''; // Limpa filtro ao trocar aba
            this.dom.inputFiltro.focus();

        } catch (e) {
            console.error(e);
            this.dom.tbodyLista.innerHTML = '<tr><td colspan="10" style="text-align:center; color:red;">Erro ao carregar dados.</td></tr>';
        }
    },

    filtrarLista(termo) {
        const term = termo.toLowerCase();
        const filtrado = this.dadosLista.filter(item => item.nome.toLowerCase().includes(term));
        this.renderizarTabela(filtrado);
    },

    renderizarTabela(lista) {
        if (lista.length === 0) {
            this.dom.tbodyLista.innerHTML = '<tr><td colspan="10" style="text-align:center; color:#999;">Nenhum registro encontrado.</td></tr>';
            return;
        }

        const html = lista.map(item => {
            // Estilo Base: Preto, tamanho 14px
            const styleBase = 'text-align:right; color:#000; font-size:14px; vertical-align:middle;';

            // Cores Específicas
            // Saldo: Verde se > 0, Vermelho se < 0, Preto se 0
            let saldoColor = '#000';
            if (item.somaSaldo > 0) saldoColor = '#27ae60';
            if (item.somaSaldo < 0) saldoColor = '#c0392b';

            // Pago: Verde se > 0, Preto se 0
            const pagoColor = item.somaPago > 0 ? '#27ae60' : '#000';

            return `
            <tr onclick="Relatorios.abrirDetalhes('${item.nome}')" style="border-bottom: 1px solid #eee;">
                <td style="font-size:14px; color:#000; vertical-align:middle; padding:12px;">${item.nome}</td>
                
                <td style="${styleBase}">${this.fmtMoney(item.somaAluguel)}</td>
                <td style="${styleBase}">${this.fmtMoney(item.somaPremium)}</td>
                <td style="${styleBase}">${this.fmtMoney(item.somaProtecao)}</td>
                <td style="${styleBase}">${this.fmtMoney(item.somaAcordo)}</td>
                <td style="${styleBase}">${this.fmtMoney(item.somaBoleto)}</td>
                <td style="${styleBase}">-${this.fmtMoney(item.somaDesconto)}</td>
                
                <td style="${styleBase} background:#fdfefe;">${this.fmtMoney(item.somaPrevisto)}</td>
                <td style="text-align:right; color:${pagoColor}; font-size:14px; vertical-align:middle;">${this.fmtMoney(item.somaPago)}</td>
                
                <td style="text-align:right; color:${saldoColor}; font-size:14px; vertical-align:middle;">
                    ${this.fmtMoney(item.somaSaldo)}
                </td>
            </tr>
            `;
        }).join('');

        this.dom.tbodyLista.innerHTML = html;
    },

    // ABRIR MODAL COM TIMELINE
    async abrirDetalhes(nome) {
        this.dom.modal.style.display = 'flex';
        this.dom.modalTitulo.textContent = `Histórico: ${nome}`;
        this.dom.timeline.innerHTML = '<p style="text-align:center; padding:20px;">Carregando histórico...</p>';

        try {
            const res = await fetch(`/api/relatorios/busca?termo=${encodeURIComponent(nome)}`);
            const data = await res.json();
            this.renderizarTimeline(data);
        } catch (e) {
            console.error(e);
            this.dom.timeline.innerHTML = `<p style="text-align:center; color:red;">Erro ao buscar detalhes: ${e.message}</p>`;
        }
    },

    fecharModal() {
        this.dom.modal.style.display = 'none';
    },

    renderizarTimeline(data) {
        const { resultados, resumo } = data;

        // Atualizar Resumo no Modal
        this.dom.totalPrevisto.textContent = this.fmtMoney(resumo.totalPrevisto);
        this.dom.totalPago.textContent = this.fmtMoney(resumo.totalRecebido);

        // Saldo Colorido (Neto)
        const saldo = resumo.totalSaldo;
        let corSaldo = '#fff';
        if (saldo > 0) corSaldo = '#2ecc71';
        if (saldo < 0) corSaldo = '#e74c3c';

        this.dom.totalSaldo.innerHTML = `
            ${this.fmtMoney(saldo)}
            <div style="font-size:10px; margin-top:5px; line-height:1.2;">
                <span style="color:#e74c3c;">Devendo: ${this.fmtMoney(resumo.totalDivida)}</span><br>
                <span style="color:#2ecc71;">Juros: ${this.fmtMoney(resumo.totalJuros)}</span>
            </div>
        `;
        this.dom.totalSaldo.style.color = corSaldo;

        if (resultados.length === 0) {
            this.dom.totalSemanas.textContent = '0';
            this.dom.timeline.innerHTML = '<p style="text-align:center;">Nenhum registro histórico encontrado.</p>';
            return;
        }

        // Calcular Totais Detalhados
        let somaAluguel = 0;
        let somaPremium = 0;
        let somaProtecao = 0;
        let somaAcordo = 0;
        let somaBoleto = 0;
        let somaDescontos = 0;

        resultados.forEach(item => {
            somaAluguel += (item.semana || 0);
            somaPremium += (item.p_premium || 0);
            somaProtecao += (item.protecao || 0);
            somaAcordo += (item.acordo || 0);
            somaBoleto += (item.ta_boleto || 0);
            somaDescontos += (item.desconto || 0);
        });

        // Renderizar "Extrato Superior"
        const extratoHtml = `
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap:10px; margin-bottom:20px;">
                <div class="resumo-mini">
                    <label>Aluguel</label>
                    <div style="color:#3498db;">${this.fmtMoney(somaAluguel)}</div>
                </div>
                <div class="resumo-mini">
                    <label>Premium</label>
                    <div style="color:#9b59b6;">${this.fmtMoney(somaPremium)}</div>
                </div>
                <div class="resumo-mini">
                    <label>Proteção</label>
                    <div style="color:#e67e22;">${this.fmtMoney(somaProtecao)}</div>
                </div>
                <div class="resumo-mini">
                    <label>Acordos</label>
                    <div style="color:#f1c40f;">${this.fmtMoney(somaAcordo)}</div>
                </div>
                <div class="resumo-mini">
                    <label>Boleto</label>
                    <div style="color:#7f8c8d;">${this.fmtMoney(somaBoleto)}</div>
                </div>
                <div class="resumo-mini">
                    <label>Descontos</label>
                    <div style="color:#7f8c8d;">${this.fmtMoney(somaDescontos)}</div>
                </div>
            </div>
            <style>
                .resumo-mini { background: #f8f9fa; padding: 10px; border-radius: 6px; text-align: center; border: 1px solid #ddd; }
                .resumo-mini label { display: block; font-size: 11px; color: #888; text-transform: uppercase; margin-bottom: 5px; }
                .resumo-mini div { font-weight: bold; font-size: 14px; }
            </style>
        `;

        // ---------------------------------------------------------
        // LÓGICA CONTEXTUAL: Se estou na aba VEÍCULOS, mostro CLIENTE
        // ---------------------------------------------------------
        const isVeiculoTab = (this.tipoAtual === 'veiculos');
        const colHeader = isVeiculoTab ? 'Cliente' : 'Veículo';

        // Renderizar TABELA DETALHADA
        const rows = resultados.map(item => {
            const dt = new Date(item.Semana.data_inicio);
            const dataFmt = dt.toLocaleDateString('pt-BR');

            const colContent = isVeiculoTab ? (item.cliente || '-') : item.placa;

            // Estilo Base: Preto, tamanho 14px
            const styleBase = 'text-align:right; color:#000; font-size:14px; vertical-align:middle;';

            // Cores
            let saldoColor = '#000';
            if (item.saldo > 0) saldoColor = '#27ae60';
            if (item.saldo < 0) saldoColor = '#c0392b';

            const pagoColor = item.recebido > 0 ? '#27ae60' : '#000';

            return `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="text-align:center; color:#000; font-size:14px; vertical-align:middle;">${dataFmt}</td>
                    <td style="font-size:14px; color:#555; text-align:left; vertical-align:middle; padding-left:15px;">${colContent}</td>
                    
                    <td style="${styleBase}">${this.fmtMoney(item.semana)}</td>
                    <td style="${styleBase}">${this.fmtMoney(item.p_premium)}</td>
                    <td style="${styleBase}">${this.fmtMoney(item.protecao)}</td>
                    <td style="${styleBase}">${this.fmtMoney(item.acordo)}</td>
                    <td style="${styleBase}">${this.fmtMoney(item.ta_boleto)}</td>
                    <td style="${styleBase}">-${this.fmtMoney(item.desconto)}</td>
                    
                    <td style="${styleBase} background:#fdfefe;">${this.fmtMoney(item.previsto)}</td>
                    <td style="text-align:right; color:${pagoColor}; font-size:14px; vertical-align:middle;">${this.fmtMoney(item.recebido)}</td>
                    <td style="text-align:right; color:${saldoColor}; font-size:14px; vertical-align:middle;">${this.fmtMoney(item.saldo)}</td>
                </tr>
            `;
        }).join('');

        this.dom.timeline.innerHTML = `
            ${extratoHtml}
            <div class="table-container-clean">
                <table class="data-table" style="width:100%; font-size:13px;">
                    <thead>
                        <tr style="background:#eee;">
                            <th style="text-align:center; width:100px;">Data</th>
                            <th style="text-align:left; padding-left:15px; width:200px;">${colHeader}</th>
                            <th style="text-align:right; width:90px;">Aluguel</th>
                            <th style="text-align:right; width:80px;">Premium</th>
                            <th style="text-align:right; width:80px;">Proteção</th>
                            <th style="text-align:right; width:80px;">Acordo</th>
                            <th style="text-align:right; width:80px;">Boleto</th>
                            <th style="text-align:right; width:80px;">Desconto</th>
                            <th style="text-align:right; width:90px; background:#f0f3f4;">PREVISTO</th>
                            <th style="text-align:right; width:90px;">PAGO</th>
                            <th style="text-align:right; width:90px;">SALDO</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            </div>
            <style> 
                .text-right { text-align: right; } 
                .text-center { text-align: center; } 
                .text-left { text-align: left; }
                .font-bold { font-weight: bold; } 
                .text-danger { color: #c0392b; } 
            </style>
        `;

        // Usar a contagem de semanas DISTINTAS do backend
        this.dom.totalSemanas.textContent = resumo.countSemanas;
    },

    fmtMoney(v) {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
    }
};

document.addEventListener('DOMContentLoaded', () => Relatorios.init());
