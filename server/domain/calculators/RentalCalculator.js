import { FinancialCalculator } from '../financial/FinancialCalculator.js';

/**
 * Calculadora de Locação (Domain Layer)
 * Regras específicas de cálculo de semanas e diárias.
 */
export class RentalCalculator {

    /**
     * Calcula a diária baseada no valor semanal (Divisão por 7).
     * @param {number} valorSemanal 
     * @returns {number} Diária precisa
     */
    static calculateDailyRate(valorSemanal) {
        if (!valorSemanal) return 0;
        return valorSemanal / 7;
    }

    /**
     * Calcula a receita da semana baseada em dias e status.
     * @param {number} dias 
     * @param {number} diaria 
     * @param {string} statusVeiculo 
     * @returns {number} Receita da semana
     */
    static calculateWeeklyRevenue(dias, diaria, statusVeiculo) {
        if (statusVeiculo !== 'alugado') return 0;
        return (dias || 0) * (diaria || 0);
    }

    /**
     * Calcula o valor previsto (Receita + Extras - Descontos).
     * @param {number} semana Receita base
     * @param {Object} extras { p_premium, protecao, acordo, ta_boleto }
     * @param {number} desconto
     * @returns {number} Valor Previsto
     */
    static calculateForecast(semana, extras = {}, desconto = 0) {
        const totalExtras = (extras.p_premium || 0) +
            (extras.protecao || 0) +
            (extras.acordo || 0) +
            (extras.ta_boleto || 0);

        return (semana || 0) + totalExtras - (desconto || 0);
    }

    /**
     * Calcula o saldo final.
     * @param {number} recebido 
     * @param {number} previsto 
     * @returns {number} Saldo (Recebido - Previsto)
     */
    static calculateBalance(recebido, previsto) {
        return (recebido || 0) - (previsto || 0);
    }
}
