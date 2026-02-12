import { validationResult } from 'express-validator';
import MultaService from '../services/MultaService.js';
import MultaAnalyticsService from '../services/MultaAnalyticsService.js';
import { QueryTypes } from 'sequelize';

class MultasController {

    async listar(req, res) {
        try {
            const filters = {
                veiculo_id: req.query.veiculo_id,
                cliente_id: req.query.cliente_id,
                modelo: req.query.modelo,
                status: req.query.status,
                filtro_rapido: req.query.filtro_rapido, // Filtro de workflow
                search: req.query.search, // Novo parametro de busca inteligente
                data_inicio: req.query.data_inicio,
                data_fim: req.query.data_fim,
                tipo_data: req.query.tipo_data, // 'infracao' (default) ou 'vencimento'
                sort_by: req.query.sort_by,
                order: req.query.order
            };
            const multas = await MultaService.list(req.models, filters);
            res.json(multas);
        } catch (error) {
            console.error('Erro ao listar multas:', error);
            res.status(500).json({ error: 'Erro interno ao listar multas' });
        }
    }

    async criar(req, res) {
        const { sequelize } = req.models;
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            // 1. Normalização
            if (req.body.numero_auto) {
                req.body.numero_auto = req.body.numero_auto.toUpperCase().trim();
            }

            // 2. Verificação de Duplicidade Fuzzy (0 vs O)
            // SQL Raw para SQLite: WHERE REPLACE(numero_auto, 'O', '0') = REPLACE(:auto, 'O', '0')

            // Passo A: Identificar se existe algo "parecido"
            const autoNormalizado = req.body.numero_auto.replace(/O/g, '0');

            // Query Raw segurana usando a conexão do tenant
            const [similar] = await sequelize.query(
                `SELECT numero_auto FROM Multas WHERE REPLACE(UPPER(numero_auto), 'O', '0') = :auto LIMIT 1`,
                {
                    replacements: { auto: autoNormalizado },
                    type: QueryTypes.SELECT
                }
            );

            if (similar) {
                // Se existe, verificar se é idêntico ou apenas similar
                if (similar.numero_auto !== req.body.numero_auto) {
                    return res.status(400).json({
                        error: `Duplicidade detectada! Já existe a multa '${similar.numero_auto}'. Verifique confusão entre número '0' e letra 'O'.`
                    });
                }
                // Se for idêntico, o UniqueConstraint do banco vai pegar logo abaixo, ou o Service.
            }

            const multa = await MultaService.create(req.models, req.body);
            res.status(201).json(multa);
        } catch (error) {
            console.error('Erro ao criar multa:', error);
            if (error.name === 'SequelizeUniqueConstraintError') {
                return res.status(400).json({ error: 'Já existe uma multa com este número de auto' });
            }
            res.status(400).json({ error: error.message });
        }
    }

    async buscarPorId(req, res) {
        try {
            const multa = await MultaService.getById(req.models, req.params.id);
            res.json(multa);
        } catch (error) {
            if (error.message === 'Multa não encontrada') {
                return res.status(404).json({ error: error.message });
            }
            console.error('Erro ao buscar multa:', error);
            res.status(500).json({ error: 'Erro interno ao buscar multa' });
        }
    }

    async atualizar(req, res) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const multa = await MultaService.update(req.models, req.params.id, req.body);
            res.json(multa);
        } catch (error) {
            if (error.message === 'Multa não encontrada') {
                return res.status(404).json({ error: error.message });
            }
            if (error.name === 'SequelizeUniqueConstraintError') {
                return res.status(400).json({ error: 'Já existe uma multa com este número de auto' });
            }
            console.error('Erro ao atualizar multa:', error);
            res.status(400).json({ error: error.message });
        }
    }

    async excluir(req, res) {
        try {
            await MultaService.delete(req.models, req.params.id);
            res.status(204).send();
        } catch (error) {
            if (error.message === 'Multa não encontrada') {
                return res.status(404).json({ error: error.message });
            }
            console.error('Erro ao excluir multa:', error);
            res.status(500).json({ error: 'Erro interno ao excluir multa' });
        }
    }

    async aplicarDesconto(req, res) {
        const { percentual } = req.body;

        if (percentual === undefined) {
            return res.status(400).json({ error: 'Percentual é obrigatório' });
        }

        try {
            const multa = await MultaService.aplicarDesconto(req.models, req.params.id, percentual);
            res.json(multa);
        } catch (error) {
            if (error.message === 'Multa não encontrada') {
                return res.status(404).json({ error: error.message });
            }
            res.status(400).json({ error: error.message });
        }
    }

    async lancarCarteira(req, res) {
        try {
            const { id } = req.params;
            const debitData = req.body;
            const result = await MultaService.lancarNaCarteira(req.models, id, debitData);
            res.status(201).json(result);
        } catch (error) {
            console.error('Erro ao lançar na carteira:', error);
            res.status(400).json({ error: error.message });
        }
    }

    async dashboard(req, res) {
        try {
            const filters = {
                data_inicio: req.query.data_inicio,
                data_fim: req.query.data_fim,
                search: req.query.search
            };

            const analytics = await MultaAnalyticsService.getAnalytics(req.models, filters);
            res.json(analytics);
        } catch (error) {
            console.error('Erro no Dashboard de Multas:', error);
            res.status(500).json({ error: 'Erro ao gerar dados do dashboard' });
        }
    }
}

export default new MultasController();
