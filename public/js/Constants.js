/**
 * Utilitário Global para Gerenciamento de Constantes do Sistema
 * Disponível globalmente como window.Constants
 */
window.Constants = {
    _cache: null,

    /**
     * Carrega as constantes da API (com cache)
     */
    async load() {
        if (this._cache) return this._cache;

        try {
            console.log('[Constants] Carregando constantes do sistema...');
            const res = await fetch('/api/constants');
            if (!res.ok) throw new Error('Falha ao carregar constantes');

            this._cache = await res.json();
            console.log('[Constants] Carregadas:', this._cache);
            return this._cache;
        } catch (e) {
            console.error('[Constants] Erro fatal:', e);
            // Fallback silencioso para não quebrar tudo, mas idealmente deve ser tratado
            return {};
        }
    },

    /**
     * Retorna o objeto de constantes inteiro ou uma chave especifica
     * @param {string} [key] - Chave opcional (ex: 'STATUS_VEICULOS')
     */
    get(key) {
        if (!this._cache) {
            console.warn('[Constants] Tentativa de acesso antes do load()');
            return null;
        }
        return key ? this._cache[key] : this._cache;
    }
};
