import ContratoService from '../services/ContratoService.js';
import ContratoWebRenderer from '../services/ContratoWebRenderer.js';
import ContratoPDFRenderer from '../services/ContratoPDFRenderer.js';
import { Op } from 'sequelize';

/**
 * Controller para gerenciamento de Contratos
 */
class ContratosController {

    /**
     * Lista todos os contratos com filtros
     */
    async list(req, res) {
        try {
            const { Contrato, Cliente, Veiculo } = req.models;
            const { cliente_id, veiculo_placa, status, data_inicio, data_fim } = req.query;

            const where = {};
            if (cliente_id) where.cliente_id = cliente_id;
            if (veiculo_placa) where.veiculo_placa = veiculo_placa;
            if (status) where.status = status;
            if (data_inicio) where.data_inicio = { [Op.gte]: data_inicio };
            if (data_fim) where.data_fim = { [Op.lte]: data_fim };

            const contratos = await Contrato.findAll({
                where,
                order: [['createdAt', 'DESC']]
            });

            res.json(contratos);
        } catch (error) {
            console.error('Erro ao listar contratos:', error);
            res.status(500).json({ error: 'Erro ao listar contratos' });
        }
    }

    /**
     * Busca contrato por ID
     */
    async getById(req, res) {
        try {
            const { Contrato, ContratoItem } = req.models;
            const contrato = await Contrato.findByPk(req.params.id);

            if (!contrato) {
                return res.status(404).json({ error: 'Contrato não encontrado' });
            }

            const itens = await ContratoItem.findAll({
                where: { contrato_id: contrato.id }
            });

            res.json({ ...contrato.toJSON(), itens });
        } catch (error) {
            console.error('Erro ao buscar contrato:', error);
            res.status(500).json({ error: 'Erro ao buscar contrato' });
        }
    }

    /**
     * Cria novo contrato
     */
    async create(req, res) {
        const { sequelize, Contrato, ContratoItem, Cliente, Veiculo } = req.models;
        const transaction = await sequelize.transaction();

        try {
            // 1. Validações
            const cliente = await Cliente.findByPk(req.body.cliente_id);
            if (!cliente) {
                await transaction.rollback();
                return res.status(400).json({ error: 'Cliente não encontrado' });
            }

            const veiculo = await Veiculo.findByPk(req.body.veiculo_placa);
            if (!veiculo) {
                await transaction.rollback();
                return res.status(400).json({ error: 'Veículo não encontrado' });
            }

            // 2. Gerar número do contrato
            const ultimos = await Contrato.findAll({
                order: [['id', 'DESC']],
                limit: 1
            });
            const proximoNumero = ultimos.length > 0 ? ultimos[0].id + 1 : 1;
            const anoAtual = new Date().getFullYear();
            const numeroContrato = `CONT-${anoAtual}-${String(proximoNumero).padStart(4, '0')}`;

            // 3. Criar contrato (snapshot do veículo)
            const contrato = await Contrato.create({
                ...req.body,
                numero_contrato: numeroContrato,
                veiculo_marca: veiculo.marca,
                veiculo_cor: veiculo.cor,
                veiculo_valor_fipe: veiculo.valor_fipe,
                status: 'ativo'
            }, { transaction });

            // 4. Criar itens do contrato
            if (req.body.itens && req.body.itens.length > 0) {
                for (const item of req.body.itens) {
                    await ContratoItem.create({
                        contrato_id: contrato.id,
                        ...item
                    }, { transaction });
                }
            }

            // 5. Integração LinhaSemana (se data_assinatura definida)
            if (req.body.data_assinatura) {
                const semanaCobranca = ContratoService.calcularSemanaCobranca(req.body.data_assinatura);
                await ContratoService.criarLinhaSemana(req.models, {
                    ...contrato.toJSON(),
                    itens: req.body.itens,
                    cliente_nome: cliente.nome
                }, semanaCobranca);
            }

            // 6. Integração Carteira (caução)
            if (req.body.valor_caucao && req.body.valor_caucao > 0) {
                await ContratoService.registrarCaucaoCarteira(req.models, {
                    ...contrato.toJSON(),
                    cliente_nome: cliente.nome
                });
            }

            await transaction.commit();
            res.status(201).json(contrato);

        } catch (error) {
            await transaction.rollback();
            console.error('Erro ao criar contrato:', error);
            res.status(500).json({ error: 'Erro ao criar contrato: ' + error.message });
        }
    }

    /**
     * Atualiza contrato existente
     */
    async update(req, res) {
        const { sequelize, Contrato } = req.models;
        const transaction = await sequelize.transaction();

        try {
            const contrato = await Contrato.findByPk(req.params.id);
            if (!contrato) {
                await transaction.rollback();
                return res.status(404).json({ error: 'Contrato não encontrado' });
            }

            await contrato.update(req.body, { transaction });
            await transaction.commit();

            res.json(contrato);
        } catch (error) {
            await transaction.rollback();
            console.error('Erro ao atualizar contrato:', error);
            res.status(500).json({ error: 'Erro ao atualizar contrato' });
        }
    }

    /**
     * Remove/cancela contrato
     */
    async remove(req, res) {
        try {
            const { Contrato } = req.models;
            const contrato = await Contrato.findByPk(req.params.id);

            if (!contrato) {
                return res.status(404).json({ error: 'Contrato não encontrado' });
            }

            // Soft delete: mudar status ao invés de deletar
            await contrato.update({ status: 'cancelado' });

            res.status(204).send();
        } catch (error) {
            console.error('Erro ao remover contrato:', error);
            res.status(500).json({ error: 'Erro ao remover contrato' });
        }
    }

    /**
     * Retorna dados processados do contrato (JSON)
     */
    async getDados(req, res) {
        try {
            const dados = await ContratoService.prepararDadosContrato(req.models, req.params.id);
            const variaveis = ContratoService.processarVariaveis(dados);

            res.json({ dados, variaveis });
        } catch (error) {
            console.error('Erro ao processar dados:', error);
            res.status(500).json({ error: 'Erro ao processar dados' });
        }
    }

    /**
     * Visualiza contrato em HTML (web)
     */
    async visualizarWeb(req, res) {
        try {
            const { TemplatesDocumento } = req.models;

            // Buscar template ativo (tipo 'contrato')
            const template = await TemplatesDocumento.findOne({
                where: { tipo: 'contrato', ativo: true }
            });

            if (!template) {
                return res.status(404).json({ error: 'Template de contrato não encontrado' });
            }

            const html = await ContratoWebRenderer.render(
                req.models,
                req.params.id,
                template.html_completo
            );

            res.setHeader('Content-Type', 'text/html');
            res.send(html);
        } catch (error) {
            console.error('Erro ao visualizar contrato:', error);
            res.status(500).json({ error: 'Erro ao visualizar contrato' });
        }
    }

    /**
     * Gera e retorna PDF do contrato
     */
    async gerarPDF(req, res) {
        try {
            const { TemplatesDocumento } = req.models;

            const template = await TemplatesDocumento.findOne({
                where: { tipo: 'contrato', ativo: true }
            });

            if (!template) {
                return res.status(404).json({ error: 'Template de contrato não encontrado' });
            }

            const pdfBuffer = await ContratoPDFRenderer.render(
                req.models,
                req.params.id,
                template.html_completo
            );

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=contrato-${req.params.id}.pdf`);
            res.send(pdfBuffer);
        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            res.status(500).json({ error: 'Erro ao gerar PDF' });
        }
    }

    /**
     * Encerra contrato e faz devolução de caução
     */
    async encerrar(req, res) {
        const { sequelize, Contrato, Credito, Debito } = req.models;
        const transaction = await sequelize.transaction();

        try {
            const contrato = await Contrato.findByPk(req.params.id);
            if (!contrato) {
                await transaction.rollback();
                return res.status(404).json({ error: 'Contrato não encontrado' });
            }

            // 1. Calcular débitos pendentes (se houver)
            const { debitos_pendentes = 0 } = req.body;

            // 2. Devolver caução (ou abater débitos)
            const valorDevolucao = Math.max(0, contrato.valor_caucao - debitos_pendentes);

            if (valorDevolucao > 0) {
                await Credito.create({
                    cliente_id: contrato.cliente_id,
                    cliente_nome: req.body.cliente_nome || '',
                    data: new Date(),
                    tipo: 'Devolução de Caução',
                    descricao: `Devolução de caução do contrato ${contrato.numero_contrato}`,
                    valor: valorDevolucao,
                    observacao: debitos_pendentes > 0 ? `Abatido débitos: ${debitos_pendentes}` : 'Integral'
                }, { transaction });
            }

            // 3. Atualizar status do contrato
            await contrato.update({
                status: 'encerrado',
                data_fim: new Date()
            }, { transaction });

            await transaction.commit();
            res.json({ message: 'Contrato encerrado com sucesso', valor_devolvido: valorDevolucao });

        } catch (error) {
            await transaction.rollback();
            console.error('Erro ao encerrar contrato:', error);
            res.status(500).json({ error: 'Erro ao encerrar contrato' });
        }
    }
}

export default new ContratosController();
