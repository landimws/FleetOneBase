/**
 * Migração 009: Adicionar campos de contrato ao Veiculo
 * 
 * Campos: marca, cor, valor_fipe
 */

export function up(db) {
    console.log('  📝 Adicionando campos de contrato na tabela Veiculos...');

    // Verificar se as colunas já existem antes de adicionar
    const tableInfo = db.prepare(`PRAGMA table_info(Veiculos)`).all();
    const existingColumns = tableInfo.map(col => col.name);

    // Adicionar campo 'marca' se não existir
    if (!existingColumns.includes('marca')) {
        db.exec(`ALTER TABLE Veiculos ADD COLUMN marca TEXT`);
        console.log('  ✅ Campo marca adicionado');
    } else {
        console.log('  ⏭️  Campo marca já existe');
    }

    // Adicionar campo 'cor' se não existir
    if (!existingColumns.includes('cor')) {
        db.exec(`ALTER TABLE Veiculos ADD COLUMN cor TEXT`);
        console.log('  ✅ Campo cor adicionado');
    } else {
        console.log('  ⏭️  Campo cor já existe');
    }

    // Adicionar campo 'valor_fipe' se não existir
    if (!existingColumns.includes('valor_fipe')) {
        db.exec(`ALTER TABLE Veiculos ADD COLUMN valor_fipe REAL DEFAULT 0`);
        console.log('  ✅ Campo valor_fipe adicionado');
    } else {
        console.log('  ⏭️  Campo valor_fipe já existe');
    }

    console.log('  ✅ Migração 009 concluída');
}

export function down(db) {
    console.log('  📝 Removendo campos de contrato da tabela Veiculos...');

    // SQLite não suporta DROP COLUMN diretamente
    // Para reverter, seria necessário recriar a tabela
    throw new Error('Rollback não suportado para ALTER TABLE. Use backup se necessário.');
}
