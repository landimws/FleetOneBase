
import { Op, Sequelize } from 'sequelize';
import Multa from '../models-sqlite/Multa.js';
import Veiculo from '../models-sqlite/Veiculo.js';
import { normalizeString } from '../utils/stringUtils.js';
import { FinancialCalculator } from '../domain/financial/FinancialCalculator.js';

class MultaAnalyticsService {

    /**
     * Gera dados analíticos das multas.
     * @param {Object} filters filtros opcionais (data_inicio, data_fim)
     */
    async getAnalytics(filters = {}) {
        const whereBase = {};
        if (filters.search) {
            const term = normalizeString(filters.search);
            whereBase.search_text = { [Op.like]: `%${term}%` };
        }

        // Filtro Geral (para KPIs, Top Ofensores e Distribuições)
        const whereGeral = { ...whereBase };
        if (filters.data_inicio && filters.data_fim) {
            whereGeral.data_infracao = {
                [Op.between]: [filters.data_inicio, filters.data_fim]
            };
        }

        // --- 1. KPIs FINANCEIROS ESTRATÉGICOS (Baseados no Filtro Geral) ---
        // Valor Original Total
        const valorOriginalTotal = await Multa.sum('valor_original', { where: whereGeral }) || 0;

        // Buscar todas as multas para cálculo preciso no Domain Layer
        const multasParaCalculo = await Multa.findAll({
            where: whereGeral,
            attributes: ['valor_original', 'desconto_aplicado', 'valor_pago_orgao', 'valor_lancado_carteira', 'data_pagamento_orgao', 'data_lancamento_carteira', 'cobrar_taxa_administrativa'],
            raw: true
        });

        // Cálculo: Valor a Pagar (com desconto aplicado)
        let totalAPagarComDesconto = 0;
        multasParaCalculo.forEach(m => {
            totalAPagarComDesconto += FinancialCalculator.calculateDiscountedValue(m.valor_original, m.desconto_aplicado);
        });

        // Saldo (Economia Gerada pelos Descontos)
        const saldoEconomia = valorOriginalTotal - totalAPagarComDesconto;

        // Pago ao Órgão (Efetivo)
        let pagoOrgaoTotal = 0;
        multasParaCalculo.forEach(m => {
            pagoOrgaoTotal += (m.valor_pago_orgao || 0);
        });

        // Pendente de Pagamento ao Órgão
        let aPagarOrgaoTotal = 0;
        multasParaCalculo.forEach(m => {
            if (!m.data_pagamento_orgao) {
                aPagarOrgaoTotal += FinancialCalculator.calculateDiscountedValue(m.valor_original, m.desconto_aplicado);
            }
        });

        // Recebido (Lançado na Carteira)
        let recebidoCarteiraTotal = 0;
        multasParaCalculo.forEach(m => {
            recebidoCarteiraTotal += (m.valor_lancado_carteira || 0);
        });

        // A Receber (Valor a Cobrar calculado)
        let aReceberCarteiraTotal = 0;
        multasParaCalculo.forEach(m => {
            if (!m.data_lancamento_carteira) {
                const valorComDesconto = FinancialCalculator.calculateDiscountedValue(m.valor_original, m.desconto_aplicado);
                const valorFinal = FinancialCalculator.calculateReceivableAmount(valorComDesconto, m.cobrar_taxa_administrativa);
                aReceberCarteiraTotal += valorFinal;
            }
        });

        // --- 2. RISCO NIC ---
        const today = new Date();
        const warningDate = new Date();
        warningDate.setDate(today.getDate() + 15);
        const todayStrLocal = today.toISOString().split('T')[0];
        const warningDateStr = warningDate.toISOString().split('T')[0];

        const riscoNicCount = await Multa.count({
            where: {
                ...whereGeral,
                tipo_responsavel: { [Op.ne]: 'locadora' },
                foi_indicado: false,
                data_pagamento_orgao: null,
                data_vencimento: {
                    [Op.gte]: todayStrLocal,
                    [Op.lte]: warningDateStr
                }
            }
        });

        // --- 3. EFICIÊNCIA E DESPERDÍCIO ---
        const multasPagas = await Multa.findAll({
            where: { ...whereGeral, data_pagamento_orgao: { [Op.not]: null } },
            attributes: ['valor_original', 'desconto_aplicado']
        });

        let desperdicioTotal = 0;
        multasPagas.forEach(m => {
            desperdicioTotal += FinancialCalculator.calculateWaste(m.valor_original, m.desconto_aplicado);
        });

        // --- 4. TOP OFENSORES ---
        const topVeiculos = await Multa.findAll({
            where: whereGeral,
            attributes: [
                'veiculo_id',
                [Sequelize.fn('COUNT', Sequelize.col('id')), 'qtd'],
                [Sequelize.fn('SUM', Sequelize.col('valor_original')), 'valor']
            ],
            include: [{ model: Veiculo, as: 'veiculo', attributes: ['modelo'] }],
            group: ['veiculo_id'],
            order: [[Sequelize.literal('valor'), 'DESC']],
            limit: 5
        });

        // --- 5. FLUXO FINANCEIRO ---
        const whereReceita = { ...whereBase };
        const whereDespesa = { ...whereBase };

        if (filters.data_inicio && filters.data_fim) {
            whereReceita.data_lancamento_carteira = { [Op.between]: [filters.data_inicio, filters.data_fim] };
            whereDespesa.data_pagamento_orgao = { [Op.between]: [filters.data_inicio, filters.data_fim] };
        } else {
            whereReceita.data_lancamento_carteira = { [Op.not]: null };
            whereDespesa.data_pagamento_orgao = { [Op.not]: null };
        }

        const receitasPorMes = await Multa.findAll({
            where: whereReceita,
            attributes: [
                [Sequelize.literal("strftime('%Y-%m', data_lancamento_carteira)"), 'mes'],
                [Sequelize.fn('SUM', Sequelize.col('valor_lancado_carteira')), 'receita']
            ],
            group: [Sequelize.literal("strftime('%Y-%m', data_lancamento_carteira)")],
            raw: true
        });

        const despesasPorMes = await Multa.findAll({
            where: whereDespesa,
            attributes: [
                [Sequelize.literal("strftime('%Y-%m', data_pagamento_orgao)"), 'mes'],
                [Sequelize.fn('SUM', Sequelize.col('valor_pago_orgao')), 'despesa']
            ],
            group: [Sequelize.literal("strftime('%Y-%m', data_pagamento_orgao)")],
            raw: true
        });

        const mesesSet = new Set([
            ...receitasPorMes.map(r => r.mes),
            ...despesasPorMes.map(d => d.mes)
        ]);

        const fluxoFinanceiro = Array.from(mesesSet).map(mes => {
            const r = receitasPorMes.find(rec => rec.mes === mes);
            const d = despesasPorMes.find(des => des.mes === mes);
            return {
                mes,
                receita: r ? r.receita : 0,
                despesa: d ? d.despesa : 0
            };
        }).sort((a, b) => a.mes.localeCompare(b.mes));

        // --- 7. DISTRIBUIÇÃO POR RESPONSABILIDADE ---
        const distribResponsabilidade = await Multa.findAll({
            where: whereGeral,
            attributes: [
                'tipo_responsavel',
                [Sequelize.fn('COUNT', Sequelize.col('id')), 'qtd'],
                [Sequelize.fn('SUM', Sequelize.col('valor_original')), 'valor']
            ],
            group: ['tipo_responsavel'],
            raw: true
        });

        // --- 8. DISTRIBUIÇÃO POR STATUS ---
        const statusCounts = { pago: 0, aberto: 0, vencido: 0 };

        statusCounts.pago = await Multa.count({ where: { ...whereGeral, data_pagamento_orgao: { [Op.not]: null } } });
        statusCounts.vencido = await Multa.count({
            where: {
                ...whereGeral,
                data_pagamento_orgao: null,
                data_vencimento: { [Op.lt]: todayStrLocal }
            }
        });
        statusCounts.aberto = await Multa.count({
            where: {
                ...whereGeral,
                data_pagamento_orgao: null,
                data_vencimento: { [Op.gte]: todayStrLocal }
            }
        });

        // --- 9. TOP ÓRGÃOS ---
        const topOrgaos = await Multa.findAll({
            where: whereGeral,
            attributes: [
                'orgao_autuador',
                [Sequelize.fn('COUNT', Sequelize.col('id')), 'qtd']
            ],
            group: ['orgao_autuador'],
            order: [[Sequelize.literal('qtd'), 'DESC']],
            limit: 5,
            raw: true
        });

        // --- 6. LISTA WAR ROOM ---
        const warRoomLimit = new Date();
        warRoomLimit.setDate(today.getDate() + 30);

        const warRoom = await Multa.findAll({
            where: {
                ...whereGeral,
                data_vencimento: {
                    [Op.gte]: todayStrLocal,
                    [Op.lte]: warRoomLimit.toISOString().split('T')[0]
                },
                data_pagamento_orgao: null
            },
            order: [['data_vencimento', 'ASC']],
            limit: 20
        });

        return {
            kpis: {
                totalOriginal: valorOriginalTotal,
                totalAPagar: totalAPagarComDesconto,
                saldo: saldoEconomia,
                pago: pagoOrgaoTotal,
                aPagar: aPagarOrgaoTotal,
                recebido: recebidoCarteiraTotal,
                aReceber: aReceberCarteiraTotal,
                lucro: recebidoCarteiraTotal - pagoOrgaoTotal,
                riscoNic: riscoNicCount,
                desperdicio: desperdicioTotal
            },
            topVeiculos: topVeiculos.map(t => ({
                placa: t.veiculo_id,
                modelo: t.veiculo ? t.veiculo.modelo : 'N/A',
                qtd: t.dataValues.qtd,
                valor: t.dataValues.valor
            })),
            fluxo: fluxoFinanceiro,
            warRoom: warRoom.map(m => m.toJSON()),
            distribResponsabilidade,
            distribStatus: statusCounts,
            topOrgaos
        };
    }
}

export default new MultaAnalyticsService();
