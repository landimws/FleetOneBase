
import sequelize from './config/database-sqlite.js';
import { DataTypes } from 'sequelize';
import Cliente from './models-sqlite/Cliente.js';
import Debito from './models-sqlite/Debito.js';
import Credito from './models-sqlite/Credito.js';

async function migrate() {
    try {
        console.log('🔄 Iniciando migração de Cliente ID para Carteira (Débitos e Créditos)...');

        // 1. Adicionar coluna cliente_id em Debitos
        try {
            await sequelize.getQueryInterface().addColumn('debitos', 'cliente_id', {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: {
                    model: 'Clientes',
                    key: 'id'
                }
            });
            console.log('✅ Coluna cliente_id adicionada em Debitos.');
        } catch (e) {
            console.log('⚠️ Coluna cliente_id já deve existir em Debitos:', e.message);
        }

        // 2. Adicionar coluna cliente_id em Creditos
        try {
            await sequelize.getQueryInterface().addColumn('creditos', 'cliente_id', {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: {
                    model: 'Clientes',
                    key: 'id'
                }
            });
            console.log('✅ Coluna cliente_id adicionada em Creditos.');
        } catch (e) {
            console.log('⚠️ Coluna cliente_id já deve existir em Creditos:', e.message);
        }

        // 3. Migrar Dados de Debitos
        console.log('🔄 Migrando dados de Debitos...');
        const debitos = await Debito.findAll();
        let debitosAtualizados = 0;

        for (const debito of debitos) {
            if (debito.cliente_nome && !debito.cliente_id) {
                const cliente = await Cliente.findOne({ where: { nome: debito.cliente_nome } });
                if (cliente) {
                    await debito.update({ cliente_id: cliente.id });
                    debitosAtualizados++;
                }
            }
        }
        console.log(`✅ ${debitosAtualizados} débitos atualizados com cliente_id.`);

        // 4. Migrar Dados de Creditos
        console.log('🔄 Migrando dados de Creditos...');
        const creditos = await Credito.findAll();
        let creditosAtualizados = 0;

        for (const credito of creditos) {
            if (credito.cliente_nome && !credito.cliente_id) {
                const cliente = await Cliente.findOne({ where: { nome: credito.cliente_nome } });
                if (cliente) {
                    await credito.update({ cliente_id: cliente.id });
                    creditosAtualizados++;
                }
            }
        }
        console.log(`✅ ${creditosAtualizados} créditos atualizados com cliente_id.`);

        console.log('🎉 Migração da Carteira concluída com sucesso!');

    } catch (error) {
        console.error('❌ Erro fatal na migração da carteira:', error);
    }
}

migrate();
