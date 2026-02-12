
export const list = async (req, res) => {
    const { Compra, Fornecedor, sequelize } = req.models;
    const { Op } = sequelize.Sequelize;

    try {
        const { start, end, fornecedor_id } = req.query;
        const where = {};

        // Date filtering (YYYY-MM-DD)
        const dateCondition = {};

        if (start && end) {
            dateCondition[Op.between] = [start, end];
        } else if (start) {
            dateCondition[Op.gte] = start;
        } else if (end) {
            dateCondition[Op.lte] = end;
        }

        if (start || end) {
            where.data_emissao = dateCondition;
        }

        if (fornecedor_id) {
            where.fornecedor_id = fornecedor_id;
        }

        const compras = await Compra.findAll({
            where,
            include: [{ model: Fornecedor, attributes: ['nome'] }],
            order: [['data_emissao', 'DESC']]
        });
        res.json(compras);
    } catch (error) {
        console.error('Erro ao listar compras:', error);
        res.status(500).json({ error: 'Erro ao listar compras' });
    }
};

export const getById = async (req, res) => {
    const { Compra, Fornecedor, CompraItem, ContaPagar } = req.models;
    try {
        const { id } = req.params;
        const compra = await Compra.findByPk(id, {
            include: [
                { model: Fornecedor },
                { model: CompraItem, as: 'itens' },
                { model: ContaPagar, as: 'parcelas' }
            ]
        });

        if (!compra) return res.status(404).json({ error: 'Compra não encontrada' });
        res.json(compra);
    } catch (error) {
        console.error('Erro ao obter compra:', error);
        res.status(500).json({ error: 'Erro ao obter compra' });
    }
};

export const create = async (req, res) => {
    const { Compra, CompraItem, ContaPagar, sequelize } = req.models;
    const t = await sequelize.transaction();
    try {
        const {
            fornecedor_id, data_emissao, numero_nota,
            observacoes,
            itens = [],
            parcelas = []
        } = req.body;

        if (!fornecedor_id) throw new Error('Fornecedor obrigatório');
        if (!itens.length) throw new Error('A compra deve ter pelo menos um item.');

        if (numero_nota) {
            const existe = await Compra.findOne({ where: { fornecedor_id, numero_nota } });
            if (existe) {
                throw new Error(`A nota fiscal nº ${numero_nota} já foi lançada para este fornecedor.`);
            }
        }

        const safeFloat = (v) => {
            const f = parseFloat(v);
            return isNaN(f) ? 0 : f;
        };

        // 1. Calculate Totals based on Items
        let valor_bruto = 0;

        const itensToCreate = itens.map(item => {
            const qtd = safeFloat(item.quantidade);
            const unit = safeFloat(item.valor_unitario);
            const subtotal = qtd * unit;

            const desc_perc = safeFloat(item.desconto_percentual);
            const desc_val = safeFloat(item.desconto_valor);

            let final_discount = desc_val;
            if (desc_perc > 0 && desc_val === 0) {
                final_discount = subtotal * (desc_perc / 100);
            }

            const valor_final = subtotal - final_discount;
            valor_bruto += valor_final;

            return {
                ...item,
                quantidade: qtd,
                valor_unitario: unit,
                valor_subtotal: subtotal,
                desconto_valor: final_discount,
                valor_final: valor_final,
                // Fix: Empty string for FK triggers constraint error. Convert to NULL.
                placa: item.placa && item.placa.trim() !== '' ? item.placa : null,
                numero_os: item.numero_os || null // Good practice
            };
        });

        // 2. Global Discount
        const desconto_global_percentual = safeFloat(req.body.desconto_percentual);
        let desconto_global_valor = safeFloat(req.body.desconto_valor);

        if (desconto_global_percentual > 0 && desconto_global_valor === 0) {
            desconto_global_valor = valor_bruto * (desconto_global_percentual / 100);
        }

        const valor_liquido = valor_bruto - desconto_global_valor;

        // 3. Create Compra Header
        const novaCompra = await Compra.create({
            fornecedor_id,
            data_emissao,
            numero_nota,
            valor_bruto,
            desconto_percentual: desconto_global_percentual,
            desconto_valor: desconto_global_valor,
            valor_liquido,
            observacoes
        }, { transaction: t });

        // 4. Create Items
        for (const item of itensToCreate) {
            await CompraItem.create({
                ...item,
                compra_id: novaCompra.id
            }, { transaction: t });
        }

        // 5. Create Installments (Contas Pagar)
        // Frontend now strictly sends 'parcelas' for both À Vista and A Prazo
        const totalParcelasCheck = parcelas.reduce((sum, p) => sum + safeFloat(p.valor), 0);

        if (parcelas.length > 0) {
            // Validation: Sum of parcels must match Total Liquid
            const diff = Math.abs(totalParcelasCheck - valor_liquido);
            if (diff > 0.05) { // Tolerance for floating point
                // Optional: Log warning, but strictly we should error. 
                // However, to avoid blocking valid saves on minor rounding:
                console.warn(`[Compras] Divergência Total (${valor_liquido}) vs Parcelas (${totalParcelasCheck})`);
            }

            for (const [index, p] of parcelas.entries()) {
                await ContaPagar.create({
                    compra_id: novaCompra.id,
                    numero_parcela: p.numero_parcela || (index + 1),
                    total_parcelas: parcelas.length,
                    valor: safeFloat(p.valor),
                    vencimento: p.vencimento,
                    forma_pagamento: p.forma_pagamento,
                    status: p.status || 'EM_ABERTO',
                    confirmado: false
                }, { transaction: t });
            }
        } else {
            // Fallback ONLY if logic completely failed (should not happen with updated frontend)
            // But let's log potential issue
            console.warn('[Compras] Nenhuma parcela recebida para compra ID: ' + novaCompra.id);
        }

        await t.commit();
        res.status(201).json(novaCompra);

    } catch (error) {
        await t.rollback();
        console.error('Erro ao criar compra:', error);
        res.status(500).json({ error: error.message || 'Erro interno ao salvar compra' });
    }
};


export const update = async (req, res) => {
    const { Compra, CompraItem, ContaPagar, sequelize } = req.models;
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const {
            fornecedor_id, data_emissao, numero_nota,
            observacoes,
            itens = [],
            parcelas = []
        } = req.body;

        const compra = await Compra.findByPk(id, {
            include: [{ model: ContaPagar, as: 'parcelas' }]
        });

        if (!compra) {
            await t.rollback();
            return res.status(404).json({ error: 'Compra não encontrada' });
        }

        // 1. Validation: Cannot edit if any installment is PAID
        const hasPaidInstallments = compra.parcelas.some(p => p.status === 'PAGO');
        if (hasPaidInstallments) {
            await t.rollback();
            return res.status(400).json({ error: 'Não é possível editar uma compra com parcelas já pagas. Estorne os pagamentos antes de editar.' });
        }

        if (numero_nota) {
            const { Op } = sequelize.Sequelize;
            const existe = await Compra.findOne({
                where: {
                    fornecedor_id,
                    numero_nota,
                    id: { [Op.ne]: id }
                }
            });
            if (existe) {
                await t.rollback();
                return res.status(400).json({ error: `A nota fiscal nº ${numero_nota} já está cadastrada para este fornecedor em outra compra.` });
            }
        }

        const safeFloat = (v) => {
            const f = parseFloat(v);
            return isNaN(f) ? 0 : f;
        };

        // 2. Recalculate Totals (Same logic as create)
        let valor_bruto = 0;
        const itensToCreate = itens.map(item => {
            const qtd = safeFloat(item.quantidade);
            const unit = safeFloat(item.valor_unitario);
            const subtotal = qtd * unit;
            const desc_perc = safeFloat(item.desconto_percentual);
            const desc_val = safeFloat(item.desconto_valor);
            let final_discount = desc_val;
            if (desc_perc > 0 && desc_val === 0) final_discount = subtotal * (desc_perc / 100);
            const valor_final = subtotal - final_discount;
            valor_bruto += valor_final;
            return {
                ...item,
                compra_id: id,
                quantidade: qtd,
                valor_unitario: unit,
                valor_subtotal: subtotal,
                desconto_valor: final_discount,
                valor_final: valor_final,
                placa: item.placa && item.placa.trim() !== '' ? item.placa : null,
                numero_os: item.numero_os || null
            };
        });

        const desconto_global_percentual = safeFloat(req.body.desconto_percentual);
        let desconto_global_valor = safeFloat(req.body.desconto_valor);
        if (desconto_global_percentual > 0 && desconto_global_valor === 0) {
            desconto_global_valor = valor_bruto * (desconto_global_percentual / 100);
        }
        const valor_liquido = valor_bruto - desconto_global_valor;

        // 3. Update Compra Header
        await compra.update({
            fornecedor_id,
            data_emissao,
            numero_nota,
            valor_bruto,
            desconto_percentual: desconto_global_percentual,
            desconto_valor: desconto_global_valor,
            valor_liquido,
            observacoes
        }, { transaction: t });

        // 4. Replace Items (Delete All -> Create New)
        await CompraItem.destroy({ where: { compra_id: id }, transaction: t });
        for (const item of itensToCreate) {
            await CompraItem.create(item, { transaction: t });
        }

        // 5. Replace Installments (Delete All -> Create New)
        await ContaPagar.destroy({ where: { compra_id: id }, transaction: t });

        if (parcelas.length > 0) {
            for (const [index, p] of parcelas.entries()) {
                await ContaPagar.create({
                    compra_id: id,
                    numero_parcela: p.numero_parcela || (index + 1),
                    total_parcelas: parcelas.length,
                    valor: safeFloat(p.valor),
                    vencimento: p.vencimento,
                    forma_pagamento: p.forma_pagamento,
                    status: 'EM_ABERTO', // Force refresh status
                    confirmado: false
                }, { transaction: t });
            }
        }

        await t.commit();
        res.json(compra);

    } catch (error) {
        await t.rollback();
        console.error('Erro ao editar compra:', error);
        res.status(500).json({ error: error.message || 'Erro interno ao editar compra' });
    }
};


export const remove = async (req, res) => {
    const { Compra, sequelize } = req.models;
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const compra = await Compra.findByPk(id);

        if (!compra) {
            await t.rollback();
            return res.status(404).json({ error: 'Compra não encontrada' });
        }

        // Cascade delete is handled by DB FKs usually, but Sequelize might need help if not configured
        // Our migration set ON DELETE CASCADE, so destroying Compra should be enough.
        await compra.destroy({ transaction: t });

        await t.commit();
        res.json({ message: 'Compra removida com sucesso' });

    } catch (error) {
        await t.rollback();
        console.error('Erro ao remover compra:', error);
        res.status(500).json({ error: 'Erro ao remover compra' });
    }
};
