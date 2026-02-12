import express from 'express';
import MultasController from '../controllers/MultasController.js';
import { validateCreateMulta, validateUpdateMulta } from '../validations/MultaSchema.js';

const router = express.Router();

// Listar multas (filtros via query params)
router.get('/', MultasController.listar);

// Busca por ID
router.get('/:id', MultasController.buscarPorId);

// Criar nova multa
router.post('/', validateCreateMulta, MultasController.criar);

// Atualizar multa
router.put('/:id', validateUpdateMulta, MultasController.atualizar);

// Excluir multa
router.delete('/:id', MultasController.excluir);

// Ação específica: Aplicar Desconto
router.post('/:id/desconto', MultasController.aplicarDesconto);
router.post('/:id/lancar-carteira', MultasController.lancarCarteira);

// Analytics
router.get('/analytics/dashboard', MultasController.dashboard);

export default router;
