# Sistema de Migrações

Este diretório contém as migrações do banco de dados SQLite do sistema de Controle Financeiro.

## 📋 Comandos Disponíveis

### Executar Migrações Pendentes
```bash
npm run migrate
```
- Cria backup automático antes de executar
- Executa todas as migrações pendentes em ordem
- Registra cada migração aplicada na tabela `migrations`

### Verificar Status
```bash
npm run migrate:status
```
- Mostra quais migrações já foram aplicadas
- Lista migrações pendentes

### Reverter Última Migração
```bash
npm run migrate:rollback
```
- Cria backup automático antes de reverter
- Reverte apenas a última migração aplicada
- **Atenção**: Nem todas as migrações suportam rollback

### Criar Backup Manual
```bash
npm run backup
```
- Cria um backup manual do banco de dados
- Útil antes de operações críticas

## 📝 Como Criar uma Nova Migração

### 1. Copiar o Template
```bash
cp server/migration-template.js server/migrations/00X_nome_da_migracao.js
```

### 2. Nomear Corretamente
- Use numeração sequencial: `001_`, `002_`, `003_`
- Use snake_case para o nome: `add_campo`, `create_tabela`
- Exemplo: `003_add_status_pagamento.js`

### 3. Implementar as Funções

#### Função `up(db)`
Aplica a migração (adiciona/modifica estrutura):
```javascript
export function up(db) {
    console.log('  📝 Adicionando coluna...');
    
    db.exec(`
        ALTER TABLE MinhaTabela 
        ADD COLUMN novo_campo TEXT DEFAULT ''
    `);
    
    console.log('  ✅ Coluna adicionada');
}
```

#### Função `down(db)`
Reverte a migração (opcional, mas recomendado):
```javascript
export function down(db) {
    console.log('  📝 Revertendo migração...');
    
    // SQLite não suporta DROP COLUMN
    // Para reverter, geralmente é necessário recriar a tabela
    // ou usar backup
    
    throw new Error('Rollback não suportado. Use backup.');
}
```

## ⚠️ Limitações do SQLite

O SQLite tem limitações em operações DDL:
- **Não suporta** `DROP COLUMN` diretamente
- **Não suporta** `ALTER COLUMN` para mudar tipo
- Para essas operações, é necessário:
  1. Criar nova tabela com estrutura desejada
  2. Copiar dados da tabela antiga
  3. Deletar tabela antiga
  4. Renomear nova tabela

## 🔒 Boas Práticas

### 1. Sempre Teste Localmente
```bash
# Verificar status
npm run migrate:status

# Criar backup manual
npm run backup

# Executar migração
npm run migrate

# Verificar se funcionou
npm run migrate:status
```

### 2. Migrações Devem Ser Idempotentes
- Sempre use `IF NOT EXISTS` ao criar tabelas
- Verifique se coluna já existe antes de adicionar
- Use transações para garantir atomicidade

### 3. Nunca Edite Migrações Aplicadas
- Uma vez aplicada, a migração é **imutável**
- Se precisar corrigir, crie uma **nova migração**
- Isso mantém o histórico consistente

### 4. Popule Dados Padrão
Se adicionar coluna NOT NULL, sempre:
```javascript
// 1. Adicionar coluna como NULL ou com DEFAULT
db.exec(`ALTER TABLE Tabela ADD COLUMN campo TEXT DEFAULT ''`);

// 2. Popular dados existentes
db.exec(`UPDATE Tabela SET campo = 'valor' WHERE campo IS NULL`);
```

## 📦 Sistema de Backup

### Backups Automáticos
- **Pré-Migração**: Criado automaticamente antes de cada migração
- **Pré-Rollback**: Criado automaticamente antes de reverter

### Localização
```
backups/
  2026-01-24T16-30-00_pre-migration.db
  2026-01-24T16-35-00_manual.db
```

### Política de Retenção
- Mantém últimos **30 backups**
- Backups mais antigos são deletados automaticamente
- Backups são nomeados com timestamp ISO

### Restaurar Backup
```bash
# 1. Parar o servidor
# 2. Copiar backup desejado
cp backups/2026-01-24T16-30-00_pre-migration.db database.sqlite

# 3. Reiniciar servidor
npm start
```

## 🗂️ Estrutura da Tabela de Controle

```sql
CREATE TABLE migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

Esta tabela rastreia quais migrações já foram aplicadas.

## 📚 Exemplos de Migrações

### Adicionar Coluna
```javascript
export function up(db) {
    db.exec(`
        ALTER TABLE LinhaSemanums 
        ADD COLUMN novo_campo REAL DEFAULT 0
    `);
}
```

### Criar Tabela
```javascript
export function up(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS NovaTabela (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
}
```

### Criar Índice
```javascript
export function up(db) {
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_placa 
        ON LinhaSemanums(placa)
    `);
}
```

### Migração de Dados
```javascript
export function up(db) {
    // Adicionar coluna
    db.exec(`ALTER TABLE Tabela ADD COLUMN status TEXT DEFAULT 'ativo'`);
    
    // Migrar dados baseado em lógica
    db.exec(`
        UPDATE Tabela 
        SET status = 'inativo' 
        WHERE data_fim < date('now')
    `);
}
```

## 🚨 Troubleshooting

### Migração Falhou
1. Verifique os logs de erro
2. Restaure o backup pré-migração
3. Corrija a migração
4. Tente novamente

### Migração Aplicada Parcialmente
1. Verifique a tabela `migrations`
2. Se registrada: use rollback ou restaure backup
3. Se não registrada: a transação foi revertida automaticamente

### Backup Corrompido
- Backups são criados com `fs.copy`, garantindo integridade
- Se suspeitar de corrupção, use comando SQLite:
```bash
sqlite3 backups/arquivo.db "PRAGMA integrity_check;"
```
