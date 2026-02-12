
import MasterDatabase from '../config/MasterDatabase.js';
import bcrypt from 'bcrypt';

const UsuariosController = {
    // Listar usuários (Apenas da própria empresa)
    index: async (req, res) => {
        try {
            await MasterDatabase.init();
            const { Usuario } = MasterDatabase;
            const empresaId = req.session.empresaId;

            const usuarios = await Usuario.findAll({
                where: { empresaId }, // FILTRO DE SEGURANÇA
                attributes: ['id', 'nome', 'username', 'role', 'ativo', 'createdAt'],
                order: [['nome', 'ASC']]
            });

            res.render('pages/configuracoes/usuarios/index', {
                title: 'Gerenciar Usuários',
                page: 'configuracoes_usuarios',
                usuarios
            });
        } catch (error) {
            console.error('Erro ao listar usuários:', error);
            res.status(500).send('Erro interno');
        }
    },

    // Criar usuário (Vinculado à própria empresa)
    create: async (req, res) => {
        try {
            await MasterDatabase.init();
            const { Usuario } = MasterDatabase;
            const empresaId = req.session.empresaId;

            const { nome, username, password, role } = req.body;

            // Check existing
            const existing = await Usuario.findOne({ where: { username } });
            if (existing) {
                return res.status(400).json({ error: 'Nome de usuário já existe' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            await Usuario.create({
                nome,
                username,
                password: hashedPassword,
                role: role || 'operador', // Default to operador checks
                empresaId: empresaId, // VINCULA À EMPRESA LOGADA
                ativo: true
            });

            res.json({ success: true });
        } catch (error) {
            console.error('Erro ao criar usuário:', error);
            res.status(500).json({ error: 'Erro interno ao criar usuário' });
        }
    },

    // Atualizar usuário (Apenas da própria empresa)
    update: async (req, res) => {
        try {
            await MasterDatabase.init();
            const { Usuario } = MasterDatabase;
            const empresaId = req.session.empresaId;

            const { id } = req.params;
            const { nome, username, password, role, ativo } = req.body;

            // Busca garantindo que usuário pertence à empresa
            const user = await Usuario.findOne({
                where: { id, empresaId }
            });

            if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

            if (username && username !== user.username) {
                const existing = await Usuario.findOne({ where: { username } });
                if (existing) return res.status(400).json({ error: 'Nome de usuário já existe' });
                user.username = username;
            }

            user.nome = nome;
            user.role = role;
            user.ativo = ativo === 'true' || ativo === true;

            if (password && password.trim() !== '') {
                user.password = await bcrypt.hash(password, 10);
            }

            await user.save();
            res.json({ success: true });
        } catch (error) {
            console.error('Erro ao atualizar usuário:', error);
            res.status(500).json({ error: 'Erro interno ao atualizar usuário' });
        }
    },

    // Deletar usuário (Hard Delete - Apenas da própria empresa)
    delete: async (req, res) => {
        try {
            await MasterDatabase.init();
            const { Usuario } = MasterDatabase;
            const empresaId = req.session.empresaId;

            const { id } = req.params;

            // Proteção contra auto-exclusão
            if (parseInt(id) === req.session.userId) {
                return res.status(400).json({ error: 'Não é possível excluir o próprio usuário logado.' });
            }

            // Busca garantindo que usuário pertence à empresa
            const user = await Usuario.findOne({
                where: { id, empresaId }
            });

            if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

            await user.destroy();
            res.json({ success: true });
        } catch (error) {
            console.error('Erro ao excluir usuário:', error);
            res.status(500).json({ error: 'Erro interno ao excluir usuário' });
        }
    },

    // Update Profile (Self Service - Qualquer empresa)
    updateProfile: async (req, res) => {
        try {
            await MasterDatabase.init();
            const { Usuario } = MasterDatabase;

            const id = req.session.userId;
            const { nome, username, password } = req.body;

            const user = await Usuario.findByPk(id);
            if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

            if (username && username !== user.username) {
                const existing = await Usuario.findOne({ where: { username } });
                if (existing) return res.status(400).json({ error: 'Nome de usuário já existe' });
                user.username = username;
                req.session.userUsername = username;
            }

            user.nome = nome;
            req.session.userName = nome;

            if (password && password.trim() !== '') {
                user.password = await bcrypt.hash(password, 10);
            }

            await user.save();

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
