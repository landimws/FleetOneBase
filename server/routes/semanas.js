
import express from 'express';
import * as SemanasController from '../controllers/SemanasController.js';

const router = express.Router();

// GET /api/semanas
router.get('/', SemanasController.list);

// GET /api/semanas/:id
router.get('/:id', SemanasController.getById);

// PUT /api/semanas/:id (Salvar Grid Completa)
router.put('/:id', SemanasController.update);

// POST /api/semanas (Criar Semana)
router.post('/', SemanasController.create);

// POST /api/semanas/:id/sincronizar
router.post('/:id/sincronizar', SemanasController.sincronizar);

// ROTAS DE LINHA (Individual)
router.put('/:semanaId/linhas/:linhaId', SemanasController.updateLine);
router.post('/:semanaId/linhas', SemanasController.createLine);
router.delete('/:semanaId/linhas/:linhaId', SemanasController.deleteLine);

// DELETE /api/semanas/:id (Excluir Semana com Validação)
router.delete('/:id', SemanasController.deleteSemana);

export default router;
