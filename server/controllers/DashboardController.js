import DashboardService from '../services/DashboardService.js';

export const getDashboard = async (req, res) => {
    try {
        const filters = {
            data_inicio: req.query.data_inicio,
            data_fim: req.query.data_fim,
            periodo: req.query.periodo
        };

        const data = await DashboardService.getDashboardData(req.models, filters);
        res.json(data);

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Erro ao gerar dashboard' });
    }
};
