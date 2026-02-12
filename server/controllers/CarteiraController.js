import CarteiraService from '../services/CarteiraService.js';

export const getResumo = async (req, res) => {
    try {
        const { id } = req.params; // Pode ser ID ou Nome
        const data = await CarteiraService.getResumoCarteira(req.models, id);
        res.json(data);
    } catch (error) {
        console.error('Erro ao buscar resumo:', error);
        res.status(500).json({ error: 'Erro ao buscar resumo: ' + error.message });
    }
};

export const createDebito = async (req, res) => {
    try {
        const novoDebito = await CarteiraService.createDebito(req.models, req.body);
        res.status(201).json(novoDebito);
    } catch (error) {
        console.error('Erro ao criar débito:', error);
        res.status(500).json({ error: 'Erro ao salvar débito' });
    }
};

export const deleteDebito = async (req, res) => {
    try {
        await CarteiraService.deleteDebito(req.models, req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao excluir débito' });
    }
};

export const createCredito = async (req, res) => {
    try {
        const result = await CarteiraService.createCredito(req.models, req.body);

        if (result.multiple) {
            res.status(201).json({
                message: result.message,
                creditos: result.creditos
            });
        } else {
            res.status(201).json(result);
        }
    } catch (error) {
        console.error('Erro ao criar crédito:', error);
        res.status(500).json({ error: 'Erro ao salvar crédito' });
    }
};

export const deleteCredito = async (req, res) => {
    try {
        await CarteiraService.deleteCredito(req.models, req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao excluir crédito' });
    }
};

export const updateDebito = async (req, res) => {
    try {
        const { id } = req.params;
        const debito = await CarteiraService.updateDebito(req.models, id, req.body);
        res.json(debito);
    } catch (error) {
        console.error('Erro ao atualizar débito:', error);
        if (error.message === 'Débito não encontrado') {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: 'Erro ao atualizar débito' });
    }
};

export const updateCredito = async (req, res) => {
    try {
        const { id } = req.params;
        const credito = await CarteiraService.updateCredito(req.models, id, req.body);
        res.json(credito);
    } catch (error) {
        console.error('Erro ao atualizar crédito:', error);
        if (error.message === 'Crédito não encontrado') {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: 'Erro ao atualizar crédito' });
    }
};
