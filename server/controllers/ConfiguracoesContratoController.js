/**
 * Controller para Configurações de Contrato
 */
class ConfiguracoesContratoController {

    /**
     * Busca configurações ativas
     */
    async get(req, res) {
        try {
            const { ConfiguracoesContrato } = req.models;

            let config = await ConfiguracoesContrato.findOne();

            // Se não existir, criar com valores padrão
            if (!config) {
                config = await ConfiguracoesContrato.create({
                    taxa_administrativa: 0.15,
                    taxa_retorno: 0,
                    taxa_limpeza_basica: 0,
                    taxa_limpeza_especial: 0,
                    percentual_multa_atraso: 0.02,
                    percentual_juros_mora: 0.01,
                    percentual_multa_rescisao: 0.10,
                    multa_arrependimento: 0,
                    multa_km_nao_revisao: 0,
                    vigencia_padrao_dias: 30,
                    km_franquia_padrao: 100,
                    valor_km_excedente_padrao: 0.5,
                    valor_avaria_padrao: 0
                });
            }

            res.json(config);
        } catch (error) {
            console.error('Erro ao buscar configurações:', error);
            res.status(500).json({ error: 'Erro ao buscar configurações' });
        }
    }

    /**
     * Atualiza configurações (admin)
     */
    async update(req, res) {
        try {
            const { ConfiguracoesContrato } = req.models;

            let config = await ConfiguracoesContrato.findOne();

            if (!config) {
                // Criar se não existir
                config = await ConfiguracoesContrato.create(req.body);
            } else {
                // Atualizar
                await config.update(req.body);
            }

            res.json(config);
        } catch (error) {
            console.error('Erro ao atualizar configurações:', error);
            res.status(500).json({ error: 'Erro ao atualizar configurações' });
        }
    }
}

export default new ConfiguracoesContratoController();
