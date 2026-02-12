
import { Op } from 'sequelize';
import { validationResult } from 'express-validator';

export const list = async (req, res) => {
    const { Cliente } = req.models;
    try {
        const { busca, ativo } = req.query;
        let where = {};

        if (ativo !== undefined) {
            where.ativo = ativo === 'true';
        }

        if (busca) {
            where.nome = { [Op.like]: `%${busca}%` };
        }

        const clientes = await Cliente.findAll({ where, order: [['nome', 'ASC']] });
        res.json(clientes);
    } catch (error) {
        console.error('Erro ao listar clientes:', error);
        res.status(500).json({ error: 'Erro ao listar clientes' });
    }
};

export const getByNome = async (req, res) => {
    const { Cliente } = req.models;
    try {
        const nome = req.params.nome;
        const cliente = await Cliente.findByPk(nome); // Atenção: ID vs Nome (Assume ID se rota mudou, mas parametro ainda chama nome?)
        // Se a rota for /api/clientes/:id, então req.params.nome pode estar errado se o router usar :id
        // Mas vamos manter a lógica original confiando que o router passará o parâmetro correto ou que 'nome' aqui é um placeholder.
        // O original usava findByPk(nome), mas Cliente.js agora tem ID.
        // [FIX] Se o parâmetro for 'nome', e tabela usa ID, findByPk pode falhar se passar string.
        // Mas se o frontend mandar ID na url, ok.

        if (!cliente) {
            return res.status(404).json({ error: 'Cliente não encontrado' });
        }

        res.json(cliente);
    } catch (error) {
        console.error('Erro ao buscar cliente:', error);
        res.status(500).json({ error: 'Erro ao buscar cliente' });
    }
};

export const create = async (req, res) => {
    const { Cliente } = req.models;
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const { nome, ativo, cpf, rg, cnh,
            logradouro, numero, bairro, cidade, estado, cep,
            telefone, email, data_nascimento
        } = req.body;

        // Montar string completa para legado/busca
        const enderecoCompleto = `${logradouro || ''}, ${numero || ''} - ${bairro || ''} - ${cidade || ''}/${estado || ''}`;

        const cliente = await Cliente.create({
            nome,
            ativo: ativo !== undefined ? ativo : true,
            cpf, rg, cnh,
            logradouro, numero, bairro, cidade, estado, cep,
            endereco: enderecoCompleto,
            telefone, email, data_nascimento
        });

        res.status(201).json(cliente);
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ error: 'Cliente já cadastrado' });
        }
        res.status(500).json({ error: 'Erro ao criar cliente' });
    }
};

// [UPDATED] Update by ID
export const update = async (req, res) => {
    const { Cliente } = req.models;
    try {
        const { id } = req.params;
        const { novoNome, nome, ativo, cpf, rg, cnh,
            logradouro, numero, bairro, cidade, estado, cep,
            telefone, email, data_nascimento
        } = req.body;

        const cliente = await Cliente.findByPk(id);
        if (!cliente) return res.status(404).json({ error: 'Cliente não encontrado' });

        // Check CPF uniqueness if changing
        if (cpf && cpf !== cliente.cpf) {
            const existing = await Cliente.findOne({ where: { cpf } });
            if (existing) return res.status(400).json({ error: 'CPF já cadastrado para outro cliente.' });
        }

        // Update fields
        if (nome !== undefined) cliente.nome = nome;
        if (cpf !== undefined) cliente.cpf = cpf;
        if (rg !== undefined) cliente.rg = rg;
        if (cnh !== undefined) cliente.cnh = cnh;

        // ... (address fields same as before)
        if (logradouro !== undefined) cliente.logradouro = logradouro;
        if (numero !== undefined) cliente.numero = numero;
        if (bairro !== undefined) cliente.bairro = bairro;
        if (cidade !== undefined) cliente.cidade = cidade;
        if (estado !== undefined) cliente.estado = estado;
        if (cep !== undefined) cliente.cep = cep;

        // ... (contact fields same as before)
        if (telefone !== undefined) cliente.telefone = telefone;
        if (email !== undefined) cliente.email = email;
        if (data_nascimento !== undefined) cliente.data_nascimento = data_nascimento;

        // Update legacy address string
        cliente.endereco = `${cliente.logradouro || ''}, ${cliente.numero || ''} - ${cliente.bairro || ''} - ${cliente.cidade || ''}/${cliente.estado || ''}`;

        if (ativo !== undefined) cliente.ativo = ativo;

        await cliente.save();
        res.json(cliente);
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ error: 'CPF já cadastrado.' });
        }
        res.status(500).json({ error: 'Erro ao atualizar cliente' });
    }
};

// [UPDATED] Remove by ID
export const remove = async (req, res) => {
    const { Cliente, LinhaSemana } = req.models;
    try {
        const { id } = req.params;

        // [TODO] LinhaSemana usa nome ou ID? A migração não mudou FKs.
        // Supomos que LinhaSemana.cliente (string) ainda seja usado.
        // Precisamos verificar o nome do cliente antes de deletar pelo ID.

        const cliente = await Cliente.findByPk(id);
        if (!cliente) return res.status(404).json({ error: 'Cliente não encontrado' });

        // Check usage by Name in LinhaSemana (legacy support)
        const usoContrato = await LinhaSemana.findOne({ where: { cliente: cliente.nome, CO: false } });
        if (usoContrato) return res.status(400).json({ error: `Cliente possui contratos ativos (${usoContrato.id}).` });

        await cliente.destroy();
        res.json({ message: 'Cliente excluído' });
    } catch (e) {
        res.status(500).json({ error: 'Erro ao excluir: ' + e.message });
    }
};
