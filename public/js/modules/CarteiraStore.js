/**
 * State Management para Carteira
 * Centraliza o estado da aplicação e notifica listeners
 */
const CarteiraStore = {
    state: {
        clientes: [],
        veiculos: [],
        clienteSelecionado: null,
        financeiro: { debitos: [], creditos: [], resumo: {} },
        contratoEncerrado: false,
        dadosEncerramento: null
    },

    listeners: [],

    subscribe(callback) {
        this.listeners.push(callback);
    },

    notify(event, data) {
        this.listeners.forEach(cb => cb(event, data));
    },

    // Actions
    setClientes(lista) {
        this.state.clientes = lista;
        this.notify('clientes_updated', lista);
    },

    setVeiculos(lista) {
        this.state.veiculos = lista;
        this.notify('veiculos_updated', lista);
    },

    selecionarCliente(nome) {
        this.state.clienteSelecionado = nome;
        this.notify('cliente_changed', nome);
    },

    setDadosFinanceiros(dados) {
        this.state.financeiro = dados;
        // Compatibilidade com código legado (modais de impressão etc)
        window.ultimoDadosCache = dados;
        this.notify('financeiro_updated', dados);
    },

    setStatusEncerramento(status, dados) {
        this.state.contratoEncerrado = status;
        this.state.dadosEncerramento = dados;
        window.contratoEncerrado = status;
        this.notify('encerramento_updated', { status, dados });
    }
};

window.CarteiraStore = CarteiraStore;
