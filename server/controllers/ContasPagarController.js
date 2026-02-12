
export const list = async (req, res) => {
    const { ContaPagar, Compra, Fornecedor, sequelize } = req.models;
    const { Op } = sequelize.Sequelize;

    try {
        const { status, start, end, fornecedor_id } = req.query;
        const where = {};

        // Status Filtering Logic
        if (status) {
            const hoje = new Date().toISOString().split('T')[0];

            if (status === 'PAGO') {
                where.status = 'PAGO';
            } else if (status === 'PENDENTE') {
                where.status = 'EM_ABERTO';
                where.vencimento = { [Op.gte]: hoje };
            } else if (status === 'ATRASADO') {
                where.status = { [Op.in]: ['EM_ABERTO', 'ATRASADO'] };
                where.vencimento = { [Op.lt]: hoje };
            } else if (status === 'TODOS') {
                // No status filter
            } else {
                where.status = status;
            }
        }

        // Date Range Filter
        const dateCondition = {};
        if (start && end) {
            dateCondition[Op.between] = [start, end];
        } else if (start) {
            dateCondition[Op.gte] = start;
        } else if (end) {
            dateCondition[Op.lte] = end;
        }

        if (start || end) {
            if (where.vencimento) {
                where.vencimento = {
                    [Op.and]: [
                        where.vencimento,
                        dateCondition
                    ]
                };
            } else {
                where.vencimento = dateCondition;
            }
        }

        const include = [{
            model: Compra,
            include: [{
                model: Fornecedor,
                where: fornecedor_id ? { id: fornecedor_id } : {}
            }]
        }];

        if (fornecedor_id) {
            include[0].required = true;
        }

        const contas = await ContaPagar.findAll({
            where,
            include,
            order: [['vencimento', 'ASC']]
        });

        res.json(contas);
    } catch (error) {
        console.error('Erro ao listar contas a pagar:', error);
        res.status(500).json({ error: 'Erro ao listar contas a pagar' });
    }
};

export const pay = async (req, res) => {
    const { ContaPagar } = req.models;
    try {
        const { id } = req.params;
        const { data_pagamento, forma_pagamento, confirmado, valor_pago } = req.body;

        const conta = await ContaPagar.findByPk(id);
        if (!conta) {
            return res.status(404).json({ error: 'Conta não encontrada' });
        }

        await conta.update({
            data_pagamento: data_pagamento || new Date(),
            forma_pagamento: forma_pagamento || conta.forma_pagamento,
            valor_pago: valor_pago || conta.valor,
            status: 'PAGO',
            confirmado: confirmado !== undefined ? confirmado : true
        });

        res.json(conta);

    } catch (error) {
        console.error('Erro ao pagar conta:', error);
        res.status(500).json({ error: 'Erro ao registrar pagamento' });
    }
};

export const reversePayment = async (req, res) => {
    const { ContaPagar } = req.models;
    try {
        const { id } = req.params;
        const conta = await ContaPagar.findByPk(id);

        if (!conta) return res.status(404).json({ error: 'Conta não encontrada' });
        if (conta.status !== 'PAGO') return res.status(400).json({ error: 'Esta conta não está paga para ser estornada.' });

        await conta.update({
            status: 'EM_ABERTO',
            data_pagamento: null,
            confirmado: false
        });

        res.json({ message: 'Pagamento estornado com sucesso', conta });
    } catch (error) {
        console.error('Erro ao estornar pagamento:', error);
        res.status(500).json({ error: 'Erro ao estornar pagamento' });
    }
};

export const updateStatus = async (req, res) => {
    const { ContaPagar } = req.models;
    try {
        const { id } = req.params;
        const { status } = req.body;

        const conta = await ContaPagar.findByPk(id);
        if (!conta) return res.status(404).json({ error: 'Conta não encontrada' });

        await conta.update({
            status,
            data_pagamento: status === 'EM_ABERTO' ? null : conta.data_pagamento,
            confirmado: status === 'PAGO'
        });

        res.json(conta);
    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        res.status(500).json({ error: 'Erro ao atualizar status' });
    }
};

export const getById = async (req, res) => {
    const { ContaPagar, Compra, Fornecedor } = req.models;
    try {
        const { id } = req.params;
        const conta = await ContaPagar.findByPk(id, {
            include: [{
                model: Compra,
                include: [{ model: Fornecedor }]
            }]
        });

        if (!conta) return res.status(404).json({ error: 'Conta não encontrada' });
        res.json(conta);
    } catch (error) {
        console.error('Erro ao buscar conta:', error);
        res.status(500).json({ error: 'Erro ao buscar conta' });
    }
};
