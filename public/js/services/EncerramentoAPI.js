/**
 * EncerramentoAPI.js
 * Centraliza todas as chamadas HTTP relacionadas ao módulo de Encerramento.
 */
const EncerramentoAPI = {

    /**
     * Busca dados completos do cliente para enriquecer o formulário
     */
    async getDadosCliente(nome) {
        if (!nome) return null;
        try {
            const res = await fetch(`/api/clientes/${encodeURIComponent(nome)}`);
            if (!res.ok) throw new Error('Erro ao buscar cliente');
            return await res.json();
        } catch (e) {
            console.error('API Error:', e);
            return null;
        }
    },

    /**
     * Busca detalhes do veículo
     */
    async getDadosVeiculo(placa) {
        if (!placa) return null;
        try {
            const res = await fetch(`/api/veiculos/${encodeURIComponent(placa)}`);
            if (!res.ok) return null; // 404 é esperado
            return await res.json();
        } catch (e) {
            return null;
        }
    },

    /**
     * Salva o encerramento do contrato
     */
    async salvarEncerramento(payload) {
        const res = await fetch('/api/encerramento', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const json = await res.json();
            throw new Error(json.error || 'Erro ao salvar encerramento');
        }
        return await res.json();
    },

    /**
     * Busca um encerramento já realizado
     */
    async getEncerramento(cliente) {
        try {
            const res = await fetch(`/api/encerramento/${encodeURIComponent(cliente)}`);
            if (!res.ok) return null;
            return await res.json();
        } catch (e) {
            return null;
        }
    },

    /**
     * Simula a minuta jurídica no backend
     */
    async simularMinuta(payloadValores) {
        try {
            const res = await fetch('/api/carteira/simular-minuta', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payloadValores)
            });
            return await res.json();
        } catch (e) {
            console.error('Erro minuta:', e);
            return { texto: '' };
        }
    },

    /**
     * Registra a negociação financeira (Wizard)
     */
    async salvarNegociacao(payloadNegociacao) {
        const res = await fetch('/api/carteira/negociacao', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloadNegociacao)
        });

        if (!res.ok) {
            const json = await res.json();
            throw new Error(json.error || 'Erro no servidor');
        }
        return await res.json();
    }
};

// Expor globalmente para usar no script antigo enquanto migramos
window.EncerramentoAPI = EncerramentoAPI;
