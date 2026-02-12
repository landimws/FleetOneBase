/**
 * Migração 002: Limpar dados de semanas
 * 
 * Remove todos os dados das tabelas Semanas e LinhaSemanas,
 * mantendo apenas Veículos e Clientes.
 * 
 * ATENÇÃO: Esta operação é DESTRUTIVA e não pode ser revertida!
 */

export function up(db) {
    console.log('  🗑️  Limpando dados de semanas...');

    // Contar registros antes
    const countSemanas = db.prepare('SELECT COUNT(*) as total FROM Semanas').get();
    const countLinhas = db.prepare('SELECT COUNT(*) as total FROM LinhaSemanas').get();

    console.log(`  📊 Registros a serem deletados:`);
    console.log(`     - Semanas: ${countSemanas.total}`);
    console.log(`     - LinhaSemanas: ${countLinhas.total}`);

    // Deletar todos os dados de LinhaSemanas primeiro (por causa da FK)
    console.log('  🗑️  Deletando LinhaSemanas...');
    const resultLinhas = db.prepare('DELETE FROM LinhaSemanas').run();
    console.log(`  ✅ ${resultLinhas.changes} linha(s) deletada(s)`);

    // Deletar todos os dados de Semanas
    console.log('  🗑️  Deletando Semanas...');
    const resultSemanas = db.prepare('DELETE FROM Semanas').run();
    console.log(`  ✅ ${resultSemanas.changes} semana(s) deletada(s)`);

    // Resetar auto-increment
    console.log('  🔄 Resetando auto-increment...');
    db.exec(`DELETE FROM sqlite_sequence WHERE name IN ('Semanas', 'LinhaSemanas')`);
    console.log('  ✅ Auto-increment resetado');

    // Contar registros após
    const countSemanasAfter = db.prepare('SELECT COUNT(*) as total FROM Semanas').get();
    const countLinhasAfter = db.prepare('SELECT COUNT(*) as total FROM LinhaSemanas').get();

    console.log(`  📊 Registros restantes:`);
    console.log(`     - Semanas: ${countSemanasAfter.total}`);
    console.log(`     - LinhaSemanas: ${countLinhasAfter.total}`);

    // Verificar que Veículos e Clientes não foram afetados
    const countVeiculos = db.prepare('SELECT COUNT(*) as total FROM Veiculos').get();
    const countClientes = db.prepare('SELECT COUNT(*) as total FROM Clientes').get();

    console.log(`  ✅ Dados preservados:`);
    console.log(`     - Veículos: ${countVeiculos.total}`);
    console.log(`     - Clientes: ${countClientes.total}`);

    console.log('  ✅ Limpeza concluída com sucesso!');
}

export function down(db) {
    console.log('  ⚠️  AVISO: Não é possível reverter deleção de dados');
    console.log('  ⚠️  Use backup para restaurar os dados deletados');

    throw new Error('Rollback não suportado para deleção de dados. Use backup.');
}
