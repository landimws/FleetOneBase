// ========================================
// MODAL DE EDIÇÃO - LÓGICA FRONTEND
// ========================================

const ModalEdicao = {
    linhaAtual: null,
    indexAtual: null,
    semanaAtual: null,

    abrir(index) {
        console.log('Abrindo modal para linha:', index);

        // Obter dados da semana atual do GridSemanal
        if (!GridSemanal.semanaAtual || !GridSemanal.semanaAtual.linhas) {
            SystemAlert.error('Dados da semana não carregados.');
            return;
        }

        this.semanaAtual = GridSemanal.semanaAtual;
        this.indexAtual = index;
        this.linhaAtual = this.semanaAtual.linhas[index];

        if (!this.linhaAtual) {
            SystemAlert.error('Linha não encontrada.');
            return;
        }

        // Criar e exibir modal
        this.renderizarModal();
    },

    renderizarModal() {
        const linha = this.linhaAtual;
        // A lógica de cálculo de cobrança cuida de zerar se for manutenção.
        const valorSemanal = (linha.valor_semanal !== undefined && linha.valor_semanal !== null) ? linha.valor_semanal : (linha.tabelado || 0);

        // [FIX] Tentar pegar base do objeto aninhado OU do cache global
        let valorBase = 0;
        if (linha.Veiculo && linha.Veiculo.preco_base) {
            valorBase = linha.Veiculo.preco_base;
        } else if (GridSemanal.veiculosCache && GridSemanal.veiculosCache[linha.placa]) {
            valorBase = GridSemanal.veiculosCache[linha.placa].preco_base;
        }
        if (!valorBase) valorBase = 0;

        // Criar overlay e modal
        const overlay = document.createElement('div');
        overlay.id = 'modal-edicao-overlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.6); display: flex; align-items: center; justify-content: center; z-index: 9999;
        `;

        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content-form';
        // Estilo compacto para o modal
        modalContent.style.cssText = 'width: 100%; max-width: 800px; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.2); font-family: "Segoe UI", sans-serif;';

        modalContent.innerHTML = `
            <!-- HEADER COMPACTO -->
            <div class="modal-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 10px 20px; display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 15px;">
                   <h2 style="margin: 0; font-size: 16px;">✏️ ${linha.placa || 'Sem Placa'}</h2>
                   <div class="status-radio-group" style="display: flex; gap: 5px; background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 12px;">
                        <label style="cursor: pointer; display: flex; align-items: center; gap: 3px; color: white; font-size: 12px;">
                            <input type="radio" name="status_veiculo" value="alugado" ${(!linha.status_veiculo || linha.status_veiculo === 'alugado') ? 'checked' : ''}> Alugado
                        </label>
                        <label style="cursor: pointer; display: flex; align-items: center; gap: 3px; color: white; font-size: 12px; margin-left: 8px;">
                            <input type="radio" name="status_veiculo" value="disponivel" ${linha.status_veiculo === 'disponivel' ? 'checked' : ''}> Disponível
                        </label>
                        <label style="cursor: pointer; display: flex; align-items: center; gap: 3px; color: white; font-size: 12px; margin-left: 8px;">
                            <input type="radio" name="status_veiculo" value="manutencao" ${linha.status_veiculo === 'manutencao' ? 'checked' : ''}> Manutenção
                        </label>
                        <label style="cursor: pointer; display: flex; align-items: center; gap: 3px; color: white; font-size: 12px; margin-left: 8px;">
                            <input type="radio" name="status_veiculo" value="validar" ${linha.status_veiculo === 'validar' ? 'checked' : ''}> Validar
                        </label>
                   </div>
                </div>
                <button id="btn-fechar-modal" style="background: none; border: none; color: white; font-size: 24px; cursor: pointer; line-height: 1;">&times;</button>
            </div>

            <div class="modal-body-form" style="padding: 15px; display: flex; flex-direction: column; gap: 12px;">
                
                <!-- CLIENTE (Custom Search) -->
                <div style="display: flex; gap: 10px; align-items: center; z-index: 100;">
                    <label style="font-size: 12px; font-weight: bold; width: 50px;">Cliente:</label>
                    <div class="custom-search-wrapper">
                        <input type="text" id="input-cliente" class="custom-search-input" 
                               value="${linha.cliente || linha.local_manutencao || ''}" 
                               placeholder="Digite para buscar..." autocomplete="off">
                        <div id="lista-clientes-custom" class="custom-dropdown-list">
                            <!-- Opções injetadas via JS -->
                        </div>
                    </div>
                </div>

                <!-- LINHA MESTRA: DIAS E VALOR SEMANAL -->
                <div style="display: flex; gap: 15px; align-items: flex-start; background: #f8f9fa; padding: 10px; border-radius: 6px; border: 1px solid #e9ecef;">
                    
                    <!-- Seletor de Dias (Compacto) -->
                    <div style="flex: 2;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                            <label style="font-size: 11px; font-weight: bold; color: #555;">DIAS COBRADOS (<span id="dias-contagem">0</span>)</label>
                            <div style="font-size: 10px;">
                                <a href="#" id="btn-semana-completa" style="text-decoration: none; color: #667eea; margin-right: 8px;">Todos</a>
                                <a href="#" id="btn-limpar-dias" style="text-decoration: none; color: #e74c3c;">Limpar</a>
                            </div>
                        </div>
                        <input type="hidden" id="input-dias" value="${linha.dias || 0}">
                        <div class="dias-grid" id="dias-grid" style="display: flex; gap: 4px;">
                            <!-- Preenchido via JS (estilo pílula) -->
                        </div>
                    </div>

                    <!-- Separador Vertical -->
                    <div style="width: 1px; background: #ddd; align-self: stretch;"></div>

                    <!-- Valor Semanal -->
                    <div style="flex: 1; text-align: right;">
                        <label style="font-size: 11px; font-weight: bold; display: block; color: #2980b9;">VALOR SEMANAL (7 Dias)</label>
                        <input type="text" id="input-valor-semanal" value="${this.formatarMoeda(linha.valor_semanal || valorSemanal)}" style="width: 100%; font-size: 18px; font-weight: bold; color: #2980b9; text-align: right; border: 1px solid #bdc3c7; border-radius: 4px; padding: 4px;">
                        <!-- Hidden Inputs para compatibilidade -->
                        <input type="hidden" id="input-diaria" value="${this.formatarMoeda(linha.diaria)}">
                        <input type="hidden" id="display-semana">
                    </div>
                </div>

                <!-- EXTRAS (Grid Compacto) -->
                <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px;">
                    <div>
                        <label style="font-size: 10px; color: #555;">P. Premium</label>
                        <input type="text" id="input-p_premium" value="${this.formatarMoeda(linha.p_premium)}" class="input-compacto">
                    </div>
                    <div>
                        <label style="font-size: 10px; color: #555;">Proteção</label>
                        <input type="text" id="input-protecao" value="${this.formatarMoeda(linha.protecao)}" class="input-compacto">
                    </div>
                    <div>
                        <label style="font-size: 10px; color: #555;">Acordo</label>
                        <input type="text" id="input-acordo" value="${this.formatarMoeda(linha.acordo)}" class="input-compacto">
                    </div>
                    <div>
                        <label style="font-size: 10px; color: #555;">Boleto/Taxas</label>
                        <input type="text" id="input-ta_boleto" value="${this.formatarMoeda(linha.ta_boleto)}" class="input-compacto">
                    </div>
                    <div>
                        <label style="font-size: 10px; color: #c0392b;">Descontos</label>
                        <input type="text" id="input-desconto" value="${this.formatarMoeda(linha.desconto)}" class="input-compacto" style="color: #c0392b;">
                    </div>
                </div>

                <!-- OBS + CONTROLES -->
                <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 10px;">
                    <input type="text" id="input-observacoes" placeholder="Observações..." value="${linha.observacoes || ''}" style="width: 100%; border: 1px solid #ddd; border-radius: 4px; padding: 5px; font-size: 12px;">
                    
                    <div style="display: flex; justify-content: flex-end; gap: 8px; align-items: center;">
                        <label style="font-size: 11px; display: flex; align-items: center; gap: 3px;"><input type="checkbox" id="input-AS" ${linha.AS ? 'checked' : ''}> Assinatura</label>
                        <label style="font-size: 11px; display: flex; align-items: center; gap: 3px;"><input type="checkbox" id="input-BO" ${linha.BO ? 'checked' : ''}> Boleto</label>
                    </div>
                </div>

            </div>

            <!-- RODAPÉ COMPACTO -->
            <div class="modal-footer" style="padding: 10px 15px; background: #2c3e50; color: white; display: flex; align-items: center; justify-content: space-between;">
                
                <div style="display: flex; gap: 15px; align-items: center;">
                <!-- Referência Limpa -->
                    <div style="font-size: 11px; opacity: 0.8; display: flex; gap: 5px; align-items: center; border-right: 1px solid rgba(255,255,255,0.2); padding-right: 15px;">
                        <span>Tabelado: <strong id="display-tabelado-meta" style="color: #fff; font-size: 14px;">${this.formatarMoeda(linha.tabelado)}</strong></span>
                        <!-- Base sempre vem do cadastro (fonte única da verdade) -->
                        <input type="hidden" id="input-tabelado-base" value="${this.formatarMoeda(valorBase)}">
                        <input type="hidden" id="input-tabelado" value="${this.formatarMoeda(linha.tabelado)}">
                    </div>

                    <!-- Totais -->
                    <div style="display: flex; gap: 15px;">
                        <div>
                            <span style="font-size: 10px; color: #f1c40f; display: block;">PREVISTO</span>
                            <input type="text" id="display-previsto" value="${this.formatarMoeda(linha.previsto)}" readonly style="background: none; border: none; font-weight: bold; font-size: 16px; color: #f1c40f; width: 100px;">
                        </div>
                        <div style="border-left: 1px solid rgba(255,255,255,0.2); padding-left: 15px;">
                            <span style="font-size: 10px; color: #bdc3c7; display: block;">RECEBIDO</span>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <input type="text" id="input-recebido" value="${this.formatarMoeda(linha.recebido)}" style="background: rgba(255,255,255,0.1); border: none; font-weight: bold; font-size: 16px; color: white; width: 90px; padding: 2px 5px; border-radius: 4px;">
                                <label style="font-size: 11px; display: flex; align-items: center; gap: 3px; cursor: pointer; background: #27ae60; padding: 2px 6px; border-radius: 4px;">
                                    <input type="checkbox" id="input-CO" ${linha.CO ? 'checked' : ''}> Conciliado
                                </label>
                            </div>
                        </div>
                        <div>
                            <input type="hidden" id="display-saldo" value="${this.formatarMoeda(linha.saldo)}">
                        </div>
                    </div>
                </div>

                <!-- BOTOES (Restaurados para estilo Clean/Sem Cancelar) -->
                <div style="display: flex; gap: 15px; align-items: center;">
                     <button id="btn-excluir-linha" class="btn-clean-danger">Excluir</button>
                     <button id="btn-duplicar-linha" class="btn-clean-secondary">Duplicar</button>
                    <button class="btn-primary btn-pill" id="btn-salvar-edicao">Salvar</button>
                </div>
            </div>
            <style>
                .input-compacto { width: 100%; padding: 4px; border: 1px solid #ddd; border-radius: 3px; font-size: 12px; }
            </style>
        `;

        document.body.appendChild(overlay);
        overlay.appendChild(modalContent);

        // FOCUS ON FIRST INPUT
        const firstInput = modalContent.querySelector('input:not([type="hidden"])');
        if (firstInput) firstInput.focus();

        this.registrarEventos(overlay, modalContent);

        // [SEC] Se semana fechada, aplicar bloqueios de edição
        if (this.semanaAtual && this.semanaAtual.status === 'fechada') {
            this.aplicarRegrasSemanaFechada(modalContent);
        }
    },

    aplicarRegrasSemanaFechada(modal) {
        // Bloquear tudo que não for financeiro de baixa (Recebimento/Conciliação)

        // 1. Bloquear Inputs de Texto Estruturais
        const idsBloqueio = [
            'input-cliente',
            'input-valor-semanal',
            'input-p_premium', 'input-protecao', 'input-acordo', 'input-ta_boleto', 'input-desconto',
            'input-observacoes'
        ];
        idsBloqueio.forEach(id => {
            const el = modal.querySelector(`#${id}`);
            if (el) {
                el.disabled = true;
                el.style.backgroundColor = '#f0f0f0';
                el.style.color = '#999';
                el.title = 'Semana Fechada: Edição Bloqueada';
            }
        });

        // 2. Bloquear Status (Radios)
        const radios = modal.querySelectorAll('input[name="status_veiculo"]');
        radios.forEach(r => r.disabled = true);

        // 3. Bloquear Flags Contratuais (AS, BO)
        // Manter CO liberado
        const flags = ['input-AS', 'input-BO'];
        flags.forEach(id => {
            const el = modal.querySelector(`#${id}`);
            if (el) el.disabled = true;
        });

        // 4. Bloquear Seletor de Dias
        const containerDias = modal.querySelector('#dias-grid');
        if (containerDias) {
            containerDias.style.pointerEvents = 'none';
            containerDias.style.opacity = '1'; // FORÇAR TOTALMENTE VISÍVEL
            containerDias.style.filter = 'none';
        }
        const btnAll = modal.querySelector('#btn-semana-completa');
        const btnClear = modal.querySelector('#btn-limpar-dias');
        if (btnAll) btnAll.style.display = 'none';
        if (btnClear) btnClear.style.display = 'none';

        // 5. Esconder Botões Estruturais (Excluir/Duplicar)
        const btnExcluir = modal.querySelector('#btn-excluir-linha');
        const btnDuplicar = modal.querySelector('#btn-duplicar-linha');
        if (btnExcluir) btnExcluir.style.display = 'none';
        if (btnDuplicar) btnDuplicar.style.display = 'none';

        // 6. Aviso Visual
        const header = modal.querySelector('.modal-header');
        if (header) {
            header.style.background = 'linear-gradient(135deg, #7f8c8d 0%, #2c3e50 100%)'; // Cinza Fechado
            const titulo = header.querySelector('h2');
            if (titulo) titulo.innerHTML += ' <span style="font-size: 10px; background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px;">(FECHADA)</span>';
        }

        // Garantir que Recebido e CO estejam LIBERADOS (já são por padrão, mas reforçando visual)
        const inputRecebido = modal.querySelector('#input-recebido');
        if (inputRecebido) inputRecebido.style.border = '1px solid #27ae60'; // Destaque que pode editar

        // [SEC UPDATE] Se não for ALUGADO, bloqueia TUDO (Manutenção/Disponível não tem baixa tardia)
        const status = this.linhaAtual.status_veiculo || 'disponivel';
        if (status !== 'alugado') {
            // Bloquear Financeiro
            if (inputRecebido) {
                inputRecebido.disabled = true;
                inputRecebido.style.border = '1px solid #bdc3c7';
                inputRecebido.style.backgroundColor = '#f0f0f0';
            }
            const inputCO = modal.querySelector('#input-CO');
            if (inputCO) inputCO.disabled = true;

            // Bloquear Botão Salvar (Visualmente Read-Only)
            const btnSalvar = modal.querySelector('#btn-salvar-edicao');
            if (btnSalvar) {
                btnSalvar.disabled = true;
                btnSalvar.textContent = 'Apenas Leitura';
                btnSalvar.style.backgroundColor = '#95a5a6';
                btnSalvar.style.cursor = 'not-allowed';
            }
        }
    },

    registrarEventos(overlay, modalContent) {
        // [UX UPDATE] Auto-selecionar texto ao focar em inputs numéricos/texto
        const inputs = modalContent.querySelectorAll('input[type="text"], input[type="number"]');
        inputs.forEach(input => {
            input.addEventListener('focus', function () {
                this.select();
            });
        });

        // Fechar modal
        const btnFechar = document.getElementById('btn-fechar-modal');
        if (btnFechar) btnFechar.addEventListener('click', () => this.fechar(overlay));

        // Cancelar
        const btnCancelar = document.getElementById('btn-cancelar-edicao');
        if (btnCancelar) btnCancelar.addEventListener('click', () => this.fechar(overlay));

        // Fechar ao clicar fora
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) this.fechar(overlay);
        });

        // Salvar
        const btnSalvar = document.getElementById('btn-salvar-edicao');
        if (btnSalvar) btnSalvar.addEventListener('click', () => this.salvar(overlay));

        // Excluir
        const btnExcluir = document.getElementById('btn-excluir-linha');
        if (btnExcluir) btnExcluir.addEventListener('click', () => this.excluir(overlay));

        // Duplicar
        const btnDuplicar = document.getElementById('btn-duplicar-linha');
        if (btnDuplicar) btnDuplicar.addEventListener('click', () => this.duplicar(overlay));

        // Renderizar seletor de dias
        this.renderizarSeletorDias();

        // Aplicar máscaras de moeda
        this.aplicarMascarasMoeda();

        // Auto-cálculo ao mudar valores
        this.bindAutoCalculo();

        // Bind atalhos de dias
        this.bindAtalhosDias();

        // Aplicar validações visuais iniciais
        this.recalcular();

        // Bind Custom Search
        this.bindCustomSearch();

        // Bind Status Change (Auto-Zero Maintenance)
        this.bindStatusChange();
    },

    bindStatusChange() {
        const radios = document.querySelectorAll('input[name="status_veiculo"]');
        radios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                const status = e.target.value;
                const inputValor = document.getElementById('input-valor-semanal');
                // [FIX] Zerar também o tabelado base visualmente se for manutenção
                // Mas cuidado: se voltar para Alugado, o usuário teria que redigitar? 
                // Melhor: apenas zerar visualmente o input-valor-semanal (Negociado)
                // O tabelado é o preço BASE do carro. Talvez não devamos zerar o input base, 
                // mas sim garantir que o cálculo considere 0.

                if (status === 'manutencao') {
                    // Manutenção = Receita Zero (Prejuízo/Perda)
                    // Validar = NÃO ZERA NADA (comportamento de edição normal)
                    if (inputValor) {
                        inputValor.value = 'R$ 0,00';
                        inputValor.style.backgroundColor = '#fff0f0';
                        setTimeout(() => inputValor.style.backgroundColor = '', 300);
                        this.recalcular();
                    }
                }
            });
        });
    },

    bindCustomSearch() {
        const input = document.getElementById('input-cliente');
        const lista = document.getElementById('lista-clientes-custom');
        if (!input || !lista) return;

        const clientes = GridSemanal.clientesCache || []; // [{nome: '...'}, ...]

        // Função para filtrar e mostrar
        const filtrar = (termo) => {
            lista.innerHTML = '';
            const filtrados = clientes.filter(c =>
                c.nome.toLowerCase().includes(termo.toLowerCase())
            ).slice(0, 10); // Limit to 10 results for perf

            if (filtrados.length === 0) {
                lista.classList.remove('visible');
                return;
            }

            filtrados.forEach(c => {
                const item = document.createElement('div');
                item.className = 'custom-option';
                item.innerHTML = `<span>${c.nome}</span>`; // Pode adicionar sub-text se tiver
                item.addEventListener('click', () => {
                    input.value = c.nome;
                    lista.classList.remove('visible');
                });
                lista.appendChild(item);
            });
            lista.classList.add('visible');
        };

        // Eventos Input
        input.addEventListener('input', (e) => filtrar(e.target.value));
        input.addEventListener('focus', () => {
            if (input.value.length > 0) filtrar(input.value);
            else filtrar(''); // Show All/Recent
        });

        // Fechar ao clicar fora
        document.addEventListener('click', (e) => {
            if (!input.contains(e.target) && !lista.contains(e.target)) {
                lista.classList.remove('visible');
            }
        });
    },

    formatarMoeda(valor) {
        if (valor === undefined || valor === null || valor === '') return 'R$ 0,00';
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
    },

    parseMoeda(texto) {
        if (!texto) return 0;
        // Remove tudo exceto números, vírgula e menos (Remove R$, pontos, espaços)
        const limpo = texto.toString().replace(/[^\d,-]/g, '');
        // Troca vírgula por ponto
        const comPonto = limpo.replace(',', '.');
        return parseFloat(comPonto) || 0;
    },

    aplicarMascarasMoeda() {
        // Incluído 'input-tabelado-base'
        const camposMoeda = ['input-valor-semanal', 'input-tabelado-base', 'input-tabelado', 'input-p_premium', 'input-protecao', 'input-acordo', 'input-ta_boleto', 'input-desconto', 'input-recebido'];

        camposMoeda.forEach(id => {
            const input = document.getElementById(id);
            if (!input) return;

            input.addEventListener('focus', (e) => {
                // Remove formatação ao focar
                const valor = this.parseMoeda(e.target.value);
                e.target.value = valor.toFixed(2).replace('.', ',');

                // Selecionar tudo após mudar valor (para permitir sobrescrever)
                e.target.select();
            });

            input.addEventListener('blur', (e) => {
                // Reformata ao desfocar
                const valor = this.parseMoeda(e.target.value);
                e.target.value = this.formatarMoeda(valor);
            });
        });
    },

    bindAutoCalculo() {
        // Incluído 'input-tabelado-base'
        const camposCalculo = ['input-dias', 'input-valor-semanal', 'input-tabelado-base', 'input-p_premium', 'input-protecao', 'input-acordo', 'input-ta_boleto', 'input-desconto', 'input-recebido'];

        camposCalculo.forEach(id => {
            const input = document.getElementById(id);
            if (!input) return;

            input.addEventListener('input', () => this.recalcular());
        });
    },

    recalcular() {
        const dias = parseInt(document.getElementById('input-dias').value) || 0;

        // 1. Receita (Baseada no Valor Cobrado) - "Preço"
        const valorSemanalInput = document.getElementById('input-valor-semanal');
        const valorSemanal = this.parseMoeda(valorSemanalInput ? valorSemanalInput.value : '0');
        const diaria = valorSemanal / 7;

        // 2. Meta (Baseada no Valor Padrão) - "Alvo" [NOVO LÓGICA]
        // O usuário define a Base (ex: 700). O sistema calcula a meta prop. (ex: 300 p/ 3 dias)
        const baseInput = document.getElementById('input-tabelado-base');
        const base = this.parseMoeda(baseInput ? baseInput.value : '0');
        const diariaMeta = base / 7;

        // [FIX] Se for manutenção/disponível, a META continua sendo a semana cheia (Prejuízo Total)
        // Se for alugado, a meta é proporcional aos dias de posse
        const statusAtualMeta = document.querySelector('input[name="status_veiculo"]:checked');
        const statusValMeta = statusAtualMeta ? statusAtualMeta.value : 'disponivel';

        let novoTabelado = 0;
        if (statusValMeta === 'alugado') {
            novoTabelado = dias * diariaMeta; // Meta Proporcional
        } else {
            // Em manutenção/disponível, a meta é o valor cheio que DEVERIA ter entrado
            // Mas espere, se ficou 3 dias em manutenção, a meta é 3 dias de perda?
            // O usuário quer ver "Tabelado Zerado é ruim".
            // Se eu colocar Base Cheia, o Saldo fica -700.
            // Se eu colocar dias * diariaMeta, e dias=3 (selecionados), fica -300.
            // O problema é que antes eu zerei os dias? Não, agora dias funcionam.
            // O problema é que dias costumam ser 0 ou o usuário marca todos?
            // "Os veiculos em manutenção estão fcadno com o valor tabelado zerado"
            // Se dias=7, novoTabelado=700.
            // Se dias=0, novoTabelado=0.
            // Em manutenção, geralmente contamos os dias parados.
            // Se o usuário selecionar os dias parados, o tabelado deve refletir isso como PREJUÍZO.

            // Lógica Atual: novoTabelado = dias * diariaMeta. 
            // Se dias > 0, deve gerar valor. 
            // O usuário disse que estava zerando. Provavelmente porque não estava salvando os dias antes?
            // Mas ele disse "tabelado zerado".
            // Vou forçar o cálculo com os dias atuais.
            novoTabelado = dias * diariaMeta;

            // Mas se dias == 0, talvez ele queira ver a semana toda como perda?
            // "faz com que o financeiro fique errado" (lucro falso).
            // Se dias=0, e meta=0, saldo=0. Neutro.
            // Se o carro existe, ele tem custo de oportunidade.
            // Vou assumir que se dias=0 em manutenção, o sistema deve assumir 7 dias de perda?
            // Não, melhor respeitar os dias.
            // Mas vou adicionar logs para garantir que 'dias' está vindo certo.
        }

        // [FIX FORCE] Se status != alugado, e dias == 0, assumimos SE PERDEU A SEMANA TODA?
        // Ou forçamos o calculo normal, mas garantimos que 'dias' não seja resetado externamente.
        // O problema anterior era que dias não salvava. Agora salva.
        // O problema "tabelado zerado" pode ser reflexo do problema anterior.
        // Vou manter a lógica proporcional (dias * meta), pois agora dias funcionam.

        // RECUPERANDO A LÓGICA DE CIMA:
        novoTabelado = dias * diariaMeta;

        // [DEBUG] Log para verificar se a base está vindo corretamente
        if (base === 0) {
            console.warn('⚠️ Base price is 0! Veiculo data:', this.linhaAtual.Veiculo);
        }

        // Atualizar inputs invisíveis
        const diariaInput = document.getElementById('input-diaria');
        if (diariaInput) diariaInput.value = this.formatarMoeda(diaria);

        // Atualizar campo Tabelado (Meta para salvar) e Display
        const tabeladoInput = document.getElementById('input-tabelado');
        if (tabeladoInput) tabeladoInput.value = this.formatarMoeda(novoTabelado);

        const displayMeta = document.getElementById('display-tabelado-meta');
        if (displayMeta) displayMeta.textContent = this.formatarMoeda(novoTabelado);

        // Atualizar display da diária equivalente (Cobrada)
        const displayDiariaEq = document.getElementById('display-diaria-eq');
        if (displayDiariaEq) displayDiariaEq.textContent = this.formatarMoeda(diaria);

        const p_premium = this.parseMoeda(document.getElementById('input-p_premium').value);
        const protecao = this.parseMoeda(document.getElementById('input-protecao').value);
        const acordo = this.parseMoeda(document.getElementById('input-acordo').value);
        const ta_boleto = this.parseMoeda(document.getElementById('input-ta_boleto').value);
        const desconto = this.parseMoeda(document.getElementById('input-desconto').value);
        const recebido = this.parseMoeda(document.getElementById('input-recebido').value);

        // Calcular Semana (Receita da Linha)
        // [FIX] Só gera valor se estiver ALUGADO. Manutenção/Disponível = R$ 0,00
        // MAS os dias continuam sendo contados para histórico se o usuário marcou
        const statusAtualEl = document.querySelector('input[name="status_veiculo"]:checked');
        const statusVal = statusAtualEl ? statusAtualEl.value : 'disponivel';

        let semana = 0;
        if (statusVal === 'alugado') {
            semana = dias * diaria;
        } else {
            // Se for manutenção ou disponível, valor é zero, mas mantemos os dias selecionados visualmente
            semana = 0;
        }

        // Calcular Previsto (Receita + Extras - Descontos)
        const previsto = semana + p_premium + protecao + acordo + ta_boleto - desconto;

        // Calcular Saldo
        const saldo = recebido - previsto;

        // Atualizar displays
        const displaySemana = document.getElementById('display-semana');
        if (displaySemana) displaySemana.value = this.formatarMoeda(semana);

        const elPrevisto = document.getElementById('display-previsto');
        if (elPrevisto) {
            elPrevisto.value = this.formatarMoeda(previsto);

            // Cores: Comparar Previsto com Meta Proporcional
            const diferenca = previsto - novoTabelado;

            if (diferenca < -0.01) {
                elPrevisto.style.color = '#e74c3c'; // Vermelho (Abaixo da meta)
            } else if (diferenca > 0.01) {
                elPrevisto.style.color = '#27ae60'; // Verde (Acima da meta por extras)
            } else {
                elPrevisto.style.color = '#f1c40f'; // Amarelo/Gold (Na meta)
            }
        }

        const elSaldo = document.getElementById('display-saldo');
        if (elSaldo) elSaldo.value = this.formatarMoeda(saldo);

        // Lógica de Conciliação
        const inputCO = document.getElementById('input-CO');
        if (inputCO) {
            if (recebido <= 0.01) {
                inputCO.checked = false;
                inputCO.disabled = true;
                inputCO.title = "Informe um valor recebido para conciliar";
            } else {
                inputCO.disabled = false;
                inputCO.title = "";
            }
        }

        // [REGRA DE NEGÓCIO] Se tem valor previsto, TEM que estar alugado
        // Exceto se for Disponível (que pode ter valor de pátio? Não, regra geral: tem valor = alugado)
        if (false) { // REGRA DESATIVADA A PEDIDO DO USUARIO
            const radioAlugado = document.querySelector('input[name="status_veiculo"][value="alugado"]');
            const radioAtual = document.querySelector('input[name="status_veiculo"]:checked');

            // Só muda se não estiver alugado
            if (radioAlugado && radioAtual && radioAtual.value !== 'alugado') {
                radioAlugado.checked = true;
                // Feedback visual sutil (opcional, pode ser irritante se muito chamativo)
            }
        }
    },

    bindModalEvents(overlay) {
        // Fechar modal
        const btnFechar = document.getElementById('btn-fechar-modal');
        if (btnFechar) btnFechar.addEventListener('click', () => this.fechar(overlay));

        // Cancelar (se existir)
        const btnCancelar = document.getElementById('btn-cancelar-modal');
        if (btnCancelar) btnCancelar.addEventListener('click', () => this.fechar(overlay));

        // Fechar ao clicar fora
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) this.fechar(overlay);
        });

        // Salvar
        const btnSalvar = document.getElementById('btn-salvar-modal');
        if (btnSalvar) btnSalvar.addEventListener('click', () => this.salvar(overlay));

        // Excluir
        const btnExcluir = document.getElementById('btn-excluir-linha');
        if (btnExcluir) btnExcluir.addEventListener('click', () => this.excluir(overlay));

        // Duplicar
        const btnDuplicar = document.getElementById('btn-duplicar-linha');
        if (btnDuplicar) btnDuplicar.addEventListener('click', () => this.duplicar(overlay));

        // ESC para fechar
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                this.fechar(overlay);
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
    },

    async duplicar(overlay) {
        // Delegate para GridSemanal que já tem a lógica (mesmo com prompt feio por enquanto)
        // Precisamos fechar o modal antes/depois para não conflitar com o re-render

        if (this.semanaAtual.status === 'fechada') {
            SystemAlert.warning('Semana fechada. Não é possível duplicar.');
            return;
        }

        // CRITICAL FIX: Capturar índice ANTES de fechar (pois o fechar limpa this.indexAtual)
        const indiceParaDuplicar = this.indexAtual;

        this.fechar(overlay); // Fecha o modal primeiro e limpa props

        // Pequeno delay para a UI limpar
        setTimeout(() => {
            if (indiceParaDuplicar !== null && indiceParaDuplicar !== undefined) {
                GridSemanal.duplicarLinha(indiceParaDuplicar);
            }
        }, 100);
    },

    async salvar(overlay) {
        try {
            // FIX: Definindo statusSelecionado corretamente
            const statusSelecionado = document.querySelector('input[name="status_veiculo"]:checked');

            // Capturar ÍNDICES dos Dias Ativos [0, 1, 2, 3, 4, 5, 6]
            const diasSelecionadosArr = [];
            document.querySelectorAll('.dia-btn.active').forEach(btn => {
                const idx = parseInt(btn.dataset.index);
                if (!isNaN(idx)) diasSelecionadosArr.push(idx);
            });
            // [FIX] Recalcular o tabelado proporcional antes de salvar
            const dias = parseInt(document.getElementById('input-dias').value) || 0;
            const baseInput = document.getElementById('input-tabelado-base');
            const base = this.parseMoeda(baseInput ? baseInput.value : '0');

            // [BUSINESS RULE] Valor Tabelado (Meta) é calculado baseados nos dias, INDEPENDENTE do status.
            // "O valor tabelado nunca deve ser zero" (se houver dias/base).
            const tabeladoProporcional = dias > 0 ? (base / 7) * dias : 0;

            const dadosAtualizados = {
                status_veiculo: statusSelecionado ? statusSelecionado.value : 'validar',
                cliente: document.getElementById('input-cliente').value.trim(),
                dias: dias,
                dias_selecionados: diasSelecionadosArr, // Salva [0, 1, 2...]
                tabelado: tabeladoProporcional, // [FIX] Usa o valor calculado, não o input
                valor_semanal: this.parseMoeda(document.getElementById('input-valor-semanal').value), // [NEW] Valor exato digitado
                // [FIX PRECISION] Calcular diária exata baseada no semanal, não ler do input arredondado
                diaria: this.parseMoeda(document.getElementById('input-valor-semanal').value) / 7,
                p_premium: this.parseMoeda(document.getElementById('input-p_premium').value),
                protecao: this.parseMoeda(document.getElementById('input-protecao').value),
                acordo: this.parseMoeda(document.getElementById('input-acordo').value),
                ta_boleto: this.parseMoeda(document.getElementById('input-ta_boleto').value),
                desconto: this.parseMoeda(document.getElementById('input-desconto').value),
                recebido: this.parseMoeda(document.getElementById('input-recebido').value),
                AS: document.getElementById('input-AS').checked,
                BO: document.getElementById('input-BO').checked,
                CO: document.getElementById('input-CO').checked,
                observacoes: document.getElementById('input-observacoes').value.trim()
            };

            // [FIX] Calcular campos derivados para garantir consistência visual imediata (Optimistic UI)
            // A lógica oficial reside no backend, mas o frontend precisa refletir a aritmética básica ( + - )

            // 1. Semana (Receita Bruta do Aluguel)
            if (dadosAtualizados.status_veiculo === 'alugado') {
                dadosAtualizados.semana = dadosAtualizados.dias * dadosAtualizados.diaria;
            } else {
                dadosAtualizados.semana = 0;
            }

            // 2. Previsto (Semana + Extras - Descontos)
            dadosAtualizados.previsto = dadosAtualizados.semana +
                dadosAtualizados.p_premium +
                dadosAtualizados.protecao +
                dadosAtualizados.acordo +
                dadosAtualizados.ta_boleto -
                dadosAtualizados.desconto;

            // 3. Saldo (Recebido - Previsto)
            dadosAtualizados.saldo = dadosAtualizados.recebido - dadosAtualizados.previsto;


            // Validação de Cliente Obrigatório para Alugados
            if (dadosAtualizados.status_veiculo === 'alugado' && (!dadosAtualizados.cliente || dadosAtualizados.cliente === '')) {
                SystemAlert.warning('Campo Obrigatório!\nPara veículos alugados, é necessário informar o Cliente.');
                return;
            }

            // Validação de Cliente (existência)
            if (dadosAtualizados.cliente && dadosAtualizados.cliente !== '') {
                const clienteValido = GridSemanal.clientesCache.some(c =>
                    c.nome.toUpperCase() === dadosAtualizados.cliente.toUpperCase()
                );

                if (!clienteValido) {
                    SystemAlert.warning('Cliente não encontrado!\nPor favor, cadastre o cliente antes de vincular.');
                    return; // Não fecha o modal
                }
            }

            // Validação de Conciliação
            if (dadosAtualizados.CO && dadosAtualizados.recebido <= 0.01) {
                SystemAlert.warning('Ação Bloqueada\nNão é possível conciliar sem valor recebido.');
                return; // Não fecha o modal
            }

            // Validação de Disponibilidade (Conflito de Dias)
            // Impede que o mesmo veículo seja alugado no mesmo dia para clientes diferentes
            const conflitos = this.semanaAtual.linhas.filter((l, idx) => {
                // Ignorar a própria linha que está sendo editada
                if (idx === this.indexAtual) return false;

                // Verificar apenas linhas do MESMO veículo
                if (l.placa !== this.linhaAtual.placa) return false;

                // Verificar colisão de dias
                // Normaliza dias da outra linha (pode ser array indices ou strings)
                const diasOutra = l.dias_selecionados || [];

                // Se array vazio ou indefinido, pula
                if (!diasOutra.length) return false;

                // Verifica se ALGUM dia selecionado agora já está na outra linha
                return diasSelecionadosArr.some(diaIndex => {
                    // Tratamento robusto para comparação
                    if (typeof diasOutra[0] === 'number') {
                        return diasOutra.includes(diaIndex);
                    } else {
                        // Fallback (se for string YYYY-MM-DD, ignorar ou converter se necessário)
                        // Por enquanto o sistema novo usa índices, assumindo compatibilidade.
                        return false;
                    }
                });
            });

            if (conflitos.length > 0) {
                const nomesConflito = conflitos.map(c => c.cliente).filter(n => n).join(', ');

                // [DEBUG] Log detalhado do conflito detectado
                console.error('🚨 CONFLITO DE DIAS DETECTADO PELA VALIDAÇÃO:', {
                    placa: this.linhaAtual.placa,
                    diasTentados: diasSelecionadosArr,
                    conflitos: conflitos.map(c => ({
                        id: c.id,
                        cliente: c.cliente,
                        status: c.status_veiculo,
                        dias: c.dias_selecionados
                    }))
                });

                SystemAlert.error(
                    `Conflito de Agendamento!\n\nO veículo ${this.linhaAtual.placa} já está ocupado nestes dias.\n\nConflito com: ${nomesConflito || 'Outro registro'}.\n\nPor favor, escolha dias diferentes.`
                );
                return;
            }

            // Atualizar e Salvar via Grid
            // [FIX] Usar função centralizada do Grid
            await GridSemanal.atualizarLinhaNoGrid(this.indexAtual, dadosAtualizados);

            this.fechar(overlay); // Fecha APENAS se tudo deu certo

        } catch (error) {
            console.error('Erro ao salvar:', error);
            if (window.SystemAlert) {
                SystemAlert.error('Erro ao salvar alterações:\n' + error.message);
            } else {
                alert('❌ Erro ao salvar: ' + error.message);
            }
            // NÃO fecha o modal no catch
        }
    },

    async excluir(overlay) {
        // Regra: Só pode excluir se houver duplicatas. Se for a única linha, bloqueia.
        const placaAtual = this.linhaAtual.placa;
        const countPlaca = this.semanaAtual.linhas.filter(l => l.placa === placaAtual).length;

        if (countPlaca <= 1) {
            SystemAlert.warning('Operação Negada!\n\nVeículos únicos não podem ser excluídos da listagem semanal.\nPara remover um veículo da frota, desative-o no cadastro.');
            return;
        }

        // ATUALIZAÇÃO: Permitir excluir duplicatas mesmo com valor (já que agora todos têm valor proporcional)

        let confirmado = false;
        if (window.SystemAlert) {
            confirmado = await SystemAlert.confirm('Tem certeza que deseja excluir esta linha/duplicata?', 'Excluir Item');
        } else {
            confirmado = confirm('Tem certeza que deseja excluir esta linha?');
        }

        if (!confirmado) return;

        await GridSemanal.excluirLinha(this.indexAtual);
        this.fechar(overlay);
    },

    fechar(overlay) {
        if (overlay && overlay.parentNode) overlay.remove();
        this.linhaAtual = null;
        this.indexAtual = null;
    },

    // ========================================
    // SELETOR DE DIAS DA SEMANA
    // ========================================

    // Helper para criar data sem fuso
    criarDataLocal(dataString) {
        if (!dataString) return new Date();
        const partes = dataString.split('T')[0].split('-');
        if (partes.length < 3) return new Date(dataString);
        return new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
    },

    renderizarSeletorDias() {
        console.log('--- Renderizando Seletor de Dias (Modo Visual) ---');
        const diasGrid = document.getElementById('dias-grid');
        if (!diasGrid) return;

        if (!this.semanaAtual || !this.semanaAtual.data_inicio) {
            console.error('ERRO: Data de início da semana não definida.');
            diasGrid.innerHTML = 'Data inválida';
            return;
        }

        try {
            const dataInicio = this.criarDataLocal(this.semanaAtual.data_inicio);
            const diasSemana = ['TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM', 'SEG'];

            // Verificar ocupação por índice [0..6]
            const indicesOcupados = this.getIndicesOcupadosPorPlaca(this.linhaAtual.placa);

            // Recuperar seleção salva
            const diasSalvos = this.linhaAtual.dias_selecionados || [];
            const usarArray = Array.isArray(diasSalvos) && diasSalvos.length > 0;
            const isIndexBased = usarArray && typeof diasSalvos[0] === 'number';

            let html = '';
            for (let i = 0; i < 7; i++) {
                const data = new Date(dataInicio);
                data.setDate(dataInicio.getDate() + i);
                const dia = data.getDate();
                const mes = data.getMonth() + 1;

                let selecionado = false;
                if (usarArray) {
                    if (isIndexBased) {
                        selecionado = diasSalvos.includes(i);
                    } else {
                        // Retrocompatibilidade
                        const ano = data.getFullYear();
                        const diaKey = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
                        selecionado = diasSalvos.includes(diaKey);
                    }
                } else {
                    // Fallback contagem
                    selecionado = i < (this.linhaAtual.dias || 0);
                }

                const ocupado = indicesOcupados.includes(i) && !selecionado;

                html += `
                    <button type="button" 
                            class="dia-btn ${selecionado ? 'active' : ''} ${ocupado ? 'dia-ocupado' : ''}" 
                            data-index="${i}"
                            ${ocupado ? 'disabled' : ''}>
                        <div class="dia-nome">${diasSemana[i]}</div>
                        <div class="dia-data">${dia}/${mes}</div>
                    </button>
                `;
            }

            diasGrid.innerHTML = html;
            diasGrid.style.display = 'grid';
            diasGrid.style.gridTemplateColumns = 'repeat(7, 1fr)';
            diasGrid.style.gap = '5px';

            diasGrid.querySelectorAll('.dia-btn:not(.dia-ocupado)').forEach(btn => {
                btn.addEventListener('click', () => this.toggleDia(btn));
            });
            this.atualizarContadorDias();
            this.atualizarCampoDias(); // [FIX] Sincronizar input hidden com o visual renderizado

        } catch (e) {
            console.error('Erro render dias:', e);
            diasGrid.innerHTML = 'Erro visual';
        }
    },

    getIndicesOcupadosPorPlaca(placa) {
        const indices = [];
        if (!this.semanaAtual || !this.semanaAtual.linhas) return indices;

        this.semanaAtual.linhas.forEach((linha, idxLinha) => {
            if (this.indexAtual === idxLinha || linha.placa !== placa) return;

            if (Array.isArray(linha.dias_selecionados) && linha.dias_selecionados.length > 0) {
                if (typeof linha.dias_selecionados[0] === 'number') {
                    linha.dias_selecionados.forEach(idx => { if (!indices.includes(idx)) indices.push(idx); });
                } else {
                    for (let k = 0; k < (linha.dias || 0); k++) { if (!indices.includes(k)) indices.push(k); }
                }
            } else {
                for (let k = 0; k < (linha.dias || 0); k++) { if (!indices.includes(k)) indices.push(k); }
            }
        });
        return indices;
    },

    toggleDia(btn) {
        btn.classList.toggle('active');
        this.atualizarContadorDias();
        this.atualizarCampoDias();
    },

    atualizarContadorDias() {
        const diasSelecionados = document.querySelectorAll('.dia-btn.active').length;
        const contador = document.getElementById('dias-contagem');
        if (contador) contador.textContent = diasSelecionados;
    },

    atualizarCampoDias() {
        const diasSelecionados = document.querySelectorAll('.dia-btn.active').length;
        document.getElementById('input-dias').value = diasSelecionados;
        this.recalcular();
    },

    bindAtalhosDias() {
        // Semana Completa
        const btnSemanaCompleta = document.getElementById('btn-semana-completa');
        if (btnSemanaCompleta) {
            btnSemanaCompleta.addEventListener('click', () => {
                document.querySelectorAll('.dia-btn:not(.dia-ocupado)').forEach(btn => {
                    btn.classList.add('active');
                });
                this.atualizarContadorDias();
                this.atualizarCampoDias();
            });
        }

        // Limpar Seleção
        const btnLimpar = document.getElementById('btn-limpar-dias');
        if (btnLimpar) {
            btnLimpar.addEventListener('click', () => {
                document.querySelectorAll('.dia-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                this.atualizarContadorDias();
                this.atualizarCampoDias();
            });
        }
    }
};
