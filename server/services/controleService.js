
import { Op } from 'sequelize';

/**
 * Serviço de Regras de Negócio do Módulo Controle
 */

/**
 * Busca o cliente que estava com o veículo no último dia da semana (Dia 7 / Segunda-feira)
 * @param {Object} semanaOriginal - Objeto da semana do sistema legado
 * @param {string} placa - Placa do veículo
 * @returns {string|null} - Nome do cliente ou null
 */
export function buscarClienteDia7(semanaOriginal, placa) {
    if (!semanaOriginal || !semanaOriginal.linhas) return null;

    // Filtrar linhas desta semana para esta placa
    const linhasDoVeiculo = semanaOriginal.linhas.filter(l => l.placa === placa);

    if (linhasDoVeiculo.length === 0) return null;

    // LÓGICA 1: Se tiver apenas 1 linha, retorna o cliente dessa linha (se existir)
    if (linhasDoVeiculo.length === 1) {
        return linhasDoVeiculo[0].cliente || null;
    }

    // LÓGICA 2: Se tiver 2 ou mais linhas, busca a linha que tem o dia 6 (Segunda-feira)
    for (const linha of linhasDoVeiculo) {
        let dias = [];
        try {
            if (Array.isArray(linha.dias_selecionados)) {
                dias = linha.dias_selecionados;
            } else if (typeof linha.dias_selecionados === 'string') {
                dias = JSON.parse(linha.dias_selecionados);
            }
        } catch (e) {
            console.warn(`Erro parse dias_selecionados veiculo ${placa}`, e);
            continue;
        }

        // Verifica se dia 6 está incluso
        if (dias && dias.includes(6)) {
            return linha.cliente || null; // Retorna o cliente desta linha (ou null se vazio)
        }
    }

    // Fallback: Se tiver múltiplas linhas e NENHUMA tiver o dia 6 marcado?
    // Regra estrita: "Se tiver sem cliente não trás".
    // Retornamos null para que o usuário defina manualmente, evitando atribuição errada.
    return null;
}

/**
 * Cria ou Sincroniza a semana no módulo Controle
 * @param {Object} models - Models do Tenant
 * @param {number} semanaId - ID da semana (Tabela Semanas)
 */
export async function sincronizarSemana(models, semanaId) {
    const {
        Semana, LinhaSemana, Veiculo,
        ControleRegistro, ControleVeiculo
    } = models;

    console.log(`[ControleService] Sincronizando semana ${semanaId}...`);

    // 1. Buscar a Semana Original com Linhas
    const semanaOriginal = await Semana.findByPk(semanaId, {
        include: [{ model: LinhaSemana, as: 'linhas' }]
    });

    if (!semanaOriginal) throw new Error('Semana não encontrada no sistema de origem.');

    // 2. Buscar/Criar a Configuração de Veículos (ControleVeiculo) para todos ativos
    const veiculosAtivos = await Veiculo.findAll({ where: { ativo: true } });

    for (const v of veiculosAtivos) {
        await ControleVeiculo.findOrCreate({
            where: { placa: v.placa },
            defaults: {
                // Defaults já definidos no Model
            }
        });
    }

    // 3. Buscar dados da Semana Anterior (Controle)
    // Para pegar km_anterior e status
    // A semana anterior pode não ser ID-1 se houver buracos, mas logicamente buscamos a mais recente antes desta
    const ultimaSemanaControle = await ControleRegistro.findOne({
        where: {
            SemanaId: { [Op.lt]: semanaId } // Menor que atual
        },
        order: [['SemanaId', 'DESC']],
        limit: 1 // A mais recente das anteriores (pega qualquer registro pra saber o ID)
    });

    const idSemanaAnterior = ultimaSemanaControle ? ultimaSemanaControle.SemanaId : null;
    let registrosAnteriores = [];

    if (idSemanaAnterior) {
        registrosAnteriores = await ControleRegistro.findAll({
            where: { SemanaId: idSemanaAnterior }
        });
    }

    // 4. Processar cada Veículo Ativo
    for (const v of veiculosAtivos) {
        // Verificar se já existe registro nesta semana (Idempotência)
        const registroExistente = await ControleRegistro.findOne({
            where: { SemanaId: semanaId, veiculo_id: v.placa }
        });

        if (registroExistente) {
            // Se já existe, atualizamos apenas o cliente (caso tenha mudado na semana original antes de iniciar a operação aqui)
            // Apenas se a semana do controle NÃO estiver fechada
            if (!registroExistente.fechada && registroExistente.km_atual === 0) {
                const clienteDia7 = buscarClienteDia7(semanaOriginal, v.placa);
                if (registroExistente.cliente_atual !== clienteDia7) {
                    registroExistente.cliente_atual = clienteDia7;
                    await registroExistente.save();
                }
            }
            continue;
        }

        // === CRIAÇÃO DE NOVO REGISTRO ===

        // A. Determinar Km Anterior
        let kmAnterior = 0;
        let situacaoInicial = 'Solicitar';

        if (idSemanaAnterior) {
            const regAnt = registrosAnteriores.find(r => r.veiculo_id === v.placa);
            if (regAnt) {
                // Se semana anterior teve km registrado
                if (regAnt.km_atual > 0) {
                    kmAnterior = regAnt.km_atual;
                } else {
                    // Se semana anterior estava zerada, mantém o anterior dela
                    kmAnterior = regAnt.km_anterior;
                }

                // B. Determinar Situação
                // Regra: "Na oficina" persiste. Resto reseta para "Solicitar".
                if (regAnt.situacao === 'Na oficina') {
                    situacaoInicial = 'Na oficina';
                }
            } else {
                // Veículo novo ou sem registro na semana imediatamente anterior NO CONTROLE
                // Como LinhaSemana (Legado) não possui colunas de KM confiáveis (baseado no Model),
                // iniciamos com 0 e o usuário deve ajustar se necessário.
                kmAnterior = 0;
            }
        }

        // C. Buscar Cliente (Dia 7)
        const clienteAtual = buscarClienteDia7(semanaOriginal, v.placa);

        // D. Salvar
        await ControleRegistro.create({
            SemanaId: semanaId,
            veiculo_id: v.placa,
            km_anterior: kmAnterior,
            km_atual: 0,
            situacao: situacaoInicial,
            cliente_atual: clienteAtual,
            fechada: false
        });
    }

    console.log(`[ControleService] Semana ${semanaId} sincronizada com sucesso.`);
}
