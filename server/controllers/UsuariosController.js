
import Usuario from '../models-sqlite/Usuario.js';
import bcrypt from 'bcrypt';

const UsuariosController = {
    // Listar usuários
    index: async (req, res) => {
        try {
            const usuarios = await Usuario.findAll({
                attributes: ['id', 'nome', 'username', 'role', 'ativo', 'createdAt']
            });

            res.render('pages/configuracoes/usuarios/index', {
                title: 'Gerenciar Usuários',
                page: 'configuracoes_usuarios', // active menu if we add it
                usuarios
            });
        } catch (error) {
            console.error('Erro ao listar usuários:', error);
            res.status(500).send('Erro interno');
        }
    },

    // Criar usuário
    create: async (req, res) => {
        try {
            const { nome, username, password, role } = req.body;

            // Check existing
            const existing = await Usuario.findOne({ where: { username } });
            if (existing) {
                return res.status(400).json({ error: 'Nome de usuário já existe' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            // [NEW] Link to the single company in this DB
            const empresa = await import('../models-sqlite/Empresa.js').then(m => m.default.findOne());

            await Usuario.create({
                nome,
                username,
                password: hashedPassword,
                role,
                empresaId: empresa ? empresa.id : null
            });

            res.json({ success: true });
        } catch (error) {
            console.error('Erro ao criar usuário:', error);
            res.status(500).json({ error: 'Erro interno ao criar usuário' });
        }
    },

    // Atualizar usuário
    update: async (req, res) => {
        try {
            const { id } = req.params;
            const { nome, username, password, role, ativo } = req.body;

            const user = await Usuario.findByPk(id);
            if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

            if (username && username !== user.username) {
                const existing = await Usuario.findOne({ where: { username } });
                if (existing) return res.status(400).json({ error: 'Nome de usuário já existe' });
                user.username = username;
            }

            user.nome = nome;
            user.role = role;
            user.ativo = ativo === 'true' || ativo === true;

            if (password) {
                user.password = await bcrypt.hash(password, 10);
            }

            await user.save();
            res.json({ success: true });
        } catch (error) {
            console.error('Erro ao atualizar usuário:', error);
            res.status(500).json({ error: 'Erro interno ao atualizar usuário' });
        }
    },

    // Deletar usuário (Hard Delete or Soft - let's use Hard for simplicity correctly)
    delete: async (req, res) => {
        try {
            const { id } = req.params;
            if (parseInt(id) === req.session.userId) {
                return res.status(400).json({ error: 'Não é possível excluir o próprio usuário logado.' });
            }

            const user = await Usuario.findByPk(id);
            if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

            await user.destroy();
            res.json({ success: true });
        } catch (error) {
            console.error('Erro ao excluir usuário:', error);
            res.status(500).json({ error: 'Erro interno ao excluir usuário' });
        }
    },

    // Update Profile (Self Service)
    updateProfile: async (req, res) => {
        try {
            const id = req.session.userId;
            const { nome, username, password } = req.body;

            const user = await Usuario.findByPk(id);
            if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

            if (username && username !== user.username) {
                const existing = await Usuario.findOne({ where: { username } });
                if (existing) return res.status(400).json({ error: 'Nome de usuário já existe' });
                user.username = username;
                req.session.userUsername = username; // Update session
            }

            user.nome = nome;
            req.session.userName = nome; // Update session

            if (password) {
                user.password = await bcrypt.hash(password, 10);
            }

            await user.save();

            // Force session save to ensure updates persist
            req.session.save((err) => {
                if (err) throw err;
                res.json({ success: true });
            });

        } catch (error) {
            console.error('Erro ao atualizar perfil:', error);
            res.status(500).json({ error: 'Erro interno ao atualizar perfil' });
        }
    }
};

export default UsuariosController;
