
import express from 'express';
import UsuariosController from '../controllers/UsuariosController.js';
import { isAuthenticated } from '../middlewares/auth.js';

const router = express.Router();

// Middleware para verificar se é admin
const isAdmin = (req, res, next) => {
    if (req.session.userRole !== 'admin') {
        return res.status(403).send('Acesso negado. Apenas administradores.');
    }
    next();
};

// Routes requiring Admin
router.get('/', isAuthenticated, isAdmin, UsuariosController.index);
router.post('/', isAuthenticated, isAdmin, UsuariosController.create);
router.put('/:id', isAuthenticated, isAdmin, UsuariosController.update);
router.delete('/:id', isAuthenticated, isAdmin, UsuariosController.delete);

export default router;
