
import { Op } from 'sequelize';
import Semana from '../models-sqlite/Semana.js';
import LinhaSemana from '../models-sqlite/LinhaSemana.js';
import Veiculo from '../models-sqlite/Veiculo.js';

class DashboardService {

    /**
     * Gera os dados do dashboard analítico.
     * @param {Object} filters { data_inicio, data_fim, periodo }
     * @returns {Object} Dados do dashboard
     */
    async getDashboardData(filters) {
        // 1. Definição do Período
        let dataInicio, dataFim;
        const whereClause = {};
        let limitClause = null;

        if (filters.data_inicio && filters.data_fim) {
            dataInicio = new Date(filters.data_inicio + 'T00:00:00');
            dataFim = new Date(filters.data_fim + 'T23:59:59');
            whereClause.data_inicio = {
                [Op.between]: [dataInicio.toISOString().split('T')[0], dataFim.toISOString().split('T')[0]]
            };
        } else {
            limitClause = parseInt(filters.periodo) || 8;
        }

        // Buscar Semanas
        const semanas = await Semana.findAll({
            where: whereClause,
            limit: limitClause,
            order: [['data_inicio', 'DESC']],
            include: [{ model: LinhaSemana, as: 'linhas' }]
        });

        // Reordenar para cronológico
        semanas.reverse();

        // 2. Buscar Dados Auxiliares (Frota Total Ativa)
        const totalVeiculosAtivos = await Veiculo.count({ where: { ativo: true } });
        const capacidadeTotalDias = totalVeiculosAtivos * 7;

        // 3. Processar Dados
        const labels = [];
        const faturamento = { potencial: [], previsto: [], recebido: [], inadimplencia: [] };

        // Acumuladores Globais
        const globalFin = {
            tabelado: 0,
            previsto: { total: 0, semana: 0, protecao: 0, premium: 0, boleto: 0, acordo: 0 },
            recebido: { total: 0, semana: 0, protecao: 0, premium: 0, boleto: 0, acordo: 0, juros: 0 },
            inadimplencia: 0,
            descontos: 0,
            dias_alugados: 0,
            dias_manutencao: 0,
            veiculos_alugados_unicos: 0
        };

        const rankVeiculos = {};
        const rankClientes = {};

        // Data de hoje zerada
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        const detalhamentoSemanas = [];

        // Controle de Churn (Comparação Semanal)
        let mapSemanaAnterior = null;
        let churnsList = [];

        semanas.forEach(s => {
            // Label
            const partsFim = s.data_fim.split('-');
            const labelData = `${partsFim[2]}/${partsFim[1]}`;
            labels.push(labelData);

            const fimSemanaParts = s.data_fim.split('-');
            const fimSemanaObj = new Date(fimSemanaParts[0], fimSemanaParts[1] - 1, fimSemanaParts[2]);
            const isVencida = hoje > fimSemanaObj;

            // Acumuladores Locais (Semana)
            const semanaFin = {
                tabelado: 0,
                previsto: { total: 0, semana: 0, protecao: 0, premium: 0, boleto: 0, acordo: 0 },
                recebido: { total: 0, semana: 0, protecao: 0, premium: 0, boleto: 0, acordo: 0, juros: 0 },
                inadimplencia: 0,
                descontos: 0,
                dias_alugados: 0,
                dias_manutencao: 0,
                veiculos_alugados_count: 0
            };

            const rankVeiculosSemana = {};
            const rankClientesSemana = {};
            const setVeiculosAlugados = new Set();

            s.linhas.forEach(l => {
                // --- 1. Financeiro ---
                const vTabelado = parseFloat(l.tabelado) || 0;
                const vSemana = parseFloat(l.semana) || 0;
                const vProtecao = parseFloat(l.protecao) || 0;
                const vPremium = parseFloat(l.p_premium) || 0;
                const vBoleto = parseFloat(l.ta_boleto) || 0;
                const vAcordo = parseFloat(l.acordo) || 0;
                const vDesconto = parseFloat(l.desconto) || 0;
                const vSaldo = parseFloat(l.saldo) || 0;
                const vRecebidoTotal = parseFloat(l.recebido) || 0;
                const vPrevistoTotal = vSemana + vProtecao + vPremium + vBoleto + vAcordo;

                // Acumular
                semanaFin.tabelado += vTabelado;
                globalFin.tabelado += vTabelado;
                semanaFin.descontos += vDesconto;
                globalFin.descontos += vDesconto;

                // Previsto
                semanaFin.previsto.total += vPrevistoTotal;
                semanaFin.previsto.semana += vSemana;
                globalFin.previsto.total += vPrevistoTotal;

                // Recebido
                semanaFin.recebido.total += vRecebidoTotal;
                globalFin.recebido.total += vRecebidoTotal;

                // Inadimplência
                if (isVencida && vSaldo < -0.01) {
                    const val = Math.abs(vSaldo);
                    semanaFin.inadimplencia += val;
                    globalFin.inadimplencia += val;
                }

                // --- 2. Operacional (Dias) ---
                const dias = parseInt(l.dias) || 0;
                if (l.status_veiculo === 'alugado') {
                    semanaFin.dias_alugados += dias;
                    globalFin.dias_alugados += dias;
                    if (l.placa) setVeiculosAlugados.add(l.placa);
                } else if (l.status_veiculo === 'manutencao') {
                    semanaFin.dias_manutencao += dias;
                    globalFin.dias_manutencao += dias;
                }

                // --- 3. Rankings ---
                if (l.placa) {
                    if (!rankVeiculos[l.placa]) rankVeiculos[l.placa] = { placa: l.placa, total: 0, semanas: 0 };
                    rankVeiculos[l.placa].total += vRecebidoTotal;

                    if (!rankVeiculosSemana[l.placa]) rankVeiculosSemana[l.placa] = { placa: l.placa, total: 0 };
                    rankVeiculosSemana[l.placa].total += vRecebidoTotal;
                }
                if (l.cliente && l.cliente.trim()) {
                    const nome = l.cliente.trim();
                    if (!rankClientes[nome]) rankClientes[nome] = { cliente: nome, total: 0 };
                    rankClientes[nome].total += vRecebidoTotal;

                    if (!rankClientesSemana[nome]) rankClientesSemana[nome] = { cliente: nome, total: 0 };
                    rankClientesSemana[nome].total += vRecebidoTotal;
                }
            });

            // Métricas da Semana
            semanaFin.veiculos_alugados_count = setVeiculosAlugados.size;

            // KPIs Calculados da Semana
            const taxaOcupacao = capacidadeTotalDias > 0 ? (semanaFin.dias_alugados / capacidadeTotalDias) * 100 : 0;
            const taxaManutencao = capacidadeTotalDias > 0 ? (semanaFin.dias_manutencao / capacidadeTotalDias) * 100 : 0;
            const revPU = semanaFin.veiculos_alugados_count > 0 ? (semanaFin.previsto.total / semanaFin.veiculos_alugados_count) : 0;
            const revPAF = totalVeiculosAtivos > 0 ? (semanaFin.recebido.total / totalVeiculosAtivos) : 0;

            // --- CÁLCULO DE CHURN RATE ---
            let churnRate = 0;
            let devolucoesCount = 0;
            let ativosInicio = 0;

            const mapVeiculosAtual = new Map();
            s.linhas.forEach(l => {
                if (l.status_veiculo === 'alugado' && l.placa) {
                    mapVeiculosAtual.set(l.placa, l.cliente ? l.cliente.trim() : 'DESCONHECIDO');
                }
            });

            if (mapSemanaAnterior) {
                ativosInicio = mapSemanaAnterior.size;
                if (ativosInicio > 0) {
                    mapSemanaAnterior.forEach((clienteAnterior, placa) => {
                        const clienteAtual = mapVeiculosAtual.get(placa);
                        const aindaAlugado = mapVeiculosAtual.has(placa);

                        if (!aindaAlugado) {
                            devolucoesCount++;
                        } else if (clienteAtual !== clienteAnterior) {
                            devolucoesCount++;
                        }
                    });
                    churnRate = (devolucoesCount / ativosInicio) * 100;
                }
            }

            mapSemanaAnterior = mapVeiculosAtual;
            churnsList.push(churnRate);

            // Push para Gráficos
            faturamento.potencial.push(semanaFin.tabelado);
            faturamento.previsto.push(semanaFin.previsto.total);
            faturamento.recebido.push(semanaFin.recebido.total);
            faturamento.inadimplencia.push(semanaFin.inadimplencia);

            detalhamentoSemanas.push({
                label: labelData,
                financeiro: semanaFin,
                kpis: {
                    ocupacao: taxaOcupacao.toFixed(1),
                    manutencao: taxaManutencao.toFixed(1),
                    revPU: revPU.toFixed(2),
                    revPAF: revPAF.toFixed(2),
                    inadimplenciaPercent: semanaFin.previsto.total > 0 ? ((semanaFin.inadimplencia / semanaFin.previsto.total) * 100).toFixed(1) : 0,
                    churnRate: churnRate.toFixed(1)
                },
                topVeiculos: Object.values(rankVeiculosSemana).sort((a, b) => b.total - a.total).slice(0, 10),
                topClientes: Object.values(rankClientesSemana).sort((a, b) => b.total - a.total).slice(0, 10)
            });
        });

        // KPIs Globais
        const totalDiasAnalise = semanas.length * 7 * totalVeiculosAtivos;
        const mediaOcupacao = totalDiasAnalise > 0 ? (globalFin.dias_alugados / totalDiasAnalise) * 100 : 0;
        const mediaManutencao = totalDiasAnalise > 0 ? (globalFin.dias_manutencao / totalDiasAnalise) * 100 : 0;

        const validChurns = churnsList.slice(1);
        const mediaChurn = validChurns.length > 0 ? (validChurns.reduce((a, b) => a + b, 0) / validChurns.length) : 0;

        const veiculosEquivalentesAlugados = globalFin.dias_alugados / 7;
        const revPUGlobal = veiculosEquivalentesAlugados > 0 ? (globalFin.previsto.total / veiculosEquivalentesAlugados) : 0;
        const frotaVezesSemanas = totalVeiculosAtivos * semanas.length;
        const revPAFGlobal = frotaVezesSemanas > 0 ? (globalFin.recebido.total / frotaVezesSemanas) : 0;

        const inadimplenciaPercentGlobal = globalFin.previsto.total > 0 ? (globalFin.inadimplencia / globalFin.previsto.total) * 100 : 0;

        const topVeiculos = Object.values(rankVeiculos).sort((a, b) => b.total - a.total).slice(0, 10);
        const topClientes = Object.values(rankClientes).sort((a, b) => b.total - a.total).slice(0, 10);

        return {
            labels,
            faturamento,
            detalhamentoSemanas,
            financeiro: globalFin,
            kpis: {
                ocupacao: mediaOcupacao.toFixed(1),
                manutencao: mediaManutencao.toFixed(1),
                revPU: revPUGlobal.toFixed(2),
                revPAF: revPAFGlobal.toFixed(2),
                churnRate: mediaChurn.toFixed(1),
                veiculosTotal: totalVeiculosAtivos,
                receitaTotal: globalFin.recebido.total,
                descontos: globalFin.descontos,
                inadimplenciaReal: globalFin.inadimplencia,
                inadimplenciaPercent: inadimplenciaPercentGlobal.toFixed(1),
                jurosTotal: globalFin.recebido.juros || 0
            },
            topVeiculos,
            topClientes
        };
    }
}

export default new DashboardService();
