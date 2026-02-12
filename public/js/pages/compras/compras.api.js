export const ComprasAPI = {
    async listar(filtros = {}) {
        const query = new URLSearchParams(filtros).toString();
        const res = await fetch(`/api/financeiro/compras?${query}`);
        if (!res.ok) throw new Error('Erro ao listar compras');
        return await res.json();
    },

    async obterFornecedores() {
        const res = await fetch('/api/financeiro/fornecedores');
        if (!res.ok) throw new Error('Erro ao listar fornecedores');
        return await res.json();
    },

    async obterVeiculos() {
        const res = await fetch('/api/veiculos?ativo=true');
        return res.ok ? await res.json() : [];
    },

    async getCompra(id) {
        const res = await fetch(`/api/financeiro/compras/${id}`);
        if (!res.ok) throw new Error('Erro ao buscar detalhes da compra');
        return await res.json();
    },

    async salvar(compra) {
        const res = await fetch('/api/financeiro/compras', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(compra)
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Erro ao salvar compra');
        }
        return await res.json();
    },

    async atualizar(id, dados) {
        const res = await fetch(`/api/financeiro/compras/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Erro ao atualizar compra');
        }
        return await res.json();
    },

    async excluir(id) {
        const res = await fetch(`/api/financeiro/compras/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Erro ao excluir compra');
        return true;
    }
};
