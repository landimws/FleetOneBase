const body = document.body;

const toggleBtn = document.getElementById('sidebar-toggle');
const mobileOverlay = document.getElementById('mobile-overlay');
const STORAGE_KEY = 'sidebar_state_v1';

// Helper: Set Cookie
const setCookie = (name, value, days) => {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
};

// 1. Restaurar Estado (Persistência) - Já feito pelo Server-Side, mas mantemos local sync
// 1. Restaurar Estado (Persistência) - Já feito pelo Server-Side, mas mantemos local sync
const savedState = localStorage.getItem(STORAGE_KEY);
const serverState = body.classList.contains('sidebar-collapsed') ? 'collapsed' : 'expanded';

console.log(`[Sidebar] Init - LocalStorage: ${savedState}, ServerClass: ${serverState}`);

// SYNC: Se existir no LocalStorage, força o Cookie para garantir SSR na próxima navegação
if (savedState) {
    // Se houver mismatch, o LS tem prioridade (assumindo que o usuário mudou recentemente)
    if (savedState !== serverState) {
        console.log('[Sidebar] Syncing mismatch: LS overrides Server');
        if (savedState === 'collapsed') body.classList.add('sidebar-collapsed');
        else body.classList.remove('sidebar-collapsed');
    }
    // Sempre renova o cookie
    setCookie('sidebar_state', savedState, 365);
}

// FIX: Remover classe de preload do HTML SOMENTE APÓS garantir o estado do corpo
document.documentElement.classList.remove('sidebar-collapsed-preload');

// Habilitar animações visualmente suaves APÓS o primeiro paint (300ms)
setTimeout(() => {
    body.classList.add('sidebar-animated');
}, 300);

// 2. Toggle Desktop (Colapso)
if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
        body.classList.toggle('sidebar-collapsed');

        const isCollapsed = body.classList.contains('sidebar-collapsed');
        const state = isCollapsed ? 'collapsed' : 'expanded';

        // Salvar preferência (Cookie + LocalStorage)
        localStorage.setItem(STORAGE_KEY, state);
        setCookie('sidebar_state', state, 365); // 1 ano
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
