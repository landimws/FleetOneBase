/**
 * Migração 010: Criar módulo de Contratos
 * 
 * Tabelas: ConfiguracoesContrato, ItensContratoPadrao, Contratos, ContratoItens, TemplatesDocumento, TemplatesDocumentoHistorico
 */

export function up(db) {
    console.log('  📝 Criando tabelas do módulo de Contratos...');

    // 1. ConfiguracoesContrato
    db.exec(`
        CREATE TABLE IF NOT EXISTS ConfiguracoesContrato (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            empresa_id INTEGER,
            
            -- Taxas
            taxa_administrativa REAL DEFAULT 0.15,
            taxa_retorno REAL DEFAULT 0,
            taxa_limpeza_basica REAL DEFAULT 0,
            taxa_limpeza_especial REAL DEFAULT 0,
            
            -- Multas e Juros  
            percentual_multa_atraso REAL DEFAULT 0.02,
            percentual_juros_mora REAL DEFAULT 0.01,
            percentual_multa_rescisao REAL DEFAULT 0.10,
            multa_arrependimento REAL DEFAULT 0,
            multa_km_nao_revisao REAL DEFAULT 0,
            
            -- Padrões
            vigencia_padrao_dias INTEGER DEFAULT 30,
            km_franquia_padrao INTEGER DEFAULT 100,
            valor_km_excedente_padrao REAL DEFAULT 0.5,
            valor_avaria_padrao REAL DEFAULT 0,
            
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log('  ✅ Tabela ConfiguracoesContrato criada');

    // 2. ItensContratoPadrao
    db.exec(`
        CREATE TABLE IF NOT EXISTS ItensContratoPadrao (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            descricao TEXT,
            tipo_item TEXT,
            valor_padrao REAL DEFAULT 0,
            permite_edicao_valor BOOLEAN DEFAULT 1,
            ativo BOOLEAN DEFAULT 1,
            ordem_exibicao INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log('  ✅ Tabela ItensContratoPadrao criada');

    // 3. Contratos
    db.exec(`
        CREATE TABLE IF NOT EXISTS Contratos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            numero_contrato TEXT UNIQUE,
            cliente_id INTEGER NOT NULL,
            veiculo_placa TEXT NOT NULL,
            
            data_assinatura DATE,
            data_inicio DATE,
            data_fim DATE,
            vigencia_dias INTEGER,
            
            dia_pagamento TEXT,
            km_franquia INTEGER,
            valor_km_excedente REAL,
            valor_avaria REAL,
            
            valor_caucao REAL,
            caucao_forma_pagamento TEXT,
            caucao_num_parcelas INTEGER,
            caucao_valor_parcela REAL,
            
            veiculo_valor_fipe REAL,
            veiculo_cor TEXT,
            veiculo_marca TEXT,
            
            status TEXT DEFAULT 'ativo',
            dados_processados TEXT,
            pdf_url TEXT,
            observacoes TEXT,
            
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            
            FOREIGN KEY (cliente_id) REFERENCES Clientes(id) ON DELETE RESTRICT ON UPDATE CASCADE,
            FOREIGN KEY (veiculo_placa) REFERENCES Veiculos(placa) ON DELETE RESTRICT ON UPDATE CASCADE
        )
    `);
    console.log('  ✅ Tabela Contratos criada');

    // 4. ContratoItens
    db.exec(`
        CREATE TABLE IF NOT EXISTS ContratoItens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            contrato_id INTEGER NOT NULL,
            item_padrao_id INTEGER NOT NULL,
            nome TEXT,
            descricao TEXT,
            tipo_item TEXT,
            quantidade INTEGER DEFAULT 1,
            valor_unitario REAL NOT NULL,
            valor_total REAL NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            
            FOREIGN KEY (contrato_id) REFERENCES Contratos(id) ON DELETE CASCADE ON UPDATE CASCADE,
            FOREIGN KEY (item_padrao_id) REFERENCES ItensContratoPadrao(id) ON DELETE RESTRICT ON UPDATE CASCADE
        )
    `);
    console.log('  ✅ Tabela ContratoItens criada');

    // 5. TemplatesDocumento
    db.exec(`
        CREATE TABLE IF NOT EXISTS TemplatesDocumento (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            tipo TEXT NOT NULL,
            descricao TEXT,
            html_completo TEXT NOT NULL,
            css_customizado TEXT,
            versao INTEGER DEFAULT 1,
            ativo BOOLEAN DEFAULT 1,
            criado_por INTEGER,
            atualizado_por INTEGER,
            variaveis_disponiveis TEXT,
            exemplo_dados TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log('  ✅ Tabela TemplatesDocumento criada');

    // 6. TemplatesDocumentoHistorico
    db.exec(`
        CREATE TABLE IF NOT EXISTS TemplatesDocumentoHistorico (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            template_id INTEGER NOT NULL,
            versao INTEGER NOT NULL,
            html_completo TEXT NOT NULL,
            css_customizado TEXT,
            alterado_por INTEGER,
            motivo_alteracao TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            
            FOREIGN KEY (template_id) REFERENCES TemplatesDocumento(id) ON DELETE CASCADE ON UPDATE CASCADE
        )
    `);
    console.log('  ✅ Tabela TemplatesDocumentoHistorico criada');

    console.log('  ✅ Migração 010 concluída - Módulo de Contratos criado');
}

export function down(db) {
    console.log('  📝 Removendo tabelas do módulo de Contratos...');

    // Ordem inversa para respeitar FKs
    db.exec('DROP TABLE IF EXISTS TemplatesDocumentoHistorico');
    db.exec('DROP TABLE IF EXISTS TemplatesDocumento');
    db.exec('DROP TABLE IF EXISTS ContratoItens');
    db.exec('DROP TABLE IF EXISTS Contratos');
    db.exec('DROP TABLE IF EXISTS ItensContratoPadrao');
    db.exec('DROP TABLE IF EXISTS ConfiguracoesContrato');

    console.log('  ✅ Tabelas removidas');
}
