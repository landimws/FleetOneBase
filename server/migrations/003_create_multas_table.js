/**
 * Migração 003: Criar tabela de Multas
 */

export function up(db) {
    console.log('  📝 Criando tabela Multas...');

    db.exec(`
        CREATE TABLE IF NOT EXISTS Multas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            veiculo_id TEXT NOT NULL,
            numero_auto TEXT NOT NULL UNIQUE,
            data_infracao DATE NOT NULL,
            data_lancamento DATE NOT NULL DEFAULT CURRENT_DATE,
            valor_original DECIMAL(10,2) NOT NULL,
            orgao_autuador TEXT NOT NULL,
            data_vencimento DATE NOT NULL,
            tipo_responsavel TEXT CHECK(tipo_responsavel IN ('cliente', 'locadora')) NOT NULL,
            cliente_nome TEXT,
            
            -- Controle
            foi_indicado BOOLEAN DEFAULT 0,
            reconheceu BOOLEAN DEFAULT 0,
            desconto_aplicado INTEGER DEFAULT 0 CHECK(desconto_aplicado IN (0, 20, 40)),
            cobrar_taxa_administrativa BOOLEAN DEFAULT 0,
            
            -- Financeiro
            data_pagamento_orgao DATE,
            valor_pago_orgao DECIMAL(10,2),
            data_lancamento_carteira DATE,
            valor_lancado_carteira DECIMAL(10,2),
            
            observacoes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (veiculo_id) REFERENCES Veiculos(placa),
            FOREIGN KEY (cliente_nome) REFERENCES Clientes(nome)
        )
    `);

    console.log('  ✅ Tabela Multas criada com sucesso');
}

export function down(db) {
    console.log('  📝 Removendo tabela Multas...');
    db.exec('DROP TABLE IF EXISTS Multas');
    console.log('  ✅ Tabela Multas removida');
}
