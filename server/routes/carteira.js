
import express from 'express';
import * as CarteiraController from '../controllers/CarteiraController.js';

const router = express.Router();

// GET /api/carteira/resumo/:id
router.get('/resumo/:id', CarteiraController.getResumo);

// DÉBITOS
router.post('/debitos', CarteiraController.createDebito);
router.put('/debitos/:id', CarteiraController.updateDebito);
router.delete('/debitos/:id', CarteiraController.deleteDebito);

// CRÉDITOS
router.post('/creditos', CarteiraController.createCredito);
router.put('/creditos/:id', CarteiraController.updateCredito);
router.delete('/creditos/:id', CarteiraController.deleteCredito);

// NEGOCIAÇÃO AUTOMATIZADA
import * as NegociacaoController from '../controllers/NegociacaoController.js';
router.post('/negociacao', NegociacaoController.processarNegociacao);
router.post('/simular-minuta', NegociacaoController.simularMinuta);

export default router;
