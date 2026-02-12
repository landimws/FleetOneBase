
document.addEventListener('DOMContentLoaded', function () {
    console.log('✅ [empresa-form.js] Carregado e iniciado.');

    // Helpers
    const safeAddEventListener = (id, event, handler) => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener(event, handler);
        } else {
            console.warn(`⚠️ Elemento #${id} não encontrado para evento ${event}`);
        }
    };

    // Máscaras (Input Masks)
    safeAddEventListener('cnpj', 'input', function (e) {
        let x = e.target.value.replace(/\D/g, '').match(/(\d{0,2})(\d{0,3})(\d{0,3})(\d{0,4})(\d{0,2})/);
        e.target.value = !x[2] ? x[1] : x[1] + '.' + x[2] + '.' + x[3] + '/' + x[4] + (x[5] ? '-' + x[5] : '');
    });

    safeAddEventListener('cep', 'input', function (e) {
        let x = e.target.value.replace(/\D/g, '').match(/(\d{0,5})(\d{0,3})/);
        e.target.value = !x[2] ? x[1] : x[1] + '-' + x[2];
    });

    safeAddEventListener('telefone', 'input', function (e) {
        let x = e.target.value.replace(/\D/g, '').match(/(\d{0,2})(\d{0,5})(\d{0,4})/);
        e.target.value = !x[2] ? x[1] : '(' + x[1] + ') ' + x[2] + (x[3] ? '-' + x[3] : '');
    });

    // ViaCEP Integration
    const cepInput = document.getElementById('cep');
    if (cepInput) {
        cepInput.addEventListener('blur', async function () {
            const cep = this.value.replace(/\D/g, '');
            if (cep.length === 8) {
                fillAddress('...', '...', '...', '...');
                try {
                    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                    const data = await response.json();
                    if (!data.erro) {
                        fillAddress(data.logradouro, data.bairro, data.localidade, data.uf);
                        document.getElementById('numero')?.focus();
                        showToast('Endereço encontrado!', 'success');
                    } else {
                        fillAddress('', '', '', '');
                        showToast('CEP não encontrado.', 'error');
                    }
                } catch (error) {
                    console.error('Erro ViaCEP:', error);
                    fillAddress('', '', '', '');
                    showToast('Erro ao buscar CEP.', 'error');
                }
            }
        });
    }

    function fillAddress(logradouro, bairro, cidade, uf) {
        if (document.getElementById('logradouro')) document.getElementById('logradouro').value = logradouro;
        if (document.getElementById('bairro')) document.getElementById('bairro').value = bairro;
        if (document.getElementById('cidade')) document.getElementById('cidade').value = cidade;
        if (document.getElementById('estado')) document.getElementById('estado').value = uf;
    }

    // Form Submission Handler
    const form = document.getElementById('formEmpresa');
    if (form) {
        console.log('✅ Listener de submit sendo anexado ao #formEmpresa');

        // Remove any inline onsubmit to prevent conflicts, though we will preventDefault anyway
        form.removeAttribute('onsubmit');

        form.addEventListener('submit', async function (e) {
            e.preventDefault(); // CRUCIAL: Prevent form submission reload
            console.log('🚀 Submit interceptado via addEventListener!');

            const btnSubmit = form.querySelector('button[type="submit"]');

            // Show loading state
            if (window.Loading) {
                window.Loading.show(btnSubmit);
            } else {
                console.warn('window.Loading não encontrado');
                if (btnSubmit) btnSubmit.disabled = true;
            }

            try {
                const empresaId = document.getElementById('empresaId')?.value;
                const isEdit = !!empresaId && empresaId !== 'undefined' && empresaId !== '';

                console.log(`📝 Modo: ${isEdit ? 'Edição (ID: ' + empresaId + ')' : 'Criação'}`);

                const getValue = (id) => document.getElementById(id)?.value || '';

                const data = {
                    nome: getValue('nome'),
                    cnpj: getValue('cnpj'),
                    email: getValue('email'),
                    telefone: getValue('telefone'),
                    responsavel: getValue('responsavel'),
                    cep: getValue('cep'),
                    logradouro: getValue('logradouro'),
                    numero: getValue('numero'),
                    bairro: getValue('bairro'),
                    cidade: getValue('cidade'),
                    estado: getValue('estado')
                };

                console.log('📦 Payload:', data);

                const url = isEdit ? `/admin/empresas/${empresaId}` : '/admin/empresas';
                const method = isEdit ? 'PUT' : 'POST';

                console.log(`🌐 Fetching: ${method} ${url}`);

                const response = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = await response.json();
                console.log('📩 Resposta do servidor:', result);

                if (result.success) {
                    showToast(result.message || 'Operação realizada com sucesso!', 'success');

                    // Redirect after a short delay
                    setTimeout(() => {
                        window.location.href = '/admin/empresas';
                    }, 1500);
                } else {
                    showToast('Erro: ' + (result.message || 'Erro desconhecido'), 'error');
                    if (window.Loading) window.Loading.hide(btnSubmit);
                    else if (btnSubmit) btnSubmit.disabled = false;
                }

            } catch (error) {
                console.error('❌ Erro no catch do submit:', error);
                showToast('Erro de comunicação: ' + error.message, 'error');

                if (window.Loading) window.Loading.hide(btnSubmit);
                else if (btnSubmit) btnSubmit.disabled = false;
            }
        });
    } else {
        console.error('❌ Formulário #formEmpresa não encontrado no DOM!');
    }

    // Helper for Toasts
    function showToast(msg, type) {
        console.log(`🔔 Toast [${type}]: ${msg}`);
        if (window.Toast) {
            window.Toast.show(msg, type);
        } else {
            alert(`${type.toUpperCase()}: ${msg}`);
        }
    }
});
