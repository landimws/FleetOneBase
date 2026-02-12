// ========================================
import { RentalCalculator } from '../domain/calculators/RentalCalculator.js';
import { FinancialCalculator } from '../domain/financial/FinancialCalculator.js';

// SERVIÇO DE LÓGICA DE NEGÓCIO - LINHA SEMANA
// ========================================

/**
 * Valida os dados de uma linha antes de salvar
 * @param {Object} dados - Dados da linha
 * @returns {Array} - Array de erros (vazio se válido)
 */
export function validarLinha(dados) {
    const erros = [];

    // Validação: Status Alugado
    if (dados.status_veiculo === 'alugado') {
        if (!dados.cliente || dados.cliente.trim() === '') {
            erros.push('Cliente é obrigatório para veículos alugados');
        }
    }

    // Validação: Status Manutenção
    if (dados.status_veiculo === 'manutencao') {
        if (!dados.local_manutencao || dados.local_manutencao.trim() === '') {
            erros.push('Local/Oficina é obrigatório para veículos em manutenção');
        }
    }

    // Validação: Conciliação
    if (dados.CO) {
        if (!dados.recebido || dados.recebido <= 0) {
            erros.push('Conciliação exige valor recebido maior que zero');
        }

        if (!dados.data_pagamento) {
            erros.push('Data de pagamento é obrigatória para conciliação');
        }

        // Conciliação marca boleto automaticamente
        dados.BO = true;
    }

    return erros;
}

/**
 * Normaliza os dados baseado no status do veículo
 * @param {Object} dados - Dados da linha
 * @returns {Object} - Dados normalizados
 */
export function normalizarDados(dados) {
    const normalizado = { ...dados };

    // Se disponível: zerar tudo
    // Se disponível: zerar apenas identificação e financeiros, manter DIAS
    if (normalizado.status_veiculo === 'disponivel') {
        normalizado.cliente = '';
        normalizado.cliente_id = null;
        normalizado.local_manutencao = null;
        normalizado.previsao_retorno = null;
        // normalizado.dias = 0; // [FIX] Manter dias para histórico
        // normalizado.dias_selecionados = []; // [FIX] Manter histórico
        normalizado.diaria = 0;
        normalizado.semana = 0;
        normalizado.p_premium = 0;
        normalizado.protecao = 0;
        normalizado.acordo = 0;
        normalizado.ta_boleto = 0;
        normalizado.desconto = 0;
        normalizado.previsto = 0;
        normalizado.recebido = 0;
        normalizado.saldo = 0;
    }

    // Se manutenção: zerar valores financeiros (RECEITA), mas manter DIAS
    // [FIX] Usuário quer manter registro de dias parados
    if (normalizado.status_veiculo === 'manutencao') {
        // normalizado.cliente -- MANTER (não zerar - permite rastreabilidade)
        // normalizado.dias -- MANTER
        // normalizado.dias_selecionados -- MANTER

        // ZERAR FINANCEIRO de Receita
        normalizado.diaria = 0;
        normalizado.semana = 0;

        // Manter custos se houver? Não, manutenção é custo operacional, não receita.
        // O sistema atual trata tudo como receita.
        normalizado.p_premium = 0;
        normalizado.protecao = 0;
        normalizado.acordo = 0;
        normalizado.ta_boleto = 0;
        normalizado.desconto = 0;
        normalizado.previsto = 0;
        normalizado.recebido = 0;
        normalizado.saldo = 0; // [FIX] Zero ou Negativo do Tabelado?
        // Se quisermos que Saldo mostre o Prejuízo do Tabelado, o saldo deveria ser (0 - Tabelado)
        // Mas 'normalizarDados' roda antes de calcularValores?
        // Vamos deixar calcularValores lidar com o Saldo.
        // AQUI apenas garantimos que não sujeira de receita entre.
    }

    return normalizado;
}



/**
 * Calcula valores automáticos
 * @param {Object} dados - Dados da linha
 * @returns {Object} - Dados com cálculos atualizados
 */
export function calcularValores(dados) {
    const calculado = { ...dados };

    // Garantir que dias é número
    const dias = parseInt(calculado.dias) || 0;
    const valorSemanal = parseFloat(calculado.valor_semanal) || 0;

    // [FIX PRECISION] Calcular diária
    let diaria = parseFloat(calculado.diaria) || 0;
    const idealDiaria = RentalCalculator.calculateDailyRate(valorSemanal);
    if (valorSemanal > 0 && Math.abs(diaria - idealDiaria) > 0.001) {
        diaria = idealDiaria;
    }

    // Calcula Semana (Receita Base)
    let semana = RentalCalculator.calculateWeeklyRevenue(dias, diaria, calculado.status_veiculo);

    // [SAFETY CHECK] Recuperação de erro legado (Dias=0 mas com Valor)
    if (semana === 0 && calculado.status_veiculo === 'alugado' && dias === 0) {
        const valorOriginal = parseFloat(calculado.semana) || 0;
        // Se o valor parece ser uma semana cheia, mantemos
        if (Math.abs(valorOriginal - valorSemanal) < 1.0) {
            semana = valorOriginal;
        } else {
            semana = valorOriginal;
        }
    }

    const extras = {
        p_premium: parseFloat(calculado.p_premium),
        protecao: parseFloat(calculado.protecao),
        acordo: parseFloat(calculado.acordo),
        ta_boleto: parseFloat(calculado.ta_boleto)
    };
    const desconto = parseFloat(calculado.desconto);

    // Previsto
    const previsto = RentalCalculator.calculateForecast(semana, extras, desconto);

    // Atualizar objeto
    calculado.diaria = diaria;
    calculado.semana = FinancialCalculator.round(semana); // Usar arredondamento do domínio
    calculado.previsto = FinancialCalculator.round(previsto);

    // Saldo = Recebido - Previsto
    const recebido = parseFloat(calculado.recebido) || 0;
    const saldo = RentalCalculator.calculateBalance(recebido, previsto);

    calculado.saldo = FinancialCalculator.round(saldo);

    return calculado;
}

/**
 * Processa uma linha completa: valida, normaliza e calcula
 * @param {Object} dados - Dados da linha
 * @returns {Object} - { sucesso: boolean, dados?: Object, erros?: Array }
 */
export function processarLinha(dados) {
    // 1. Validar
    const erros = validarLinha(dados);
    if (erros.length > 0) {
        return { sucesso: false, erros };
    }

    // 2. Normalizar
    let processado = normalizarDados(dados);

    // 3. Calcular
    processado = calcularValores(processado);

    return { sucesso: true, dados: processado };
}

/**
 * Calcula dias ocupados por um veículo em uma semana
 * @param {Array} linhas - Todas as linhas da semana
 * @param {String} placa - Placa do veículo
 * @param {Number} linhaAtualId - ID da linha atual (para ignorar)
 * @returns {Set} - Set de dias ocupados ['ter', 'qua', ...]
 */
export function calcularDiasOcupados(linhas, placa, linhaAtualId = null) {
    const diasOcupados = new Set();

    linhas.forEach(linha => {
        // Ignorar a linha atual
        if (linhaAtualId && linha.id === linhaAtualId) return;

        // Apenas linhas do mesmo veículo com status alugado
        if (linha.placa === placa && linha.status_veiculo === 'alugado') {
            const dias = linha.dias_selecionados || [];
            dias.forEach(dia => diasOcupados.add(dia));
        }
    });

    return diasOcupados;
}

/**
 * Valida conflito de dias
 * @param {Array} diasSelecionados - Dias que se quer selecionar
 * @param {Set} diasOcupados - Dias já ocupados
 * @returns {Array} - Dias em conflito
 */
export function validarConflitoDias(diasSelecionados, diasOcupados) {
    const conflitos = [];

    diasSelecionados.forEach(dia => {
        if (diasOcupados.has(dia)) {
            conflitos.push(dia);
        }
    });

    return conflitos;
}
