
import MasterDatabase from '../config/MasterDatabase.js';

const EmpresasController = {
    // Get company details (tenant context)
    getCompany: async (req, res) => {
        try {
            await MasterDatabase.init();
            const { Empresa } = MasterDatabase;
            const empresaId = req.session.empresaId;

            if (!empresaId) {
                return res.redirect('/login');
            }

            // Find the tenant's company
            let empresa = await Empresa.findByPk(empresaId);

            if (!empresa) {
                return res.status(404).render('pages/404', { message: 'Empresa não encontrada.' });
            }

            res.render('pages/configuracoes/empresa/index', {
                title: 'Dados da Empresa',
                page: 'configuracoes_empresa',
                empresa: empresa
            });
        } catch (error) {
            console.error('Erro ao buscar empresa:', error);
            res.status(500).render('pages/500', { error: 'Erro ao carregar dados da empresa.' });
        }
    },

    // Update company details (tenant context)
    updateCompany: async (req, res) => {
        try {
            await MasterDatabase.init();
            const { Empresa } = MasterDatabase;
            const empresaId = req.session.empresaId;

            if (!empresaId) {
                return res.status(403).json({ error: 'Sessão inválida.' });
            }

            // Campos permitidos para atualização (Sanitização)
            const { nome, cnpj, telefone, email, responsavel, cep, logradouro, numero, bairro, cidade, estado } = req.body;

            let empresa = await Empresa.findByPk(empresaId);

            if (!empresa) {
                return res.status(404).json({ error: 'Empresa não encontrada.' });
            }

            await empresa.update({
                nome,
                cnpj,
                telefone,
                email,
                responsavel,
                cep,
                logradouro,
                numero,
                bairro,
                cidade,
                estado
            });

            res.json({ message: 'Dados atualizados com sucesso!' });
        } catch (error) {
            console.error('Erro ao atualizar empresa:', error);
            res.status(500).json({ error: 'Erro ao atualizar dados.' });
        }
    }
};

export default EmpresasController;
