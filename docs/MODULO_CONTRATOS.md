# 📄 Módulo de Contratos - Documentação

## 📋 Visão Geral

O **Módulo de Contratos** é um sistema completo para gerenciamento de contratos de locação de veículos. Ele integra-se com os módulos de Clientes, Veículos, Carteira e LinhaSemana para fornecer uma solução end-to-end.

## ✨ Funcionalidades Principais

### 1. Gestão de Contratos
- ✅ CRUD completo de contratos
- ✅ Vínculo com clientes e veículos
- ✅ Snapshot de dados do veículo (marca, cor, valor FIPE)
- ✅ Geração automática de número do contrato
- ✅ Cálculo de vigência e datas
- ✅ Status: Ativo, Encerrado, Cancelado

### 2. Itens Contratuais
- ✅ Catálogo de itens padrão (reutilizáveis)
- ✅ Tipos: Locação, Seguro, Taxa, Serviço, Acessório
- ✅ Adição dinâmica de itens ao contrato
- ✅ Cálculo automático de totais

### 3. Caução
- ✅ Valor customizável
- ✅ Forma de pagamento: À vista ou Parcelada
- ✅ Integração com Carteira (débito/crédito)
- ✅ Devolução automática no encerramento

### 4. Geração de Documentos
- ✅ Templates HTML editáveis
- ✅ Sistema de variáveis dinâmicas
- ✅ Renderização Web (visualização)
- ✅ Geração de PDF
- ✅ Versionamento de templates

### 5. Integrações
- ✅ **LinhaSemana**: Criação automática de linha semanal
- ✅ **Carteira**: Registro de caução e devolução
- ✅ **Clientes**: Vínculo e dados do locatário
- ✅ **Veículos**: Snapshot do veículo contratado

## 🗂️ Estrutura de Arquivos

```
server/
├── models-sqlite/
│   ├── Contrato.js                      # Model principal
│   ├── ContratoItem.js                  # Itens do contrato
│   ├── ConfiguracoesContrato.js         # Configurações globais
│   ├── ItensContratoPadrao.js           # Catálogo de itens
│   ├── TemplatesDocumento.js            # Templates HTML
│   └── TemplateHistorico.js             # Versionamento
├── controllers/
│   ├── ContratosController.js           # CRUD + ações
│   ├── ConfiguracoesContratoController.js
│   ├── ItensContratoPadraoController.js
│   └── TemplatesDocumentoController.js
├── services/
│   ├── ContratoService.js               # Lógica de negócio
│   ├── ContratoWebRenderer.js           # Renderização HTML
│   └── ContratoPDFRenderer.js           # Geração PDF
├── routes/
│   └── contratos.js                     # Todas as rotas
├── migrations/
│   ├── 20250215000001-create-contratos-tables.cjs
│   └── 20250215000002-create-templates-tables.cjs
└── seeds/
    ├── contratos-seed.js                # Dados iniciais
    └── run-tenant-seeds.js              # Runner

views/
├── pages/
│   ├── contratos.ejs                    # Listagem
│   ├── contrato-form.ejs                # Formulário
│   └── configuracoes/
│       ├── configuracoes-contrato.ejs
│       ├── itens-contrato-padrao.ejs
│       └── editor-templates.ejs
└── partials/
    └── sidebar.ejs                      # (atualizado)

public/
└── js/
    ├── contratos.js                     # Listagem
    ├── contrato-form.js                 # Formulário
    └── admin/
        ├── configuracoes-contrato.js
        └── itens-padrao.js
```

## 🚀 Como Usar

### 1. Executar Migrations

```bash
npm run migrate
```

### 2. Popular Dados Iniciais

```bash
# Seeds master (empresas, usuários)
node server/seeds/master-seed.js

# Seeds tenant (configurações, itens, templates)
node server/seeds/run-tenant-seeds.js 1
```

### 3. Acessar o Sistema

```bash
npm start
```

**Navegue para:**
- **Listagem**: `https://localhost:3000/contratos`
- **Novo Contrato**: `https://localhost:3000/contratos/novo`
- **Configurações**: `https://localhost:3000/configuracoes/contratos`
- **Itens Padrão**: `https://localhost:3000/configuracoes/itens-padrao`
- **Editor Templates**: `https://localhost:3000/configuracoes/templates`

## 📡 Endpoints da API

### Contratos

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/contratos` | Lista contratos (com filtros) |
| `GET` | `/api/contratos/:id` | Busca por ID |
| `POST` | `/api/contratos` | Criar novo |
| `PUT` | `/api/contratos/:id` | Atualizar |
| `DELETE` | `/api/contratos/:id` | Cancelar (soft delete) |
| `GET` | `/api/contratos/:id/dados` | Dados processados (JSON) |
| `GET` | `/api/contratos/:id/web` | Visualização HTML |
| `GET` | `/api/contratos/:id/pdf` | Gerar PDF |
| `POST` | `/api/contratos/:id/encerrar` | Encerrar + devolução caução |

### Configurações

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/contratos/config/get` | Buscar configurações |
| `PUT` | `/api/contratos/config/update` | Atualizar configurações |

### Itens Padrão

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/contratos/itens-padrao/list` | Listar catálogo |
| `GET` | `/api/contratos/itens-padrao/:id` | Buscar item |
| `POST` | `/api/contratos/itens-padrao` | Criar item |
| `PUT` | `/api/contratos/itens-padrao/:id` | Atualizar item |
| `DELETE` | `/api/contratos/itens-padrao/:id` | Desativar item |

### Templates

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/contratos/templates/list` | Listar templates |
| `GET` | `/api/contratos/templates/:id` | Buscar template |
| `POST` | `/api/contratos/templates` | Criar template |
| `PUT` | `/api/contratos/templates/:id` | Atualizar (versiona) |
| `DELETE` | `/api/contratos/templates/:id` | Desativar |
| `GET` | `/api/contratos/templates/:id/historico` | Histórico versões |
| `POST` | `/api/contratos/templates/:id/restaurar/:versao` | Restaurar versão |

## 🔧 Configurações Disponíveis

```javascript
{
  taxa_administrativa: 0.15,           // 15%
  percentual_multa_atraso: 0.02,       // 2%
  percentual_juros_mora: 0.01,         // 1% ao dia
  percentual_multa_rescisao: 0.10,     // 10%
  vigencia_padrao_dias: 30,
  km_franquia_padrao: 100,
  valor_km_excedente_padrao: 0.50,     // R$ por km
  valor_avaria_padrao: 100.00
}
```

## 📝 Variáveis de Template

As seguintes variáveis estão disponíveis nos templates:

```
{{EMPRESA_NOME}}
{{EMPRESA_CNPJ}}
{{EMPRESA_ENDERECO}}
{{CLIENTE_NOME}}
{{CLIENTE_CPF}}
{{CLIENTE_RG}}
{{CLIENTE_CNH}}
{{VEICULO_MARCA}}
{{VEICULO_MODELO}}
{{VEICULO_PLACA}}
{{VEICULO_COR}}
{{CONTRATO_NUMERO}}
{{CONTRATO_DATA_INICIO}}
{{CONTRATO_DATA_FIM}}
{{CONTRATO_VIGENCIA_DIAS}}
{{VALOR_TOTAL_ITENS}}
{{VALOR_CAUCAO}}
{{KM_FRANQUIA}}
{{VALOR_KM_EXCEDENTE}}
{{DIA_PAGAMENTO}}
{{ITENS_TABELA}}              // Tabela HTML renderizada
{{CLAUSULA_4_2}}              // Cláusula caução dinâmica
```

## 🔗 Integrações

### LinhaSemana
Quando um contrato é criado com `data_assinatura`, automaticamente:
1. Calcula semana de cobrança
2. Cria registro em `LinhaSemana` com valor mensal
3. Vínculo com cliente e veículo

### Carteira
Quando há caução (`valor_caucao > 0`):
1. Registra débito na carteira do cliente
2. No encerramento, devolve caução (crédito)
3. Abate débitos pendentes se houver

## 🧪 Testes Sugeridos

1. **Criar Contrato Completo**
   - Cliente + Veículo + 3 itens
   - Caução parcelada
   - Gerar PDF

2. **Editar Template**
   - Modificar HTML
   - Testar variáveis
   - Validar renderização

3. **Encerrar Contrato**
   - Com devolução integral
   - Com débitos pendentes

4. **Verificar Integrações**
   - LinhaSemana criada?
   - Caução na Carteira?

## 🐛 Troubleshooting

### Migrations não executam
```bash
# Verificar banco
npm run migrate:status

# Reverter última migration
npm run migrate:undo

# Executar manualmente
node server/migrations/migrate.js
```

### Templates não carregam
- Verificar se seed foi executado
- Confirmar `ativo: true` no banco
- Validar JSON de `variaveis_disponiveis`

### PDF não gera
- Instalar dependências: `npm install puppeteer`
- Verificar template HTML válido
- Conferir logs do `ContratoPDFRenderer`

## 📊 Estatísticas do Módulo

- **Arquivos criados**: 35
- **Linhas de código**: ~7000
- **Models**: 6
- **Controllers**: 4
- **Services**: 3
- **Endpoints**: 25+
- **Views**: 5
- **Scripts JS**: 4

## 🎯 Roadmap Futuro

- [ ] Assinatura digital integrada
- [ ] Notificações de vencimento
- [ ] Dashboard de contratos (métricas)
- [ ] Renovação automática
- [ ] Integração e-mail (envio automático)
- [ ] Exportação em lote (ZIP)

## 👥 Suporte

Para dúvidas ou problemas, consulte:
- Logs do servidor: `console.log` em controllers/services
- DevTools do navegador (Network, Console)
- Documentação Sequelize: https://sequelize.org
