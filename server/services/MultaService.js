import { Op } from 'sequelize';
import { normalizeString } from '../utils/stringUtils.js';

class MultaService {

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

        const jaEstavaPago = currentRecord && currentRecord.data_pagamento_orgao;
        const estaEstornando = data.data_pagamento_orgao === null;

        if (jaEstavaPago && !estaEstornando) {
            if (data.desconto_aplicado !== undefined && data.desconto_aplicado !== currentRecord.desconto_aplicado) {
                throw new Error('Não é possível alterar desconto de multa já paga no órgão.');
            }
        }
    }

    /**
     * Cria uma nova multa.
     * @param {Object} models
     * @param {Object} data 
     * @returns {Object} Multa criada (JSON)
     */
    async create(models, data) {
        const { Multa, Veiculo, Cliente } = models;

        try {
            this._validateRules(data);

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
            data.cliente_nome = nomeCliente;

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
     * @param {Object} models
     * @param {number} id 
     * @returns {Object} Multa (JSON)
     */
    async getById(models, id) {
        const { Multa, Veiculo, Cliente } = models;

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
     * @param {Object} models
     * @param {Object} filters 
     * @returns {Array} Lista de multas
     */
    async list(models, filters = {}) {
        const { Multa, Veiculo, Cliente } = models;

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

        // Filtros Rápidos
        if (filters.filtro_rapido) {
            const todayStrComp = new Date().toISOString().split('T')[0];

            switch (filters.filtro_rapido) {
                case 'falta_indicar':
                    where.foi_indicado = false;
                    where.tipo_responsavel = 'cliente';
                    break;
                case 'falta_reconhecer':
                    where.reconheceu = false;
                    where.foi_indicado = true;
                    break;
                case 'falta_lancar':
                    where.data_lancamento_carteira = null;
                    where.tipo_responsavel = 'cliente';
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

        // Smart Search
        if (filters.search) {
            const term = normalizeString(filters.search);
            where.search_text = { [Op.like]: `%${term}%` };
        }

        // Filtro por Data
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
        let order = [['data_infracao', 'DESC']];
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
            raw: false
        });

        return multas.map(m => m.toJSON());
    }

    /**
     * Atualiza uma multa.
     * @param {Object} models
     * @param {number} id 
     * @param {Object} data 
     * @returns {Object} Multa atualizada
     */
    async update(models, id, data) {
        const { Multa, Veiculo, Cliente } = models;

        const multa = await Multa.findByPk(id);
        if (!multa) {
            throw new Error('Multa não encontrada');
        }

        const placa = data.veiculo_id || multa.veiculo_id;
        let modelo = '';
        const veiculo = await Veiculo.findByPk(placa);
        if (veiculo) modelo = veiculo.modelo;

        let nome = multa.cliente_nome || '';
        if (data.cliente_id !== undefined) {
            const cliente = await Cliente.findByPk(data.cliente_id);
            nome = cliente ? cliente.nome : '';
            data.cliente_nome = nome;
        } else if (data.cliente_nome !== undefined) {
            nome = data.cliente_nome;
        }

        const auto = data.numero_auto !== undefined ? data.numero_auto : (multa.numero_auto || '');

        const fullText = `${placa} ${modelo} ${nome} ${auto}`;
        data.search_text = normalizeString(fullText);

        if (data.numero_auto) {
            data.numero_auto = data.numero_auto.toUpperCase();
        }

        this._validateRules(data, true, multa);

        await multa.update(data);
        return multa.toJSON();
    }

    /**
     * Exclui uma multa.
     * @param {Object} models
     * @param {number} id 
     */
    async delete(models, id) {
        const { Multa } = models;
        const multa = await Multa.findByPk(id);
        if (!multa) {
            throw new Error('Multa não encontrada');
        }
        await multa.destroy();
    }

    /**
     * Lança a multa na carteira do cliente (Cria Débito).
     * @param {Object} models
     * @param {number} id ID da Multa
     * @param {Object} debitData Dados confirmados pelo usuário
     */
    async lancarNaCarteira(models, id, debitData) {
        const { Multa, Debito } = models;

        const multa = await Multa.findByPk(id);
        if (!multa) throw new Error('Multa não encontrada');

        if (multa.data_lancamento_carteira && multa.data_lancamento_carteira !== 'Invalid date') {
            throw new Error('Esta multa já foi lançada na carteira anteriormente.');
        }

        if (!debitData.data || isNaN(new Date(debitData.data).getTime())) {
            throw new Error('Data de lançamento inválida.');
        }

        if (!debitData.cliente_nome) throw new Error('Cliente obrigatório para lançamento.');

        try {
            // 1. Criar Débito
            const novoDebito = await Debito.create({
                cliente_id: debitData.cliente_id || multa.cliente_id, // Ensure binding
                cliente_nome: debitData.cliente_nome,
                veiculo_placa: debitData.veiculo_placa || multa.veiculo_id,
                data: debitData.data,
                tipo: 'Multa',
                descricao: debitData.descricao,
                quantidade: 1,
                valor_unitario: debitData.valor_unitario,
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
     * @param {Object} models
     * @param {number} id 
     * @param {number} percentual (0, 20, 40)
     */
    async aplicarDesconto(models, id, percentual) {
        const { Multa } = models;

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
