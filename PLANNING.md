# PLANNING.md — Controle Financeiro Casal

> Documento de referência para o MVP. Última atualização: 2026-08-08.

## 1. Objetivo

Ajudar um casal a controlar gastos compartilhados e individuais, com rateio automático
proporcional à renda de cada pessoa, eliminando a planilha manual e a dúvida de
"quanto eu devo pagar desse boleto".

Problema concreto resolvido: hoje as despesas do casal (cartão, contas fixas, compras
do dia a dia) precisam ser divididas de forma justa — não 50/50, mas proporcional ao
que cada um ganha (`payer1_salary` / `payer2_salary`). O site centraliza os lançamentos
(manuais ou sincronizados via Open Finance), categoriza automaticamente (regras + IA)
e mostra quanto cada um deve.

Público: exclusivamente os dois usuários do casal. Não há intenção de abrir para
outras famílias/casais neste momento — a aplicação é single-tenant por design.

## 2. Funcionalidades do MVP

- **Autenticação** simples (Laravel Breeze) para os dois usuários.
- **Configurações do casal**: nome e renda de cada pagador, dia de fechamento da
  fatura do cartão (já implementado em `Setting`).
- **Categorias**: CRUD com cor e ownership padrão.
- **Lançamento de despesas**:
  - Manual (criar, editar e apagar).
  - Sincronização automática via Open Finance (Pluggy): conectar banco, listar
    conexões (`OpenFinanceItem`), sincronizar sob demanda.
- **Categorização**:
  - Regras automáticas por padrão de texto + valor opcional (`CategorizationRule`).
  - Categorização automática por IA (OpenAI): assim que uma despesa nova chega via
    Open Finance e não bate em nenhuma regra, a IA categoriza automaticamente, sem
    intervenção manual. Um campo booleano `auto_categorized` marca o que já foi
    processado, para categorizar apenas o que é novo a cada sync.
- **Rateio automático**: cada despesa tem `ownership` (payer1 / payer2 / both) e o
  valor "both" é dividido pela % de renda de cada um.
- **Despesas fixas/recorrentes**: cadastro com dia de vencimento, para prever contas
  do mês (`FixedExpense`).
- **Dashboard** (baseado no mockup Órbita): saldo, receitas x despesas do mês,
  próximas despesas (fixas) a vencer, despesas por categoria, histórico recente.
- **Exportação em PDF** das despesas de um período (já existe em `ExpenseController::exportPdf`).

## 3. Fora do escopo (v2+)

- **Metas financeiras** (ex: "Meta · Investimentos" do mockup Órbita) — exige modelar
  `Goal` (valor alvo, prazo, progresso) e tela de acompanhamento. Adiado por decisão
  explícita do usuário.
- **"Saúde financeira" com score/gauge** (presente no mockup Órbita) — depende de uma
  fórmula ainda não definida (reserva, endividamento, regularidade). Fica pra depois
  do MVP; o card aparece no Dashboard como placeholder "Em breve".
- Multi-tenancy / abrir para outros casais.
- Investimentos (carteira, rentabilidade).
- App mobile nativo.
- Notificações (push/e-mail) de vencimento de contas.

## 4. Telas

### Login
- **Objetivo**: autenticar um dos dois usuários do casal.
- **Vê**: formulário de e-mail/senha (Breeze padrão).
- **Pode fazer**: entrar, recuperar senha.

### Dashboard (`/dashboard`, baseado no mockup Órbita)
- **Objetivo**: visão geral do mês corrente — "como estão nossas finanças agora".
- **Vê**: saldo total, receitas do mês, despesas do mês (com % da renda), despesas
  por categoria (gráfico de rosca), próximas despesas fixas a vencer, histórico
  recente de lançamentos.
- **Pode fazer**: navegar para Despesas/Categorias/Configurações, criar um
  lançamento rápido ("+ Lançamento").
- **Nota**: "Próximas despesas" é uma lista informativa, sem checkbox/interação de
  marcar como paga. Item de nav "Metas" fica desabilitado/oculto; card "Saúde
  financeira" (e demais funcionalidades fora do MVP) aparecem como placeholder
  "Em breve" em vez de sumir do layout.

### Despesas (`/expenses`)
- **Objetivo**: listar, revisar e categorizar todos os lançamentos do mês/período.
- **Vê**: tabela de despesas com descrição, valor, data, categoria, ownership,
  status (pending/categorized) e fonte (manual/open_finance).
- **Pode fazer**: filtrar por mês/fonte, criar despesa manual, editar uma despesa
  já lançada (descrição, categoria, ownership etc. — nome, valor e data não são
  editáveis), apagar despesa, apagar todas as despesas de um mês/fonte (reimport),
  disparar categorização IA em lote, editar categoria/ownership em lote, exportar
  PDF.

### Open Finance (`/open-finance`)
- **Objetivo**: conectar contas bancárias via Pluggy para sincronização automática.
- **Vê**: lista de conexões (`OpenFinanceItem`) com status (UPDATED, LOGIN_ERROR,
  OUTDATED, UPDATING...) e data da última sincronização.
- **Pode fazer**: iniciar conexão (Pluggy Connect widget), sincronizar uma conexão
  específica, ver detalhes/transações de uma conexão (`OpenFinanceDetails`),
  remover uma conexão.

### Categorias (`/categories`)
- **Objetivo**: gerenciar as categorias usadas para classificar despesas.
- **Vê**: lista de categorias com cor e ownership padrão.
- **Pode fazer**: criar, editar, apagar categoria.

### Regras de Categorização (`/categorization-rules`)
- **Objetivo**: automatizar a categorização de despesas recorrentes por padrão de
  texto (ex: "UBER" → Transporte).
- **Vê**: lista de regras (padrão, valor opcional, categoria, ownership).
- **Pode fazer**: criar, editar, apagar regra, aplicar regras retroativamente às
  despesas pendentes.

### Despesas Fixas (`/fixed-expenses`)
- **Objetivo**: cadastrar contas recorrentes (aluguel, assinaturas) para
  previsibilidade no dashboard.
- **Vê**: lista de despesas fixas com dia de vencimento, categoria, ownership,
  status ativo/inativo.
- **Pode fazer**: criar, editar, apagar, ativar/desativar.

### Configurações (`/settings`)
- **Objetivo**: definir os parâmetros do casal usados no rateio.
- **Vê**: nome e renda de cada pagador, % calculada automaticamente, dia de
  fechamento da fatura.
- **Pode fazer**: editar nome/renda de cada pagador, editar dia de fechamento.

### Perfil (`/profile`)
- **Objetivo**: gerenciar a própria conta (Breeze padrão).
- **Vê/Pode fazer**: editar nome/e-mail, trocar senha, apagar conta.

## 5. Fluxo de navegação

```
Login
  └─→ Dashboard (home após login)
        ├─→ "+ Lançamento" → cria despesa manual → volta pro Dashboard/Despesas
        ├─→ Despesas → cria/edita/apaga/categoriza → volta pro Dashboard
        ├─→ Open Finance → conecta banco → Pluggy Connect (widget externo) → volta
        │      com conexão criada → "Sincronizar" → despesas novas chegam já
        │      categorizadas automaticamente (regras + IA) em Despesas
        ├─→ Categorias → CRUD → volta pro menu
        ├─→ Regras de Categorização → CRUD + "aplicar" → afeta Despesas pendentes
        ├─→ Despesas Fixas → CRUD → aparecem no Dashboard como "Próximas despesas"
        └─→ Configurações → edita rateio/fechamento → afeta cálculos em todo o site
```

Pontos que precisam de decisão explícita antes de implementar (ver seção 8):
- Não há link "voltar" consistente: cada tela depende só do menu de navegação
  superior. Ok para MVP, mas vale confirmar que não precisa de breadcrumb.

## 6. Modelo de dados (alto nível)

```
Setting (singleton — 1 registro só, sem user_id)
  payer1_name, payer2_name, payer1_salary, payer2_salary, card_closing_day
  → payer1_percent / payer2_percent calculados dinamicamente

Category
  name, color, default_ownership
  1 ── N Expense
  1 ── N FixedExpense
  1 ── N CategorizationRule

Expense
  description, amount, date, category_id (nullable), ownership [payer1|payer2|both],
  status [pending|categorized], source [manual|open_finance], import_hash (unique),
  auto_categorized (bool) — marca se a categoria foi definida automaticamente pela
  IA, usado para categorizar apenas despesas novas a cada sync
  N ── 1 Category

FixedExpense
  description, amount, due_day, category_id (nullable), ownership, active
  N ── 1 Category

CategorizationRule
  pattern, amount (nullable), category_id, ownership
  N ── 1 Category
  → aplicada contra Expense.description (contains, case-insensitive) + amount exato

OpenFinanceItem
  item_id (Pluggy), connector_name, owner [payer1|payer2], status, last_synced_at
  → sincronização gera Expense com source=open_finance

User (Breeze padrão)
  name, email, password
  → hoje não vinculado a Setting/Expense — não existe conceito de "dono do registro",
    o casal compartilha os mesmos dados globalmente
```

**Observação de design**: `Setting` é um singleton global e `User` não tem relação
com os demais modelos. Isso é aceitável porque o público é fechado (só o casal), mas
é uma decisão consciente que vale registrar — se um dia a aplicação precisar de
multi-tenancy, todo o modelo de dados precisa ganhar `user_id`/`couple_id`.

## 7. Stack técnica

- **Backend**: Laravel (PHP 8.3)
- **Frontend**: React + Inertia.js + Tailwind CSS + Recharts
- **IA**: OpenAI gpt-4o-mini (categorização de despesas)
- **Open Finance**: Pluggy (via `PluggyService`)
- **Banco de dados**: SQLite em dev; produção a definir (ver seção 8)
- **Fila**: Laravel Queue (`queue:work`) para `CategorizeExpensesJob` — processo
  persistente, não serverless

Essa stack foi mantida deliberadamente (não reavaliada do zero) porque já suporta
CRUD, gráficos, chamadas de IA e sync bancário sem esforço extra, e trocar jogaria
fora a integração Pluggy + IA já funcionais. Trocar só faria sentido se o produto
mudasse de direção para multi-tenant/SaaS ou app mobile nativo — não é o caso.

## 8. Decisões em aberto

### Resolvidas
- **Editar despesa lançada**: entra no MVP. Pode editar tudo (descrição, categoria,
  ownership etc.) exceto nome, valor e data, que ficam fixos após o lançamento
  inicial (manual ou via Open Finance). Observação de implementação: o modelo
  `Expense` hoje só tem um campo de texto (`description`) — separar "nome"
  (imutável) de "descrição" (editável) exige um novo campo no schema.
- **Checkbox em "Próximas despesas" no Dashboard**: removido. A lista de despesas
  fixas a vencer é só informativa nesta versão, sem interação de marcar como paga.
- **Revisão de lançamentos novos**: resolvido com categorização automática — ver
  próximo item.
- **Categorização automática pós-sync**: assim que uma despesa nova chega via Open
  Finance, ela é categorizada automaticamente (regras + IA), sem precisar de ação
  manual. Um campo booleano `auto_categorized` em `Expense` marca o que já foi
  processado pela IA, para reprocessar apenas o que é novo em cada sync.
- **Importação de dados**: só via Open Finance. Import manual de CSV foi removido
  do escopo — tela `/import`, dependência `maatwebsite/excel` e `source=csv` saem
  do produto.
- **Card "Saúde financeira"**: fica no Dashboard como placeholder "Em breve",
  junto com as demais funcionalidades fora do MVP (ex: Metas).
- **Retenção/consistência de `OpenFinanceItem.owner`**: decidido que não terá
  validação — cada pessoa é responsável por conectar suas próprias contas.

### Em aberto
- **Banco de dados de produção**: usuário ainda vai decidir. Recomendação segue
  sendo Postgres/MySQL gerenciado (ex: Neon/Supabase) em vez de SQLite — não por
  limite técnico de performance (2 usuários é uso muito baixo), mas por backup
  automático e acesso concorrente mais seguro durante gravações da fila.
- **Hospedagem de produção**: precisa suportar processo persistente para
  `queue:work` (categorização IA) — recomendação é VPS simples (Hetzner/DigitalOcean)
  ou Laravel Forge, não serverless puro (Vercel-style).
