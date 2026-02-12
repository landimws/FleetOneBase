import { Op, Sequelize } from 'sequelize';
import Multa from '../models-sqlite/Multa.js';
import Veiculo from '../models-sqlite/Veiculo.js';
import Cliente from '../models-sqlite/Cliente.js';
import Debito from '../models-sqlite/Debito.js';
import { normalizeString } from '../utils/stringUtils.js';
import { FinancialCalculator } from '../domain/financial/FinancialCalculator.js';

class MultaService {


    // Analytics removido para MultaAnalyticsService.js


    /**
     * Valida regras de negócio complexas.
     */
    _validateRules(data, isUpdate = false, currentRecord = null) {
        // Obter valores de trabalho (Payload ou Atual)
        const vencimento = data.data_vencimento || (currentRecord ? currentRecord.data_vencimento : null);
        const pagamento = data.data_pagamento_orgao !== undefined ? data.data_pagamento_orgao : (currentRecord ? currentRecord.data_pagamento_orgao : null);
        const desconto = data.desconto_aplicado !== undefined ? data.desconto_aplicado : (currentRecord ? currentRecord.desconto_aplicado : 0);

        // Conversão segura para comparação de datas (String 'YYYY-MM-DD')
        const todayStr = new Date().toISOString().split('T')[0];

        // Regra Central: Desconto só é permitido se o pagamento ocorrer até o vencimento.
        if (desconto > 0 && vencimento) {
            if (pagamento) {
                // Cenário 1: Pagamento informado (Novo ou existente)
                // Se pagou DEPOIS do vencimento, não pode ter desconto.
                if (pagamento > vencimento) {
                    throw new Error(`Multa paga com atraso (${pagamento}) não permite desconto do vencimento (${vencimento}).`);
                }
            } else {
                // Cenário 2: Em aberto
                // Se hoje já passou do vencimento, não pode ter desconto.
                if (todayStr > vencimento) {
                    throw new Error('Multa vencida não permite desconto.');
                }
            }
        }

        // Regra: Não alterar desconto se já pago (já estava pago no banco)
        // Se estamos pagando AGORA (data.data_pagamento_orgao presente), permitimos definir o desconto (validado acima).
        // Mas se já estava pago ANTES, não deixamos mudar o desconto para garantir integridade histórica.
        const jaEstavaPago = currentRecord && currentRecord.data_pagamento_orgao;

        // Verifica se o usuário está removendo o pagamento (Estorno/Correção)
        // Se data.data_pagamento_orgao é explicitamente null, ele está estornando.
        const estaEstornando = data.data_pagamento_orgao === null;

        if (jaEstavaPago && !estaEstornando) {
            // Se tentar mudar desconto de algo q ja estava pago E NÃO está estornando
            if (data.desconto_aplicado !== undefined && data.desconto_aplicado !== currentRecord.desconto_aplicado) {
                // Exceção: Se o usuário estiver "reabrindo" o pagamento (mudando data de pagamento ou valor), talvez devesse permitir?
                // Mas por segurança, assumimos que registro histórico é imutável nessa via.
                throw new Error('Não é possível alterar desconto de multa já paga no órgão.');
            }
        }
    }

    /**
     * Cria uma nova multa.
     * @param {Object} data 
     * @returns {Object} Multa criada (JSON)
     */
    async create(data) {
        // Business Logic: Validar se já existe auto (embora o Schema já faça, double check é bom)
        // Aqui confiamos no Schema para validação básica.

        try {
            this._validateRules(data);

            // Populate search_text
            // Need to fetch vehicle model if not provided?
            // Strategy: Fetch vehicle model since we only assume placa is valid from validation.
            // But doing a query here? Yes necessary.
            let modelo = '';
            let nomeCliente = '';
            const veiculo = await Veiculo.findByPk(data.veiculo_id);
            if (veiculo) modelo = veiculo.modelo;

            if (data.cliente_id) {
                const cliente = await Cliente.findByPk(data.cliente_id);
                if (cliente) nomeCliente = cliente.nome;
            }

            const fullText = `${data.veiculo_id} ${modelo} ${nomeCliente} ${data.numero_auto || ''} ${data.renainf || ''}`;
            data.search_text = normalizeString(fullText);
            data.cliente_nome = nomeCliente; // Sync for legacy/search

            if (data.numero_auto) {
                data.numero_auto = data.numero_auto.toUpperCase();
            }

            const multa = await Multa.create(data);
            return multa.toJSON();
        } catch (error) {
            throw new Error(`Erro ao criar multa: ${error.message}`);
        }
    }

    /**
     * Busca uma multa por ID.
     * @param {number} id 
     * @returns {Object} Multa (JSON)
     */
    async getById(id) {
        const multa = await Multa.findByPk(id, {
            include: [
                { model: Veiculo, as: 'veiculo' },
                { model: Cliente, as: 'cliente' }
            ]
        });

        if (!multa) {
            throw new Error('Multa não encontrada');
        }

        return multa.toJSON();
    }

    /**
     * Lista todas as multas com filtros opcionais.
     * @param {Object} filters 
     * @returns {Array} Lista de multas
     */
    async list(filters = {}) {
        const where = {};
        const include = [
            { model: Veiculo, as: 'veiculo' },
            { model: Cliente, as: 'cliente' }
        ];

        // Filtros Diretos
        if (filters.veiculo_id) where.veiculo_id = { [Op.like]: `%${filters.veiculo_id}%` };
        if (filters.cliente_id) where.cliente_id = filters.cliente_id;
        if (filters.cliente_nome) where.cliente_nome = { [Op.like]: `%${filters.cliente_nome}%` };

        // Filtro por Modelo (Associação)
        if (filters.modelo) {
            include[0].where = { modelo: { [Op.like]: `%${filters.modelo}%` } };
        }

        // Filtro por Status
        if (filters.status) {
            const todayStrComp = new Date().toISOString().split('T')[0];
            if (filters.status === 'pago') {
                where.data_pagamento_orgao = { [Op.not]: null };
            } else if (filters.status === 'vencido') {
                where.data_pagamento_orgao = null;
                where.data_vencimento = { [Op.lt]: todayStrComp };
            } else if (filters.status === 'aberto') {
                where.data_pagamento_orgao = null;
                where.data_vencimento = { [Op.gte]: todayStrComp };
            }
        }

        // Filtros Rápidos (Workflow)
        if (filters.filtro_rapido) {
            const todayStrComp = new Date().toISOString().split('T')[0];

            switch (filters.filtro_rapido) {
                case 'falta_indicar':
                    where.foi_indicado = false;
                    where.tipo_responsavel = 'cliente'; // Apenas clientes precisam ser indicados
                    break;
                case 'falta_reconhecer':
                    where.reconheceu = false;
                    where.foi_indicado = true; // Só pode reconhecer se já foi indicado
                    break;
                case 'falta_lancar':
                    where.data_lancamento_carteira = null;
                    where.tipo_responsavel = 'cliente'; // Apenas clientes são cobrados na carteira
                    break;
                case 'pagas':
                    where.data_pagamento_orgao = { [Op.not]: null };
                    break;
                case 'vencidos':
                    where.data_pagamento_orgao = null;
                    where.data_vencimento = { [Op.lt]: todayStrComp };
                    break;
                case 'aberto':
                    where.data_pagamento_orgao = null;
                    where.data_vencimento = { [Op.gte]: todayStrComp };
                    break;
            }
        }

        // Smart Search (Busca Global)
        if (filters.search) {
            const term = normalizeString(filters.search);
            where.search_text = { [Op.like]: `%${term}%` };
        }

        // Filtro por Data (Intervalo ou Parcial)
        if (filters.data_inicio || filters.data_fim) {
            const campoData = filters.tipo_data === 'vencimento' ? 'data_vencimento' : 'data_infracao'; // Default infracao

            if (filters.data_inicio && filters.data_fim) {
                where[campoData] = { [Op.between]: [filters.data_inicio, filters.data_fim] };
            } else if (filters.data_inicio) {
                where[campoData] = { [Op.gte]: filters.data_inicio };
            } else if (filters.data_fim) {
                where[campoData] = { [Op.lte]: filters.data_fim };
            }
        }

        // Ordenação
        let order = [['data_infracao', 'DESC']]; // Default
        if (filters.sort_by) {
            const direction = filters.order === 'asc' ? 'ASC' : 'DESC';
            const allowedCols = ['veiculo_id', 'data_infracao', 'data_vencimento', 'valor_original', 'cliente_nome', 'cliente_id'];

            if (allowedCols.includes(filters.sort_by)) {
                order = [[filters.sort_by, direction]];
            } else if (filters.sort_by === 'responsavel') {
                order = [['tipo_responsavel', direction]];
            }
        }

        const multas = await Multa.findAll({
            where,
            include,
            order,
            raw: false,
            logging: console.log
        });

        return multas.map(m => m.toJSON());
    }

    /**
     * Atualiza uma multa.
     * @param {number} id 
     * @param {Object} data 
     * @returns {Object} Multa atualizada
     */
    async update(id, data) {
        const multa = await Multa.findByPk(id);
        if (!multa) {
            throw new Error('Multa não encontrada');
        }

        // Regra de Negócio: Se mudar o desconto, verificar se é permitido (placeholder)
        // Regra: Se mudar valor_original, recalcular dependentes (automático via virtual getter)

        // Update search_text if relevant fields change
        // Update search_text ALWAYS to ensure consistency with new strategy (including auto number)
        // Even if fields didn't change in payload, we might need to update the index if the logic changed.
        // Or simpler: Just ensure we have the latest values.

        // Fetch current values if not in payload
        const placa = data.veiculo_id || multa.veiculo_id;
        let modelo = '';
        const veiculo = await Veiculo.findByPk(placa);
        if (veiculo) modelo = veiculo.modelo;

        let nome = multa.cliente_nome || '';
        if (data.cliente_id !== undefined) {
            const cliente = await Cliente.findByPk(data.cliente_id);
            nome = cliente ? cliente.nome : '';
            data.cliente_nome = nome; // Sync legacy
        } else if (data.cliente_nome !== undefined) {
            nome = data.cliente_nome;
        }

        const auto = data.numero_auto !== undefined ? data.numero_auto : (multa.numero_auto || '');

        // Always update search_text
        const fullText = `${placa} ${modelo} ${nome} ${auto}`;
        data.search_text = normalizeString(fullText);

        if (data.numero_auto) {
            data.numero_auto = data.numero_auto.toUpperCase();
        }

        if (data.numero_auto) {
            data.numero_auto = data.numero_auto.toUpperCase();
        }

        this._validateRules(data, true, multa);

        await multa.update(data);
        return multa.toJSON();
    }

    /**
     * Exclui uma multa.
     * @param {number} id 
     */
    async delete(id) {
        const multa = await Multa.findByPk(id);
        if (!multa) {
            throw new Error('Multa não encontrada');
        }
        await multa.destroy();
    }

    /**
     * Lança a multa na carteira do cliente (Cria Débito).
     * @param {number} id ID da Multa
     * @param {Object} debitData Dados confirmados pelo usuário (valor, data, descricao, etc)
     */
    async lancarNaCarteira(id, debitData) {
        const multa = await Multa.findByPk(id);
        if (!multa) throw new Error('Multa não encontrada');

        // Auto-healing: Se estiver com data infalida, permitir relançar
        if (multa.data_lancamento_carteira && multa.data_lancamento_carteira !== 'Invalid date') {
            throw new Error('Esta multa já foi lançada na carteira anteriormente.');
        }

        // Validar Data do Lançamento
        if (!debitData.data || isNaN(new Date(debitData.data).getTime())) {
            throw new Error('Data de lançamento inválida.');
        }

        // Validar Cliente
        if (!debitData.cliente_nome) throw new Error('Cliente obrigatório para lançamento.');

        try {
            // 1. Criar Débito
            const novoDebito = await Debito.create({
                cliente_nome: debitData.cliente_nome,
                veiculo_placa: debitData.veiculo_placa || multa.veiculo_id,
                data: debitData.data,
                tipo: 'Multa',
                descricao: debitData.descricao,
                quantidade: 1,
                valor_unitario: debitData.valor_unitario, // Valor base sem taxa
                cobra_taxa_adm: debitData.cobra_taxa_adm,
                percentual_taxa: debitData.cobra_taxa_adm ? 15.0 : 0,
                valor_taxa: debitData.valor_taxa,
                valor_total: debitData.valor_total,
                observacao: `Integração Multas ID: ${id}. ${debitData.observacao || ''}`
            });

            // 2. Atualizar Multa
            multa.data_lancamento_carteira = debitData.data;
            multa.valor_lancado_carteira = debitData.valor_total;
            await multa.save();

            return { multa: multa.toJSON(), debito: novoDebito.toJSON() };

        } catch (error) {
            throw new Error('Erro ao lançar na carteira: ' + error.message);
        }
    }

    /**
     * Aplica desconto em uma multa.
     * @param {number} id 
     * @param {number} percentual (0, 20, 40)
     */
    async aplicarDesconto(id, percentual) {
        if (![0, 20, 40].includes(percentual)) {
            throw new Error('Percentual inválido. Use 0, 20 ou 40.');
        }

        const multa = await Multa.findByPk(id);
        if (!multa) {
            throw new Error('Multa não encontrada');
        }

        this._validateRules({ desconto_aplicado: percentual }, true, multa);

        multa.desconto_aplicado = percentual;
        await multa.save();
        return multa.toJSON();
    }
}

export default new MultaService();
