
import express from 'express';
import EmpresasController from '../controllers/EmpresasController.js';
import { isAuthenticated, isAdmin } from '../middlewares/auth.js';

const router = express.Router();

// Only admin can access company settings
router.get('/', isAuthenticated, isAdmin, EmpresasController.getCompany);
router.put('/', isAuthenticated, isAdmin, EmpresasController.updateCompany);

export default router;
