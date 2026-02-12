/**
 * Calculadora Financeira Pura (Domain Layer)
 * Isolada de Frameworks e Banco de Dados.
 */
export class FinancialCalculator {

    /**
     * Calcula o desperdício financeiro (diferença entre desconto máximo permitido e descontado aplicado).
     * @param {number} valorOriginal 
     * @param {number} percentualAplicado 
     * @returns {number} Valor do desperdício
     */
    static calculateWaste(valorOriginal, percentualAplicado) {
        // Regra de Negócio: Desconto Máximo Permitido = 40%
        const MAX_DISCOUNT_PERCENT = 40;

        const maxDiscountValue = valorOriginal * (MAX_DISCOUNT_PERCENT / 100);
        const actualDiscountValue = valorOriginal * ((percentualAplicado || 0) / 100);

        return maxDiscountValue - actualDiscountValue;
    }

    /**
     * Arredonda para 2 casas decimais.
     * @param {number} value 
     * @returns {number}
     */
    static round(value) {
        return Math.round((value + Number.EPSILON) * 100) / 100;
    }

    /**
     * Calcula o valor final com desconto aplicado.
     * @param {number} valorOriginal 
     * @param {number} descontoPercentual 
     * @returns {number} Valor com desconto
     */
    static calculateDiscountedValue(valorOriginal, descontoPercentual) {
        if (!valorOriginal) return 0;
        const discount = (descontoPercentual || 0) / 100;
        const finalValue = valorOriginal * (1 - discount);
        return this.round(finalValue);
    }

    /**
     * Calcula o valor a receber (Valor com Desconto + Taxa Administrativa se aplicável).
     * @param {number} valorComDesconto 
     * @param {boolean} cobrarTaxa 
     * @returns {number} Valor final a receber
     */
    static calculateReceivableAmount(valorComDesconto, cobrarTaxa) {
        const ADMIN_FEE_PERCENT = 0.15; // 15%
        if (!valorComDesconto) return 0;

        let finalValue = valorComDesconto;
        if (cobrarTaxa) {
            finalValue = valorComDesconto * (1 + ADMIN_FEE_PERCENT);
        }
        return this.round(finalValue);
    }
}
