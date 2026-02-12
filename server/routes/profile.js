
import express from 'express';
import UsuariosController from '../controllers/UsuariosController.js';
import { isAuthenticated } from '../middlewares/auth.js';

const router = express.Router();

// Update own profile
router.put('/', isAuthenticated, UsuariosController.updateProfile);

export default router;
