/**
 * Service Layer para Carteira de Clientes
 */
const CarteiraAPI = {
    getClientes: async () => {
        const res = await fetch('/api/clientes');
        return res.json();
    },
    getVeiculos: async () => {
        const res = await fetch('/api/veiculos');
        return res.json();
    },
    getResumoFinanceiro: async (clienteNome) => {
        const nomeSafe = encodeURIComponent(clienteNome);
        const res = await fetch(`/api/carteira/resumo/${nomeSafe}`);

        // Validação de JSON
        const contentType = res.headers.get("content-type");
        let dados;
        if (contentType && contentType.indexOf("application/json") !== -1) {
            dados = await res.json();
        } else {
            throw new Error(`Erro ${res.status}: Backend não retornou JSON.`);
        }

        if (!res.ok) {
            throw new Error(dados.error || 'Erro desconhecido ao carregar dados.');
        }
        return dados;
    },
    getStatusEncerramento: async (clienteNome) => {
        const res = await fetch(`/api/encerramento/${encodeURIComponent(clienteNome)}`);
        if (res.ok) return res.json();
        return null; // Retorna null se 404/Erro (Contrato Ativo ou erro)
    },
    reabrirContrato: async (clienteNome, motivo) => {
        const res = await fetch(`/api/encerramento/${encodeURIComponent(clienteNome)}/reabrir`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ motivo })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Erro ao reabrir contrato');
        }
        return res.json();
    }
};

window.CarteiraAPI = CarteiraAPI;
