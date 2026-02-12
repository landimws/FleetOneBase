
export const getLast = async (req, res) => {
    const { Encerramento } = req.models;
    try {
        const cliente_ref = decodeURIComponent(req.params.cliente);
        const isId = !isNaN(cliente_ref);
        const where = isId ? { cliente_id: cliente_ref } : { cliente_nome: cliente_ref };

        const encerramento = await Encerramento.findOne({
            where: {
                ...where,
                ativo: true,
                reaberto: false
            },
            order: [['createdAt', 'DESC']]
        });

        res.json(encerramento);
    } catch (error) {
        console.error('Erro ao buscar encerramento:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
};

export const create = async (req, res) => {
    const { Encerramento, Cliente } = req.models;
    try {
        const {
            cliente_id,
            cliente_nome,
            placa,
            data_encerramento,
            km_final,
            acordo_texto,
            snapshot_financeiro
        } = req.body;

        const novo = await Encerramento.create({
            cliente_id,
            cliente_nome,
            placa,
            data_encerramento,
            km_final: parseInt(km_final) || 0,
            acordo_texto,
            snapshot_financeiro
        });

        const clienteWhere = cliente_id ? { id: cliente_id } : { nome: cliente_nome };
        await Cliente.update({ ativo: false }, { where: clienteWhere });

        res.status(201).json(novo);
    } catch (error) {
        console.error('Erro ao criar encerramento:', error);
        res.status(500).json({ error: 'Erro ao salvar encerramento' });
    }
};

export const reopen = async (req, res) => {
    const { Encerramento, Cliente } = req.models;
    try {
        const cliente_ref = decodeURIComponent(req.params.cliente);
        const { motivo } = req.body;
        const isId = !isNaN(cliente_ref);
        const where = isId ? { cliente_id: cliente_ref } : { cliente_nome: cliente_ref };

        if (!motivo || motivo.trim().length < 10) {
            return res.status(400).json({
                error: 'Motivo obrigatório (mínimo 10 caracteres)'
            });
        }

        const encerramento = await Encerramento.findOne({
            where: {
                ...where,
                ativo: true,
                reaberto: false
            },
            order: [['createdAt', 'DESC']]
        });

        if (!encerramento) {
            return res.status(404).json({ error: 'Encerramento não encontrado' });
        }

        encerramento.reaberto = true;
        encerramento.data_reabertura = new Date();
        encerramento.motivo_reabertura = motivo;
        await encerramento.save();

        await Cliente.update({ ativo: true }, { where: isId ? { id: cliente_ref } : { nome: cliente_ref } });

        res.json({
            message: 'Contrato reaberto com sucesso',
            encerramento
        });
    } catch (error) {
        console.error('Erro ao reabrir contrato:', error);
        res.status(500).json({ error: 'Erro ao reabrir contrato' });
    }
};
