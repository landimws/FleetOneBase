/**
 * Formatters Util
 */

const Formatters = {
    currency: (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val),

    date: (str) => {
        if (!str) return '-';
        // Se vier do banco como YYYY-MM-DD
        if (str.includes('-')) {
            const [y, m, d] = str.split('T')[0].split('-'); // Handle potentially ISO string with T
            return `${d}/${m}/${y}`;
        }
        return str;
    }
};

// Expose globally for legacy support if needed, or just use Formatters.currency
window.formatCurrency = Formatters.currency;
window.formatDate = Formatters.date;

// Legacy Aliases
window.formatMoeda = Formatters.currency;
window.formatData = Formatters.date;
