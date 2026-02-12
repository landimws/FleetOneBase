export const ComprasPagamento = {
    init() {
        this.cacheDOM();
        this.bindEvents();
    },

    cacheDOM() {
        this.dom = {
            condicao: document.getElementById('condicao_pagamento'),
            forma: document.getElementById('forma_pagamento_padrao'),
            primeiroVenc: document.getElementById('primeiro_vencimento'),
            divParcelas: document.getElementById('divQtdParcelas'),
            qtdParcelas: document.getElementById('qtd_parcelas'),
            listaParcelas: document.getElementById('listaParcelas'),
            valorLiquido: document.getElementById('valor_liquido'),
            emissao: document.getElementById('data_emissao')
        };
    },

    bindEvents() {
        this.dom.condicao.addEventListener('change', () => this.handleCondicaoChange());
        this.dom.qtdParcelas.addEventListener('input', () => this.gerarParcelasUI());
        this.dom.primeiroVenc.addEventListener('change', () => {
            if (this.dom.condicao.value === 'prazo') this.gerarParcelasUI();
        });
        // Listen for total changes to update parcels? Ideally controller calls this.
    },

    handleCondicaoChange() {
        const condicao = this.dom.condicao.value;
        const options = this.dom.forma.options;
        const emissaoVal = this.dom.emissao.value; // YYYY-MM-DD
        let baseDate = new Date();

        if (emissaoVal) {
            const parts = emissaoVal.split('-');
            baseDate = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
        }

        if (condicao === 'avista') {
            // Enable all
            for (let i = 0; i < options.length; i++) options[i].disabled = false;

            this.dom.divParcelas.style.display = 'none';
            this.dom.listaParcelas.innerHTML = '';
            this.dom.qtdParcelas.value = 1;

            // Default Date: Same as Emission
            this.dom.primeiroVenc.value = baseDate.toISOString().split('T')[0];

        } else if (condicao === 'prazo') {
            // Lock to Boleto
            this.dom.forma.value = 'BOLETO';
            for (let i = 0; i < options.length; i++) {
                if (options[i].value !== 'BOLETO') options[i].disabled = true;
            }

            this.dom.divParcelas.style.display = 'block';
            this.dom.qtdParcelas.value = 1;

            // Default Date: Emission + 30 days
            baseDate.setDate(baseDate.getDate() + 30);
            this.dom.primeiroVenc.value = baseDate.toISOString().split('T')[0];

            this.gerarParcelasUI();
        }
    },

    gerarParcelasUI() {
        const qtd = parseInt(this.dom.qtdParcelas.value) || 1;
        const total = parseFloat(this.dom.valorLiquido.value) || 0;
        const startStr = this.dom.primeiroVenc.value; // YYYY-MM-DD

        if (!startStr) return; // Wait for date

        // Calculate defaults
        const valParc = parseFloat((total / qtd).toFixed(2));
        let soma = 0;

        // Date logic
        const parts = startStr.split('-');
        // Create date at noon to avoid timezone rollover issues
        const baseDate = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);

        let html = '<div style="display:flex; flex-direction:column; gap:8px;">';

        for (let i = 0; i < qtd; i++) {
            // Calc Date (base + 30*i days roughly, or Month+i)
            // Business rule: usually 30 days. Let's add Months for stability? 
            // Or strictly 30 days? "30 dias" implies days. "Parcelado" usually monthly.
            // Let's use Monthly increment for "A Prazo".

            let venc = new Date(baseDate);
            venc.setMonth(venc.getMonth() + i);
            const vencStr = venc.toISOString().split('T')[0];

            let valor = valParc;
            // Adjust last parcel remainder
            if (i === qtd - 1) {
                valor = parseFloat((total - soma).toFixed(2));
            }
            soma += valor;

            html += `
                <div class="parcela-row" style="display:flex; gap:10px; align-items:center;">
                    <span style="font-size:0.85rem; color:#64748b; width:20px;">${i + 1}x</span>
                    <input type="date" class="form-modern input-vencimento-parcela" value="${vencStr}" style="flex:1;">
                    <input type="number" class="form-modern input-valor-parcela" value="${valor.toFixed(2)}" step="0.01" style="flex:1;">
                </div>
            `;
        }
        html += '</div>';

        // Add footer with total valid check?
        // For now just render
        this.dom.listaParcelas.innerHTML = html;
    },

    // Called by Controller when collecting data to save
    obterParcelas() {
        const condicao = this.dom.condicao.value;
        const forma = this.dom.forma.value;

        if (condicao === 'avista') {
            // "À Vista": Create 1 implicit parcel with total value and emission date
            const total = parseFloat(this.dom.valorLiquido.value) || 0;
            const vencimento = this.dom.primeiroVenc.value; // Should be emission date by default logic

            return [{
                numero_parcela: 1,
                valor: total,
                vencimento: vencimento,
                forma_pagamento: forma, // Respects user selection (PIX, CARD, BOLETO)
                status: 'EM_ABERTO' // Or 'PAGO'? Usually "A vista" means paid. But let's keep 'EM_ABERTO' or let user confirm? 
                // User said "Boletos não foram lançados". 
            }];
        }

        // Collect from UI for "A Prazo"
        const rows = this.dom.listaParcelas.querySelectorAll('.parcela-row');
        const parcelas = [];
        rows.forEach((row, index) => {
            const venc = row.querySelector('.input-vencimento-parcela').value;
            const val = parseFloat(row.querySelector('.input-valor-parcela').value) || 0;
            parcelas.push({
                numero_parcela: index + 1,
                valor: val,
                vencimento: venc,
                forma_pagamento: forma, // Locked to Boleto for Prazo
                status: 'EM_ABERTO'
            });
        });
        return parcelas;
    },

    // Helper to refresh if total changes
    atualizarValores(novoTotal) {
        if (this.dom.condicao.value === 'prazo') {
            this.gerarParcelasUI();
        }
    }
};
