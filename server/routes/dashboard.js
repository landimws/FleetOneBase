
import express from 'express';
import * as DashboardController from '../controllers/DashboardController.js';

const router = express.Router();

// GET /api/dashboard
router.get('/', DashboardController.getDashboard);

export default router;
