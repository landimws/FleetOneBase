
import express from 'express';
import * as FornecedoresController from '../controllers/FornecedoresController.js';
// Import other controllers later

import * as ComprasController from '../controllers/ComprasController.js';
import * as ContasPagarController from '../controllers/ContasPagarController.js';

const router = express.Router();

// --- FORNECEDORES ---
router.get('/fornecedores', FornecedoresController.list);
router.get('/fornecedores/:id', FornecedoresController.getById);
router.post('/fornecedores', FornecedoresController.create);
router.put('/fornecedores/:id', FornecedoresController.update);
router.delete('/fornecedores/:id', FornecedoresController.remove);

// --- COMPRAS ---
router.get('/compras', ComprasController.list);
router.get('/compras/:id', ComprasController.getById);
router.post('/compras', ComprasController.create);
router.put('/compras/:id', ComprasController.update);
router.delete('/compras/:id', ComprasController.remove);

// --- CONTAS A PAGAR ---
router.get('/contas-pagar', ContasPagarController.list);
router.get('/contas-pagar/:id', ContasPagarController.getById);
router.post('/contas-pagar/:id/pagar', ContasPagarController.pay);
router.post('/contas-pagar/:id/estornar', ContasPagarController.reversePayment);
router.put('/contas-pagar/:id/status', ContasPagarController.updateStatus);

export default router;
