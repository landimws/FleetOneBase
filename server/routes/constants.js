import express from 'express';
import CONSTANTS from '../config/constants.js';

const router = express.Router();

/**
 * GET /api/constants
 * 
 * Retorna todas as constantes do sistema para uso no frontend.
 * Permite que o frontend seja dinâmico e sempre sincronizado com o backend.
 */
router.get('/', (req, res) => {
    res.json(CONSTANTS);
});

export default router;
