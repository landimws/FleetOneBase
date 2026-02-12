class Dashboard {
    constructor() {
        this.cacheDOM();
        this.bindEvents();
        this.init();
    }

    cacheDOM() {
        this.dom = {
            selectPeriodo: document.getElementById('select-periodo'),
            kpiVeiculos: document.getElementById('kpi-veiculos'),
            kpiOcupacao: document.getElementById('kpi-ocupacao'),
            kpiManutencao: document.getElementById('kpi-manutencao'),
            kpiTicket: document.getElementById('kpi-ticket'),
            kpiRevPAF: document.getElementById('kpi-revpaf'),
            kpiChurn: document.getElementById('kpi-churn'),
            kpiInadimplencia: document.getElementById('kpi-inadimplencia'),
            kpiInadimplenciaPct: document.getElementById('kpi-inadimplencia-pct'),
            kpiReceita: document.getElementById('kpi-receita'),
            ctxOcupacao: document.getElementById('chartOcupacao').getContext('2d'),
            ctxFinanceiro: document.getElementById('chartFinanceiro').getContext('2d')
        };
        this.charts = {
            ocupacao: null,
            financeiro: null
        };
    }

    bindEvents() {
        this.dom.selectPeriodo.addEventListener('change', () => this.loadData());
    }

    async init() {
        await this.loadData();
    }

    async loadData() {
        const periodo = this.dom.selectPeriodo.value;
        try {
            const response = await fetch(`/api/dashboard?periodo=${periodo}`);
            if (!response.ok) throw new Error('Erro ao carregar dados');
            const data = await response.json();
            this.updateKPIs(data);
            this.renderCharts(data);
        } catch (e) {
            console.error(e);
            alert('Erro ao carregar dashboard');
        }
    }

    updateKPIs(data) {
        const { kpis, financeiro } = data;
        const fmtMoney = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

        this.dom.kpiVeiculos.textContent = kpis.veiculosTotal;
        this.dom.kpiOcupacao.textContent = `${kpis.ocupacao}%`;
        this.dom.kpiManutencao.textContent = `${kpis.manutencao}%`;
        this.dom.kpiTicket.textContent = fmtMoney(kpis.revPU);
        this.dom.kpiRevPAF.textContent = fmtMoney(kpis.revPAF);
        this.dom.kpiReceita.textContent = fmtMoney(financeiro.recebido.total);
        this.dom.kpiInadimplencia.textContent = fmtMoney(financeiro.inadimplencia);
        this.dom.kpiInadimplenciaPct.textContent = `${kpis.inadimplenciaPercent}% de inadimplência`;

        if (this.dom.kpiChurn) {
            const churn = parseFloat(kpis.churnRate) || 0;
            this.dom.kpiChurn.textContent = churn.toFixed(1) + '%';
            this.dom.kpiChurn.style.color = churn > 5 ? '#e74c3c' : '#27ae60';
        }
    }

    renderCharts(data) {
        const { labels, faturamento, detalhamentoSemanas } = data;

        // --- Gráfico 1: Eficiência ---
        if (this.charts.ocupacao) this.charts.ocupacao.destroy();
        this.charts.ocupacao = new Chart(this.dom.ctxOcupacao, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Ocupação (%)',
                        data: detalhamentoSemanas.map(d => d.kpis.ocupacao),
                        borderColor: '#27ae60',
                        backgroundColor: 'rgba(46, 204, 113, 0.1)',
                        fill: true,
                        tension: 0.3
                    },
                    {
                        label: 'Manutenção (%)',
                        data: detalhamentoSemanas.map(d => d.kpis.manutencao),
                        borderColor: '#f39c12',
                        backgroundColor: 'rgba(243, 156, 18, 0.1)',
                        fill: true,
                        tension: 0.3
                    }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });

        // --- Gráfico 2: Financeiro (3 Barras + 1 Linha) ---
        if (this.charts.financeiro) this.charts.financeiro.destroy();

        const dataInadimplenciaPct = detalhamentoSemanas.map(d => parseFloat(d.kpis.inadimplenciaPercent));

        this.charts.financeiro = new Chart(this.dom.ctxFinanceiro, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        type: 'bar',
                        label: 'Potencial',
                        data: faturamento.potencial,
                        backgroundColor: '#bdc3c7',
                        borderRadius: 3,
                        barPercentage: 0.7,
                        categoryPercentage: 0.8,
                        yAxisID: 'y'
                    },
                    {
                        type: 'bar',
                        label: 'Previsto',
                        data: faturamento.previsto,
                        backgroundColor: '#3498db',
                        borderRadius: 3,
                        barPercentage: 0.7,
                        categoryPercentage: 0.8,
                        yAxisID: 'y'
                    },
                    {
                        type: 'bar',
                        label: 'Realizado',
                        data: faturamento.recebido,
                        backgroundColor: '#2ecc71',
                        borderRadius: 3,
                        barPercentage: 0.7,
                        categoryPercentage: 0.8,
                        yAxisID: 'y'
                    },
                    {
                        type: 'line',
                        label: 'Inadimplência (%)',
                        data: dataInadimplenciaPct,
                        borderColor: '#c0392b',
                        borderWidth: 2,
                        pointRadius: 4,
                        pointBackgroundColor: '#c0392b',
                        yAxisID: 'y2',
                        tension: 0.1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        position: 'left',
                        title: { display: true, text: 'Valor (R$)' }
                    },
                    y2: {
                        beginAtZero: true,
                        position: 'right',
                        min: 0,
                        max: 100,
                        grid: { drawOnChartArea: false },
                        title: { display: true, text: 'Inadimplência (%)' }
                    }
                }
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.dashboardApp = new Dashboard();
});
