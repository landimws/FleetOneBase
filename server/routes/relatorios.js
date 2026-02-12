
import express from 'express';
import * as RelatoriosController from '../controllers/RelatoriosController.js';

const router = express.Router();

// GET /api/relatorios/busca
router.get('/busca', RelatoriosController.search);

// GET /api/relatorios/listar
router.get('/listar', RelatoriosController.listGeneral);

export default router;
