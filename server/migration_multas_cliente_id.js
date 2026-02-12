
import sequelize from './config/database-sqlite.js';
import { DataTypes } from 'sequelize';
import Cliente from './models-sqlite/Cliente.js';
import Multa from './models-sqlite/Multa.js';
import LinhaSemana from './models-sqlite/LinhaSemana.js';

async function migrate() {
    try {
        console.log('🔄 Iniciando migração de Cliente ID para Multas e LinhaSemanas...');

        // 1. Adicionar coluna cliente_id em Multas se não existir
        try {
            await sequelize.getQueryInterface().addColumn('Multas', 'cliente_id', {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: {
                    model: 'Clientes',
                    key: 'id'
                }
            });
            console.log('✅ Coluna cliente_id adicionada em Multas.');
        } catch (e) {
            console.log('⚠️ Coluna cliente_id já deve existir em Multas (ou erro ao criar):', e.message);
        }

        // 2. Adicionar coluna cliente_id em LinhaSemanas se não existir
        try {
            await sequelize.getQueryInterface().addColumn('LinhaSemana', 'cliente_id', {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: {
                    model: 'Clientes',
                    key: 'id'
                }
            });
            console.log('✅ Coluna cliente_id adicionada em LinhaSemanas.');
        } catch (e) {
            console.log('⚠️ Coluna cliente_id já deve existir em LinhaSemanas (ou erro ao criar):', e.message);
        }

        // 3. Migrar Dados de Multas
        console.log('🔄 Migrando dados de Multas...');
        const multas = await Multa.findAll();
        let multasAtualizadas = 0;

        for (const multa of multas) {
            if (multa.cliente_nome && !multa.cliente_id) {
                const cliente = await Cliente.findOne({ where: { nome: multa.cliente_nome } });
                if (cliente) {
                    await multa.update({ cliente_id: cliente.id });
                    multasAtualizadas++;
                } else {
                    console.warn(`⚠️ Cliente não encontrado para Multa ID ${multa.id} (Nome: ${multa.cliente_nome})`);
                }
            }
        }
        console.log(`✅ ${multasAtualizadas} multas atualizadas com cliente_id.`);

        // 4. Migrar Dados de LinhaSemana
        console.log('🔄 Migrando dados de LinhaSemana...');
        const linhas = await LinhaSemana.findAll();
        let linhasAtualizadas = 0;

        for (const linha of linhas) {
            if (linha.cliente && !linha.cliente_id) {
                const cliente = await Cliente.findOne({ where: { nome: linha.cliente } });
                if (cliente) {
                    await linha.update({ cliente_id: cliente.id });
                    linhasAtualizadas++;
                } else {
                    console.warn(`⚠️ Cliente não encontrado para LinhaSemana ID ${linha.id} (Nome: ${linha.cliente})`);
                }
            }
        }
        console.log(`✅ ${linhasAtualizadas} linhas atualizadas com cliente_id.`);

        console.log('🎉 Migração concluída com sucesso!');

    } catch (error) {
        console.error('❌ Erro fatal na migração:', error);
    } finally {
        // Não fechar conexão se estiver rodando via script que requer persistencia, 
        // mas como é script avulso, encerramos.
        // await sequelize.close(); 
    }
}

// Executar se chamado diretamente
migrate();
