
import Empresa from '../models-sqlite/Empresa.js';

const EmpresasController = {
    // Get company details (first one found)
    // In a multi-tenant real scenario, this would filter by user.empresaId
    // For now, we simulate a single company or the one linked to the user.
    getCompany: async (req, res) => {
        try {
            // Find the first company (singleton pattern for now)
            let empresa = await Empresa.findOne();

            // If no company exists, create a default blank one to avoid errors
            if (!empresa) {
                empresa = await Empresa.create({
                    nome: 'Minha Locadora',
                    cnpj: '',
                    endereco: '',
                    telefone: '',
                    email: '',
                    responsavel: ''
                });
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

    // Update company details
    updateCompany: async (req, res) => {
        try {
            const { id, nome, cnpj, telefone, email, responsavel, cep, logradouro, numero, bairro, cidade, estado } = req.body;

            let empresa = await Empresa.findByPk(id);

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
