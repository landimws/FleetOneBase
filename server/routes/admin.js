import express from 'express';
import { isSuperAdmin } from '../middlewares/auth.js';
import AdminEmpresasController from '../controllers/admin/AdminEmpresasController.js';
import AdminUsuariosController from '../controllers/admin/AdminUsuariosController.js';

const router = express.Router();

// Todas as rotas administrativas requerem SuperAdmin
router.use(isSuperAdmin);

// ====================================
// ROTAS DE EMPRESAS
// ====================================

// GET /admin/empresas - Listar todas as empresas
router.get('/empresas', AdminEmpresasController.listAll);

// GET /admin/empresas/novo - Formulário de criação/edição
router.get('/empresas/novo', AdminEmpresasController.renderForm);

// POST /admin/empresas - Criar nova empresa
router.post('/empresas', AdminEmpresasController.create);

// PUT /admin/empresas/:id - Atualizar empresa
router.put('/empresas/:id', AdminEmpresasController.update);

// POST /admin/empresas/:id/toggle-status - Ativar/Desativar empresa
router.post('/empresas/:id/toggle-status', AdminEmpresasController.toggleStatus);

// DELETE /admin/empresas/:id - Deletar empresa (soft delete)
router.delete('/empresas/:id', AdminEmpresasController.delete);

// ====================================
// ROTAS DE USUÁRIOS
// ====================================

// GET /admin/usuarios - Listar todos os usuários
router.get('/usuarios', AdminUsuariosController.listAllMasterUsers);

// GET /admin/usuarios/novo - Formulário de criação/edição
router.get('/usuarios/novo', AdminUsuariosController.renderForm);

// POST /admin/usuarios - Criar novo usuário
router.post('/usuarios', AdminUsuariosController.createMasterUser);

// PUT /admin/usuarios/:id - Atualizar usuário
router.put('/usuarios/:id', AdminUsuariosController.update);

// POST /admin/usuarios/:id/toggle-status - Ativar/Desativar usuário
router.post('/usuarios/:id/toggle-status', AdminUsuariosController.toggleUserStatus);

// POST /admin/usuarios/:id/transferir-empresa - Transferir usuário entre empresas
router.post('/usuarios/:id/transferir-empresa', AdminUsuariosController.updateUserCompany);

// ====================================
// ROTA PADRÃO (Dashboard Admin)
// ====================================

// GET /admin - Redireciona para listagem de empresas
router.get('/', (req, res) => {
    res.redirect('/admin/empresas');
});

export default router;
