# RELATÓRIO DE AUDITORIA FORENSE DE FRONTEND

## STATUS FINAL: **FALHA ARQUITETURAL**

A auditoria detectou múltiplas violações críticas onde regras de negócio, cálculos financeiros e decisões de domínio estão sendo executados no navegador. Segue o detalhamento das evidências:

---

### 1. ARQUIVO: `public/js/multas.js`

**OCORRÊNCIA 1:** Cálculo Financeiro de Taxa Administrativa (15%)
**LINHA:** 537-539, 1317
**TRECHO:**
```javascript
if (cobrarTaxa) {
    valACobrar += (valComDesconto * 0.15);
}
```
**DESCRIÇÃO:** O frontend está calculando explicitamente o valor da taxa de 15%.
**POR QUE É REGRA DE NEGÓCIO:** Taxas percentuais são definições contratuais que devem residir no domínio (backend). Se a taxa mudar para 10%, o frontend quebra ou precisa de deploy.
**CLASSIFICAÇÃO:** **CRÍTICA** (Financeiro)

**OCORRÊNCIA 2:** Decisão de Estado (Vencido)
**LINHA:** 132, 279, 1003
**TRECHO:**
```javascript
else if (new Date(m.data_vencimento) < new Date()) statusBadge = ...
```
**DESCRIÇÃO:** Decisão se uma multa está "Vencida" baseada na data atual da máquina do cliente.
**POR QUE É REGRA DE NEGÓCIO:** O status de uma dívida é um estado de domínio, não puramente visual.
**CLASSIFICAÇÃO:** **ALTA** (Estado de Negócio)

**OCORRÊNCIA 3:** Agregação de Totais (Reduce)
**LINHA:** 155-156
**TRECHO:**
```javascript
const totalOriginal = lista.reduce((sum, m) => sum + parseFloat(m.valor_original || 0), 0);
```
**DESCRIÇÃO:** Uso de `reduce` para recalcular somatórios de valores monetários.
**POR QUE É REGRA DE NEGÓCIO:** Totais financeiros devem ser providos pela API para garantir consistência (ex: arredondamentos).
**CLASSIFICAÇÃO:** **MÉDIA** (Agregação)

**OCORRÊNCIA 4:** Auditoria de Reabertura (Prompt e Append)
**LINHA:** 578-590
**TRECHO:**
```javascript
const motivo = prompt("Qual o motivo para reabrir este pagamento? (Ficará registrado)");
// ...
obsInput.value += log;
```
**DESCRIÇÃO:** O frontend decide como registrar a auditoria (append text) e força a captura do motivo via prompt.
**POR QUE É REGRA DE NEGÓCIO:** A estrutura de um log de auditoria e a obrigatoriedade de motivo são regras de compliance.
**CLASSIFICAÇÃO:** **ALTA** (Regra de Negócio)

---

### 2. ARQUIVO: `public/js/carteira.js`

**OCORRÊNCIA 1:** Cálculo Financeiro de Taxa (15%)
**LINHA:** 521
**TRECHO:**
```javascript
total = total * 1.15; // +15%
```
**DESCRIÇÃO:** Multiplicação explícita por 1.15 para adicionar margem.
**POR QUE É REGRA DE NEGÓCIO:** Regra de precificação hardcoded no cliente.
**CLASSIFICAÇÃO:** **CRÍTICA** (Financeiro)

**OCORRÊNCIA 2:** Engenharia Reversa de Cálculo
**LINHA:** 657
**TRECHO:**
```javascript
valorOriginal = valorFinal / (1 - desconto / 100);
```
**DESCRIÇÃO:** O frontend tenta descobrir o valor original revertendo a fórmula de desconto.
**POR QUE É REGRA DE NEGÓCIO:** Lógica matemática complexa de precificação inversa.
**CLASSIFICAÇÃO:** **CRÍTICA** (Financeiro/Integridade)

**OCORRÊNCIA 3:** Projeção de Saldo
**LINHA:** 802
**TRECHO:**
```javascript
const saldoProjetado = resumo.saldo_devedor - totalCreditosPendentes;
```
**DESCRIÇÃO:** Cálculo de um indicador financeiro (Saldo Projetado) subtraindo pendências.
**POR QUE É REGRA DE NEGÓCIO:** Projeções financeiras são dados derivados de negócio.
**CLASSIFICAÇÃO:** **ALTA** (Estado de Negócio)

**OCORRÊNCIA 4:** Bloqueio de Ação por Estado (Contrato Encerrado)
**LINHA:** 1223-1240
**TRECHO:**
```javascript
if (encerramento) {
    // ...
    btnDebito.disabled = true;
}
```
**DESCRIÇÃO:** O frontend decide bloquear funcionalidades baseado na presença de um objeto.
**POR QUE É REGRA DE NEGÓCIO:** A regra "Não pode lançar débito em contrato encerrado" deve ser validada no backend; o frontend devia apenas refletir permissões.
**CLASSIFICAÇÃO:** **ALTA** (Estado de Negócio)

---

### 3. ARQUIVO: `public/js/grid.js`

**OCORRÊNCIA 1:** Agregação de KPIs (Business Intelligence)
**LINHA:** 487-691 (Função `atualizarContadorVeiculos`)
**TRECHO:**
```javascript
if (statusFinal === Constants.get('STATUS_VEICULOS').ALUGADO) countAlugados++;
// ... iteração complexa de timeline
```
**DESCRIÇÃO:** Algoritmo complexo para determinar ocupação da frota iterando linhas e dias da semana.
**POR QUE É REGRA DE NEGÓCIO:** Cálculo de KPI de ocupação é "Core Domain". O frontend está reprocessando dados brutos para gerar métricas de gestão.
**CLASSIFICAÇÃO:** **ALTA** (Agregação Inteligente)

**OCORRÊNCIA 2:** Recálculo de Totais (Footer)
**LINHA:** 935
**TRECHO:**
```javascript
totais[k] += (parseFloat(l[k]) || 0);
```
**DESCRIÇÃO:** Soma manual das colunas financeiras `tabelado`, `recebido`, `saldo`, etc.
**POR QUE É REGRA DE NEGÓCIO:** Agregação financeira.
**CLASSIFICAÇÃO:** **MÉDIA** (Agregação)

**OCORRÊNCIA 3:** Validação de Conciliação
**LINHA:** 731
**TRECHO:**
```javascript
if (linha.recebido <= 0.01) { alert(...); return; }
```
**DESCRIÇÃO:** Impede ação de negócio (conciliar) baseado em valor.
**POR QUE É REGRA DE NEGÓCIO:** Regra de validação de domínio ("Só concilia se tiver pagamento").
**CLASSIFICAÇÃO:** **ALTA** (Regra de Negócio)

---

### 4. ARQUIVO: `public/js/veiculos-page.js`

**OCORRÊNCIA 1:** Classificação de "Vencido"
**LINHA:** 82
**TRECHO:**
```javascript
const vencido = vencimento < hoje;
```
**DESCRIÇÃO:** Comparação de datas para determinar se IPVA/Licenciamento está vencido.
**POR QUE É REGRA DE NEGÓCIO:** Estado de legalidade do ativo.
**CLASSIFICAÇÃO:** **ALTA** (Estado de Negócio)

**OCORRÊNCIA 2:** Filtro de Condutor
**LINHA:** 58-64
**TRECHO:**
```javascript
if (filtroTipo === 'indicado') return v.condutor_atual && v.condutor_indicado;
```
**DESCRIÇÃO:** Lógica para determinar quais veículos se enquadram na categoria "Indicado".
**POR QUE É REGRA DE NEGÓCIO:** Classificação de categorias de negócio no cliente.
**CLASSIFICAÇÃO:** **ALTA** (Lógica de Seleção)

---

### 5. ARQUIVO: `public/js/relatorios.js`

**OCORRÊNCIA 1:** Agregação Manual de Totais
**LINHA:** 190-197
**TRECHO:**
```javascript
resultados.forEach(item => {
    somaAluguel += (item.semana || 0);
    // ...
});
```
**DESCRIÇÃO:** Loop explícito para somar colunas de relatório.
**POR QUE É REGRA DE NEGÓCIO:** Geração de relatório financeiro no cliente.
**CLASSIFICAÇÃO:** **MÉDIA** (Agregação)

---

### CONCLUSÃO

A aplicação viola sistematicamente o princípio de "Frontend Exclusivamente Apresentacional". Cálculos críticos de impostos (15% hardcoded), agregação de balanços financeiros e decisões de status de inadimplência ("vencido", "atrasado") estão dispersos em arquivos JavaScript do cliente.

**DIAGNÓSTICO:** O Frontend atua como uma **camada de regra de negócio não supervisionada**, criando risco de inconsistência de dados, brechas de segurança (manipulação de valores no cliente) e dificuldade extrema de manutenção (regras duplicadas ou ocultas).
