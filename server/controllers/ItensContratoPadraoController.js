/**
 * Controller para Itens de Contrato Padrão (Catálogo)
 */
class ItensContratoPadraoController {

    /**
     * Lista todos os itens do catálogo
     */
    async list(req, res) {
        try {
            const { ItensContratoPadrao } = req.models;
            const { ativo } = req.query;

            const where = {};
            if (ativo !== undefined) {
                where.ativo = ativo === 'true';
            }

            const itens = await ItensContratoPadrao.findAll({
                where,
                order: [['ordem_exibicao', 'ASC'], ['nome', 'ASC']]
            });

            res.json(itens);
        } catch (error) {
            console.error('Erro ao listar itens:', error);
            res.status(500).json({ error: 'Erro ao listar itens' });
        }
    }

    /**
     * Busca item por ID
     */
    async getById(req, res) {
        try {
            const { ItensContratoPadrao } = req.models;
            const item = await ItensContratoPadrao.findByPk(req.params.id);

            if (!item) {
                return res.status(404).json({ error: 'Item não encontrado' });
            }

            res.json(item);
        } catch (error) {
            console.error('Erro ao buscar item:', error);
            res.status(500).json({ error: 'Erro ao buscar item' });
        }
    }

    /**
     * Cria novo item (admin)
     */
    async create(req, res) {
        try {
            const { ItensContratoPadrao } = req.models;

            // Validações
            if (!req.body.nome) {
                return res.status(400).json({ error: 'Nome é obrigatório' });
            }

            const item = await ItensContratoPadrao.create(req.body);
            res.status(201).json(item);
        } catch (error) {
            console.error('Erro ao criar item:', error);
            res.status(500).json({ error: 'Erro ao criar item' });
        }
    }

    /**
     * Atualiza item existente (admin)
     */
    async update(req, res) {
        try {
            const { ItensContratoPadrao } = req.models;
            const item = await ItensContratoPadrao.findByPk(req.params.id);

            if (!item) {
                return res.status(404).json({ error: 'Item não encontrado' });
            }

            await item.update(req.body);
            res.json(item);
        } catch (error) {
            console.error('Erro ao atualizar item:', error);
            res.status(500).json({ error: 'Erro ao atualizar item' });
        }
    }

    /**
     * Desativa item (admin)
     */
    async remove(req, res) {
        try {
            const { ItensContratoPadrao } = req.models;
            const item = await ItensContratoPadrao.findByPk(req.params.id);

            if (!item) {
                return res.status(404).json({ error: 'Item não encontrado' });
            }

            // Soft delete
            await item.update({ ativo: false });
            res.status(204).send();
        } catch (error) {
            console.error('Erro ao remover item:', error);
            res.status(500).json({ error: 'Erro ao remover item' });
        }
    }
}

export default new ItensContratoPadraoController();
