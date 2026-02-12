
import test from 'node:test';
import assert from 'node:assert';
import sequelize from '../server/config/database-sqlite.js';
import Fornecedor from '../server/models-sqlite/Fornecedor.js';
import Compra from '../server/models-sqlite/Compra.js';
import CompraItem from '../server/models-sqlite/CompraItem.js';
import ContaPagar from '../server/models-sqlite/ContaPagar.js';

import * as FornecedoresController from '../server/controllers/FornecedoresController.js';
import * as ComprasController from '../server/controllers/ComprasController.js';
import * as ContasPagarController from '../server/controllers/ContasPagarController.js';

// Helper to mock request/response
const mockRes = () => {
    const res = {};
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (data) => { res.body = data; return res; };
    return res;
};

// Clear DB before tests
test.before(async () => {
    if (process.env.NODE_ENV !== 'test') throw new Error('NODE_ENV must be test');
    // Ensure sync to have tables
    await sequelize.sync({ force: true });
});

test('Fluxo Financeiro: Fornecedor -> Compra -> Pagamento', async (t) => {
    let fornecedorId;
    let compraId;
    let parcelaId;

    await t.test('1. Criar Fornecedor', async () => {
        const req = { body: { nome: 'Fornecedor Teste', cnpj_cpf: '123' } };
        const res = mockRes();

        await FornecedoresController.create(req, res);

        assert.strictEqual(res.statusCode, 201);
        assert.ok(res.body.id);
        fornecedorId = res.body.id;
    });

    await t.test('2. Registrar Compra com Itens e Parcelas', async () => {
        const req = {
            body: {
                fornecedor_id: fornecedorId,
                data_emissao: '2023-10-01',
                numero_nota: '12345',
                itens: [
                    { descricao: 'Item 1', tipo: 'PECA', quantidade: 2, valor_unitario: 50 } // 100
                ],
                parcelas: [
                    { valor: 100, vencimento: '2023-11-01', forma_pagamento: 'BOLETO' }
                ]
            }
        };
        const res = mockRes();

        await ComprasController.create(req, res);

        if (res.statusCode === 500) console.error(res.body);
        assert.strictEqual(res.statusCode, 201);
        assert.ok(res.body.id);
        compraId = res.body.id;
        assert.strictEqual(res.body.valor_liquido, 100);
    });

    await t.test('3. Verificar Criação de Parcelas', async () => {
        const conta = await ContaPagar.findOne({ where: { compra_id: compraId } });
        assert.ok(conta);
        assert.strictEqual(conta.valor, 100);
        assert.strictEqual(conta.status, 'EM_ABERTO');
        parcelaId = conta.id;
    });

    await t.test('4. Pagar Parcela', async () => {
        const req = {
            params: { id: parcelaId },
            body: { data_pagamento: '2023-10-15', confirmado: true }
        };
        const res = mockRes();

        await ContasPagarController.pay(req, res);

        assert.strictEqual(res.body.status, 'PAGO');
        assert.strictEqual(res.body.confirmado, true);
    });
});
