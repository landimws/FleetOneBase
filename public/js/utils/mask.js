export const Mask = {
    cpfCnpj(value) {
        if (!value) return '';
        value = value.replace(/\D/g, '');

        if (value.length <= 11) {
            // CPF
            return value
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        } else {
            // CNPJ
            return value
                .replace(/^(\d{2})(\d)/, '$1.$2')
                .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
                .replace(/\.(\d{3})(\d)/, '.$1/$2')
                .replace(/(\d{4})(\d)/, '$1-$2');
        }
    },

    phone(value) {
        if (!value) return '';
        value = value.replace(/\D/g, '');

        if (value.length > 10) {
            // Mobile (11 digits): (XX) XXXXX-XXXX
            return value.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
        } else if (value.length > 5) {
            // Landline (10 digits): (XX) XXXX-XXXX
            return value.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
        } else if (value.length > 2) {
            return value.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
        } else {
            return value;
        }
    },

    currency(value) {
        if (!value) return '';

        // Ensure string
        value = value.toString().replace(/\D/g, '');

        // Handle empty or zero
        if (value === '') return '';

        // Parse to float/int
        const numberValue = parseInt(value, 10) / 100;

        return numberValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    },

    // Parse formatted string back to float
    unmaskCurrency(value) {
        if (!value) return 0;
        if (typeof value === 'number') return value;

        // Remove everything except numbers and comma
        // "R$ 1.234,56" -> "1234,56"
        let clean = value.replace(/[^\d,]/g, '');

        // Replace comma with dot
        // "1234,56" -> "1234.56"
        clean = clean.replace(',', '.');

        return parseFloat(clean) || 0;
    }
};
