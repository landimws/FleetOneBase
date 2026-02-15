
/**
 * Middleware para auditar ações de Impersonate
 * Deve ser usado antes da controller action
 */
export const auditImpersonate = (req, res, next) => {
    if (req.session?.userRole !== 'admin' || !req.session?.isSuperAdmin) {
        console.warn(`[SECURITY] Tentativa de Impersonate negada para usuário: ${req.session?.userUsername}`);
        return res.status(403).send('Acesso Negado');
    }

    const adminUser = req.session.userUsername;
    const targetEmpresaId = req.params.id;

    console.log(`[AUDIT] ADMIN ${adminUser} iniciou impersonate na empresa ID: ${targetEmpresaId} em ${new Date().toISOString()}`);

    // Aqui poderia gravar em tabela de logs no banco

    next();
};
