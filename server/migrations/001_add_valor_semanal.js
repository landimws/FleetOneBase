/**
 * Migração 001: Adicionar campo valor_semanal
 * 
 * Adiciona o campo valor_semanal à tabela LinhaSemanas para armazenar
 * o valor semanal exato digitado pelo usuário, evitando erros de precisão
 * de ponto flutuante em cálculos repetidos.
 */

export function up(db) {
    console.log('  📝 Verificando se coluna valor_semanal existe...');

    // Verificar se a coluna já existe
    const tableInfo = db.prepare('PRAGMA table_info(LinhaSemanas)').all();
    const colunaExiste = tableInfo.some(col => col.name === 'valor_semanal');

    if (colunaExiste) {
        console.log('  ℹ️  Coluna valor_semanal já existe, pulando criação...');
    } else {
        console.log('  📝 Adicionando coluna valor_semanal...');

        // Adicionar coluna
        db.exec(`
            ALTER TABLE LinhaSemanas 
            ADD COLUMN valor_semanal REAL DEFAULT 0
        `);

        console.log('  ✅ Coluna valor_semanal adicionada');
    }

    // Popular dados existentes: valor_semanal = diaria * 7
    // (Só atualiza onde valor_semanal ainda é 0)
    console.log('  📝 Populando dados existentes...');
    const result = db.prepare(`
        UPDATE LinhaSemanas 
        SET valor_semanal = diaria * 7 
        WHERE valor_semanal = 0 AND diaria > 0
    `).run();

    console.log(`  ✅ ${result.changes} registro(s) atualizado(s)`);
}

export function down(db) {
    console.log('  📝 Removendo coluna valor_semanal...');

    // SQLite não suporta DROP COLUMN diretamente
    // Precisamos recriar a tabela sem a coluna

    // Isso é complexo e arriscado, então apenas alertamos
    console.warn('  ⚠️  AVISO: Rollback desta migração requer recriação da tabela');
    console.warn('  ⚠️  Não implementado por segurança. Use backup para restaurar.');

    throw new Error('Rollback não suportado para esta migração. Use backup.');
}
