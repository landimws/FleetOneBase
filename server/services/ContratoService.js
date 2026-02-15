import { Op } from 'sequelize';

/**
 * Service para operações de Contratos
 * Gerencia lógica de negócio, processamento de variáveis e integrações
 */
class ContratoService {

    /**
     * Prepara dados completos de um contrato para renderização
     * @param {Object} models - Models do Sequelize
     * @param {number} contratoId - ID do contrato
     * @returns {Object} Dados completos do contrato
     */
    async prepararDadosContrato(models, contratoId) {
        const { Contrato, ContratoItem, Cliente, Veiculo, ConfiguracoesContrato, ItensContratoPadrao } = models;

        // Buscar contrato com relacionamentos
        const contrato = await Contrato.findByPk(contratoId);
        if (!contrato) {
            throw new Error('Contrato não encontrado');
        }

        // Buscar dados relacionados
        const cliente = await Cliente.findByPk(contrato.cliente_id);
        if (!cliente) {
            throw new Error('Cliente não encontrado');
        }

        const veiculo = await Veiculo.findByPk(contrato.veiculo_placa);
        if (!veiculo) {
            throw new Error('Veículo não encontrado');
        }

        const itens = await ContratoItem.findAll({
            where: { contrato_id: contratoId },
            order: [['id', 'ASC']]
        });

        const config = await ConfiguracoesContrato.findOne();

        return {
            contrato: contrato.toJSON(),
            cliente: cliente.toJSON(),
            veiculo: veiculo.toJSON(),
            itens: itens.map(i => i.toJSON()),
            config: config ? config.toJSON() : this._getDefaultConfig()
        };
    }

    /**
     * Processa todas as variáveis do template
     * @param {Object} dados - Dados completos do contrato
     * @returns {Object} Variáveis processadas
     */
    processarVariaveis(dados) {
        const { contrato, cliente, veiculo, itens, config } = dados;

        // Data formatada
        const hoje = new Date();
        const dataExtenso = this._formatarDataExtenso(hoje);

        // Variáveis do Cliente
        const variaveis = {
            // Empresa (assumindo dados da empresa - você pode buscar do config ou hardcode)
            EMPRESA_NOME: 'FLEET ONE LOCADORA',
            EMPRESA_CNPJ: '00.000.000/0001-00',
            EMPRESA_ENDERECO: 'Rua Exemplo, 123',
            EMPRESA_CIDADE: 'Cidade',
            EMPRESA_ESTADO: 'UF',
            EMPRESA_TELEFONE: '(00) 0000-0000',

            // Cliente
            CLIENTE_NOME: cliente.nome || '',
            CLIENTE_CPF: cliente.cpf || '',
            CLIENTE_RG: cliente.rg || '',
            CLIENTE_CNH: cliente.cnh || '',
            CLIENTE_ENDERECO: this._formatarEndereco(cliente),
            CLIENTE_CIDADE: cliente.cidade || '',
            CLIENTE_ESTADO: cliente.estado || '',
            CLIENTE_CEP: cliente.cep || '',
            CLIENTE_TELEFONE: cliente.telefone || '',
            CLIENTE_EMAIL: cliente.email || '',
            CLIENTE_DATA_NASCIMENTO: this._formatarData(cliente.data_nascimento),

            // Veículo
            VEICULO_MARCA: veiculo.marca || contrato.veiculo_marca || '',
            VEICULO_MODELO: veiculo.modelo || '',
            VEICULO_PLACA: veiculo.placa || '',
            VEICULO_COR: veiculo.cor || contrato.veiculo_cor || '',
            VEICULO_ANO: veiculo.ano || '',
            VEICULO_CHASSI: veiculo.chassi || '',
            VEICULO_RENAVAM: veiculo.renavam || '',
            VEICULO_COMBUSTIVEL: veiculo.combustivel || '',
            VEICULO_VALOR_FIPE: this._formatarMoeda(veiculo.valor_fipe || contrato.veiculo_valor_fipe || 0),

            // Contrato
            CONTRATO_NUMERO: contrato.numero_contrato || '',
            CONTRATO_DATA: this._formatarData(contrato.data_assinatura || hoje),
            CONTRATO_DATA_EXTENSO: dataExtenso,
            CONTRATO_DATA_INICIO: this._formatarData(contrato.data_inicio),
            CONTRATO_DATA_FIM: this._formatarData(contrato.data_fim),
            CONTRATO_VIGENCIA_DIAS: contrato.vigencia_dias || 30,

            // Valores Financeiros
            VALOR_CAUCAO: this._formatarMoeda(contrato.valor_caucao || 0),
            VALOR_CAUCAO_EXTENSO: this.numeroExtenso(contrato.valor_caucao || 0),
            CAUCAO_FORMA_PAGAMENTO: contrato.caucao_forma_pagamento || 'a_vista',
            CAUCAO_NUM_PARCELAS: contrato.caucao_num_parcelas || 1,
            CAUCAO_VALOR_PARCELA: this._formatarMoeda(contrato.caucao_valor_parcela || 0),

            // Itens do Contrato (tabela)
            ITENS_TABELA: this._gerarTabelaItens(itens),
            VALOR_TOTAL_ITENS: this._formatarMoeda(this._calcularTotalItens(itens)),

            // Condições
            DIA_PAGAMENTO: contrato.dia_pagamento || 'segunda-feira',
            KM_FRANQUIA: contrato.km_franquia || config.km_franquia_padrao || 100,
            VALOR_KM_EXCEDENTE: this._formatarMoeda(contrato.valor_km_excedente || config.valor_km_excedente_padrao || 0.5),
            VALOR_AVARIA: this._formatarMoeda(contrato.valor_avaria || config.valor_avaria_padrao || 0),

            // Taxas e Multas (da configuração)
            TAXA_ADMINISTRATIVA: this._formatarPercentual(config.taxa_administrativa || 0.15),
            MULTA_ATRASO: this._formatarPercentual(config.percentual_multa_atraso || 0.02),
            JUROS_MORA: this._formatarPercentual(config.percentual_juros_mora || 0.01),
            MULTA_RESCISAO: this._formatarPercentual(config.percentual_multa_rescisao || 0.10)
        };

        // Cláusula 4.2 dinâmica (à vista vs parcelada)
        variaveis.CLAUSULA_4_2 = this.gerarClausula42(
            contrato.caucao_forma_pagamento,
            contrato.valor_caucao,
            contrato.caucao_num_parcelas,
            contrato.caucao_valor_parcela
        );

        return variaveis;
    }

    /**
     * Gera texto da cláusula 4.2 (caução) baseado na forma de pagamento
     * @param {string} formaPagamento - 'a_vista' ou 'parcelada'
     * @param {number} valorCaucao - Valor total da caução
     * @param {number} numParcelas - Número de parcelas (se parcelada)
     * @param {number} valorParcela - Valor de cada parcela (se parcelada)
     * @returns {string} Texto da cláusula
     */
    gerarClausula42(formaPagamento, valorCaucao, numParcelas, valorParcela) {
        const valorFormatado = this._formatarMoeda(valorCaucao || 0);
        const valorExtenso = this.numeroExtenso(valorCaucao || 0);

        if (formaPagamento === 'a_vista') {
            return `4.2. A caução no valor de ${valorFormatado} (${valorExtenso}) será paga à vista no ato da assinatura deste contrato.`;
        } else {
            const parcelaFormatada = this._formatarMoeda(valorParcela || 0);
            return `4.2. A caução no valor de ${valorFormatado} (${valorExtenso}) será paga em ${numParcelas}x parcelas de ${parcelaFormatada}, com vencimento todo dia ${new Date().getDate()} de cada mês.`;
        }
    }

    /**
     * Converte número para extenso (simplificado para valores monetários)
     * @param {number} valor - Valor a ser convertido
     * @returns {string} Valor por extenso
     */
    numeroExtenso(valor) {
        if (!valor || valor === 0) return 'zero reais';

        const numeral = Math.floor(valor);
        const centavos = Math.round((valor - numeral) * 100);

        // Simplificação: Para MVP, usar biblioteca externa seria ideal
        // Por enquanto, retorna formato básico
        const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
        const especiais = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
        const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
        const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

        let resultado = '';

        // Implementação simplificada para valores até 999
        if (numeral >= 100) {
            const c = Math.floor(numeral / 100);
            resultado += centenas[c];
            if (numeral % 100 > 0) resultado += ' e ';
        }

        const resto = numeral % 100;
        if (resto >= 10 && resto < 20) {
            resultado += especiais[resto - 10];
        } else {
            const d = Math.floor(resto / 10);
            const u = resto % 10;
            if (d > 0) resultado += dezenas[d];
            if (d > 0 && u > 0) resultado += ' e ';
            if (u > 0) resultado += unidades[u];
        }

        resultado += numeral === 1 ? ' real' : ' reais';

        if (centavos > 0) {
            resultado += ` e ${centavos} centavo${centavos > 1 ? 's' : ''}`;
        }

        return resultado;
    }

    /**
     * Calcula a semana de cobrança baseada na data de fechamento
     * Lógica: Se fecha na quarta, cobra na segunda da próxima semana
     * @param {Date} dataFechamento - Data de fechamento do contrato
     * @returns {Date} Data da próxima segunda-feira
     */
    calcularSemanaCobranca(dataFechamento) {
        const data = new Date(dataFechamento);
        const diaDaSemana = data.getDay(); // 0 = domingo, 1 = segunda, ..., 6 = sábado

        // Calcular dias até próxima segunda-feira
        let diasAteSegunda;
        if (diaDaSemana === 0) { // Domingo
            diasAteSegunda = 1;
        } else if (diaDaSemana === 1) { // Segunda
            diasAteSegunda = 7; // Próxima segunda
        } else { // Terça a Sábado
            diasAteSegunda = 8 - diaDaSemana;
        }

        const proximaSegunda = new Date(data);
        proximaSegunda.setDate(data.getDate() + diasAteSegunda);
        return proximaSegunda;
    }

    /**
     * Cria registro na LinhaSemana ao fechar contrato
     * @param {Object} models - Models do Sequelize
     * @param {Object} contrato - Dados do contrato
     * @param {Date} semana - Data da semana de cobrança
     * @returns {Object} LinhaSemana criada
     */
    async criarLinhaSemana(models, contrato, semana) {
        const { LinhaSemana, Semana } = models;

        // Buscar ou criar a Semana
        const [semanaRegistro] = await Semana.findOrCreate({
            where: {
                data_inicio: semana
            },
            defaults: {
                data_inicio: semana,
                encerrada: false
            }
        });

        // Calcular valor semanal (soma dos itens do contrato)
        const valorSemanal = contrato.itens?.reduce((total, item) => total + (item.valor_total || 0), 0) || 0;

        // Criar LinhaSemana
        const linhaSemana = await LinhaSemana.create({
            SemanaId: semanaRegistro.id,
            placa: contrato.veiculo_placa,
            cliente: contrato.cliente_nome || '',
            cliente_id: contrato.cliente_id,
            valor_fechado: valorSemanal,
            valor_semanal: valorSemanal,
            observacao: `Contrato ${contrato.numero_contrato}`
        });

        return linhaSemana;
    }

    /**
     * Registra caução na carteira (Crédito/Débito)
     * @param {Object} models - Models do Sequelize
     * @param {Object} contrato - Dados do contrato
     * @returns {Object} Registro criado
     */
    async registrarCaucaoCarteira(models, contrato) {
        const { Credito, Debito } = models;

        if (contrato.caucao_forma_pagamento === 'a_vista') {
            // Caução recebida à vista = Crédito
            const credito = await Credito.create({
                cliente_id: contrato.cliente_id,
                cliente_nome: contrato.cliente_nome || '',
                data: new Date(),
                tipo: 'Caução Recebida',
                descricao: `Caução do contrato ${contrato.numero_contrato}`,
                valor: contrato.valor_caucao,
                observacao: 'À vista'
            });
            return { tipo: 'credito', registro: credito };
        } else {
            // Caução parcelada = Débito (a receber)
            const debito = await Debito.create({
                cliente_id: contrato.cliente_id,
                cliente_nome: contrato.cliente_nome || '',
                veiculo_placa: contrato.veiculo_placa,
                data: new Date(),
                tipo: 'Caução a Receber',
                descricao: `Caução parcelada do contrato ${contrato.numero_contrato} (${contrato.caucao_num_parcelas}x)`,
                quantidade: contrato.caucao_num_parcelas,
                valor_unitario: contrato.caucao_valor_parcela,
                valor_total: contrato.valor_caucao,
                observacao: 'Parcelada'
            });
            return { tipo: 'debito', registro: debito };
        }
    }

    /**
     * Processa diretivas condicionais no HTML (@if)
     * @param {string} html - HTML com diretivas
     * @param {Object} dados - Dados para avaliação
     * @returns {string} HTML processado
     */
    processarDiretivasCondicionais(html, dados) {
        // Regex para encontrar @if(condicao) ... @endif
        const regexIf = /@if\((.*?)\)([\s\S]*?)@endif/g;

        return html.replace(regexIf, (match, condicao, conteudo) => {
            try {
                // Substituir variáveis na condição
                const condicaoProcessada = condicao.replace(/(\w+)/g, (_, varName) => {
                    return dados[varName] !== undefined ? JSON.stringify(dados[varName]) : 'undefined';
                });

                // Avaliar condição (CUIDADO: eval é perigoso em produção, considere alternativa)
                const resultado = eval(condicaoProcessada);
                return resultado ? conteudo : '';
            } catch (error) {
                console.error('Erro ao processar diretiva @if:', error);
                return match; // Retorna original se erro
            }
        });
    }

    /**
     * Substitui variáveis no HTML ({{VARIAVEL}})
     * @param {string} html - HTML com variáveis
     * @param {Object} variaveis - Objeto com valores das variáveis
     * @returns {string} HTML com variáveis substituídas
     */
    substituirVariaveis(html, variaveis) {
        return html.replace(/\{\{([A-Z_0-9]+)\}\}/g, (match, nomeVariavel) => {
            return variaveis[nomeVariavel] !== undefined ? variaveis[nomeVariavel] : match;
        });
    }

    // ==================== MÉTODOS AUXILIARES ====================

    _getDefaultConfig() {
        return {
            taxa_administrativa: 0.15,
            percentual_multa_atraso: 0.02,
            percentual_juros_mora: 0.01,
            percentual_multa_rescisao: 0.10,
            vigencia_padrao_dias: 30,
            km_franquia_padrao: 100,
            valor_km_excedente_padrao: 0.5,
            valor_avaria_padrao: 0
        };
    }

    _formatarData(data) {
        if (!data) return '';
        const d = new Date(data);
        return d.toLocaleDateString('pt-BR');
    }

    _formatarDataExtenso(data) {
        const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
            'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
        const d = new Date(data);
        return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
    }

    _formatarMoeda(valor) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(valor || 0);
    }

    _formatarPercentual(valor) {
        return `${(valor * 100).toFixed(0)}%`;
    }

    _formatarEndereco(cliente) {
        const partes = [
            cliente.logradouro,
            cliente.numero,
            cliente.bairro
        ].filter(Boolean);
        return partes.join(', ');
    }

    _gerarTabelaItens(itens) {
        if (!itens || itens.length === 0) {
            return '<tr><td colspan="4">Nenhum item</td></tr>';
        }

        return itens.map((item, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${item.nome || item.descricao || ''}</td>
                <td>${item.quantidade || 1}</td>
                <td>${this._formatarMoeda(item.valor_total || 0)}</td>
            </tr>
        `).join('');
    }

    _calcularTotalItens(itens) {
        return itens.reduce((total, item) => total + (item.valor_total || 0), 0);
    }
}

export default new ContratoService();
