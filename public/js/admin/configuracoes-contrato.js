/**
 * JavaScript para gerenciar configurações de contrato
 */

document.addEventListener('DOMContentLoaded', () => {
    carregarConfiguracoes();
    configurarFormulario();
});

async function carregarConfiguracoes() {
    try {
        const response = await fetch('/api/contratos/config/get');
        const config = await response.json();

        // Preencher formulário
        Object.keys(config).forEach(key => {
            const input = document.querySelector(`[name="${key}"]`);
            if (input) {
                input.value = config[key];
            }
        });
    } catch (error) {
        console.error('Erro ao carregar configurações:', error);
    }
}

function configurarFormulario() {
    document.getElementById('form-configuracoes')?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(e.target);
        const dados = Object.fromEntries(formData.entries());

        // Converter strings para números
        Object.keys(dados).forEach(key => {
            if (!isNaN(dados[key]) && dados[key] !== '') {
                dados[key] = parseFloat(dados[key]);
            }
        });

        try {
            const response = await fetch('/api/contratos/config/update', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados)
            });

            if (response.ok) {
                alert('Configurações salvas com sucesso!');
            } else {
                alert('Erro ao salvar configurações');
            }
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro ao salvar configurações');
        }
    });
}
