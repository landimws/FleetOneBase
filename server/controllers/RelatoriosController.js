
import { Op } from 'sequelize';

export const search = async (req, res) => {
    const { LinhaSemana, Semana } = req.models;
    try {
        const { termo } = req.query;

        if (!termo || termo.trim().length < 2) {
            return res.json({ resultados: [], resumo: {} });
        }

        const cleanTerm = termo.trim();

        // Busca Inteligente: Tenta encontrar em Cliente OU Placa
        const linhas = await LinhaSemana.findAll({
            where: {
                [Op.or]: [
                    { cliente: { [Op.like]: `%${cleanTerm}%` } },
                    { placa: { [Op.like]: `%${cleanTerm}%` } }
                ]
            },
            include: [{
                model: Semana,
                attributes: ['data_inicio', 'data_fim', 'id']
            }],
            order: [[Semana, 'data_inicio', 'DESC']], // Mais recente primeiro
            limit: 100 // Limite de segurança
        });

        // Calcular Resumo
        let totalPrevisto = 0;
        let totalRecebido = 0;
        let totalSaldo = 0;
        let totalJuros = 0;
        let totalDivida = 0;

        const semanasUnicas = new Set();

        linhas.forEach(l => {
            totalPrevisto += (l.previsto || 0);
            totalRecebido += (l.recebido || 0);
            totalSaldo += (l.saldo || 0);

            const saldo = parseFloat(l.saldo) || 0;
            if (saldo > 0.01) {
                totalJuros = (totalJuros || 0) + saldo;
            } else if (saldo < -0.01) {
                totalDivida = (totalDivida || 0) + saldo;
            }

            if (l.SemanaId) {
                semanasUnicas.add(l.SemanaId);
            }
        });

        const countSemanas = semanasUnicas.size;

        res.json({
            resultados: linhas,
            resumo: {
                totalPrevisto,
                totalRecebido,
                totalSaldo,
                totalJuros,
                totalDivida,
                countSemanas
            }
        });

    } catch (e) {
        console.error('Erro relatorios:', e);
        res.status(500).json({ error: 'Erro ao buscar relatorio' });
    }
};

export const listGeneral = async (req, res) => {
    const { LinhaSemana } = req.models;
    try {
        const { tipo } = req.query; // 'clientes' ou 'veiculos'

        let result = [];

        const linhas = await LinhaSemana.findAll({
            attributes: [
                'id', 'placa', 'cliente',
                'semana', 'tabelado', 'diaria',
                'p_premium', 'protecao',
                'acordo', 'ta_boleto', 'desconto',
                'recebido', 'saldo', 'previsto'
            ]
        });

        const agrupado = {};

        linhas.forEach(l => {
            let key = '';
            let nomeDisplay = '';

            if (tipo === 'clientes') {
                if (!l.cliente || l.cliente.trim() === '') return;
                key = l.cliente.trim();
                nomeDisplay = key;
            } else {
                key = l.placa;
                nomeDisplay = key;
            }

            if (!agrupado[key]) {
                agrupado[key] = {
                    nome: nomeDisplay,
                    somaAluguel: 0,
                    somaPremium: 0,
                    somaProtecao: 0,
                    somaAcordo: 0,
                    somaBoleto: 0,
                    somaDesconto: 0,
                    somaPrevisto: 0,
                    somaPago: 0,
                    somaSaldo: 0,
                    somaJuros: 0,
                    somaDivida: 0,
                    qtd: 0
                };
            }

            const item = agrupado[key];

            item.somaAluguel += (l.semana || 0);
            item.somaPremium += (l.p_premium || 0);
            item.somaProtecao += (l.protecao || 0);
            item.somaAcordo += (l.acordo || 0);
            item.somaBoleto += (l.ta_boleto || 0);
            item.somaDesconto += (l.desconto || 0);
            item.somaPrevisto += (l.previsto || 0);
            item.somaPago += (l.recebido || 0);
            item.somaSaldo += (l.saldo || 0);

            const saldo = parseFloat(l.saldo) || 0;
            if (saldo > 0.01) {
                item.somaJuros += saldo;
            } else if (saldo < -0.01) {
                item.somaDivida += saldo;
            }

            item.qtd++;
        });

        result = Object.values(agrupado).sort((a, b) => b.somaPago - a.somaPago);

        res.json(result);

    } catch (e) {
        console.error('Erro listar relatorios:', e);
        res.status(500).json({ error: 'Erro ao listar' });
    }
};
