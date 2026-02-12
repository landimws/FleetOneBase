/**
 * Constantes do Sistema
 * 
 * Arquivo centralizado para gerenciar todas as constantes configuráveis
 * do sistema, seguindo o princípio de Single Source of Truth.
 * 
 * IMPORTANTE: Este é o ÚNICO local onde essas listas devem ser mantidas.
 * O frontend deve consumir via API /api/constants
 */

const CONSTANTS = {
    /**
     * Modelos de Veículos Disponíveis
     * Para adicionar/remover modelos, edite apenas esta lista
     */
    // --- 1. Veículos ---

    MODELOS_VEICULOS: [
        'Mobi',
        'Kwid',
        'Gol',
        'Voyage',
        'Polo',
        'Onix Plus',
        'Corolla Cross',
        'Dolphin Mini',
        'Dolphin',
        'Sandero',
        'Onix',
        'HB20',
        'HB20s',
        'Versa',
        'Ford Ka',
        'Spin'
    ],

    TIPOS_COMBUSTIVEL: [
        'Gasolina',
        'Etanol',
        'Flex',
        'Diesel',
        'Híbrido'
    ],

    STATUS_VEICULOS: {
        DISPONIVEL: 'disponivel',
        ALUGADO: 'alugado',
        MANUTENCAO: 'manutencao',
        VALIDAR: 'validar',
        VENDIDO: 'vendido',     // Novo status sugerido para histórico
        INDISPONIVEL: 'indisponivel' // Genérico
    },

    STATUS_VEICULOS_LABELS: {
        disponivel: 'Disponível',
        alugado: 'Alugado',
        manutencao: 'Manutenção',
        validar: 'Validar',
        vendido: 'Vendido',
        indisponivel: 'Indisponível'
    },

    // --- 2. Multas ---

    TIPOS_RESPONSAVEL: {
        CLIENTE: 'cliente',
        LOCADORA: 'locadora'
    },

    TIPOS_RESPONSAVEL_LABELS: {
        cliente: 'Cliente',
        locadora: 'Locadora'
    },

    STATUS_MULTAS: {
        ABERTO: 'aberto',
        PAGO: 'pago',
        VENCIDO: 'vencido',
        ISENTO: 'isento'
    },

    STATUS_MULTAS_LABELS: {
        aberto: 'Aberto',
        pago: 'Pago',
        vencido: 'Vencido',
        isento: 'Isento'
    },

    // --- 3. Financeiro e Taxas ---

    TAXAS: {
        TAXA_ADMINISTRATIVA: 0.15, // 15%
    },

    // --- 4. UI e Ícones ---

    ICONES: {
        SEMANA_ABERTA: '📝',
        SEMANA_FECHADA: '🔒',
        DISPONIVEL: 'ph-check-circle',
        ALUGADO: 'ph-car-profile',
        MANUTENCAO: 'ph-wrench',
        VALIDAR: 'ph-hourglass'
    },

    // --- 5. Configurações de UI/Regras ---

    UI_CONFIG: {
        CAMPOS_BLOQUEIO_MULTA_PAGA: [
            'placa', 'numero_auto', 'renainf', 'data_infracao',
            'valor_original', 'data_vencimento', 'orgao_autuador',
            'tipo_responsavel', 'cliente_nome', 'foi_indicado',
            'reconheceu', 'desconto_aplicado', 'cobrar_taxa'
        ]
    }
};

export default CONSTANTS;
