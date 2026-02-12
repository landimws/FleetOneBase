/**
 * Calcula o período de uma semana (terça a segunda)
 * @param {Date} dataReferencia - Segunda-feira de fechamento
 * @returns {Object} { data_inicio: Date, data_fim: Date }
 */
export const calcularPeriodoSemana = (dataReferencia) => {
    const data_fim = new Date(dataReferencia);
    data_fim.setHours(0, 0, 0, 0);

    // Data de início é 6 dias antes (terça-feira)
    const data_inicio = new Date(data_fim);
    data_inicio.setDate(data_inicio.getDate() - 6);

    return { data_inicio, data_fim };
};

/**
 * Formata período para exibição
 * @param {Date} data_inicio 
 * @param {Date} data_fim 
 * @returns {String} "06/01 a 12/01"
 */
export const formatarPeriodo = (data_inicio, data_fim) => {
    const inicio = `${String(data_inicio.getDate()).padStart(2, '0')}/${String(data_inicio.getMonth() + 1).padStart(2, '0')}`;
    const fim = `${String(data_fim.getDate()).padStart(2, '0')}/${String(data_fim.getMonth() + 1).padStart(2, '0')}`;
    return `${inicio} a ${fim}`;
};

/**
 * Obtém a próxima segunda-feira
 * @param {Date} dataAtual 
 * @returns {Date}
 */
export const obterProximaSegunda = (dataAtual) => {
    const data = new Date(dataAtual);
    const diaSemana = data.getDay();
    const diasAteSegunda = diaSemana === 1 ? 7 : (8 - diaSemana) % 7;
    data.setDate(data.getDate() + diasAteSegunda);
    data.setHours(0, 0, 0, 0);
    return data;
};
