
import MasterDatabase from '../../config/MasterDatabase.js';

class AdminPlanosController {

    // GET /admin/planos
    async listAll(req, res) {
        try {
            const planos = await MasterDatabase.Plano.findAll({
                order: [['preco', 'ASC']]
            });

            // Contar empresas por plano
            const planosComContagem = await Promise.all(planos.map(async p => {
                const count = await MasterDatabase.Empresa.count({ where: { planoId: p.id } });
                return { ...p.toJSON(), totalEmpresas: count };
            }));

            res.render('admin/planos/index', {
                title: 'Gestão de Planos',
                planos: planosComContagem,
                page: 'planos',
                layout: 'admin/layouts/admin-layout'
            });
        } catch (error) {
            console.error('Erro ao listar planos:', error);
            res.status(500).send('Erro ao carregar planos.');
        }
    }

    // GET /admin/planos/novo
    async renderForm(req, res) {
        const { id } = req.query;
        let plano = null;

        if (id) {
            plano = await MasterDatabase.Plano.findByPk(id);
        }

        res.render('admin/planos/form', {
            title: plano ? 'Editar Plano' : 'Novo Plano',
            plano: plano || {},
            page: 'planos',
            layout: 'admin/layouts/admin-layout'
        });
    }

    // POST /admin/planos
    async save(req, res) {
        try {
            const { id, nome, descricao, preco, limite_veiculos, limite_usuarios, modulos_ativos, ativo } = req.body;

            const dados = {
                nome,
                descricao,
                preco: parseFloat(preco.replace('R$', '').replace('.', '').replace(',', '.')),
                limite_veiculos: parseInt(limite_veiculos),
                limite_usuarios: parseInt(limite_usuarios),
                modulos_ativos: ['todos'], // Regra de negócio: Todos os planos têm acesso completo
                ativo: ativo === 'true' || ativo === 'on'
            };

            if (id) {
                await MasterDatabase.Plano.update(dados, { where: { id } });
                req.flash('success', 'Plano atualizado com sucesso!'); // Se tiver flash, senão adaptar
            } else {
                await MasterDatabase.Plano.create(dados);
                req.flash('success', 'Plano criado com sucesso!');
            }

            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.json({ success: true });
            }
            res.redirect('/admin/planos');

        } catch (error) {
            console.error('Erro ao salvar plano:', error);
            if (req.xhr) return res.status(500).json({ success: false, message: error.message });
            res.status(500).send('Erro ao salvar plano.');
        }
    }
}

export default new AdminPlanosController();
