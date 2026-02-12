import { body, param } from 'express-validator';
import Veiculo from '../models-sqlite/Veiculo.js';
import Cliente from '../models-sqlite/Cliente.js';
import Multa from '../models-sqlite/Multa.js';

export const validateCreateMulta = [
    body('veiculo_id')
        .trim().notEmpty().withMessage('Placa do veículo é obrigatória')
        .custom(async (placa) => {
            const veiculo = await Veiculo.findByPk(placa);
            if (!veiculo) throw new Error('Veículo não encontrado');
            return true;
        }),

    body('numero_auto')
        .trim().notEmpty().withMessage('Número do auto é obrigatório')
        .toUpperCase()
        .custom(async (numero_auto) => {
            const exists = await Multa.findOne({ where: { numero_auto } });
            if (exists) throw new Error('Já existe uma multa com este número de auto');
            return true;
        }),

    body('valor_original')
        .isFloat({ min: 0.01 }).withMessage('Valor original deve ser maior que zero'),

    body('data_infracao')
        .isISO8601().withMessage('Data da infração inválida (YYYY-MM-DD)'),

    body('data_vencimento')
        .isISO8601().withMessage('Data de vencimento inválida')
        .custom((value, { req }) => {
            if (new Date(value) < new Date(req.body.data_infracao)) {
                throw new Error('Data de vencimento não pode ser anterior à data da infração');
            }
            return true;
        }),

    body('orgao_autuador')
        .trim().notEmpty().withMessage('Órgão autuador é obrigatório'),

    body('tipo_responsavel')
        .isIn(['cliente', 'locadora']).withMessage('Tipo responsável inválido (cliente/locadora)'),

    body('cliente_nome')
        .if(body('tipo_responsavel').equals('cliente'))
        .notEmpty().withMessage('Nome do cliente é obrigatório para multas de cliente')
        .custom(async (nome) => {
            if (!nome) return true;
            const cliente = await Cliente.findByPk(nome);
            if (!cliente) throw new Error('Cliente não encontrado');
            return true;
        }),

    body('desconto_aplicado')
        .optional()
        .isIn([0, 20, 40]).withMessage('Desconto deve ser 0, 20 ou 40'),

    body('cobrar_taxa_administrativa')
        .optional()
        .isBoolean().withMessage('Cobrar taxa deve ser booleano')
];

export const validateUpdateMulta = [
    param('id').isInt().withMessage('ID inválido'),

    body('numero_auto')
        .optional()
        .trim().notEmpty()
        .toUpperCase()
        .custom(async (numero_auto, { req }) => {
            const exists = await Multa.findOne({ where: { numero_auto } });
            if (exists && exists.id != req.params.id) {
                throw new Error('Já existe uma multa com este número de auto');
            }
            return true;
        }),

    // Adicionar outras validações de update conforme necessário, 
    // focando em consistência se campos criticos forem alterados
];
