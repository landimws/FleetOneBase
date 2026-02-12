import * as LinhaService from '../services/linhaSemanaService.js';
import { Op } from 'sequelize';

export const list = async (req, res) => {
    const { Semana } = req.models;
    try {
        const semanas = await Semana.findAll({
            attributes: ['id', 'data_inicio', 'data_fim', 'status'],
            order: [['data_inicio', 'DESC']]
        });
        const mapped = semanas.map(s => {
            const j = s.toJSON();
            j._id = j.id;
            return j;
        });
        res.json(mapped);
    } catch (e) {
        console.error('❌ [GET /api/semanas] Erro:', e);
        res.status(500).json({
            error: 'Erro ao listar semanas',
            details: e.message,
            stack: e.stack
        });
    }
};

export const getById = async (req, res) => {
    const { Semana, LinhaSemana } = req.models;
    try {
        const id = req.params.id;
        const semana = await Semana.findByPk(id, {
            include: [{
                model: LinhaSemana,
                as: 'linhas'
            }]
        });

        if (!semana) return res.status(404).json({ error: 'Semana não encontrada' });

        const j = semana.toJSON();

        // Sorting in JS to avoid SQLite join ordering issues
        if (j.linhas && Array.isArray(j.linhas)) {
            j.linhas.sort((a, b) => (a.placa || '').localeCompare(b.placa || ''));
        }

        j._id = j.id; // Frontend legacy compatibility
        res.json(j);
    } catch (e) {
        console.error('❌ [GET /api/semanas/:id] Erro Crítico:', e);
        if (e.original) console.error('Original Database Error:', e.original);
        if (e.sql) console.error('Failed SQL:', e.sql);

        res.status(500).json({
            error: 'Erro ao buscar semana',
            details: e.message,
            sql: e.sql
        });
    }
};

export const update = async (req, res) => {
    const { Semana, LinhaSemana, Veiculo } = req.models;
    try {
        const id = req.params.id;
        const { status, linhas } = req.body;

        const semana = await Semana.findByPk(id);
        if (!semana) return res.status(404).json({ error: 'Semana não encontrada' });

        // Se estiver fechando a semana
        if (status === 'fechada' && semana.status !== 'fechada') {
            semana.status = 'fechada';
            semana.data_fechamento = new Date();
        }

        await semana.save();

        if (linhas && Array.isArray(linhas)) {
            for (const l of linhas) {
                const processado = LinhaService.normalizarDados(l);

                await LinhaSemana.update({
                    status_veiculo: processado.status_veiculo || 'disponivel',
                    AS: processado.AS,
                    placa: processado.placa,
                    tipo: processado.tipo,
                    cliente: processado.cliente,
                    cliente_id: processado.cliente_id,
                    dias: processado.dias,
                    tabelado: processado.tabelado,
                    valor_semanal: processado.valor_semanal,
                    diaria: processado.diaria,
                    semana: processado.semana,
                    p_premium: processado.p_premium,
                    protecao: processado.protecao,
                    acordo: processado.acordo,
                    ta_boleto: processado.ta_boleto,
                    desconto: processado.desconto,
                    previsto: processado.previsto,
                    recebido: processado.recebido,
                    saldo: processado.saldo,
                    BO: processado.BO,
                    CO: processado.CO,
                    observacoes: processado.observacoes,
                    dias_selecionados: processado.dias_selecionados,
                    data_pagamento: processado.data_pagamento
                }, { where: { id: l.id } });
            }
        }

        const atualizada = await Semana.findByPk(id, {
            include: [{ model: LinhaSemana, as: 'linhas', include: [{ model: Veiculo, as: 'Veiculo' }] }]
        });

        const result = atualizada.toJSON();
        result._id = result.id;
        res.json({ success: true, data: result });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Erro ao atualizar semana' });
    }
};

export const create = async (req, res) => {
    const { Semana, LinhaSemana, Veiculo } = req.models;
    try {
        const { data_inicio_manual } = req.body;

        let data_inicio = new Date();
        if (data_inicio_manual) {
            data_inicio = new Date(data_inicio_manual + 'T12:00:00');
        }

        const data_fim = new Date(data_inicio);
        data_fim.setDate(data_fim.getDate() + 6);

        const nova = await Semana.create({
            data_inicio: data_inicio.toISOString().split('T')[0],
            data_fim: data_fim.toISOString().split('T')[0],
            status: 'aberta'
        });

        // Buscar última semana para copiar dados
        const ultima = await Semana.findOne({
            where: { id: { [Op.ne]: nova.id } },
            order: [['data_inicio', 'DESC']],
            include: [{ model: LinhaSemana, as: 'linhas' }]
        });

        if (ultima && ultima.linhas) {
            for (const linhaBase of ultima.linhas) {
                const processado = LinhaService.normalizarDados(linhaBase);

                await LinhaSemana.create({
                    SemanaId: nova.id,
                    status_veiculo: processado.status_veiculo || 'disponivel',
                    AS: processado.AS || false,
                    placa: processado.placa,
                    tipo: processado.tipo || 'Diária',
                    cliente: processado.cliente || '',
                    cliente_id: processado.cliente_id,
                    dias: processado.dias || 0,
                    tabelado: processado.tabelado || 0,
                    valor_semanal: processado.valor_semanal || 0,
                    diaria: processado.diaria || 0,
                    semana: processado.semana || 0,
                    p_premium: processado.p_premium || 0,
                    protecao: processado.protecao || 0,
                    acordo: processado.acordo || 0,
                    ta_boleto: processado.ta_boleto || 0,
                    desconto: processado.desconto || 0,
                    previsto: processado.previsto || 0,
                    recebido: processado.recebido || 0,
                    saldo: processado.saldo || 0,
                    BO: processado.BO || false,
                    CO: processado.CO || false,
                    observacoes: processado.observacoes || '',
                    dias_selecionados: processado.dias_selecionados
                });
            }
        } else {
            // Se não houver semana anterior, criar linhas para todos os veículos ativos
            const veiculos = await Veiculo.findAll({ where: { ativo: true } });
            for (const v of veiculos) {
                await LinhaSemana.create({
                    SemanaId: nova.id,
                    placa: v.placa,
                    status_veiculo: 'disponivel',
                    tabelado: v.preco_base,
                    valor_semanal: v.preco_base
                });
            }
        }

        const j = nova.toJSON();
        j._id = j.id;
        res.status(201).json(j);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Erro ao criar semana' });
    }
};

export const sincronizar = async (req, res) => {
    const { Semana, LinhaSemana, Veiculo } = req.models;
    try {
        const id = req.params.id;
        const semana = await Semana.findByPk(id, {
            include: [{ model: LinhaSemana, as: 'linhas' }]
        });

        if (!semana) return res.status(404).json({ error: 'Semana não encontrada' });

        const veiculosAtivos = await Veiculo.findAll({ where: { ativo: true } });
        const placasAtivas = veiculosAtivos.map(v => v.placa);
        const placasNaSemana = semana.linhas.map(l => l.placa);

        // 1. Adicionar veículos novos
        for (const v of veiculosAtivos) {
            if (!placasNaSemana.includes(v.placa)) {
                await LinhaSemana.create({
                    SemanaId: id,
                    placa: v.placa,
                    status_veiculo: 'disponivel',
                    tabelado: v.preco_base,
                    valor_semanal: v.preco_base
                });
            }
        }

        // 2. Atualizar preços tabelados (opcional, conforme regra de negócio)
        for (const l of semana.linhas) {
            const v = veiculosAtivos.find(va => va.placa === l.placa);
            if (v && l.status_veiculo === 'disponivel') {
                await l.update({ tabelado: v.preco_base, valor_semanal: v.preco_base });
            }
        }

        const atualizada = await Semana.findByPk(id, {
            include: [{ model: LinhaSemana, as: 'linhas', include: [{ model: Veiculo, as: 'Veiculo' }] }]
        });

        const result = atualizada.toJSON();
        result._id = result.id;
        res.json(result);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Erro ao sincronizar frota' });
    }
};

export const updateLine = async (req, res) => {
    const { LinhaSemana } = req.models;
    try {
        const { linhaId } = req.params;
        const processado = LinhaService.normalizarDados(req.body);
        await LinhaSemana.update(processado, { where: { id: linhaId } });
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Erro ao atualizar linha' });
    }
};

export const createLine = async (req, res) => {
    const { LinhaSemana } = req.models;
    try {
        const { semanaId } = req.params;
        const processado = LinhaService.normalizarDados(req.body);
        processado.SemanaId = semanaId;
        const nova = await LinhaSemana.create(processado);
        res.status(201).json(nova);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Erro ao criar linha' });
    }
};

export const deleteLine = async (req, res) => {
    const { LinhaSemana } = req.models;
    try {
        const { linhaId } = req.params;
        await LinhaSemana.destroy({ where: { id: linhaId } });
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Erro ao excluir linha' });
    }
};
