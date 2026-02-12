
import Cliente from '../models-sqlite/Cliente.js';
import LinhaSemana from '../models-sqlite/LinhaSemana.js';
import { Op } from 'sequelize';
import { validationResult } from 'express-validator';

export const list = async (req, res) => {
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
    try {
        const nome = req.params.nome;
        const cliente = await Cliente.findByPk(nome);

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
    try {
        const { id } = req.params; // Changed from nome to id
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
        if (nome !== undefined) cliente.nome = nome; // Allow name change
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
    try {
        const { id } = req.params; // Changed from nome to id

        // Check Usage (LinhaSemana uses 'cliente' name string currently? We need to check this!)
        // If LinhaSemana stores 'nome', we need to be careful. Ideally it should store ID.
        // For now, let's assume we proceed with ID for deletion check against Cliente table.
        // But the constraint check might fail if other tables still reference 'nome'?
        // The migration didn't update foreign keys in other tables. This is a risk.
        // However, user asked for Cliente Refactor. If LinhaSemana uses Name string, it acts as a loose reference now.
        // We should probably check by name still for safety if other tables aren't migrated?
        // Let's stick to ID deletion for the Cliente table itself.

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
