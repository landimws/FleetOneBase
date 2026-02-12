
import express from 'express';
import { body } from 'express-validator';
import * as ClientesController from '../controllers/ClientesController.js';

const router = express.Router();

// GET /api/clientes
router.get('/', ClientesController.list);

// GET /api/clientes/:nome
router.get('/:nome', ClientesController.getByNome);

// POST /api/clientes
router.post('/', [
    body('nome').trim().notEmpty()
], ClientesController.create);

// PUT /api/clientes/:nome
router.put('/:nome', ClientesController.update);

// DELETE /api/clientes/:nome
router.delete('/:nome', ClientesController.remove);

export default router;
