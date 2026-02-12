
import Veiculo from '../models-sqlite/Veiculo.js';
import LinhaSemana from '../models-sqlite/LinhaSemana.js';
import Semana from '../models-sqlite/Semana.js';
import { Op } from 'sequelize';
import { validationResult } from 'express-validator';

export const list = async (req, res) => {
    try {
        const { busca, ativo } = req.query;
        let where = {};

        if (ativo !== undefined) {
            where.ativo = ativo === 'true';
        }

        if (busca) {
            where[Op.or] = [
                { placa: { [Op.like]: `%${busca}%` } },
                { modelo: { [Op.like]: `%${busca}%` } }
            ];
        }

        // Buscar veículos
        const veiculos = await Veiculo.findAll({ where, order: [['placa', 'ASC']] });

        // Buscar última semana para pegar os condutores atuais
        const ultimaSemana = await Semana.findOne({
            order: [['data_inicio', 'DESC']],
            include: [{
                model: LinhaSemana,
                as: 'linhas',
                where: { status_veiculo: 'alugado' }, // Só interessa quem está alugado
                attributes: ['placa', 'cliente']
            }]
        });

        // Criar um mapa placa -> cliente
        const condutoresMap = new Map();
        if (ultimaSemana && ultimaSemana.linhas) {
            ultimaSemana.linhas.forEach(l => {
                if (l.cliente) condutoresMap.set(l.placa, l.cliente);
            });
        }

        // Anexar info ao json
        const veiculosComCondutor = veiculos.map(v => {
            const j = v.toJSON();
            j.condutor_atual = condutoresMap.get(v.placa) || null;
            return j;
        });

        res.json(veiculosComCondutor);
    } catch (error) {
        console.error('Erro ao listar veículos:', error);
        res.status(500).json({ error: 'Erro ao listar veículos' });
    }
};

export const getByPlaca = async (req, res) => {
    try {
        const veiculo = await Veiculo.findByPk(req.params.placa.toUpperCase());
        if (!veiculo) return res.status(404).json({ error: 'Veículo não encontrado' });
        res.json(veiculo);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar veículo' });
    }
};

export const create = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const {
            placa, modelo, ano, combustivel, preco_base, ativo,
            renavam, chassi,
            ipva_vencimento, ipva_pago,
            licenciamento_vencimento, licenciamento_pago,
            vistoria_vencimento, vistoria_pago
        } = req.body;

        // Sanitização simples
        const renavamSanitized = renavam ? renavam.replace(/\D/g, '') : null;
        const chassiSanitized = chassi ? chassi.toUpperCase() : null;
        const anoSanitized = ano ? parseInt(ano) : null;

        const veiculo = await Veiculo.create({
            placa: placa.toUpperCase(),
            modelo,
            ano: anoSanitized,
            combustivel,
            preco_base,
            ativo: ativo !== undefined ? ativo : true,
            renavam: renavamSanitized,
            chassi: chassiSanitized,
            ipva_vencimento: ipva_vencimento || null,
            ipva_pago: !!ipva_pago,
            licenciamento_vencimento: licenciamento_vencimento || null,
            licenciamento_pago: !!licenciamento_pago,
            vistoria_vencimento: vistoria_vencimento || null,
            vistoria_pago: !!vistoria_pago,
            condutor_indicado: false // Default no create
        });

        res.status(201).json(veiculo);
    } catch (error) {
        // Erro de unique constraint
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ error: 'Placa já cadastrada' });
        }
        console.error(error);
        res.status(500).json({ error: 'Erro ao criar veículo' });
    }
};

export const update = async (req, res) => {
    try {
        const placa = req.params.placa.toUpperCase();
        const veiculo = await Veiculo.findByPk(placa);
        if (!veiculo) return res.status(404).json({ error: 'Veículo não encontrado' });

        const dados = { ...req.body };
        // Sanitizar updates
        if (dados.renavam) dados.renavam = dados.renavam.replace(/\D/g, '');
        if (dados.chassi) dados.chassi = dados.chassi.toUpperCase();
        if (dados.ano) dados.ano = parseInt(dados.ano);
        // Garantir que datas vazias sejam null
        if (dados.ipva_vencimento === '') dados.ipva_vencimento = null;
        if (dados.licenciamento_vencimento === '') dados.licenciamento_vencimento = null;
        if (dados.vistoria_vencimento === '') dados.vistoria_vencimento = null;

        // Sanitizar moedas
        const parseCurrency = (val) => {
            if (!val) return null;
            if (typeof val === 'number') return val;
            return parseFloat(val.toString().replace(/\./g, '').replace(',', '.'));
        };
        if (dados.ipva_valor !== undefined) dados.ipva_valor = parseCurrency(dados.ipva_valor);
        if (dados.licenciamento_valor !== undefined) dados.licenciamento_valor = parseCurrency(dados.licenciamento_valor);
        if (dados.vistoria_valor !== undefined) dados.vistoria_valor = parseCurrency(dados.vistoria_valor);

        // Checkboxes
        if (dados.condutor_indicado !== undefined) dados.condutor_indicado = !!dados.condutor_indicado;

        await veiculo.update(dados);
        res.json(veiculo);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao atualizar veículo' });
    }
};

export const remove = async (req, res) => {
    try {
        const placa = req.params.placa.toUpperCase();

        // Verificar uso em linhas não conciliadas
        const uso = await LinhaSemana.findOne({
            where: { placa: placa, CO: false }
        });

        if (uso) {
            return res.status(400).json({ error: 'Veículo em uso em semana não conciliada' });
        }

        const count = await Veiculo.destroy({ where: { placa } });
        if (count === 0) return res.status(404).json({ error: 'Veículo não encontrado' });

        res.json({ message: 'Veículo excluído' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao excluir veículo' });
    }
};

export const getLastClient = async (req, res) => {
    try {
        const placa = req.params.placa.toUpperCase();

        // 1. Buscar a última semana cadastrada
        const ultimaSemana = await Semana.findOne({
            order: [['data_inicio', 'DESC']],
            include: [{
                model: LinhaSemana,
                as: 'linhas',
                where: { placa: placa },
                required: false // Se não tiver linha nessa semana, retorna null na linha, mas a semana vem
            }]
        });

        if (!ultimaSemana) {
            return res.json({ cliente: null, data: null });
        }

        // 2. Tentar pegar a linha direta do include (se existiu)
        let linha = null;
        if (ultimaSemana.linhas && ultimaSemana.linhas.length > 0) {
            linha = ultimaSemana.linhas[0];
        }

        // Se achou linha e tem cliente
        if (linha && linha.cliente) {
            return res.json({
                cliente: linha.cliente,
                semana_id: ultimaSemana.id,
                data_inicio: ultimaSemana.data_inicio
            });
        }

        res.json({ cliente: null });

    } catch (error) {
        console.error('Erro ao buscar último cliente:', error);
        res.status(500).json({ error: 'Erro ao buscar último cliente' });
    }
};
