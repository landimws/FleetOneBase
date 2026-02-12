
import sequelize from './config/database-sqlite.js';
import { DataTypes } from 'sequelize';
import Cliente from './models-sqlite/Cliente.js';
import Encerramento from './models-sqlite/Encerramento.js';

async function migrate() {
    try {
        console.log('🔄 Iniciando migração de Cliente ID para Encerramentos...');

        // 1. Adicionar coluna cliente_id
        try {
            await sequelize.getQueryInterface().addColumn('Encerramentos', 'cliente_id', {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: {
                    model: 'Clientes',
                    key: 'id'
                }
            });
            console.log('✅ Coluna cliente_id adicionada em Encerramentos.');
        } catch (e) {
            console.log('⚠️ Coluna cliente_id já deve existir em Encerramentos:', e.message);
        }

        // 2. Migrar Dados
        const records = await Encerramento.findAll();
        let atualizados = 0;

        for (const record of records) {
            if (record.cliente_nome && !record.cliente_id) {
                const cliente = await Cliente.findOne({ where: { nome: record.cliente_nome } });
                if (cliente) {
                    await record.update({ cliente_id: cliente.id });
                    atualizados++;
                }
            }
        }
        console.log(`✅ ${atualizados} encerramentos atualizados com cliente_id.`);
        console.log('🎉 Migração de Encerramentos concluída!');

    } catch (error) {
        console.error('❌ Erro na migração de encerramentos:', error);
    }
}

migrate();
