
import express from 'express';
import * as EncerramentoController from '../controllers/EncerramentoController.js';

const router = express.Router();

// GET /api/encerramento/:cliente
router.get('/:cliente', EncerramentoController.getLast);

// POST /api/encerramento
router.post('/', EncerramentoController.create);

// PUT /api/encerramento/:cliente/reabrir
router.put('/:cliente/reabrir', EncerramentoController.reopen);

export default router;
