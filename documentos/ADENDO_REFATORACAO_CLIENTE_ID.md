# ADENDO: Refatoração de Chave Primária de Cliente
## Análise de Impacto e Estratégia de Migração

---

## 1. Problema Atual: Nome como Chave Primária

### 1.1 Definição Atual

**Model:** [`Cliente.js`](file:///c:/Landim/ControleFinanceiro/server/models-sqlite/Cliente.js)

```javascript
const Cliente = sequelize.define('Cliente', {
    nome: {
        type: DataTypes.STRING,
        primaryKey: true,  // ← PROBLEMA
        allowNull: false
    },
    cpf: { type: DataTypes.STRING },  // ← Opcional
    // ...
});
```

### 1.2 Problemas Identificados

#### 🔴 **CRÍTICO: Clientes com Nomes Idênticos**

**Cenário real:**
- Cliente "João Silva" cadastrado em 2024
- Novo cliente "João Silva" em 2026 → **ERRO de PK duplicada**

**Consequência:** Impossível cadastrar clientes homônimos.

#### 🔴 **CRÍTICO: Alteração de Nome Quebra Integridade Referencial**

**Cenário:**
1. Cliente cadastrado como "Maria Santos"
2. Possui débitos, créditos, multas com `cliente_nome = "Maria Santos"`
3. Cliente casa e muda para "Maria Santos Silva"
4. **Atualizar nome quebra todas as FKs**

**SQLite não suporta `ON UPDATE CASCADE` para STRING PKs de forma confiável.**

#### 🟡 **Médio: Performance de Joins**

```sql
-- Join atual (STRING comparison)
SELECT * FROM Debitos d
JOIN Clientes c ON d.cliente_nome = c.nome;

-- Join ideal (INTEGER comparison)
SELECT * FROM Debitos d
JOIN Clientes c ON d.cliente_id = c.id;
```

**Impacto:** JOINs com STRING são 2-3x mais lentos que INTEGER.

#### 🟡 **Médio: Tamanho de Banco**

Cada FK armazena o nome completo (10-50 bytes) vs ID (4 bytes).

**Exemplo:**
- 1.000 débitos × nome "João Silva" (10 bytes) = 10 KB
- 1.000 débitos × ID (4 bytes) = 4 KB

**Economia projetada:** 30-50% no tamanho das tabelas de movimento.

#### 🟢 **Baixo: Espaços e Capitalização**

```javascript
"João Silva" !== "joão silva" !== "João  Silva" (2 espaços)
```

Nome como PK é sensível a variações de digitação.

---

## 2. Tabelas Afetadas pela Mudança

### 2.1 Tabelas com FK para Cliente

| Tabela | Campo FK | Relacionamento | Uso |
|--------|----------|----------------|-----|
| **Credito** | `cliente_nome` | `belongsTo Cliente` | Lançamentos de crédito |
| **Debito** | `cliente_nome` | `belongsTo Cliente` | Lançamentos de débito |
| **Multa** | `cliente_nome` | `belongsTo Cliente` | Responsável por multa |
| **Encerramento** | `cliente_nome` | (sem FK explícita) | Encerramento de contrato |
| **LinhaSemana** | `cliente` | (campo livre STRING) | Cliente ativo na semana |

**Total:** 5 tabelas precisam ser modificadas.

### 2.2 Código que Usa `cliente_nome`

**Services:**
- `MultaService.js` - 5 ocorrências
- `CarteiraService.js` - 3 ocorrências
- `DashboardService.js` - 3 ocorrências (usa campo `cliente` de LinhaSemana)

**Controllers:**
- `MultasController.js` - 1 ocorrência (filtro de busca)
- `EncerramentoController.js` - 2 ocorrências (parâmetro de rota)
- `SemanasController.js` - 2 ocorrências (campo `cliente`)
- `RelatoriosController.js` - 2 ocorrências
- `VeiculosController.js` - 2 ocorrências

**Total:** ~20 pontos no código precisam ser ajustados.

---

## 3. Opções de Refatoração

### Opção 1: ID Autoincrement ✅ **RECOMENDADA**

#### **Nova Estrutura:**

```javascript
const Cliente = sequelize.define('Cliente', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nome: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: false  // Permite homônimos
    },
    cpf: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,  // CPF único quando informado
        sparse: true   // Permite múltiplos NULL
    },
    // ... outros campos
});
```

#### **Vantagens:**

✅ **Universalmente aceito** (padrão de mercado)  
✅ **Funciona com qualquer cliente** (com ou sem CPF)  
✅ **Performance máxima** (INTEGER é tipo mais rápido para JOIN)  
✅ **Facilita alteração de dados** (nome pode mudar livremente)  
✅ **Suporte nativo a CASCADE** em SQLite  
✅ **Compatível com qualquer framework/ORM**  
✅ **Permite clientes homônimos**

#### **Desvantagens:**

⚠️ **ID não tem significado** (é um número abstrato)  
⚠️ **Migração complexa** (precisa gerar IDs para clientes existentes)

---

### Opção 2: CPF como Chave Primária ❌ **NÃO RECOMENDADA**

#### **Nova Estrutura:**

```javascript
const Cliente = sequelize.define('Cliente', {
    cpf: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false  // ← PROBLEMA
    },
    nome: {
        type: DataTypes.STRING,
        allowNull: false
    },
    // ...
});
```

#### **Vantagens:**

✅ CPF é único por pessoa (regra de negócio garantida)  
✅ Fácil identificação visual  
✅ Auditoria mais fácil (CPF é rastreável)

#### **Desvantagens (CRÍTICAS):**

❌ **Clientes sem CPF:** Alguns clientes atuais não têm CPF cadastrado  
❌ **Estrangeiros:** CPF não se aplica a estrangeiros  
❌ **Mudança de CPF:** Correção de CPF digitado errado quebra FKs  
❌ **Performance:** STRING é mais lento que INTEGER  
❌ **Privacidade/LGPD:** CPF é dado sensível (exposição em logs, URLs, etc)  
❌ **Tamanho:** 11-14 caracteres vs 4 bytes (INTEGER)

---

### Opção 3: UUID ⚠️ **Muito complexo para o caso**

**Descartada:** Adiciona complexidade desnecessária para sistema local.

---

## 4. Estratégia de Migração Recomendada

### 4.1 Abordagem: ID Autoincrement

**Fases da migração:**

#### **FASE 1: Adicionar campo ID sem quebrar nada**

1. Adicionar coluna `id INTEGER` em `Clientes` (sem ser PK ainda)
2. Gerar IDs para clientes existentes
3. Sistema continua usando `nome` como PK temporariamente

**Migration:** `005_add_cliente_id.js`

```javascript
export function up(db) {
    // 1. Adicionar coluna id (nullable temporariamente)
    db.exec(`ALTER TABLE Clientes ADD COLUMN id INTEGER;`);
    
    // 2. Gerar IDs para clientes existentes (ordenado por nome)
    const clientes = db.prepare('SELECT nome FROM Clientes ORDER BY nome').all();
    const updateStmt = db.prepare('UPDATE Clientes SET id = ? WHERE nome = ?');
    
    clientes.forEach((cliente, index) => {
        updateStmt.run(index + 1, cliente.nome);
    });
    
    console.log(`✅ IDs gerados para ${clientes.length} clientes`);
}

export function down(db) {
    // Remover coluna id
    db.exec(`ALTER TABLE Clientes DROP COLUMN id;`);
}
```

---

#### **FASE 2: Adicionar FKs cliente_id nas tabelas relacionadas**

**Migration:** `006_add_cliente_id_fks.js`

```javascript
export function up(db) {
    // Creditos
    db.exec(`ALTER TABLE creditos ADD COLUMN cliente_id INTEGER;`);
    db.exec(`
        UPDATE creditos SET cliente_id = (
            SELECT id FROM Clientes WHERE nome = creditos.cliente_nome
        );
    `);
    
    // Debitos
    db.exec(`ALTER TABLE debitos ADD COLUMN cliente_id INTEGER;`);
    db.exec(`
        UPDATE debitos SET cliente_id = (
            SELECT id FROM Clientes WHERE nome = debitos.cliente_nome
        );
    `);
    
    // Multas
    db.exec(`ALTER TABLE Multas ADD COLUMN cliente_id INTEGER;`);
    db.exec(`
        UPDATE Multas SET cliente_id = (
            SELECT id FROM Clientes WHERE nome = Multas.cliente_nome
        );
    `);
    
    // Encerramentos
    db.exec(`ALTER TABLE Encerramentos ADD COLUMN cliente_id INTEGER;`);
    db.exec(`
        UPDATE Encerramentos SET cliente_id = (
            SELECT id FROM Clientes WHERE nome = Encerramentos.cliente_nome
        );
    `);
    
    console.log('✅ FKs cliente_id populadas em todas as tabelas');
}
```

**Observação:** LinhaSemana usa campo livre `cliente` (STRING), não precisa migrar ainda.

---

#### **FASE 3: Recriar tabelas com PK correta**

**IMPORTANTE:** SQLite não suporta `ALTER TABLE ... DROP PRIMARY KEY`.  
**Solução:** Recriar tabelas.

**Migration:** `007_migrate_cliente_to_id_pk.js`

```javascript
export function up(db) {
    db.exec('PRAGMA foreign_keys = OFF;');
    
    // 1. Criar tabela nova com estrutura correta
    db.exec(`
        CREATE TABLE Clientes_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            cpf TEXT UNIQUE,
            rg TEXT,
            cnh TEXT,
            logradouro TEXT,
            numero TEXT,
            bairro TEXT,
            cidade TEXT,
            estado TEXT,
            telefone TEXT,
            email TEXT,
            data_nascimento TEXT,
            endereco TEXT,
            ativo INTEGER DEFAULT 1,
            createdAt TEXT,
            updatedAt TEXT
        );
    `);
    
    // 2. Copiar dados (id já existe)
    db.exec(`
        INSERT INTO Clientes_new 
        SELECT id, nome, cpf, rg, cnh, logradouro, numero, bairro, 
               cidade, estado, telefone, email, data_nascimento, 
               endereco, ativo, createdAt, updatedAt
        FROM Clientes;
    `);
    
    // 3. Dropar tabela antiga e renomear
    db.exec('DROP TABLE Clientes;');
    db.exec('ALTER TABLE Clientes_new RENAME TO Clientes;');
    
    // 4. Recriar Creditos com FK para id
    db.exec(`
        CREATE TABLE creditos_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente_id INTEGER NOT NULL REFERENCES Clientes(id) ON DELETE CASCADE,
            data TEXT NOT NULL,
            valor_original REAL,
            valor REAL NOT NULL,
            tipo TEXT NOT NULL,
            descricao TEXT,
            desconto_percentual REAL DEFAULT 0,
            desconto_tipo TEXT DEFAULT 'percentual',
            banco TEXT,
            banco_confirmado INTEGER DEFAULT 0,
            observacao TEXT,
            createdAt TEXT,
            updatedAt TEXT
        );
    `);
    
    db.exec(`
        INSERT INTO creditos_new 
        SELECT id, cliente_id, data, valor_original, valor, tipo, descricao,
               desconto_percentual, desconto_tipo, banco, banco_confirmado,
               observacao, createdAt, updatedAt
        FROM creditos;
    `);
    
    db.exec('DROP TABLE creditos;');
    db.exec('ALTER TABLE creditos_new RENAME TO creditos;');
    
    // 5. Repetir para Debitos, Multas, Encerramentos...
    // (mesmo padrão)
    
    db.exec('PRAGMA foreign_keys = ON;');
    
    console.log('✅ Tabelas recriadas com cliente_id como FK');
}
```

**Tempo estimado:** Esta migration é complexa e deve ser testada em ambiente de teste primeiro.

---

#### **FASE 4: Atualizar Models no código**

**Cliente.js:**
```javascript
const Cliente = sequelize.define('Cliente', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nome: {
        type: DataTypes.STRING,
        allowNull: false
        // Removido primaryKey: true
    },
    cpf: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
    },
    // ... resto igual
});
```

**Credito.js:**
```javascript
const Credito = sequelize.define('Credito', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    cliente_id: {  // ← Novo campo
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: Cliente, key: 'id' }
    },
    // Remover campo cliente_nome
    // ... resto igual
});

Credito.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'cliente' });
```

**Repetir para:** Debito, Multa, Encerramento.

---

#### **FASE 5: Atualizar Controllers e Services**

**ANTES:**
```javascript
// MultaService.js
const multa = await Multa.create({
    cliente_nome: 'João Silva',
    // ...
});
```

**DEPOIS:**
```javascript
// Buscar cliente por nome para obter ID
const cliente = await Cliente.findOne({ where: { nome: 'João Silva' } });
if (!cliente) throw new Error('Cliente não encontrado');

const multa = await Multa.create({
    cliente_id: cliente.id,
    // ...
});
```

**Ou melhor ainda:**
```javascript
// Passar ID diretamente do frontend
const multa = await Multa.create({
    cliente_id: req.body.cliente_id,
    // ...
});
```

---

#### **FASE 6: Atualizar Frontend**

**ANTES (select por nome):**
```html
<select name="cliente_nome">
    <option value="João Silva">João Silva</option>
    <option value="Maria Santos">Maria Santos</option>
</select>
```

**DEPOIS (select por ID):**
```html
<select name="cliente_id">
    <option value="1">João Silva</option>
    <option value="2">Maria Santos</option>
</select>
```

**JSON retornado da API:**
```javascript
// ANTES
{ cliente_nome: "João Silva" }

// DEPOIS
{ 
    cliente_id: 1,
    cliente: {  // Include automático do Sequelize
        id: 1,
        nome: "João Silva",
        cpf: "123.456.789-00"
    }
}
```

---

## 5. Impacto em Funcionalidades Existentes

### 5.1 Carteira de Clientes

**ANTES:**
```javascript
// CarteiraService.js - buscar saldo por nome
const creditos = await Credito.findAll({ where: { cliente_nome: nomeCliente } });
```

**DEPOIS:**
```javascript
const creditos = await Credito.findAll({ 
    where: { cliente_id: idCliente },
    include: [{ model: Cliente, as: 'cliente' }]  // Para exibir nome
});
```

**Impacto:** Queries ficam mais eficientes (JOIN por INTEGER).

---

### 5.2 Multas

**ANTES:**
```javascript
// Filtro por nome
if (filters.cliente_nome) {
    where.cliente_nome = { [Op.like]: `%${filters.cliente_nome}%` };
}
```

**DEPOIS:**
```javascript
// Filtro por nome usando JOIN
if (filters.cliente_nome) {
    include.push({
        model: Cliente,
        as: 'cliente',
        where: { nome: { [Op.like]: `%${filters.cliente_nome}%` } }
    });
}
```

**Impacto:** Lógica de filtro precisa ser ajustada, mas funcionalidade idêntica para usuário.

---

### 5.3 Relatórios

**ANTES:**
```javascript
// RelatoriosController.js
key = l.cliente.trim();
if (!map.has(key)) map.set(key, { nome: key, total: 0 });
```

**DEPOIS:**
```javascript
key = l.cliente_id;
if (!map.has(key)) map.set(key, { 
    id: l.cliente_id,
    nome: l.Cliente.nome,  // Via include
    total: 0 
});
```

**Impacto:** Necessário usar `include: [Cliente]` nas queries.

---

### 5.4 Encerramento de Contratos

**ANTES (rota):**
```javascript
app.get('/api/encerramento/:cliente/:placa', ...)
// URL: /api/encerramento/João%20Silva/ABC1234
```

**DEPOIS:**
```javascript
app.get('/api/encerramento/:cliente_id/:placa', ...)
// URL: /api/encerramento/123/ABC1234
```

**Impacto:** URLs mudam, mas sistema fica mais robusto (ID não muda).

---

## 6. Caso Especial: LinhaSemana

### 6.1 Problema Atual

```javascript
// LinhaSemana.js
cliente: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Cliente (só para alugado)'
}
```

Este campo **não é FK** - é texto livre onde usuário digita o nome.

### 6.2 Opções

#### **Opção A: Manter como STRING** ⚠️
- Vantagem: Não precisa migrar
- Desvantagem: Inconsistência (resto usa ID)
- **Usar quando:** Cliente é digitado rápido (autocomplete por nome)

#### **Opção B: Converter para FK** ✅
```javascript
cliente_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: Cliente, key: 'id' }
}
```
- Vantagem: Consistência total
- Desvantagem: Mais complexo de usar (precisa selecionar cliente)

#### **Opção C: Híbrida (RECOMENDADA)** ✅
```javascript
cliente_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: Cliente, key: 'id' }
},
cliente_nome_temp: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Nome temporário se cliente_id não informado'
}
```

**Lógica:**
1. Usuário digita nome → salva em `cliente_nome_temp`
2. Ao salvar, backend tenta encontrar cliente por nome
3. Se encontrar → popula `cliente_id` e limpa `cliente_nome_temp`
4. Se não encontrar → mantém `cliente_nome_temp` até cadastrar cliente

---

## 7. Riscos da Migração

### 🔴 **CRÍTICO: Backup Obrigatório**

**ANTES de qualquer migration:**
```bash
npm run backup
# Criar backup manual adicional
cp data/prod/database.sqlite data/prod/database_ANTES_MIGRACAO_CLIENTE.sqlite
```

### 🔴 **CRÍTICO: Testar em Ambiente de Teste**

```bash
# 1. Copiar banco de produção para teste
cp data/prod/database.sqlite data/test/database_test.sqlite

# 2. Rodar migrations em teste
NODE_ENV=test npm run migrate

# 3. Validar integridade
node server/scripts/validate-cliente-migration.js

# 4. Se OK, aplicar em produção
npm run migrate
```

### 🟡 **Médio: Migration Complexa (FASE 3)**

A recriação de tabelas em SQLite é trabalhosa:
- Precisa dropar FKs temporariamente
- Pode dar erro se houver dados órfãos
- Rollback é complexo

**Mitigação:** Dividir em migrations menores e testar cada uma.

### 🟡 **Médio: Frontend Precisa Atualizar**

Todas as telas que criam/editam:
- Créditos
- Débitos
- Multas
- Encerramentos
- Semanas

Precisam ser ajustadas para enviar `cliente_id` ao invés de `cliente_nome`.

**Tempo estimado:** 2-3 horas de ajustes no frontend.

### 🟢 **Baixo: Performance Durante Migração**

Durante FASE 3, tabelas são recriadas. Sistema deve estar **offline**.

---

## 8. Plano de Implementação Faseado

### ✅ **FASE 1: Análise e Preparação** (1 hora)

- [x] Análise de impacto (este documento)
- [ ] Backup completo do banco
- [ ] Criar ambiente de teste isolado
- [ ] Validar que não há dados órfãos

---

### ✅ **FASE 2: Migrations - Adicionar ID** (2 horas)

**Tarefas:**
- [ ] Criar migration `005_add_cliente_id.js`
- [ ] Executar em ambiente de teste
- [ ] Validar que todos os clientes receberam ID
- [ ] Verificar que sistema continua funcionando

**Validação:**
```sql
SELECT COUNT(*) FROM Clientes WHERE id IS NULL;
-- Deve retornar 0
```

---

### ✅ **FASE 3: Migrations - Adicionar FKs** (2 horas)

**Tarefas:**
- [ ] Criar migration `006_add_cliente_id_fks.js`
- [ ] Executar em teste
- [ ] Validar que todas as FKs foram populadas

**Validação:**
```sql
-- Verificar registros sem cliente_id (devem ser poucos ou zero)
SELECT COUNT(*) FROM creditos WHERE cliente_id IS NULL;
SELECT COUNT(*) FROM debitos WHERE cliente_id IS NULL;
SELECT COUNT(*) FROM Multas WHERE cliente_id IS NULL;
```

---

### ✅ **FASE 4: Migrations - Recriar Tabelas** (4 horas)

**Tarefas:**
- [ ] Criar migration `007_migrate_cliente_to_id_pk.js`
- [ ] **CRITICAL:** Testar rollback antes
- [ ] Executar em teste
- [ ] Validar integridade referencial

**Validação:**
```sql
PRAGMA foreign_key_check;
-- Deve retornar vazio (sem erros)
```

---

### ✅ **FASE 5: Atualizar Models Sequelize** (2 horas)

**Tarefas:**
- [ ] Atualizar `Cliente.js`
- [ ] Atualizar `Credito.js`
- [ ] Atualizar `Debito.js`
- [ ] Atualizar `Multa.js`
- [ ] Atualizar `Encerramento.js`
- [ ] Decidir estratégia para `LinhaSemana.js` (híbrida recomendada)

---

### ✅ **FASE 6: Atualizar Services** (3 horas)

**Tarefas:**
- [ ] `CarteiraService.js` - trocar `cliente_nome` por `cliente_id`
- [ ] `MultaService.js` - idem
- [ ] `DashboardService.js` - ajustar includes
- [ ] Adicionar lookups por nome quando necessário

---

### ✅ **FASE 7: Atualizar Controllers** (2 horas)

**Tarefas:**
- [ ] `MultasController.js`
- [ ] `EncerramentoController.js`
- [ ] `RelatoriosController.js`
- [ ] `VeiculosController.js`
- [ ] Ajustar rotas que usam `:cliente` no path

---

### ✅ **FASE 8: Atualizar Frontend** (3 horas)

**Tarefas:**
- [ ] Criar endpoint `GET /api/clientes` (se não existe)
- [ ] Atualizar selects de cliente para usar ID
- [ ] Atualizar formulários de Crédito/Débito/Multa
- [ ] Implementar autocomplete por nome (opcional)

---

### ✅ **FASE 9: Testes Finais** (2 horas)

**Cenários de teste:**
- [ ] Criar novo cliente
- [ ] Lançar crédito para cliente existente
- [ ] Lançar débito para cliente existente
- [ ] Criar multa vinculada a cliente
- [ ] Gerar relatório por cliente
- [ ] Verificar carteira de cliente específico
- [ ] Alterar nome de cliente (deve funcionar sem quebrar FKs)
- [ ] Tentar cadastrar cliente com CPF duplicado (deve rejeitar)
- [ ] Cadastrar dois clientes com mesmo nome (deve permitir)

---

### ✅ **FASE 10: Deploy em Produção** (1 hora)

**Checklist:**
- [ ] Backup final de produção
- [ ] Colocar sistema offline (manutenção)
- [ ] Executar migrations em produção
- [ ] Validar integridade
- [ ] Restart do servidor
- [ ] Testar funcionalidades críticas
- [ ] Colocar sistema online
- [ ] Monitorar logs por 24h

---

## 9. Recomendação Final

### ✅ **FORTEMENTE RECOMENDADO: Migrar para ID**

**Razões:**
1. **Resolve problema real:** Clientes homônimos são comuns
2. **Profissionaliza o sistema:** ID é padrão de mercado
3. **Performance:** Queries 2-3x mais rápidas
4. **Flexibilidade:** Nome pode mudar sem quebrar dados
5. **Preparação para multi-empresa:** ID facilita sincronização entre bases

### ⚠️ **Timing: Incluir na FASE 1 do Multi-Empresa**

**Justificativa:**
- Se vai mexer na estrutura de dados, melhor fazer tudo de uma vez
- Evita duas grandes migrações separadas
- Cliente já terá ID quando criar novas empresas
- Template de empresa nova já nascerá com estrutura correta

### 📋 **Ordem Recomendada de Implementação**

1. **Refatorar Cliente para ID** (este documento)
2. **Depois implementar Multi-Empresa** (relatório anterior)

**Alternativa:**
Fazer ambos em paralelo (não recomendado - muito risco).

---

## 10. Estratégia para Clientes Sem CPF

### Situação Atual

Se alguns clientes não têm CPF cadastrado:

```sql
SELECT nome, cpf FROM Clientes WHERE cpf IS NULL OR cpf = '';
```

### Solução Proposta

**Opção A: CPF permanece opcional** ✅
```javascript
cpf: {
    type: DataTypes.STRING,
    allowNull: true,  // ← Pode ser NULL
    unique: true,     // ← Mas se informado, deve ser único
    sparse: true      // ← Permite múltiplos NULL
}
```

**Validação no backend:**
```javascript
// Ao criar/atualizar cliente
if (data.cpf && data.cpf.trim() !== '') {
    // Verificar se já existe outro cliente com este CPF
    const existe = await Cliente.findOne({ 
        where: { 
            cpf: data.cpf,
            id: { [Op.ne]: clienteId }  // Excluir o próprio cliente
        } 
    });
    if (existe) throw new Error('CPF já cadastrado');
}
```

**Opção B: Gerar CPF temporário (NÃO RECOMENDADO)**
```javascript
// Gerar "CPF" fake para clientes sem CPF
cpf: data.cpf || `TEMP-${id}`
```
❌ Isso viola integridade de dados e pode causar problemas legais.

---

## 11. Checklist de Validação Pós-Migração

Após concluir todas as fases, validar:

### Integridade de Dados
- [ ] Todos os clientes têm ID único
- [ ] Nenhum crédito/débito/multa tem `cliente_id` NULL
- [ ] FKs apontam para clientes existentes
- [ ] CPFs únicos (quando informados)

### Funcionalidades
- [ ] CRUD de clientes funciona
- [ ] Lançamento de crédito/débito funciona
- [ ] Cadastro de multa funciona
- [ ] Relatórios exibem nomes corretamente
- [ ] Busca por nome funciona
- [ ] Alterar nome de cliente não quebra histórico

### Performance
- [ ] Queries de relatório executam em <500ms
- [ ] Dashboard carrega em <2s
- [ ] Listagem de clientes é rápida (mesmo com 1000+ registros)

### Backup/Restore
- [ ] Backup funciona normalmente
- [ ] Restore de backup funciona

---

## Conclusão

A migração de `nome` para `id` como chave primária de Cliente é:

- **Necessária:** Resolve problemas reais (homônimos, mudança de nome)
- **Viável:** Técnica bem estabelecida, risco controlado com testes
- **Estratégica:** Prepara sistema para multi-empresa e crescimento
- **Complexa mas gerenciável:** 20-25 horas de trabalho total

**Próximo passo sugerido:**  
Aprovar este adendo e iniciar FASE 1 (Análise e Preparação).

---

**Elaborado em:** 04/02/2026  
**Versão:** 1.0  
**Vinculado ao:** [Relatório Multi-Empresa](file:///C:/Users/landi/.gemini/antigravity/brain/b8ad27fc-94a6-47a8-95d3-fc3f707969cb/relatorio_multi_empresa.md)
