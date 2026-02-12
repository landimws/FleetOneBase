
import Fornecedor from '../models-sqlite/Fornecedor.js';

export const list = async (req, res) => {
    try {
        const fornecedores = await Fornecedor.findAll({
            order: [['nome', 'ASC']]
        });
        res.json(fornecedores);
    } catch (error) {
        console.error('Erro ao listar fornecedores:', error);
        res.status(500).json({ error: 'Erro ao listar fornecedores' });
    }
};

import Compra from '../models-sqlite/Compra.js';
import { Sequelize } from 'sequelize';

export const getById = async (req, res) => {
    try {
        const { id } = req.params;
        const fornecedor = await Fornecedor.findByPk(id, {
            include: [{
                model: Compra,
                attributes: ['data_emissao', 'valor_liquido']
            }]
        });

        if (!fornecedor) return res.status(404).json({ error: 'Fornecedor não encontrado' });

        // Calculate financial summary manually (or via Sequelize aggregate if preferred, but this is simpler for now)
        const compras = fornecedor.Compras || [];
        const total_gasto = compras.reduce((sum, c) => sum + Number(c.valor_liquido || 0), 0);

        let ultima_compra = null;
        if (compras.length > 0) {
            // Find max date
            ultima_compra = compras.reduce((max, c) => c.data_emissao > max ? c.data_emissao : max, compras[0].data_emissao);
        }

        const result = {
            ...fornecedor.toJSON(),
            total_gasto,
            ultima_compra
        };

        res.json(result);
    } catch (error) {
        console.error('Erro ao buscar fornecedor:', error);
        res.status(500).json({ error: 'Erro ao buscar fornecedor' });
    }
};

export const create = async (req, res) => {
    try {
        const { nome, cnpj_cpf, telefone, ativo } = req.body;

        if (!nome) {
            return res.status(400).json({ error: 'Nome é obrigatório' });
        }

        if (cnpj_cpf) {
            const existe = await Fornecedor.findOne({ where: { cnpj_cpf } });
            if (existe) {
                return res.status(400).json({ error: 'Este CNPJ/CPF já está cadastrado para outro fornecedor.' });
            }
        }

        const novo = await Fornecedor.create({
            nome,
            cnpj_cpf,
            telefone,
            ativo: ativo !== undefined ? ativo : true
        });

        res.status(201).json(novo);
    } catch (error) {
        console.error('Erro ao criar fornecedor:', error);
        res.status(500).json({ error: 'Erro ao criar fornecedor' });
    }
};

export const update = async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, cnpj_cpf, telefone, ativo } = req.body;

        const fornecedor = await Fornecedor.findByPk(id);
        if (!fornecedor) {
            return res.status(404).json({ error: 'Fornecedor não encontrado' });
        }

        if (cnpj_cpf && cnpj_cpf !== fornecedor.cnpj_cpf) {
            const { Op } = await import('sequelize');
            const existe = await Fornecedor.findOne({
                where: {
                    cnpj_cpf,
                    id: { [Op.ne]: id }
                }
            });
            if (existe) {
                return res.status(400).json({ error: 'Este CNPJ/CPF já está em uso por outro fornecedor.' });
            }
        }

        await fornecedor.update({
            nome,
            cnpj_cpf,
            telefone,
            ativo
        });

        res.json(fornecedor);
    } catch (error) {
        console.error('Erro ao atualizar fornecedor:', error);
        res.status(500).json({ error: 'Erro ao atualizar fornecedor' });
    }
};

export const remove = async (req, res) => {
    try {
        const { id } = req.params;
        const fornecedor = await Fornecedor.findByPk(id);

        if (!fornecedor) {
            return res.status(404).json({ error: 'Fornecedor não encontrado' });
        }

        // Check for dependencies (Compras) before delete
        // Since we have RESTRICT in DB, sequelize might throw error, catch it.
        try {
            await fornecedor.destroy();
            res.json({ message: 'Fornecedor removido com sucesso' });
        } catch (e) {
            if (e.name === 'SequelizeForeignKeyConstraintError') {
                return res.status(400).json({ error: 'Não é possível excluir fornecedor com compras vinculadas.' });
            }
            throw e;
        }

    } catch (error) {
        console.error('Erro ao excluir fornecedor:', error);
        res.status(500).json({ error: 'Erro ao excluir fornecedor' });
    }
};
