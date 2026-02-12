document.addEventListener('DOMContentLoaded', () => {
    const body = document.body;
    const toggleBtn = document.getElementById('sidebar-toggle');
    const mobileOverlay = document.getElementById('mobile-overlay');
    const STORAGE_KEY = 'sidebar_state_v1';

    // 1. Restaurar Estado (Persistência)
    const savedState = localStorage.getItem(STORAGE_KEY);

    // Default: Aberto em desktop, Fechado em mobile
    // Se salvo como 'collapsed', aplica a classe
    if (savedState === 'collapsed') {
        body.classList.add('sidebar-collapsed');
    }

    // 2. Toggle Desktop (Colapso)
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            body.classList.toggle('sidebar-collapsed');

            // Salvar preferência
            if (body.classList.contains('sidebar-collapsed')) {
                localStorage.setItem(STORAGE_KEY, 'collapsed');
            } else {
                localStorage.removeItem(STORAGE_KEY);
            }
        });
    }

    // 3. Mobile Logic
    const mobileBtn = document.getElementById('mobile-menu-btn');

    if (mobileBtn) {
        mobileBtn.addEventListener('click', () => {
            body.classList.add('mobile-menu-open');
        });
    }

    // Fechar ao clicar no overlay (mobile)
    if (mobileOverlay) {
        mobileOverlay.addEventListener('click', () => {
            body.classList.remove('mobile-menu-open');
        });
    }

    // 4. Highlight Ativo (Backup caso o server-side não pegue)
    // O EJS já deve setar a classe 'active', mas podemos reforçar via JS se a URL bater
    const currentPath = window.location.pathname;
    const links = document.querySelectorAll('.nav-item');

    links.forEach(link => {
        if (link.getAttribute('href') === currentPath && !link.classList.contains('active')) {
            link.classList.add('active');
        }
    });
});
