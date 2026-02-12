
const Masks = {
    cpf: (v) => {
        v = v.replace(/\D/g, '');
        if (v.length > 3) v = v.replace(/^(\d{3})(\d)/, '$1.$2');
        if (v.length > 6) v = v.replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3');
        if (v.length > 9) v = v.replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
        return v.slice(0, 14);
    },

    cnpj: (v) => {
        v = v.replace(/\D/g, '');
        if (v.length > 2) v = v.replace(/^(\d{2})(\d)/, '$1.$2');
        if (v.length > 5) v = v.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
        if (v.length > 8) v = v.replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3/$4');
        if (v.length > 12) v = v.replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, '$1.$2.$3/$4-$5');
        return v.slice(0, 18);
    },

    phone: (v) => {
        v = v.replace(/\D/g, '');
        if (v.length > 10) {
            v = v.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
        } else if (v.length > 5) {
            v = v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
        } else if (v.length > 2) {
            v = v.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
        } else {
            v = v.replace(/^(\d*)/, '($1');
        }
        return v;
    },

    cep: (v) => {
        v = v.replace(/\D/g, '');
        if (v.length > 5) v = v.replace(/^(\d{5})(\d)/, '$1-$2');
        return v.slice(0, 9);
    },

    date: (v) => {
        v = v.replace(/\D/g, '');
        if (v.length > 2) v = v.replace(/^(\d{2})(\d)/, '$1/$2');
        if (v.length > 4) v = v.replace(/^(\d{2})\/(\d{2})(\d)/, '$1/$2/$3');
        return v.slice(0, 10);
    },

    money: (v) => {
        v = v.replace(/\D/g, "");
        v = (v / 100).toFixed(2) + "";
        v = v.replace(".", ",");
        v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
        return `R$ ${v}`;
    },

    apply: (input, type) => {
        if (!input) return;

        const handler = (e) => {
            if (Masks[type]) {
                e.target.value = Masks[type](e.target.value);
            }
        };

        // Apply on input and initial load if value exists
        input.addEventListener('input', handler);
        if (input.value) {
            input.value = Masks[type](input.value);
        }
    },

    // Auto-init based on data-mask attribute
    init: () => {
        document.querySelectorAll('[data-mask]').forEach(input => {
            const type = input.dataset.mask;
            Masks.apply(input, type);
        });
    }
};

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', Masks.init);
