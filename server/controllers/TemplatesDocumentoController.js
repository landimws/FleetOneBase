import DOMPurify from 'isomorphic-dompurify';

/**
 * Controller para Templates de Documento (Editor)
 */
class TemplatesDocumentoController {

    /**
     * Lista todos os templates
     */
    async list(req, res) {
        try {
            const { TemplatesDocumento } = req.models;
            const { tipo, ativo } = req.query;

            const where = {};
            if (tipo) where.tipo = tipo;
            if (ativo !== undefined) where.ativo = ativo === 'true';

            const templates = await TemplatesDocumento.findAll({
                where,
                order: [['createdAt', 'DESC']]
            });

            res.json(templates);
        } catch (error) {
            console.error('Erro ao listar templates:', error);
            res.status(500).json({ error: 'Erro ao listar templates' });
        }
    }

    /**
     * Busca template por ID com variáveis disponíveis
     */
    async getById(req, res) {
        try {
            const { TemplatesDocumento } = req.models;
            const template = await TemplatesDocumento.findByPk(req.params.id);

            if (!template) {
                return res.status(404).json({ error: 'Template não encontrado' });
            }

            // Parse JSON de variáveis e exemplo se existir
            const data = template.toJSON();
            if (data.variaveis_disponiveis) {
                try {
                    data.variaveis_disponiveis = JSON.parse(data.variaveis_disponiveis);
                } catch (e) {
                    console.warn('Erro ao fazer parse de variaveis_disponiveis');
                }
            }
            if (data.exemplo_dados) {
                try {
                    data.exemplo_dados = JSON.parse(data.exemplo_dados);
                } catch (e) {
                    console.warn('Erro ao fazer parse de exemplo_dados');
                }
            }

            res.json(data);
        } catch (error) {
            console.error('Erro ao buscar template:', error);
            res.status(500).json({ error: 'Erro ao buscar template' });
        }
    }

    /**
     * Cria novo template (superadmin)
     */
    async create(req, res) {
        try {
            const { TemplatesDocumento } = req.models;

            // Validações
            if (!req.body.nome || !req.body.tipo || !req.body.html_completo) {
                return res.status(400).json({ error: 'Nome, tipo e HTML são obrigatórios' });
            }

            // Sanitizar HTML
            const htmlSanitizado = DOMPurify.sanitize(req.body.html_completo);

            const template = await TemplatesDocumento.create({
                ...req.body,
                html_completo: htmlSanitizado,
                versao: 1,
                criado_por: req.user?.id || null
            });

            res.status(201).json(template);
        } catch (error) {
            console.error('Erro ao criar template:', error);
            res.status(500).json({ error: 'Erro ao criar template' });
        }
    }

    /**
     * Atualiza template (cria versão no histórico)
     */
    async update(req, res) {
        const { sequelize, TemplatesDocumento, TemplatesDocumentoHistorico } = req.models;
        const transaction = await sequelize.transaction();

        try {
            const template = await TemplatesDocumento.findByPk(req.params.id);

            if (!template) {
                await transaction.rollback();
                return res.status(404).json({ error: 'Template não encontrado' });
            }

            // 1. Salvar versão atual no histórico
            await TemplatesDocumentoHistorico.create({
                template_id: template.id,
                versao: template.versao,
                html_completo: template.html_completo,
                css_customizado: template.css_customizado,
                alterado_por: req.user?.id || null,
                motivo_alteracao: req.body.motivo_alteracao || 'Atualização do template'
            }, { transaction });

            // 2. Atualizar template (incrementar versão)
            const htmlSanitizado = req.body.html_completo
                ? DOMPurify.sanitize(req.body.html_completo)
                : template.html_completo;

            await template.update({
                ...req.body,
                html_completo: htmlSanitizado,
                versao: template.versao + 1,
                atualizado_por: req.user?.id || null
            }, { transaction });

            await transaction.commit();
            res.json(template);

        } catch (error) {
            await transaction.rollback();
            console.error('Erro ao atualizar template:', error);
            res.status(500).json({ error: 'Erro ao atualizar template' });
        }
    }

    /**
     * Desativa template
     */
    async remove(req, res) {
        try {
            const { TemplatesDocumento } = req.models;
            const template = await TemplatesDocumento.findByPk(req.params.id);

            if (!template) {
                return res.status(404).json({ error: 'Template não encontrado' });
            }

            await template.update({ ativo: false });
            res.status(204).send();
        } catch (error) {
            console.error('Erro ao remover template:', error);
            res.status(500).json({ error: 'Erro ao remover template' });
        }
    }

    /**
     * Lista histórico de versões
     */
    async getHistorico(req, res) {
        try {
            const { TemplatesDocumentoHistorico } = req.models;

            const historico = await TemplatesDocumentoHistorico.findAll({
                where: { template_id: req.params.id },
                order: [['versao', 'DESC']]
            });

            res.json(historico);
        } catch (error) {
            console.error('Erro ao buscar histórico:', error);
            res.status(500).json({ error: 'Erro ao buscar histórico' });
        }
    }

    /**
     * Restaura versão anterior
     */
    async restaurarVersao(req, res) {
        const { sequelize, TemplatesDocumento, TemplatesDocumentoHistorico } = req.models;
        const transaction = await sequelize.transaction();

        try {
            const { versao } = req.params;

            const versaoAnterior = await TemplatesDocumentoHistorico.findOne({
                where: {
                    template_id: req.params.id,
                    versao: versao
                }
            });

            if (!versaoAnterior) {
                await transaction.rollback();
                return res.status(404).json({ error: 'Versão não encontrada' });
            }

            const template = await TemplatesDocumento.findByPk(req.params.id);

            // Salvar versão atual antes de restaurar
            await TemplatesDocumentoHistorico.create({
                template_id: template.id,
                versao: template.versao,
                html_completo: template.html_completo,
                css_customizado: template.css_customizado,
                alterado_por: req.user?.id || null,
                motivo_alteracao: `Antes de restaurar para versão ${versao}`
            }, { transaction });

            // Restaurar
            await template.update({
                html_completo: versaoAnterior.html_completo,
                css_customizado: versaoAnterior.css_customizado,
                versao: template.versao + 1
            }, { transaction });

            await transaction.commit();
            res.json({ message: `Versão ${versao} restaurada com sucesso`, template });

        } catch (error) {
            await transaction.rollback();
            console.error('Erro ao restaurar versão:', error);
            res.status(500).json({ error: 'Erro ao restaurar versão' });
        }
    }

    /**
     * Preview do template com dados de exemplo
     */
    async preview(req, res) {
        try {
            const { TemplatesDocumento } = req.models;
            const template = await TemplatesDocumento.findByPk(req.params.id);

            if (!template) {
                return res.status(404).json({ error: 'Template não encontrado' });
            }

            // Usar dados de exemplo do template ou do body
            let dadosExemplo = req.body.exemplo_dados || {};
            if (template.exemplo_dados) {
                try {
                    dadosExemplo = JSON.parse(template.exemplo_dados);
                } catch (e) {
                    console.warn('Erro ao fazer parse de exemplo_dados');
                }
            }

            // Processar template
            const ContratoService = (await import('../services/ContratoService.js')).default;
            let html = ContratoService.processarDiretivasCondicionais(template.html_completo, dadosExemplo);
            html = ContratoService.substituirVariaveis(html, dadosExemplo);

            res.setHeader('Content-Type', 'text/html');
            res.send(html);

        } catch (error) {
            console.error('Erro ao gerar preview:', error);
            res.status(500).json({ error: 'Erro ao gerar preview' });
        }
    }

    /**
     * Valida HTML e variáveis do template
     */
    async validar(req, res) {
        try {
            const { html_completo } = req.body;

            if (!html_completo) {
                return res.status(400).json({ error: 'HTML é obrigatório para validação' });
            }

            const erros = [];
            const avisos = [];

            // 1. Validar HTML básico
            const htmlSanitizado = DOMPurify.sanitize(html_completo);
            if (htmlSanitizado !== html_completo) {
                avisos.push('HTML foi sanitizado. Alguns elementos podem ter sido removidos por segurança.');
            }

            // 2. Encontrar variáveis usadas ({{VARIAVEL}})
            const variaveisEncontradas = [...html_completo.matchAll(/\{\{([A-Z_0-9]+)\}\}/g)].map(m => m[1]);
            const variaveisUnicas = [...new Set(variaveisEncontradas)];

            // 3. Verificar diretivas @if
            const diretivasIf = [...html_completo.matchAll(/@if\((.*?)\)/g)];
            for (const dir of diretivasIf) {
                const condicao = dir[1];
                if (!condicao || condicao.trim() === '') {
                    erros.push(`Diretiva @if vazia encontrada`);
                }
            }

            res.json({
                valido: erros.length === 0,
                erros,
                avisos,
                variaveis_encontradas: variaveisUnicas,
                total_variaveis: variaveisUnicas.length
            });

        } catch (error) {
            console.error('Erro ao validar template:', error);
            res.status(500).json({ error: 'Erro ao validar template' });
        }
    }
}

export default new TemplatesDocumentoController();
