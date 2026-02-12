
/**
 * Migração 005: Criar módulo de Compras e Pagamentos
 * 
 * Tabelas: Fornecedores, Compras, CompraItens, ContasPagar
 */

export function up(db) {
    console.log('  📝 Criando tabelas do módulo Financeiro...');

    // 1. FORNECEDORES
    db.exec(`
        CREATE TABLE IF NOT EXISTS Fornecedores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            cnpj_cpf TEXT,
            telefone TEXT,
            ativo BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log('  ✅ Tabela Fornecedores criada');

    // 2. COMPRAS
    db.exec(`
        CREATE TABLE IF NOT EXISTS Compras (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fornecedor_id INTEGER NOT NULL,
            data_emissao DATE NOT NULL,
            numero_nota TEXT NOT NULL,
            valor_bruto REAL DEFAULT 0,
            desconto_percentual REAL DEFAULT 0,
            desconto_valor REAL DEFAULT 0,
            valor_liquido REAL DEFAULT 0,
            observacoes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (fornecedor_id) REFERENCES Fornecedores(id) ON DELETE RESTRICT ON UPDATE CASCADE
        )
    `);
    console.log('  ✅ Tabela Compras criada');

    // 3. COMPRAS ITENS
    db.exec(`
        CREATE TABLE IF NOT EXISTS CompraItens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            compra_id INTEGER NOT NULL,
            descricao TEXT NOT NULL,
            tipo TEXT NOT NULL,
            quantidade REAL DEFAULT 1,
            valor_unitario REAL DEFAULT 0,
            valor_subtotal REAL DEFAULT 0,
            desconto_percentual REAL DEFAULT 0,
            desconto_valor REAL DEFAULT 0,
            valor_final REAL DEFAULT 0,
            placa TEXT,
            numero_os TEXT,
            observacoes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (compra_id) REFERENCES Compras(id) ON DELETE CASCADE ON UPDATE CASCADE,
            FOREIGN KEY (placa) REFERENCES Veiculos(placa) ON DELETE SET NULL ON UPDATE CASCADE
        )
    `);
    console.log('  ✅ Tabela CompraItens criada');

    // 4. CONTAS A PAGAR
    db.exec(`
        CREATE TABLE IF NOT EXISTS ContasPagar (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            compra_id INTEGER NOT NULL,
            numero_parcela INTEGER NOT NULL,
            total_parcelas INTEGER NOT NULL,
            valor REAL NOT NULL,
            vencimento DATE NOT NULL,
            data_pagamento DATE,
            forma_pagamento TEXT,
            status TEXT DEFAULT 'EM_ABERTO',
            confirmado BOOLEAN DEFAULT 0,
            observacoes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (compra_id) REFERENCES Compras(id) ON DELETE CASCADE ON UPDATE CASCADE
        )
    `);
    console.log('  ✅ Tabela ContasPagar criada');
}

export function down(db) {
    console.log('  📝 Removendo tabelas do módulo Financeiro...');

    // Ordem inversa para respeitar FKs
    db.exec('DROP TABLE IF EXISTS ContasPagar');
    db.exec('DROP TABLE IF EXISTS CompraItens');
    db.exec('DROP TABLE IF EXISTS Compras');
    db.exec('DROP TABLE IF EXISTS Fornecedores');

    console.log('  ✅ Tabelas removidas');
}
