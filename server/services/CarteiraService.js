
class CarteiraService {

    /**
     * Busca o resumo financeiro da carteira de um cliente.
     * @param {Object} models Models injetados (Debito, Credito)
     * @param {string} cliente_ref 
     * @returns {Object} Resumo e listas de débitos/créditos
     */
    async getResumoCarteira(models, cliente_ref) {
        const { Debito, Credito } = models;

        // Pode ser ID (numero) ou Nome (string) para retrocompatibilidade
        const isId = !isNaN(cliente_ref);
        const where = isId ? { cliente_id: cliente_ref } : { cliente_nome: decodeURIComponent(cliente_ref) };

        // Buscar débitos
        const debitos = await Debito.findAll({
            where,
            order: [['data', 'ASC']]
        });

        // Buscar créditos
        const creditos = await Credito.findAll({
            where,
            order: [['data', 'ASC']]
        });

        // Calcular totais
        const totalDebitos = debitos.reduce((sum, d) => sum + parseFloat(d.valor_total), 0);

        let totalPago = 0;
        let totalDescontos = 0;

        creditos.forEach(c => {
            if (c.banco_confirmado) {
                const valorOriginal = parseFloat(c.valor_original || c.valor);
                const valorRealPago = parseFloat(c.valor);

                // Soma o que realmente foi pago
                totalPago += valorRealPago;

                // Soma o desconto concedido
                if (valorOriginal > valorRealPago) {
                    totalDescontos += (valorOriginal - valorRealPago);
                }
            }
        });

        // Saldo = Débitos - (Pago + Descontos)
        const saldo = totalDebitos - (totalPago + totalDescontos);

        // totalCreditos para o resumo deve ser o valor REALMENTE PAGO
        const totalCreditos = totalPago;

        // Agrupar por veículo
        const porVeiculo = {};
        debitos.forEach(d => {
            if (d.veiculo_placa) {
                if (!porVeiculo[d.veiculo_placa]) {
                    porVeiculo[d.veiculo_placa] = 0;
                }
                porVeiculo[d.veiculo_placa] += parseFloat(d.valor_total);
            }
        });

        const resumoVeiculos = Object.entries(porVeiculo).map(([placa, valor]) => ({
            placa,
            valor
        }));

        return {
            resumo: {
                total_debitos: totalDebitos,
                total_creditos: totalCreditos,
                total_descontos: totalDescontos,
                saldo_devedor: saldo,
                por_veiculo: resumoVeiculos
            },
            debitos,
            creditos
        };
    }

    /**
     * Cria um novo débito.
     * @param {Object} models
     * @param {Object} data 
     * @returns {Object} Débito criado
     */
    async createDebito(models, data) {
        const { Debito } = models;

        // Validar e calcular
        const qtd = parseFloat(data.quantidade) || 1;
        const unit = parseFloat(data.valor_unitario) || 0;
        let percTaxa = 0;
        let valTaxa = 0;

        if (data.cobra_taxa_adm) {
            percTaxa = 15.00;
            valTaxa = unit * 0.15;
        }

        const total = qtd * (unit + valTaxa);

        const novoDebito = await Debito.create({
            cliente_id: data.cliente_id,
            cliente_nome: data.cliente_nome,
            veiculo_placa: data.veiculo_placa,
            data: data.data,
            tipo: data.tipo,
            descricao: data.descricao,
            quantidade: qtd,
            valor_unitario: unit,
            cobra_taxa_adm: !!data.cobra_taxa_adm,
            percentual_taxa: percTaxa,
            valor_taxa: valTaxa,
            valor_total: total,
            observacao: data.observacao
        });

        return novoDebito;
    }

    /**
     * Cria um crédito (ou múltiplos parcelados).
     * @param {Object} models
     * @param {Object} data 
     * @returns {Object} Resultado (único ou lista)
     */
    async createCredito(models, data) {
        const { Credito } = models;

        // Se recorrente, criar múltiplos créditos
        if (data.recorrente && data.num_parcelas > 1) {
            const parcelas = parseInt(data.num_parcelas);
            const dias = data.periodicidade === 'semanal' ? 7 : 30;
            const dataBase = new Date(data.data);

            const creditosCriados = [];

            for (let i = 0; i < parcelas; i++) {
                const dataAtual = new Date(dataBase);
                dataAtual.setDate(dataBase.getDate() + (i * dias));

                // Formatar para YYYY-MM-DD
                const dataFormatada = dataAtual.toISOString().split('T')[0];

                const novoCredito = await Credito.create({
                    cliente_id: data.cliente_id,
                    cliente_nome: data.cliente_nome,
                    data: dataFormatada,
                    valor_original: data.valor,
                    valor: data.valor,
                    tipo: data.tipo,
                    descricao: `Parcela ${i + 1}/${parcelas}${data.descricao ? ' - ' + data.descricao : ''}`,
                    desconto_percentual: data.desconto_percentual || 0,
                    desconto_tipo: data.desconto_tipo || 'percentual',
                    banco: data.banco,
                    banco_confirmado: !!data.banco_confirmado,
                    observacao: data.observacao
                });

                creditosCriados.push(novoCredito);
            }

            return {
                multiple: true,
                message: `${parcelas} créditos criados com sucesso`,
                creditos: creditosCriados
            };
        } else {
            // Criação única
            const novoCredito = await Credito.create({
                cliente_id: data.cliente_id,
                cliente_nome: data.cliente_nome,
                data: data.data,
                valor_original: data.valor,
                valor: data.valor,
                tipo: data.tipo,
                descricao: data.descricao,
                desconto_percentual: data.desconto_percentual || 0,
                desconto_tipo: data.desconto_tipo || 'percentual',
                banco: data.banco,
                banco_confirmado: !!data.banco_confirmado,
                observacao: data.observacao
            });

            return novoCredito;
        }
    }

    async updateDebito(models, id, data) {
        const { Debito } = models;
        const debito = await Debito.findByPk(id);
        if (!debito) throw new Error('Débito não encontrado');

        // Recalcular
        const qtd = parseFloat(data.quantidade) || 1;
        const unit = parseFloat(data.valor_unitario) || 0;
        let percTaxa = 0;
        let valTaxa = 0;

        if (data.cobra_taxa_adm) {
            percTaxa = 15.00;
            valTaxa = unit * 0.15;
        }
        const total = qtd * (unit + valTaxa);

        await debito.update({
            veiculo_placa: data.veiculo_placa,
            data: data.data,
            tipo: data.tipo,
            descricao: data.descricao,
            quantidade: qtd,
            valor_unitario: unit,
            cobra_taxa_adm: !!data.cobra_taxa_adm,
            percentual_taxa: percTaxa,
            valor_taxa: valTaxa,
            valor_total: total,
            observacao: data.observacao
        });

        return debito;
    }

    async updateCredito(models, id, data) {
        const { Credito } = models;
        const credito = await Credito.findByPk(id);
        if (!credito) throw new Error('Crédito não encontrado');

        // Montar objeto de atualização apenas com campos presentes no data
        const updateData = {};
        const fields = ['data', 'valor_original', 'valor', 'tipo', 'descricao', 'desconto_percentual', 'desconto_tipo', 'banco', 'banco_confirmado', 'observacao'];

        fields.forEach(f => {
            if (data[f] !== undefined) updateData[f] = data[f];
        });

        // Booleans explicit
        if (data.banco_confirmado !== undefined) updateData.banco_confirmado = !!data.banco_confirmado;
        if (data.desconto_percentual === undefined && credito.desconto_percentual === null) updateData.desconto_percentual = 0;
        if (data.desconto_tipo === undefined && credito.desconto_tipo === null) updateData.desconto_tipo = 'percentual';

        await credito.update(updateData);
        return credito;
    }
    async deleteDebito(models, id) {
        const { Debito } = models;
        return await Debito.destroy({ where: { id } });
    }

    async deleteCredito(models, id) {
        const { Credito } = models;
        return await Credito.destroy({ where: { id } });
    }
}

export default new CarteiraService();
