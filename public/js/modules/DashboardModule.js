/**
 * Módulo Dashboard de Multas
 * Dependências: Chart.js, MultasAPI (api service), Formatters (utils)
 */

const DashboardModule = {
    charts: {
        fluxo: null,
        topVeiculos: null,
        status: null,
        topOrgaos: null,
        responsabilidade: null
    },

    init: async () => {
        await DashboardModule.carregar();
    },

    carregar: async () => {
        try {
            const inicio = document.getElementById('filtro-inicio').value;
            const fim = document.getElementById('filtro-fim').value;
            const search = document.getElementById('smart-search-input').value; // Read search

            // console.log('Dashboard Search Term:', search);

            const data = await API.getDashboard({ data_inicio: inicio, data_fim: fim, search });
            // console.log('Dados recebidos do Dashboard:', data);

            if (!data || !data.kpis) {
                console.warn('Dados de KPI não encontrados na resposta da API.');
                return;
            }

            // Preencher KPIs
            DashboardModule.updateKPI('kpi-total-original', formatCurrency(data.kpis.totalOriginal || 0));
            DashboardModule.updateKPI('kpi-total-a-pagar', formatCurrency(data.kpis.totalAPagar || 0));
            DashboardModule.updateKPI('kpi-saldo', formatCurrency(data.kpis.saldo || 0));
            DashboardModule.updateKPI('kpi-pago', formatCurrency(data.kpis.pago || 0));
            DashboardModule.updateKPI('kpi-a-pagar', formatCurrency(data.kpis.aPagar || 0));
            DashboardModule.updateKPI('kpi-recebido', formatCurrency(data.kpis.recebido || 0));
            DashboardModule.updateKPI('kpi-a-receber', formatCurrency(data.kpis.aReceber || 0));

            // Fallback: Calcular lucro no frontend se backend não enviou ou para garantir consistência visual
            const valRecebido = parseFloat(data.kpis.recebido || 0);
            const valPago = parseFloat(data.kpis.pago || 0);
            const valLucro = (data.kpis.lucro !== undefined) ? data.kpis.lucro : (valRecebido - valPago);

            DashboardModule.updateKPI('kpi-lucro', formatCurrency(valLucro));
            DashboardModule.updateKPI('kpi-risco-nic', data.kpis.riscoNic || 0);

            // 2. RENDER CHARTS
            if (data.fluxo) DashboardModule.renderChartFluxo(data.fluxo);
            if (data.topVeiculos) DashboardModule.renderChartTopVeiculos(data.topVeiculos);
            if (data.distribStatus) DashboardModule.renderChartStatus(data.distribStatus);
            if (data.topOrgaos) DashboardModule.renderChartTopOrgaos(data.topOrgaos);
            if (data.distribResponsabilidade) DashboardModule.renderChartResponsabilidade(data.distribResponsabilidade);

            // 3. POPULATE WAR ROOM
            if (data.warRoom) DashboardModule.renderWarRoom(data.warRoom);

        } catch (error) {
            console.error('Erro dashboard:', error);
        }
    },

    updateKPI: (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    },

    renderChartFluxo: (fluxoData) => {
        const ctx = document.getElementById('chart-fluxo');
        if (!ctx) return;

        if (DashboardModule.charts.fluxo) DashboardModule.charts.fluxo.destroy();

        DashboardModule.charts.fluxo = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: fluxoData.map(d => d.mes),
                datasets: [
                    {
                        label: 'Receita',
                        data: fluxoData.map(d => d.receita),
                        backgroundColor: '#27ae60',
                        order: 2
                    },
                    {
                        label: 'Despesa',
                        data: fluxoData.map(d => d.despesa),
                        backgroundColor: '#c0392b',
                        order: 3
                    },
                    {
                        label: 'Resultado',
                        data: fluxoData.map(d => d.receita - d.despesa),
                        type: 'line',
                        borderColor: '#2980b9',
                        borderWidth: 2,
                        fill: false,
                        order: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    },

    renderChartTopVeiculos: (veiculosData) => {
        const ctx = document.getElementById('chart-top-veiculos');
        if (!ctx) return;

        if (DashboardModule.charts.topVeiculos) DashboardModule.charts.topVeiculos.destroy();

        DashboardModule.charts.topVeiculos = new Chart(ctx, {
            type: 'bar',
            indexAxis: 'y',
            data: {
                labels: veiculosData.map(v => `${v.modelo} (${v.placa})`),
                datasets: [{
                    label: 'Total em Multas (R$)',
                    data: veiculosData.map(v => v.valor),
                    backgroundColor: '#95a5a6'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } }
            }
        });
    },

    renderChartStatus: (statusData) => {
        const ctx = document.getElementById('chart-status');
        if (!ctx) return;
        if (DashboardModule.charts.status) DashboardModule.charts.status.destroy();

        DashboardModule.charts.status = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Pago', 'Em Aberto', 'Vencido'],
                datasets: [{
                    data: [statusData.pago, statusData.aberto, statusData.vencido],
                    backgroundColor: ['#27ae60', '#3498db', '#e74c3c'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' }
                },
                cutout: '70%'
            }
        });
    },

    renderChartTopOrgaos: (orgaosData) => {
        const ctx = document.getElementById('chart-top-orgaos');
        if (!ctx) return;
        if (DashboardModule.charts.topOrgaos) DashboardModule.charts.topOrgaos.destroy();

        DashboardModule.charts.topOrgaos = new Chart(ctx, {
            type: 'bar',
            indexAxis: 'y',
            data: {
                labels: orgaosData.map(o => o.orgao_autuador),
                datasets: [{
                    label: 'Qtd. Multas',
                    data: orgaosData.map(o => o.qtd),
                    backgroundColor: '#34495e'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } }
            }
        });
    },

    renderChartResponsabilidade: (responsData) => {
        const ctx = document.getElementById('chart-responsabilidade');
        if (!ctx) return;
        if (DashboardModule.charts.responsabilidade) DashboardModule.charts.responsabilidade.destroy();

        DashboardModule.charts.responsabilidade = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: responsData.map(r => r.tipo_responsavel === Constants.get('TIPOS_RESPONSAVEL').CLIENTE ? Constants.get('TIPOS_RESPONSAVEL_LABELS').cliente : Constants.get('TIPOS_RESPONSAVEL_LABELS').locadora),
                datasets: [{
                    data: responsData.map(r => r.valor),
                    backgroundColor: ['#2980b9', '#95a5a6'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    },

    renderWarRoom: (lista) => {
        const tbody = document.getElementById('lista-war-room');
        // Check if element exists before setting innerHTML
        if (!tbody) return;

        tbody.innerHTML = '';

        if (!lista || lista.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Nenhum alerta crítico para os próximos 30 dias.</td></tr>';
            return;
        }

        lista.forEach(m => {
            // Logic reused from multas.js (simplified)
            // Need to ensure badge classes match CSS
            let status = Constants.get('STATUS_MULTAS_LABELS').aberto;
            let badgeClass = 'badge-warning'; // Default for open

            // Logic matching renderPrintTable or similar
            if (new Date(m.data_vencimento) < new Date()) {
                status = Constants.get('STATUS_MULTAS_LABELS').vencido;
                badgeClass = 'badge-danger';
            }

            const row = `
                <tr>
                    <td><span class="badge ${badgeClass}">${status}</span></td>
                    <td>${formatDate(m.data_vencimento)}</td>
                    <td>${m.numero_auto}</td>
                    <td>${m.veiculo_placa || '-'}</td>
                    <td>${m.cliente_nome || '-'}</td>
                    <td class="text-right">${formatCurrency(m.valor_original)}</td>
                </tr>
            `;
            tbody.insertAdjacentHTML('beforeend', row);
        });
    }
};

window.DashboardModule = DashboardModule;
