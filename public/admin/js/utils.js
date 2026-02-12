/**
 * FleetOne Admin Utilities
 * - Toasts
 * - Loading States
 */

const Toast = {
    init() {
        if (!document.getElementById('toast-container')) {
            const container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'position-fixed bottom-0 end-0 p-3';
            container.style.zIndex = '1070';
            document.body.appendChild(container);
        }
    },

    show(message, type = 'success') {
        this.init();
        const container = document.getElementById('toast-container');

        // Cores baseadas no tipo
        const bgClass = type === 'success' ? 'bg-success' : (type === 'error' ? 'bg-danger' : 'bg-primary');
        const icon = type === 'success' ? 'bi-check-circle' : (type === 'error' ? 'bi-exclamation-circle' : 'bi-info-circle');

        const toastEl = document.createElement('div');
        toastEl.className = `toast align-items-center text-white ${bgClass} border-0 mb-2`;
        toastEl.setAttribute('role', 'alert');
        toastEl.setAttribute('aria-live', 'assertive');
        toastEl.setAttribute('aria-atomic', 'true');

        toastEl.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <i class="bi ${icon} me-2"></i> ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;

        container.appendChild(toastEl);

        // Inicializar Bootstrap Toast
        const bsToast = new bootstrap.Toast(toastEl, { delay: 4000 });
        bsToast.show();

        // Remover do DOM após hide
        toastEl.addEventListener('hidden.bs.toast', () => {
            toastEl.remove();
        });
    }
};

const Loading = {
    show(buttonElement) {
        if (!buttonElement) return;

        // Guardar conteúdo original
        buttonElement.dataset.originalContent = buttonElement.innerHTML;
        buttonElement.disabled = true;

        // Adicionar spinner
        buttonElement.innerHTML = `
            <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            Processando...
        `;
    },

    hide(buttonElement) {
        if (!buttonElement) return;

        buttonElement.disabled = false;
        if (buttonElement.dataset.originalContent) {
            buttonElement.innerHTML = buttonElement.dataset.originalContent;
        }
    }
};

// Exportar globalmente
window.Toast = Toast;
window.Loading = Loading;
