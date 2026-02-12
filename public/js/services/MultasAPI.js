/**
 * Service Layer para Multas
 */
const MultasAPI = {
    getDashboard: async (params) => {
        const query = new URLSearchParams(params).toString();
        const res = await fetch(`/api/multas/analytics/dashboard?${query}`);
        return res.json();
    },
    getList: async (filters = {}) => {
        const query = new URLSearchParams(filters).toString();
        const res = await fetch(`/api/multas?${query}`);
        return res.json();
    },
    getById: async (id) => {
        const res = await fetch(`/api/multas/${parseInt(id)}`);
        if (!res.ok) throw new Error('Multa não encontrada');
        return res.json();
    },
    create: async (data) => {
        const res = await fetch('/api/multas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },
    update: async (id, data) => {
        const res = await fetch(`/api/multas/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },
    delete: async (id) => {
        const res = await fetch(`/api/multas/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Falha ao excluir');
    },
    // Integrações
    getVeiculos: async () => {
        const res = await fetch('/api/veiculos?ativo=true');
        return res.json();
    },
    getClientes: async () => {
        const res = await fetch('/api/clientes?ativo=true');
        return res.json();
    },
    lancarCarteira: async (id, payload) => {
        const res = await fetch(`/api/multas/${id}/lancar-carteira`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Erro ao lançar');
        }
        return res.json();
    }
};

// Expose globally to replace the local 'const API' in multas.js
window.API = MultasAPI;
