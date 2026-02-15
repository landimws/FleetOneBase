
import express from 'express';
import * as ControleController from '../controllers/ControleController.js';

const router = express.Router();

// Semanas
router.get('/semanas', ControleController.listSemanas);
router.get('/semanas/proxima', ControleController.checkProximaSemana); // [NEW] Prioridade sobre :id
router.post('/semanas/:id/criar', ControleController.criarSemana);
router.get('/semanas/:id', ControleController.getSemana);
router.put('/semanas/:id/fechar', ControleController.fecharSemana);
router.delete('/semanas/:id', ControleController.excluirSemana);

// Registros (Operações)
router.put('/veiculo/:id/config', ControleController.updateConfig);
router.post('/registro/:id/km', ControleController.registrarKm);
router.post('/registro/:id/servico/agendar', ControleController.agendarServico);
router.post('/registro/:id/servico/entrada', ControleController.registrarEntrada);
router.post('/registro/:id/servico/saida', ControleController.registrarSaida);
router.post('/registro/:id/servico-nao-previsto', ControleController.solicitarServico);

export default router;
