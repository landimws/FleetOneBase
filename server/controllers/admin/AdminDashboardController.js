
import MasterDatabase from '../../config/MasterDatabase.js';
import { Op } from 'sequelize';

class AdminDashboardController {

    // GET /admin
    async index(req, res) {
        try {
            // 1. Métricas Gerais
            const totalEmpresas = await MasterDatabase.Empresa.count();
            const empresasAtivas = await MasterDatabase.Empresa.count({ where: { ativo: true } });
            const empresasCanceladas = await MasterDatabase.Empresa.count({ where: { ativo: false } });

            // 2. Cálculo de MRR (Monthly Recurring Revenue)
            // Busca empresas ativas e seus planos para somar o valor
            const empresasComPlano = await MasterDatabase.Empresa.findAll({
                where: { ativo: true },
                include: [{
                    model: MasterDatabase.Plano,
                    attributes: ['preco', 'nome']
                }]
            });

            let mrr = 0;
            const distribuicaoPlanos = {};

            empresasComPlano.forEach(emp => {
                if (emp.Plano) {
                    mrr += parseFloat(emp.Plano.preco || 0);

                    // Contagem por plano para gráfico/lista
                    const nomePlano = emp.Plano.nome;
                    distribuicaoPlanos[nomePlano] = (distribuicaoPlanos[nomePlano] || 0) + 1;
                }
            });

            // 3. Usuários Totais no Sistema
            const totalUsuarios = await MasterDatabase.Usuario.count();

            res.render('admin/dashboard/index', {
                title: 'Dashboard Administrativo',
                page: 'dashboard', // Usado na sidebar para active state
                layout: 'admin/layouts/admin-layout',
                kpis: {
                    totalEmpresas,
                    empresasAtivas,
                    empresasCanceladas,
                    mrr,
                    totalUsuarios,
                    ticketMedio: empresasAtivas > 0 ? (mrr / empresasAtivas) : 0
                },
                distribuicaoPlanos
            });

        } catch (error) {
            console.error('Erro ao carregar dashboard admin:', error);
            res.render('admin/dashboard/error', {
                title: 'Erro no Dashboard',
                layout: 'admin/layouts/admin-layout',
                error
            });
        }
    }
}

export default new AdminDashboardController();
