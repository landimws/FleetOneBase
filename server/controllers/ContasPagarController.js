
import ContaPagar from '../models-sqlite/ContaPagar.js';
import Compra from '../models-sqlite/Compra.js';
import Fornecedor from '../models-sqlite/Fornecedor.js';

export const list = async (req, res) => {
    try {
        const { status, start, end, fornecedor_id } = req.query;
        const where = {};
        const { Op } = await import('sequelize');

        // Status Filtering Logic
        if (status) {
            const hoje = new Date().toISOString().split('T')[0];

            if (status === 'PAGO') {
                where.status = 'PAGO';
            } else if (status === 'PENDENTE') {
                // Em Aberto e NÃO vencido (ou vencendo hoje)
                where.status = 'EM_ABERTO';
                where.vencimento = { [Op.gte]: hoje };
            } else if (status === 'ATRASADO') {
                // Em Aberto e Vencido
                where.status = { [Op.in]: ['EM_ABERTO', 'ATRASADO'] }; // Include explicit 'ATRASADO' if it exists
                where.vencimento = { [Op.lt]: hoje };
            } else if (status === 'TODOS') {
                // No status filter
            } else {
                // Fallback for direct DB values (e.g. if someone sends 'EM_ABERTO' manually)
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
            // If we already have a vencimento condition (from PENDENTE/ATRASADO), we need to AND it.
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

        // Filter by supplier requires filtering the included Compra->Fornecedor
        // If fornecedor_id is present, the inner where handles it. 
        // But we need 'required: true' if we want to filter the main results.
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
    try {
        const { id } = req.params;
        const { data_pagamento, forma_pagamento, confirmado, valor_pago } = req.body;

        const conta = await ContaPagar.findByPk(id);
        if (!conta) {
            return res.status(404).json({ error: 'Conta não encontrada' });
        }

        if (conta.status === 'PAGO' && !confirmado) {
            // Preventing accidental double payment logic if needed
        }

        await conta.update({
            data_pagamento: data_pagamento || new Date(),
            forma_pagamento: forma_pagamento || conta.forma_pagamento,
            valor_pago: valor_pago || conta.valor, // Default to original value if not provided
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
    // Defines generic status update (e.g. reopen)
    try {
        const { id } = req.params;
        const { status } = req.body; // EM_ABERTO, ATRASADO

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
