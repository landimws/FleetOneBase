// ========================================
// GRID SEMANAL - LÓGICA FRONTEND (FINAL STABLE)
// ========================================

// Fallback para Constants se não carregado externamente
if (!window.Constants) {
    window.Constants = {
        _cache: null,
        async load() {
            if (this._cache) return this._cache;
            try {
                const res = await fetch('/api/constants');
                if (!res.ok) throw new Error('Falha ao carregar constantes');
                this._cache = await res.json();
                return this._cache;
            } catch (e) {
                console.error('[Constants-Fallback] Erro:', e);
                return {};
            }
        },
        get(key) {
            return (this._cache && key) ? this._cache[key] : this._cache;
        }
    };
    console.warn('Constants carregado via Fallback no grid.js');
}

const GridSemanal = {
    semanaAtual: null,
    semanaAnterior: null, // Cache da semana anterior
    semanasLista: [],

    // Estado de Ordenação
    // Estado de Ordenação
    ordenacao: { campo: 'placa', direcao: 'asc' },

    veiculosCache: {},
    clientesCache: [],

    init() {
        console.log('Grid Semanal iniciando...');
        this.cacheDOM();
        this.bindEvents();
        this.carregarDadosAuxiliares();
        this.carregarSemanas();

        // [DataRefreshBus] Subscribe para atualizações de outros módulos
        if (window.DataRefreshBus) {
            DataRefreshBus.subscribe((dataType) => {
                if (dataType === 'all' || dataType === 'clientes' || dataType === 'veiculos') {
                    console.log(`🔄 [Grid] Recebido evento de atualização: ${dataType}`);
                    this.refreshAllData();
                }
            });
        } else {
            console.warn('[Grid] DataRefreshBus não encontrado. Atualização automática desabilitada.');
        }
    },

    async carregarDadosAuxiliares() {
        try {
            const [r1, r2] = await Promise.all([
                fetch('/api/veiculos?ativo=true'),
                fetch('/api/clientes?ativo=true')
            ]);
            const veiculos = await r1.json();
            const clientes = await r2.json();

            // Popular Cache
            this.veiculosCache = {};
            veiculos.forEach(v => this.veiculosCache[v.placa] = v);
            this.clientesCache = clientes;

            // Popular Datalists
            const dlPlacas = document.getElementById('placas-list');
            if (dlPlacas) {
                dlPlacas.innerHTML = veiculos.map(v => `<option value="${v.placa}">${v.modelo} - ${v.combustivel}</option>`).join('');
            }

            const dlClientes = document.getElementById('clientes-list');
            if (dlClientes) {
                dlClientes.innerHTML = clientes.map(c => `<option value="${c.nome}">`).join('');
            }

        } catch (e) { console.error('Erro loading options', e); }
    },

    // [DataRefreshBus] Método para atualizar todos os dados
    async refreshAllData() {
        console.log('🔄 [Grid] Atualizando dados auxiliares...');
        try {
            await this.carregarDadosAuxiliares();

            // Recarregar semana atual para pegar dados novos se estiver visualizando
            if (this.semanaAtual && this.semanaAtual.id) {
                await this.carregarSemana(this.semanaAtual.id);
            }

            console.log('✅ [Grid] Dados atualizados com sucesso');
        } catch (error) {
            console.error('❌ [Grid] Erro ao atualizar dados:', error);
        }
    },

    cacheDOM() {
        this.dom = {
            selectSemana: document.getElementById('select-semana'),
            btnAnterior: document.getElementById('btn-anterior'),
            btnProxima: document.getElementById('btn-proxima'),
            btnNova: document.getElementById('btn-nova-semana'),
            btnFechar: document.getElementById('btn-fechar-semana'),
            btnSync: document.getElementById('btn-sync-frota'), // Novo botão
            inputBusca: document.getElementById('input-busca-grid'), // Nova Barra de Pesquisa
            contadorVeiculos: document.getElementById('contador-veiculos'), // Contador de veículos únicos
            tbody: document.querySelector('#grid-semana tbody')
        };
    },

    bindEvents() {
        this.dom.selectSemana.addEventListener('change', (e) => this.carregarSemana(e.target.value));
        this.dom.btnNova.addEventListener('click', () => this.criarNovaSemana());

        if (this.dom.btnSync) {
            this.dom.btnSync.addEventListener('click', () => this.sincronizarFrota());
        }

        // Listener da Busca
        if (this.dom.inputBusca) {
            this.dom.inputBusca.addEventListener('input', () => {
                const filtroAtivo = document.querySelector('.filtro-btn.active');
                const tipo = filtroAtivo ? filtroAtivo.dataset.filtro : 'todos';
                this.aplicarFiltro(tipo);
            });
        }

        // Botão Imprimir
        const btnImprimir = document.getElementById('btn-imprimir-grid');
        if (btnImprimir) {
            btnImprimir.addEventListener('click', () => window.print());
        }

        this.dom.btnFechar.addEventListener('click', () => this.fecharSemana());
        this.dom.btnAnterior.addEventListener('click', () => this.navegar(-1));
        this.dom.btnProxima.addEventListener('click', () => this.navegar(1));

        document.querySelectorAll('.filtro-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.aplicarFiltro(e.target.dataset.filtro);
            });
        });

        // Ordenação
        document.querySelectorAll('th[data-sort]').forEach(th => {
            th.addEventListener('click', () => this.ordenar(th.dataset.sort));
            th.style.cursor = 'pointer';
        });

        // Navegação por Teclado (Excel-like)
        this.dom.tbody.addEventListener('keydown', (e) => this.handleGridNavigation(e));
    },

    ordenar(campo) {
        if (!this.semanaAtual || !this.semanaAtual.linhas) return;

        const direcao = (this.ordenacao.campo === campo && this.ordenacao.direcao === 'asc') ? 'desc' : 'asc';
        this.ordenacao = { campo, direcao };

        this.aplicarOrdenacao();
        this.renderizarGrid();
        this.atualizarIconesOrdenacao();
    },

    aplicarOrdenacao() {
        if (!this.semanaAtual || !this.semanaAtual.linhas) return;
        const { campo, direcao } = this.ordenacao;
        if (!campo) return;

        const collator = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });

        this.semanaAtual.linhas.sort((a, b) => {
            let valA = a[campo];
            let valB = b[campo];

            // Tratamento de nulos
            if (valA === null || valA === undefined) valA = '';
            if (valB === null || valB === undefined) valB = '';

            let result;
            if (typeof valA === 'string' && typeof valB === 'string') {
                result = collator.compare(valA, valB);
            } else {
                // Numérico
                valA = parseFloat(valA) || 0;
                valB = parseFloat(valB) || 0;
                result = valA - valB;
            }

            return direcao === 'asc' ? result : -result;
        });
    },

    atualizarIconesOrdenacao() {
        document.querySelectorAll('th[data-sort]').forEach(th => {
            const campo = th.dataset.sort;
            th.classList.remove('sort-asc', 'sort-desc'); // Limpar classes CSS se existirem
            // Limpar texto extra unicode
            const textoBase = th.innerText.replace(' ▲', '').replace(' ▼', '');
            th.innerText = textoBase;

            if (campo === this.ordenacao.campo) {
                const seta = this.ordenacao.direcao === 'asc' ? ' ▲' : ' ▼';
                th.innerText += seta;
                th.classList.add(`sort-${this.ordenacao.direcao}`);
            }
        });
    },

    async carregarSemanas() {
        try {
            const response = await fetch('/api/semanas');
            this.semanasLista = await response.json();
            this.renderizarDropdown();
            if (this.semanasLista.length > 0) {
                this.carregarSemana(this.semanasLista[0].id);
            } else {
                this.dom.tbody.innerHTML = '<tr><td colspan="20" class="text-center">Nenhuma semana encontrada. Clique em "+ Nova" para começar.</td></tr>';
            }
        } catch (error) {
            console.error('Erro loading:', error);
        }
    },

    renderizarDropdown() {
        this.dom.selectSemana.innerHTML = this.semanasLista.map(s => {
            const formatarData = (dt) => {
                if (!dt) return '??/??';
                const partes = dt.split('-');
                return `${partes[2]}/${partes[1]}`;
            };
            const inicio = formatarData(s.data_inicio);
            const fim = formatarData(s.data_fim);
            const statusIcon = s.status === 'fechada' ? '🔒' : '📝';
            return `<option value="${s._id}">${statusIcon} ${inicio} a ${fim}</option>`;
        }).join('');
    },

    async carregarSemana(id) {
        if (!id) return;
        try {
            this.dom.selectSemana.value = id;

            // 1. Identificar ID Anterior para Fetch Paralelo
            let idAnterior = null;
            // [FIX] ID do banco é 'id', não '_id'. Isso corrigirá o cálculo da semana anterior.
            const currentIndex = this.semanasLista.findIndex(s => s.id == id); // == para garantir string/int match
            if (currentIndex !== -1 && currentIndex + 1 < this.semanasLista.length) {
                idAnterior = this.semanasLista[currentIndex + 1].id;
            }

            // 2. Otimização: Carregar semana atual PRIMEIRO para renderizar rápido
            // Não esperar a semana anterior para mostrar a grid principal
            const resAtual = await fetch(`/api/semanas/${id}`);
            this.semanaAtual = await resAtual.json();

            // Renderizar IMEDIATAMENTE (Semana Anterior ainda será null, delta ficará zerado por instantes)
            this.semanaAnterior = null;

            // 3. Ordenação & Render Inicial
            this.ordenacao = { campo: 'placa', direcao: 'asc' };
            this.renderizarGrid();
            this.atualizarIconesOrdenacao();

            // 4. Carregar Semana Anterior em Background (para o Rodapé)
            if (idAnterior) {
                fetch(`/api/semanas/${idAnterior}`)
                    .then(r => r.json())
                    .then(anterior => {
                        this.semanaAnterior = anterior;
                        // Forçar atualização só do rodapé/filtro sem recriar toda a tabela se possível,
                        // mas chamar renderizarGrid() é seguro e rápido se o DOM já existe.
                        // Melhor: chamar aplicarFiltro que atualiza o rodapé
                        const filtroAtivo = document.querySelector('.filtro-btn.active');
                        this.aplicarFiltro(filtroAtivo ? filtroAtivo.dataset.filtro : 'todos');
                    })
                    .catch(err => console.error('Erro loading previous week stats:', err));
            }

            // A renderizarGrid chama aplicarFiltro, que vai chamar atualizarRodape com os dados filtrados
            // Mas Icones precisam ser atualizados tambem

            if (this.semanaAtual.status === 'fechada') {
                this.dom.btnFechar.textContent = 'Fechada';
                this.dom.btnFechar.disabled = true;
                this.dom.btnFechar.classList.add('btn-fechada');
                if (this.dom.btnSync) this.dom.btnSync.disabled = true;
            } else {
                this.dom.btnFechar.textContent = 'Fechar';
                this.dom.btnFechar.disabled = false;
                this.dom.btnFechar.classList.remove('btn-fechada');
                if (this.dom.btnSync) this.dom.btnSync.disabled = false;
            }
        } catch (error) {
            console.error('Erro carregar semana:', error);
        }
    },

    // ===============================================
    // GESTÃO DE FOCO
    // ===============================================
    focarCampo(el) {
        el.select();
    },

    desfocarCampo(el) {
        const index = el.dataset.index;
        const campo = el.dataset.campo;
        let novoValor = el.value;

        // Tratamento decimal BR -> JS
        novoValor = novoValor.replace(/\./g, '');
        novoValor = novoValor.replace(',', '.');

        this.atualizarLinha(index, campo, novoValor);

        // Reformatar visual
        const valorAtualizado = this.semanaAtual.linhas[index][campo];
        el.value = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valorAtualizado);
    },


    gerarIcones(linha) {
        // Configuração de Estilo
        const slotStyle = 'width: 16px; text-align: center; display: inline-block;';
        const iconStyle = 'font-size: 14px; vertical-align: middle;';

        // Slots: [1: Status] [2: AS] [3: CO/BO]
        let slot1 = '';
        let slot2 = '';
        let slot3 = '';

        const status = linha.status_veiculo || 'disponivel';

        // Slot 1: Status Principal
        // [FIX] Usar valores literais ao invés de Constants.get() para evitar problema de carregamento
        if (status === 'alugado') {
            slot1 = `<i class="ph ph-car-profile" style="${iconStyle} color: #2c3e50;" title="Alugado"></i>`;
        } else if (status === 'disponivel') {
            slot1 = `<i class="ph ph-check-circle" style="${iconStyle} color: #2980b9;" title="Disponível"></i>`;
        } else if (status === 'manutencao') {
            slot1 = `<i class="ph ph-wrench" style="${iconStyle} color: #c0392b;" title="Manutenção"></i>`;
        } else if (status === 'validar') {
            slot1 = `<i class="ph ph-hourglass" style="${iconStyle} color: #9b59b6;" title="Validar"></i>`;
        }

        // Slot 2: AS (Assinatura)
        if (linha.AS) {
            slot2 = `<i class="ph ph-arrows-clockwise" style="${iconStyle} color: #e67e22;" title="AS"></i>`;
        }

        // Slot 3: CO (Conciliado) ou BO (Boleto)
        if (linha.CO) {
            slot3 = `<i class="ph ph-check" style="${iconStyle} color: #27ae60; font-weight: bold;" title="Conciliado"></i>`;
        } else if (linha.BO) {
            slot3 = `<i class="ph ph-receipt" style="${iconStyle} color: #7f8c8d;" title="Boleto"></i>`;
        }

        // Renderizar Container Flex com Slots Fixos
        return `
            <div style="display: flex; justify-content: center; gap: 4px; width: 100%;">
                <span style="${slotStyle}">${slot1}</span>
                <span style="${slotStyle}">${slot2}</span>
                <span style="${slotStyle}">${slot3}</span>
            </div>
        `;
    },

    renderizarGrid() {
        if (!this.semanaAtual || !this.semanaAtual.linhas) {
            this.dom.tbody.innerHTML = '';
            return;
        }

        const formatMoney = (v) => {
            if (v === undefined || v === null || v === '') return 'R$ 0,00';
            return new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            }).format(v);
        };

        const html = this.semanaAtual.linhas.map((linha, index) => {
            const icones = this.gerarIcones(linha);

            let saldoColor = '#000';
            if (linha.saldo > 0.01) saldoColor = '#27ae60';
            if (linha.saldo < -0.01) saldoColor = '#c0392b';

            const pagoColor = linha.recebido > 0 ? '#27ae60' : '#000';
            const clienteOuLocal = linha.cliente || linha.local_manutencao || '-';

            // [NEW] Classe de Status para colorir a linha
            const statusClass = `row-status-${linha.status_veiculo || 'disponivel'}`;

            return `
                <tr data-index="${index}" class="${linha.CO ? 'row-conciliada' : ''} ${statusClass}">
                    <td style="text-align:center; font-size:11px;">${icones}</td>
                    <td><span class="placa-text" onclick="ModalEdicao.abrir(${index})">${linha.placa || '-'}</span></td>
                    <td style="text-align:left;">${clienteOuLocal}</td>
                    <td style="text-align:right;">${formatMoney(linha.tabelado)}</td>
                    <td style="text-align:center;">${linha.dias || 0}</td>
                    <td style="text-align:right;">${formatMoney(linha.semana)}</td>
                    <td style="text-align:right;">${formatMoney(linha.p_premium)}</td>
                    <td style="text-align:right;">${formatMoney(linha.protecao)}</td>
                    <td style="text-align:right;">${formatMoney(linha.acordo)}</td>
                    <td style="text-align:right;">${formatMoney(linha.ta_boleto)}</td>
                    <td style="text-align:right;">-${formatMoney(linha.desconto)}</td>
                    <td style="text-align:right; background:#fdfefe;">${formatMoney(linha.previsto)}</td>
                    <td style="text-align:right; color:${pagoColor};">${formatMoney(linha.recebido)}</td>
                    <td style="text-align:right; color:${saldoColor};">${formatMoney(linha.saldo)}</td>
                </tr>
            `;
        }).join('');

        this.dom.tbody.innerHTML = html;

        const filtroAtivo = document.querySelector('.filtro-btn.active');
        const tipoHelper = filtroAtivo ? filtroAtivo.dataset.filtro : 'todos';
        this.aplicarFiltro(tipoHelper);
    },

    testarLinhaComFiltro(linha, termoBusca, tipoFiltro) {
        // 1. Filtro por Categoria (Abas)
        let visivelTipo = true;

        switch (tipoFiltro) {
            case Constants.get('STATUS_VEICULOS').ALUGADO:
                visivelTipo = (linha.status_veiculo === Constants.get('STATUS_VEICULOS').ALUGADO);
                break;
            case Constants.get('STATUS_VEICULOS').DISPONIVEL:
                visivelTipo = (linha.status_veiculo === Constants.get('STATUS_VEICULOS').DISPONIVEL);
                break;
            case Constants.get('STATUS_VEICULOS').MANUTENCAO:
                visivelTipo = (linha.status_veiculo === Constants.get('STATUS_VEICULOS').MANUTENCAO);
                break;
            case Constants.get('STATUS_VEICULOS').VALIDAR:
                // [FIX] Catch-all: Mostra qualquer coisa que não seja Alugado, Disponível ou Manutenção
                visivelTipo = (linha.status_veiculo !== Constants.get('STATUS_VEICULOS').ALUGADO &&
                    linha.status_veiculo !== Constants.get('STATUS_VEICULOS').DISPONIVEL &&
                    linha.status_veiculo !== Constants.get('STATUS_VEICULOS').MANUTENCAO);
                break;
            case 'receber':
                // [REQ] Só veículos alugados que ainda não foram recebidos (não conciliados)
                visivelTipo = (linha.status_veiculo === Constants.get('STATUS_VEICULOS').ALUGADO || !linha.status_veiculo) && !linha.CO;
                break;
            case 'recebidos':
                visivelTipo = !!linha.CO; // Conciliado
                break;
            default:
                visivelTipo = true;
        }

        // 2. Filtro por Texto (Busca)
        let visivelBusca = true;
        if (termoBusca) {
            // Helper para normalizar (remover acentos)
            const normalizar = (str) => {
                return (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase();
            };

            const termo = normalizar(termoBusca);
            const placa = normalizar(linha.placa);
            const cliente = normalizar(linha.cliente);
            const tipoLinha = normalizar(linha.tipo);

            // Busca Modelo no Cache usando a placa
            const dadosVeiculo = this.veiculosCache[linha.placa];
            const modelo = dadosVeiculo ? normalizar(dadosVeiculo.modelo) : '';

            visivelBusca = placa.includes(termo) ||
                cliente.includes(termo) ||
                tipoLinha.includes(termo) ||
                modelo.includes(termo);
        }

        return visivelTipo && visivelBusca;
    },

    aplicarFiltro(tipo) {
        const termoBusca = this.dom.inputBusca ? this.dom.inputBusca.value.trim().toLowerCase() : '';
        const rows = this.dom.tbody.querySelectorAll('tr');

        // A. Visual: Esconder/Mostrar Linhas na Grid
        rows.forEach(row => {
            const index = row.dataset.index;
            const linha = this.semanaAtual.linhas[index];
            const visivel = this.testarLinhaComFiltro(linha, termoBusca, tipo);
            row.style.display = visivel ? '' : 'none';
        });

        // B. Dados: Calcular Totais Filtrados
        const linhasAtuaisFiltradas = (this.semanaAtual?.linhas || []).filter(l => this.testarLinhaComFiltro(l, termoBusca, tipo));

        let linhasAnterioresFiltradas = [];
        if (this.semanaAnterior?.linhas) {
            linhasAnterioresFiltradas = this.semanaAnterior.linhas.filter(l => this.testarLinhaComFiltro(l, termoBusca, tipo));
        }

        this.atualizarRodapeComDados(linhasAtuaisFiltradas, linhasAnterioresFiltradas);

        // C. Atualizar Contador de Veículos Únicos
        // [FIX] Passar TODAS as linhas, não apenas as filtradas, para ter contagem real
        this.atualizarContadorVeiculos(this.semanaAtual?.linhas || [], tipo);
    },

    atualizarContadorVeiculos(todasLinhas, filtroAtivo) {
        if (!this.dom.contadorVeiculos) return;

        // Lógica Temporal (replicando backend)
        // Agrupar por Placa
        const mapaVeiculos = {};

        todasLinhas.forEach(linha => {
            if (!linha.placa) return;
            const placa = linha.placa.trim().toUpperCase(); // Normalização

            if (!mapaVeiculos[placa]) {
                mapaVeiculos[placa] = {
                    timeline: Array(7).fill(null),
                    hasAlugado: false,
                    defaultStatus: null // [NEW] Status implícito se timeline estiver vazia
                };
            }

            const stats = mapaVeiculos[placa];

            // [FIX] Garantir que seja array (pode vir como string do banco/api)
            let diasSel = [];
            try {
                if (Array.isArray(linha.dias_selecionados)) {
                    diasSel = linha.dias_selecionados;
                } else if (typeof linha.dias_selecionados === 'string') {
                    diasSel = JSON.parse(linha.dias_selecionados);
                }
            } catch (e) {
                console.warn('Erro parsing dias_selecionados', linha.placa, e);
                diasSel = [];
            }

            if (linha.status_veiculo === Constants.get('STATUS_VEICULOS').ALUGADO) {
                stats.hasAlugado = true;
                stats.defaultStatus = Constants.get('STATUS_VEICULOS').ALUGADO; // [FIX] Salvar status base para alugado também
                if (diasSel.length > 0) {
                    diasSel.forEach(d => {
                        if (d >= 0 && d < 7) stats.timeline[d] = Constants.get('STATUS_VEICULOS').ALUGADO;
                    });
                } else if ((linha.dias || 0) >= 7) {
                    stats.timeline.fill(Constants.get('STATUS_VEICULOS').ALUGADO);
                }
            } else if (linha.status_veiculo === Constants.get('STATUS_VEICULOS').DISPONIVEL || linha.status_veiculo === Constants.get('STATUS_VEICULOS').MANUTENCAO) {
                stats.defaultStatus = linha.status_veiculo; // Salva o status base para fallback
                if (diasSel.length > 0) {
                    diasSel.forEach(d => {
                        if (d >= 0 && d < 7) stats.timeline[d] = linha.status_veiculo;
                    });
                }
            }
        });

        // 2. Contar Totais Reais (Baseado no Status Final / Segunda-feira)
        let countAlugados = 0;
        let countDisponiveis = 0;
        let countManutencao = 0;
        let countValidar = 0;

        Object.values(mapaVeiculos).forEach(v => {
            let statusFinal = v.timeline[6]; // Segunda-feira (Fim da Semana)

            // Fallback: Se status final for null, buscar último status conhecido
            if (statusFinal === null) {
                for (let i = 6; i >= 0; i--) {
                    if (v.timeline[i]) {
                        statusFinal = v.timeline[i];
                        break;
                    }
                }
            }

            // Categorização
            if (statusFinal === Constants.get('STATUS_VEICULOS').ALUGADO) countAlugados++;
            else if (statusFinal === Constants.get('STATUS_VEICULOS').MANUTENCAO) countManutencao++;
            else if (statusFinal === Constants.get('STATUS_VEICULOS').DISPONIVEL) countDisponiveis++;
            else {
                if (v.defaultStatus === Constants.get('STATUS_VEICULOS').ALUGADO) { // [FIX] Check for alugado fallback
                    countAlugados++;
                } else if (v.defaultStatus === Constants.get('STATUS_VEICULOS').MANUTENCAO) {
                    countManutencao++;
                } else if (v.defaultStatus === Constants.get('STATUS_VEICULOS').DISPONIVEL) {
                    countDisponiveis++;
                } else {
                    countValidar++;
                }
            }
        });

        // O texto deve refletir o FILTRO ATUAL ou o TOTAL DE ALUGADOS?
        // O usuário pediu: "quero saber quantos veiculos eu tneho disponivel na semana"
        // Se o filtro for 'todos', mostramos alugados ou totais da lista?
        // O contador atual mostra "X veículos" (contagem visual da lista).
        // Se eu filtrar por 'disponivel', ele vai contar quantos sobraram.
        // A lógica de filtragem `testarLinhaComFiltro` já esconde visualmente as linhas.
        // Se eu tenho 2 linhas (1 alugada, 1 disponivel) para o msm carro:
        // - Filtro TODOS: aparecem as 2. Count = 1 veiculo (único).
        // - Filtro ALUGADO: aparece so a alugada. Count = 1 veiculo.
        // - Filtro DISPONIVEL: aparece so a disponivel. Count = 1 veiculo.

        // O problema é que "1 veiculo" no filtro "disponível" parece correto.
        // Mas no filtro "Alugado", se o carro foi devolvido, ele não deveria aparecer?
        // O usuário disse: "Se o carro estava alugado no inicio... mas no final devolvido... em alugados ele não é contabilizado."

        // A função aplicarFiltro chama esta função com as linhas VISÍVEIS.
        // Se o filtro visual mostrou a linha 'alugado' (porque o filtro é 'alugado' ou 'todos'), ela entra aqui.
        // Se a gente aplicar a logica temporal ESTRITA, um carro devolvido não conta como alugado.
        // Mas se a linha está visível, o usuário espera que ela conte? 
        // "Na imagem mostra 138 veiculos alugados... mas tem veiculos que ficaram disponiveis"
        // Ele quer que o número reflita a realidade DO FIM DA SEMANA, não a soma das linhas.

        // Então, mantemos a lógica: Contamos PLACAS ÚNICAS das linhas visíveis.
        // MAS, se o filtro for 'alugado', e o carro foi devolvido, ele nem deveria estar nessa lista?
        // O filtro `testarLinhaComFiltro` é linha a linha. Ele não sabe o contexto temporal.
        // Se eu mudar o contador mas manter a linha visivel, fica confuso ("vejo a linha mas o contador diz 0").

        // Solução ideal: O contador reflete o que foi filtrado.
        // Se o filtro é 'alugado', o contador deve mostrar quantos carros ESTÃO alugados.
        // Mas se a linha de terça-feira (alugado) passou pelo filtro, ela tá lá.
        // O usuário quer que essa linha NÃO conte para o total de "Veículos Alugados Atualmente"?
        // Sim. "Exemplo: cliente A pegou Carro B de terça a quinta... isso conta um alugado e não 2." (Primeiro request)
        // "ele deve ser cntabilidado só em disponiveis, mas em alugados ele não é contabilizado" (Segundo request)

        // Ok, então mesmo se a linha 'Alugado' estiver na tela (pq existiu aluguel), o contador deve ignora-la se o carro terminou a semana disponivel?
        // Isso pode ser confuso: "Vejo 10 linhas de aluguel, mas contador diz 9".
        // Mas parece ser o que ele quer: KPIs Reais.

        // Vou usar a lógica de PLACAS ÚNICAS simples para "Quantos veículos correspondem a essas linhas". 
        // E ADICIONAR um label extra se possível? Não, vamos seguir a lógica do backend.
        // Se o contexto é "Quantos veículos únicos estão aqui".

        // Se eu tenho 138 linhas de aluguel. 10 carros foram devolvidos.
        // O contador deve mostrar 128? Sim.

        // A minha implementação acima (countAlugados) faz exatamente isso:
        // Só conta se status final = alugado.
        // Se o carro foi devolvido (status final = disponivel), countAlugados não incrementa.
        // E se o filtro for 'disponivel'?
        // Aí countAlugados vai dar 0 (pq status final = disponivel, não alugado).
        // Mas o contador deve mostrar "X disponiveis".

        // A lógica deve ser: "Quantos veículos ÚNICOS satisfazem o status predominante na lista visualizada?"
        // Se estou vendo 'todos', quero saber quantos carros únicos existem. (138 carros únicos, independente do status).
        // Se apenas contar 'alugados', vai dar um número menor que o total de linhas.

        // VAMOS SIMPLIFICAR PARA O FRONTEND (VISUAL):
        // O contador da grade serve para dizer "Quantos carros estou vendo".
        // Se o usuário quer KPI de Ocupação, ele olha no Dashboard (que acabamos de corrigir).
        // O contador da grade "138 veículos" deve dizer quantos objetos físicos distintos estão listados.
        // Se eu tenho [Fusca - Alugado] e [Fusca - Disponivel].
        // Filtro Todos -> Vejo 2 linhas. Contador = 1 Veículo. (Isso já fazemos com Set).
        // Filtro Alugado -> Vejo 1 linha [Fusca - Alugado]. Contador = 1 Veículo. 
        //   (Mas usuário diz: "em alugados ele não é contabilizado").
        //   Isso implica que a LINHA nem deveria aparecer no filtro 'alugado'? 
        //   Se o carro foi devolvido, ele não está mais alugado. Mas HISTORICAMENTE naquela semana ele ESTEVE.
        //   A Grade é Semanal (Histórico). O Dashboard é Gerencial.

        // O usuário disse: "Na imagem mostra 138 veiculos alugados... mas tem veiculos que ficaram alugafos no inicio... mas no final... disponiveis"
        // Ele quer que o contador ("138") reflita o status FINAL.
        // Entao se eu filtro 'alugado', e tenho 138 registros historicos, mas 10 devolveram...
        // Eu devo mostrar 128?

        // Vou assumir que SIM. O contador é "Quantos veículos ativos/validos para essa categoria".

        // Mas espere, se eu filtro 'disponivel', eu vejo [Fusca - Disponivel].
        // Status final = Disponivel.
        // countAlugados = 0.
        // O contador vai mostrar "0 veículos"? Não pode. Tem que mostrar 1.

        // FIX: O contador deve contar quantos veículos únicos ÚTEIS sobraram.
        // Vou contar Quantos Veículos Únicos existem no total (Set Placa).
        // ISSO já resolve a duplicação "2 linhas = 1 carro".
        // O problema "conta como alugado mesmo devolvido" é semântico.

        // SE o filtro for "Alugado", vou aplicar a lógica restritiva (Só conta se terminou alugado).
        // SE o filtro for "Disponivel", so conta se terminou disponivel.
        // SE for Todos, conta unicos total.

        // Usar o parâmetro filtroAtivo ao invés de buscar no DOM
        const tipoFiltro = filtroAtivo || 'todos';

        // Contar quantos veículos únicos estão visíveis no filtro atual
        const placasUnicas = new Set();
        todasLinhas.forEach(linha => {
            if (linha.placa && this.testarLinhaComFiltro(linha, '', tipoFiltro)) {
                placasUnicas.add(linha.placa.trim().toUpperCase());
            }
        });

        const count = placasUnicas.size;

        if (tipoFiltro === Constants.get('STATUS_VEICULOS').ALUGADO) {
            this.dom.contadorVeiculos.textContent = `${count} listados (${countAlugados} ativos)`;
        } else if (tipoFiltro === Constants.get('STATUS_VEICULOS').MANUTENCAO) {
            this.dom.contadorVeiculos.textContent = `${count} listados (${countManutencao} em manutenção)`;
        } else if (tipoFiltro === Constants.get('STATUS_VEICULOS').DISPONIVEL) {
            this.dom.contadorVeiculos.textContent = `${count} listados (${countDisponiveis} disponíveis)`;
        } else if (tipoFiltro === Constants.get('STATUS_VEICULOS').VALIDAR) {
            this.dom.contadorVeiculos.textContent = `${count} listados (${countValidar} a validar)`;
        } else {
            // Default para 'todos'
            this.dom.contadorVeiculos.textContent = count === 1 ? '1 veículo listado' : `${count} veículos listados`;
        }
    },

    async atualizarLinhaNoGrid(index, dados) {
        if (!this.semanaAtual) return;

        // Atualizar linha localmente line-by-line
        this.semanaAtual.linhas[index] = { ...this.semanaAtual.linhas[index], ...dados };

        // Recalcular totais e renderizar
        this.renderizarGrid();
        this.atualizarRodape();

        // Persistir
        await this.salvarSemana();

    },

    async atualizarLinha(index, campo, valor) {
        if (!this.semanaAtual) return;
        let linha = this.semanaAtual.linhas[index];

        // Validação Estrita de Cliente (Bloqueia não cadastrado)
        if (campo === 'cliente' && valor.trim() !== '') {
            const nomeBusca = valor.trim().toUpperCase();
            // Cache é array de objetos {nome: 'Fulano', ...}
            const clienteValido = this.clientesCache.some(c => c.nome.toUpperCase() === nomeBusca);

            if (!clienteValido) {
                alert('⚠️ CLIENTE NÃO ENCONTRADO!\n\nPor favor, cadastre o cliente no módulo "Clientes" antes de vinculá-lo aqui.');

                // Reverter visualmente
                const input = this.dom.tbody.querySelector(`tr[data-index="${index}"] input[data-campo="cliente"]`);
                if (input) input.value = linha.cliente || '';
                return; // ABORTA
            }
        }

        // Validação de Conciliação (CO)
        if (campo === 'CO' && valor === true) {
            // Regra: Só pode conciliar se tiver valor recebido
            if (linha.recebido <= 0.01) {
                alert('⚠️ AÇÃO BLOQUEADA\n\nNão é possível conciliar uma linha sem valor Recebido.\nInforme o valor pago antes de dar baixa.');

                // Reverter Checkbox (Visualmente)
                const checkbox = this.dom.tbody.querySelector(`tr[data-index="${index}"] input[data-campo="CO"]`);
                if (checkbox) checkbox.checked = false;

                return; // ABORTA
            }
        }

        if (['dias', 'tabelado', 'diaria', 'p_premium', 'protecao', 'acordo', 'ta_boleto', 'desconto', 'recebido'].includes(campo)) {
            valor = parseFloat(valor) || 0;
        }
        linha[campo] = valor;

        // [FIX] REMOVED FRONTEND CALCULATIONS - BACKEND IS THE TRUTH
        /*
        if (window.Calculations) {
            linha.semana = Calculations.calcularSemana(linha.dias, linha.tabelado);
            linha.previsto = Calculations.calcularPrevisto(linha);
            linha.saldo = Calculations.calcularSaldo(linha.recebido, linha.previsto);
        }
        */

        // Visual Feedback (Optimistic UI - optional, but user said 'dumb', so let's trust backend)
        // this.atualizarDOMCalculado(index, linha); // Removed to avoid fake updates

        // Show loading state?
        const tr = this.dom.tbody.querySelector(`tr[data-index="${index}"]`);
        if (tr) tr.style.opacity = '0.5';

        await this.salvarSemana();
    },

    async salvarSemana() {
        if (!this.semanaAtual) return;

        try {
            const payload = {
                linhas: this.semanaAtual.linhas,
                status: this.semanaAtual.status
            };

            const response = await fetch(`/api/semanas/${this.semanaAtual.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error('Erro ao salvar');

            const result = await response.json();

            // [SYNC] Update Grid with Truth from Backend
            if (result.data) {
                this.semanaAtual = result.data; // Full Replace
                this.renderizarGrid(); // Re-render with calculated values
                this.atualizarIconesOrdenacao();

                // [DataRefreshBus] Notificar outros módulos
                if (window.DataRefreshBus) {
                    DataRefreshBus.notifyDataChanged('all');
                }
            }

        } catch (error) {
            console.error('Erro ao salvar:', error);
            alert('Erro ao salvar alterações. Verifique sua conexão.');
        } finally {
            // Restore opacity
            const rows = this.dom.tbody.querySelectorAll('tr');
            rows.forEach(r => r.style.opacity = '1');
        }
    },
    async duplicarLinha(index) {
        if (!this.semanaAtual) return;

        if (this.semanaAtual.status === 'fechada') {
            if (window.SystemAlert) SystemAlert.warning('Semana fechada.');
            return;
        }

        const linhaOrigem = this.semanaAtual.linhas[index];

        const novaLinha = {
            ...linhaOrigem,
            AS: false,
            cliente: '',
            dias: 0,
            dias_selecionados: [], // Começar zerado para obrigar escolha e evitar colisão
            status_veiculo: Constants.get('STATUS_VEICULOS').DISPONIVEL,
            tabelado: 0, // Será calculado proporcionalmente quando selecionar os dias
            diaria: 0, semana: 0,
            p_premium: 0, protecao: 0, acordo: 0, ta_boleto: 0, desconto: 0,
            previsto: 0, recebido: 0, saldo: 0,
            BO: false, CO: false, observacoes: ''
        };

        // Remover IDs para evitar conflito no banco
        delete novaLinha._id;
        delete novaLinha.id; // Precaução extra

        // Inserir logo após a original
        const novoIndex = index + 1;
        this.semanaAtual.linhas.splice(novoIndex, 0, novaLinha);

        await this.salvarSemana();
        this.renderizarGrid(); // Atualiza grid visualmente

        // REABRIR O MODAL NA NOVA LINHA
        if (window.ModalEdicao) {
            ModalEdicao.abrir(novoIndex);

            if (window.SystemAlert) {
                // Pequeno toast/aviso flutuante seria ideal, mas um alerta rápido serve
                SystemAlert.success('Veículo duplicado com sucesso!');
            }
        }
    },

    async sincronizarFrota() {
        if (!this.semanaAtual) return;

        const confirmed = await SystemAlert.confirm(
            'Isso irá atualizar os valores tabelados e inserir novos veículos do cadastro.\n\nDeseja continuar?',
            'Sincronizar Frota'
        );
        if (!confirmed) return;

        try {
            const id = this.semanaAtual._id;
            const res = await fetch(`/api/semanas/${id}/sincronizar`, {
                method: 'POST'
            });

            if (res.ok) {
                const atualizada = await res.json();
                this.semanaAtual = atualizada;
                this.renderizarGrid();
                this.atualizarRodape();

                if (window.SystemAlert) SystemAlert.success('Frota sincronizada com sucesso!');
            } else {
                if (window.SystemAlert) SystemAlert.error('Erro ao sincronizar frota.');
            }
        } catch (e) {
            console.error(e);
            if (window.SystemAlert) SystemAlert.error('Erro de conexão ao sincronizar.');
        }
    },

    async salvarSemana() {
        try {
            const id = this.semanaAtual._id || this.semanaAtual.id;
            const payload = { status: this.semanaAtual.status, linhas: this.semanaAtual.linhas };
            await fetch(`/api/semanas/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (e) { console.error('Erro save', e); }
    },

    async fecharSemana() {
        const confirmed = await SystemAlert.confirm(
            'Tem certeza que deseja fechar esta semana?\n\nApós fechada, não será mais possível editá-la.',
            '🔒 Fechar Semana'
        );

        if (!confirmed) return;

        this.semanaAtual.status = 'fechada';
        await this.salvarSemana();
        this.carregarSemana(this.semanaAtual._id);

        if (window.SystemAlert) {
            SystemAlert.success('Semana fechada com sucesso!');
        }
    },

    async excluirLinha(index) {
        // Confirmação já feita pelo Modal
        this.semanaAtual.linhas.splice(index, 1);
        await this.salvarSemana();
        this.renderizarGrid();
    },

    atualizarRodape() {
        // Wrapper para compatibilidade se chamado sem argumentos (usa tudo)
        // Mas agora o fluxo principal é via aplicarFiltro.
        // Se precisar forçar refresh geral:
        if (this.semanaAtual) {
            this.aplicarFiltro(document.querySelector('.filtro-btn.active')?.dataset.filtro || 'todos');
        }
    },

    atualizarRodapeComDados(linhasAtuais, linhasAnteriores) {
        // Agora repassa corretamente os filtrados
        this.renderFooterModerno(linhasAtuais, linhasAnteriores);
    },

    calcularTotaisColunas(linhas) {
        const chaves = ['tabelado', 'semana', 'p_premium', 'protecao', 'acordo', 'ta_boleto', 'desconto', 'previsto', 'recebido', 'saldo'];
        const totais = {};
        chaves.forEach(k => totais[k] = 0);

        linhas.forEach(l => {
            chaves.forEach(k => {
                totais[k] += (parseFloat(l[k]) || 0);
            });
        });
        return totais;
    },

    gerarTotaisZerados() {
        const chaves = ['tabelado', 'semana', 'p_premium', 'protecao', 'acordo', 'ta_boleto', 'desconto', 'previsto', 'recebido', 'saldo'];
        const t = {};
        chaves.forEach(k => t[k] = 0);
        return t;
    },

    renderFooterModerno(linhasAtuais, linhasAnteriores) {
        const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

        // [FIX] Usar linhas passadas por parâmetro (filtradas) ou fallback para todas
        const targetLinhasAtual = linhasAtuais || (this.semanaAtual ? this.semanaAtual.linhas : []);
        const targetLinhasAnterior = linhasAnteriores || (this.semanaAnterior ? this.semanaAnterior.linhas : []);

        const totaisAtual = this.calcularTotaisColunas(targetLinhasAtual);
        const totaisAnterior = this.calcularTotaisColunas(targetLinhasAnterior);

        // Todas as colunas financeiras
        const colunas = ['tabelado', 'semana', 'p_premium', 'protecao', 'acordo', 'ta_boleto', 'desconto', 'previsto', 'recebido', 'saldo'];

        // Popular valores atuais
        // Popular valores atuais
        colunas.forEach(col => {
            const el = document.getElementById(`foot-atual-${col}`);
            if (el) {
                el.textContent = fmt(totaisAtual[col] || 0);

                // Aplicar cores no saldo e recebido
                if (col === 'saldo') {
                    el.style.color = ''; // Reset
                    if (totaisAtual[col] > 0.01) el.style.color = '#27ae60';
                    if (totaisAtual[col] < -0.01) el.style.color = '#c0392b';
                }
            }
        });

        // Popular valores anteriores
        colunas.forEach(col => {
            const el = document.getElementById(`foot-ant-${col}`);
            if (el) {
                el.textContent = fmt(totaisAnterior[col] || 0);
                if (col === 'saldo') {
                    el.style.color = '';
                    if (totaisAnterior[col] > 0.01) el.style.color = '#27ae60';
                    if (totaisAnterior[col] < -0.01) el.style.color = '#c0392b';
                }
            }
        });

        // 3. Popular Variação (Novo)
        colunas.forEach(col => {
            const el = document.getElementById(`foot-diff-${col}`);
            if (el) {
                const atual = totaisAtual[col] || 0;
                const anterior = totaisAnterior[col] || 0;
                const diff = atual - anterior;

                let percent = 0;
                if (anterior !== 0) {
                    percent = (diff / Math.abs(anterior)) * 100;
                } else if (atual !== 0) {
                    percent = 100; // Saiu de 0 para algo
                }

                // Formatar display compacto: "R$ +50 (10%)"
                // const diffFmt = fmt(Math.abs(diff));
                const diffFmt = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(diff);
                const percentFmt = percent.toFixed(2).replace('.', ',') + '%';

                // Ex: "+ 1.200 (10%)"
                const sinal = diff > 0 ? '+' : '';
                el.textContent = `${sinal}${diffFmt} (${sinal}${percentFmt})`;

                // Cores discretas para variação
                el.style.color = '#95a5a6'; // Neutro
                if (diff > 0.01) el.style.color = '#27ae60'; // Verde
                if (diff < -0.01) el.style.color = '#c0392b'; // Vermelho

                // Se for zero, deixa traço
                if (Math.abs(diff) < 0.01) {
                    el.textContent = '-';
                    el.style.color = '#bdc3c7';
                }
            }
        });

        // Popular valores anteriores
        colunas.forEach(col => {
            const el = document.getElementById(`ant-${col}`);
            if (el) {
                el.textContent = fmt(totaisAnterior[col] || 0);

                // Aplicar cores no saldo
                if (col === 'saldo') {
                    el.classList.remove('positivo', 'negativo');
                    if (totaisAnterior[col] > 0) el.classList.add('positivo');
                    if (totaisAnterior[col] < 0) el.classList.add('negativo');
                }
            }
        });
    },

    async criarNovaSemana() {
        // Calcular Sugestão de Data (Terça-feira ideal)
        let sugestao = '';
        if (this.semanasLista.length > 0) {
            // Tem histórico: Sugere dia seguinte ao fim da ultima
            // Ultima é weeks[0] pois order DESC
            const ultima = this.semanasLista[0];
            const fimUltima = new Date(ultima.data_fim); // "YYYY-MM-DD" ja funciona em date? se vier do banco sqlite vem string.
            // Ajuste timezone simples
            const dt = new Date(ultima.data_fim);
            dt.setDate(dt.getDate() + 1);
            sugestao = dt.toISOString().split('T')[0];
        } else {
            // Primeira semana: Sugerir a Terça-feira mais recente (ou hoje se for terça)
            const hoje = new Date();
            const diaSemana = hoje.getDay(); // 0=Dom, 1=Seg, 2=Ter...
            // Distancia para terca passada: 
            // Se hoje é Quart (3), Terca foi ontem (-1). (3 - 2 = 1 dia atras)
            // Se hoje é Seg (1), Terca foi semana passada (-6). (1 - 2 = -1 -> +7 = 6 dias atras?)
            // Logica simples:
            const diasParaTerca = (diaSemana + 7 - 2) % 7;
            const terca = new Date(hoje);
            terca.setDate(hoje.getDate() - diasParaTerca);
            sugestao = terca.toISOString().split('T')[0];
        }

        const dataEscolhida = await SystemAlert.promptDate(
            'Selecione a data de início da nova semana:',
            sugestao,
            '📅 Nova Semana'
        );

        if (!dataEscolhida) return; // Cancelou

        try {
            const res = await fetch('/api/semanas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data_inicio_manual: dataEscolhida })
            });

            if (res.ok) {
                const nova = await res.json();
                await this.carregarSemanas();
                await this.carregarSemana(nova._id);

                if (window.SystemAlert) {
                    SystemAlert.success('Semana criada com sucesso!');
                }
            } else {
                // Parsear mensagem de erro do backend
                const errorData = await res.json();
                const mensagem = errorData.error || 'Erro ao criar semana. Verifique a data informada.';

                if (window.SystemAlert) {
                    SystemAlert.error(mensagem, 'Erro ao Criar Semana');
                } else {
                    alert(mensagem);
                }
            }
        } catch (e) {
            if (window.SystemAlert) {
                SystemAlert.error('Erro ao criar semana: ' + e.message);
            } else {
                alert('Erro criar: ' + e);
            }
        }
    },

    navegar(dir) {
        if (!this.semanasLista.length) return;
        const curIdx = this.semanasLista.findIndex(s => s._id === this.dom.selectSemana.value);
        if (curIdx === -1) return;
        let targetIndex = (dir === -1) ? curIdx + 1 : curIdx - 1;
        if (targetIndex >= 0 && targetIndex < this.semanasLista.length) {
            this.carregarSemana(this.semanasLista[targetIndex]._id);
        }
    },

    // ===============================================
    // NAVEGAÇÃO POR TECLADO (EXCEL-LIKE)
    // ===============================================
    handleGridNavigation(e) {
        if (!e.target.matches('input, select')) return;

        const key = e.key;
        if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(key)) return;

        const input = e.target;

        // Detecção de Modo: Se texto todo selecionado = Navegação. Se cursor = Edição.
        const isFullSelection = (input.tagName === 'SELECT') ||
            (input.selectionStart === 0 && input.selectionEnd === input.value.length);

        // Se enter, apenas blur se não quiser navegar. Mas Excel desce.
        // Vamos implementar Enter = Descer, shift+Enter = Subir? 
        // Por enquanto Enter = Descer simples.

        const index = parseInt(input.dataset.index);
        const campo = input.dataset.campo;

        // Vertical: Up / Down / Enter
        if (['ArrowUp', 'ArrowDown', 'Enter'].includes(key)) {
            e.preventDefault();
            const dir = (key === 'ArrowUp') ? -1 : 1;
            const nextIndex = index + dir;

            // Tentar achar linha alvo
            const targetRow = this.dom.tbody.querySelector(`tr[data-index="${nextIndex}"]`);
            if (targetRow) {
                const targetInput = targetRow.querySelector(`[data-campo="${campo}"]`);
                if (targetInput) {
                    targetInput.focus();
                    if (targetInput.select) targetInput.select();
                }
            }
        }

        // Horizontal: Left / Right
        if (['ArrowLeft', 'ArrowRight'].includes(key)) {
            if (!isFullSelection) {
                // Modo Edição: Deixa o navegador mover o cursor
                return;
            }

            // Modo Navegação: Naviga entre colunas
            e.preventDefault();
            this.navegarHorizontal(input, key === 'ArrowLeft' ? -1 : 1);
        }
    },

    navegarHorizontal(currentInput, dir) {
        const row = currentInput.closest('tr');
        if (!row) return;

        // Pega todos inputs visiveis e habilitados da linha
        // Vamos incluir readonly também, pois no Excel voce navega por células bloqueadas.
        const inputs = Array.from(row.querySelectorAll('input:not([type="hidden"]), select'));

        // Filtrar apenas os visíveis (offsetParent) para evitar bizarrices
        const visibleInputs = inputs.filter(el => el.offsetParent !== null && !el.disabled);

        const currIdx = visibleInputs.indexOf(currentInput);
        if (currIdx === -1) return;

        const nextIdx = currIdx + dir;

        if (nextIdx >= 0 && nextIdx < visibleInputs.length) {
            const tgt = visibleInputs[nextIdx];
            tgt.focus();
            if (tgt.select) tgt.select();
        }
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    if (window.Constants) {
        await window.Constants.load();
    } else {
        console.error('Constants util not found!');
    }
    GridSemanal.init();
});
