
import express from 'express';
import { body } from 'express-validator';
import * as VeiculosController from '../controllers/VeiculosController.js';

const router = express.Router();

// GET /api/veiculos
router.get('/', VeiculosController.list);

// GET /api/veiculos/:placa
router.get('/:placa', VeiculosController.getByPlaca);

// POST /api/veiculos
router.post('/', [
    body('placa').trim().notEmpty(),
    body('modelo').trim().notEmpty(),
    body('combustivel').trim().notEmpty(),
    body('preco_base').isFloat({ min: 0 })
], VeiculosController.create);

// PUT /api/veiculos/:placa
router.put('/:placa', VeiculosController.update);

// DELETE /api/veiculos/:placa
router.delete('/:placa', VeiculosController.remove);

// GET /api/veiculos/:placa/ultimo-cliente
router.get('/:placa/ultimo-cliente', VeiculosController.getLastClient);

export default router;
