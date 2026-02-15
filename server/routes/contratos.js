import express from 'express';
import ContratosController from '../controllers/ContratosController.js';
import ConfiguracoesContratoController from '../controllers/ConfiguracoesContratoController.js';
import ItensContratoPadraoController from '../controllers/ItensContratoPadraoController.js';
import TemplatesDocumentoController from '../controllers/TemplatesDocumentoController.js';

const router = express.Router();

// ==================== CONTRATOS ====================

// Listar contratos (com filtros)
router.get('/', ContratosController.list);

// Buscar contrato por ID
router.get('/:id', ContratosController.getById);

// Rota temporária para popular dados iniciais (REMOVER EM PRODUÇÃO)
router.get('/seed/run', async (req, res) => {
    try {
        const { seedContratos } = await import('../seeds/contratos-seed.js');
        const result = await seedContratos(req.models);
        res.json(result);
    } catch (error) {
        console.error('Erro ao executar seed:', error);
        res.status(500).json({ error: 'Erro ao executar seed', details: error.message });
    }
});

// Criar novo contrato
router.post('/', ContratosController.create);

// Atualizar contrato
router.put('/:id', ContratosController.update);

// Remover/cancelar contrato
router.delete('/:id', ContratosController.remove);

// Obter dados processados do contrato (JSON)
router.get('/:id/dados', ContratosController.getDados);

// Visualizar contrato em HTML (web)
router.get('/:id/web', ContratosController.visualizarWeb);

// Gerar PDF do contrato
router.get('/:id/pdf', ContratosController.gerarPDF);

// Encerrar contrato
router.post('/:id/encerrar', ContratosController.encerrar);

// ==================== CONFIGURAÇÕES ====================

// Buscar configurações de contrato
router.get('/config/get', ConfiguracoesContratoController.get);

// Atualizar configurações (admin)
router.put('/config/update', ConfiguracoesContratoController.update);

// ==================== ITENS PADRÃO ====================

// Listar itens do catálogo
router.get('/itens-padrao/list', ItensContratoPadraoController.list);

// Buscar item por ID
router.get('/itens-padrao/:id', ItensContratoPadraoController.getById);

// Criar item (admin)
router.post('/itens-padrao', ItensContratoPadraoController.create);

// Atualizar item (admin)
router.put('/itens-padrao/:id', ItensContratoPadraoController.update);

// Desativar item (admin)
router.delete('/itens-padrao/:id', ItensContratoPadraoController.remove);

// ==================== TEMPLATES DE DOCUMENTO ====================

// Listar templates
router.get('/templates/list', TemplatesDocumentoController.list);

// Buscar template por ID
router.get('/templates/:id', TemplatesDocumentoController.getById);

// Criar template (superadmin)
router.post('/templates', TemplatesDocumentoController.create);

// Atualizar template (versionamento automático)
router.put('/templates/:id', TemplatesDocumentoController.update);

// Desativar template
router.delete('/templates/:id', TemplatesDocumentoController.remove);

// Listar histórico de versões
router.get('/templates/:id/historico', TemplatesDocumentoController.getHistorico);

// Restaurar versão anterior
router.post('/templates/:id/restaurar/:versao', TemplatesDocumentoController.restaurarVersao);

// Preview do template
router.post('/templates/:id/preview', TemplatesDocumentoController.preview);

// Validar HTML e variáveis
router.post('/templates/validar', TemplatesDocumentoController.validar);

export default router;
