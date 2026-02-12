/**
 * 🔄 DataRefreshBus - Sistema de Sincronização de Dados Cross-Module
 * 
 * Coordena a atualização de dados entre todos os módulos do sistema.
 * Quando um módulo salva dados (cliente, veículo, etc), ele notifica o bus,
 * que propaga o evento para todos os outros módulos atualizarem seus caches.
 * 
 * Uso:
 * 
 * // No módulo, registrar listener:
 * DataRefreshBus.subscribe((dataType) => {
 *     if (dataType === 'clientes' || dataType === 'all') {
 *         carregarClientes();
 *     }
 * });
 * 
 * // Após salvar dados, notificar:
 * DataRefreshBus.notifyDataChanged('clientes');
 * 
 * @module DataRefreshBus
 */

window.DataRefreshBus = {
    listeners: [],

    /**
     * Registra um listener para eventos de atualização de dados
     * @param {Function} callback - Função que será chamada quando dados mudarem
     *                              Recebe dataType como parâmetro ('clientes' | 'veiculos' | 'all')
     */
    subscribe(callback) {
        if (typeof callback !== 'function') {
            console.error('[DataRefreshBus] Subscribe requer uma função callback');
            return;
        }

        this.listeners.push(callback);
        console.log(`📡 [DataRefreshBus] Novo listener registrado. Total: ${this.listeners.length}`);
    },

    /**
     * Remove um listener previamente registrado
     * @param {Function} callback - A mesma função passada no subscribe
     */
    unsubscribe(callback) {
        const initialLength = this.listeners.length;
        this.listeners = this.listeners.filter(cb => cb !== callback);

        if (this.listeners.length < initialLength) {
            console.log(`📡 [DataRefreshBus] Listener removido. Total: ${this.listeners.length}`);
        }
    },

    /**
     * Notifica todos os módulos que dados foram alterados
     * @param {string} dataType - Tipo de dado alterado: 'clientes', 'veiculos', ou 'all'
     */
    notifyDataChanged(dataType = 'all') {
        const validTypes = ['clientes', 'veiculos', 'all'];

        if (!validTypes.includes(dataType)) {
            console.warn(`[DataRefreshBus] Tipo de dado inválido: ${dataType}. Usando 'all'.`);
            dataType = 'all';
        }

        console.log(`🔄 [DataRefreshBus] Notificando ${this.listeners.length} módulo(s): ${dataType}`);

        let successCount = 0;
        let errorCount = 0;

        this.listeners.forEach((callback, index) => {
            try {
                callback(dataType);
                successCount++;
            } catch (error) {
                errorCount++;
                console.error(`[DataRefreshBus] Erro ao notificar listener #${index}:`, error);
            }
        });

        if (errorCount > 0) {
            console.warn(`[DataRefreshBus] ${successCount} notificações ok, ${errorCount} com erro`);
        }
    },

    /**
     * Limpa todos os listeners (útil para testes)
     */
    reset() {
        this.listeners = [];
        console.log('🔄 [DataRefreshBus] Reset completo');
    }
};

// Confirmação de carregamento
console.log('✅ DataRefreshBus carregado e disponível globalmente');
