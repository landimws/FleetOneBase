export const ComprasCalculo = {
    calcularItem(qtd, unit, desconto) {
        const q = parseFloat(qtd) || 0;
        const u = parseFloat(unit) || 0;
        const d = parseFloat(desconto) || 0;
        return Math.max(0, (q * u) - d);
    },

    calcularTotalCompra(itens, descontoValor, descontoPercentual) {
        const bruto = itens.reduce((acc, item) => acc + (parseFloat(item.total) || 0), 0);
        const dVal = parseFloat(descontoValor) || 0;
        const dPerc = parseFloat(descontoPercentual) || 0;

        let liquido = bruto - dVal;
        if (dPerc > 0) {
            liquido = liquido * (1 - (dPerc / 100));
        }

        return {
            bruto: bruto,
            liquido: Math.max(0, liquido)
        };
    },

    // Formatters strict for this context
    formatarMoeda(valor) {
        return parseFloat(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
};
