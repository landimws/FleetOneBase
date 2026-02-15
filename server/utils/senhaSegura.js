import crypto from 'crypto';

/**
 * Gera senha segura aleatória
 * @param {number} length - Tamanho da senha (padrão: 16)
 * @returns {string} Senha gerada
 */
export function gerarSenhaSegura(length = 16) {
    // Caracteres sem ambiguidade (sem 0/O, 1/I/l)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    let senha = '';
    const valores = crypto.randomBytes(length);

    for (let i = 0; i < length; i++) {
        senha += chars[valores[i] % chars.length];
    }

    return senha;
}

/**
 * Valida força de senha
 * @param {string} senha 
 * @returns {object} {valida: boolean, erros: string[]}
 */
export function validarForcaSenha(senha) {
    const erros = [];

    if (!senha || senha.length < 8) {
        erros.push('Senha deve ter no mínimo 8 caracteres');
    }

    if (!/[A-Z]/.test(senha)) {
        erros.push('Senha deve conter pelo menos uma letra maiúscula');
    }

    if (!/[a-z]/.test(senha)) {
        erros.push('Senha deve conter pelo menos uma letra minúscula');
    }

    if (!/[0-9]/.test(senha)) {
        erros.push('Senha deve conter pelo menos um número');
    }

    if (!/[!@#$%&*]/.test(senha)) {
        erros.push('Senha deve conter pelo menos um caractere especial (!@#$%&*)');
    }

    return {
        valida: erros.length === 0,
        erros
    };
}

/**
 * Calcula data de expiração (7 dias a partir de agora)
 * @returns {Date}
 */
export function calcularDataExpiracao() {
    const data = new Date();
    data.setDate(data.getDate() + 7);
    return data;
}
