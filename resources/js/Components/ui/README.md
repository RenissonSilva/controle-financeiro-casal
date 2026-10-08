# Design system Sovinna — tema Noite

Padrão visual oficial do produto (tema "Noite", escuro por decisão de design, sem variante clara), portado da referência publicada em https://claude.ai/artifact/B6hM2CyEBJYpe98m7yhubA. Toda tela nova deve compor a partir destes tokens e componentes em vez de reintroduzir cor/estilo ad-hoc.

Regras da referência: Geist (Geist Mono em datas, % e valores de tabela); profundidade só por superfície + borda de 1px, **sem sombras, gradientes ou foto de fundo**; limão (`accent`) só no botão principal, ícone do menu ativo, valor positivo e card de acerto; coral (`red`) só para dinheiro saindo; âmbar (`warning`) só para "Atenção"/pendências; valores em pt-BR com "−" (U+2212) nas saídas.

## Tokens

Fonte única de cor: [`resources/js/theme/tokens.js`](../../theme/tokens.js), espelhada como CSS vars em [`resources/css/app.css`](../../../css/app.css) e transformada em classes via `tailwind.config.js`: `bg`, `surface`, `raised`, `inset`, `line`, `line-soft`, `line-row`, `line-strong`, `track`, `text`, `secondary`, `muted`, `accent`, `on-accent`, `on-accent-2`, `warning`, `red` (saída), `green` (= accent, entrada), `person1`/`person2` (cores do casal). `teal`, `strong-accent`, `lime` e `blue` são apelidos antigos (Maré) que apontam para a paleta Noite — prefira os nomes novos.

`tint(hex, alpha)` / `lighten(hex)` em `tokens.js` montam a etiqueta de categoria a partir da cor da categoria (dado dinâmico → `style` inline).

Breakpoints da referência: `max-[1280px]` (KPIs 2×2), `max-[1100px]` (cards em uma coluna), `desk` = ≥861px (sidebar; abaixo vira barra no topo), `max-[560px]` (celular).

### Duas pegadinhas do Tailwind que já causaram bug visual real aqui — leia antes de mexer em cor

1. **O valor da CSS var precisa ser separado por espaço, não por vírgula.** `tailwind.config.js` usa o padrão `rgb(var(--x-rgb) / <alpha-value>)` (sintaxe moderna). Se `--x-rgb` estiver definido como `"223, 238, 240"` (vírgula, formato legado de `rgba()`), o resultado vira `rgb(223, 238, 240 / 1)` — **CSS inválido**, descartado silenciosamente pelo navegador (sem erro no console, a cor simplesmente não aplica). Tem que ser `--x-rgb: 223 238 240;` (espaço). Todos os tokens em `app.css` já seguem isso — se adicionar um novo, mantenha o padrão.
2. **Modificador de opacidade "solto" (`bg-teal/16`) só funciona se o número estiver na escala padrão do Tailwind** (0,5,10,20,25,30,40,50,60,70,75,80,90,95,100). Fora disso (`/16`, `/8`, `/45`...), a classe não é gerada — de novo, sem erro, só não aparece no CSS final. Os valores usados no design já foram adicionados em `theme.extend.opacity` no `tailwind.config.js`; se precisar de um novo valor fora da lista, adicione lá (ou use a sintaxe com colchete `/[0.16]`, que sempre funciona).
3. **Não misture gradiente + cor sólida num único `bg-[...]`** (ex: `bg-[linear-gradient(...),var(--color-bg)]`). Isso é válido como propriedade `background` (shorthand), mas a classe arbitrária `bg-[...]` do Tailwind vira só `background-image` OU `background-color` (inferido pelo valor) — misturar os dois no mesmo bracket quebra a declaração inteira. Use duas classes separadas: `bg-bg bg-[linear-gradient(...)]`.

## Componentes

- `Card` — `surface` + borda `line`, raio 16, padding 24, sem sombra. `bg={false}` deixa o fundo com o caller (ex: card de acerto em limão: `border border-accent bg-accent text-on-accent`).
- `Button` — `primary` (limão, ação principal da tela), `secondary` (contorno), `ghost` (só texto), `dark` (sobre o limão); `size="sm"`; `href` vira `Link` do Inertia. Altura 44px.
- `PageHeader` (título 26/600 + descrição + ações), `SectionHeader` (título de card 15/600), `SectionLabel` (separador entre blocos), `IconBadge` (ícone cinza do título).
- `CycleSwitcher` — ‹ Set 2026 › (mês financeiro; intervalo do ciclo no `title`). `Segmented`, `OwnershipToggle` (cores das pessoas), `Field`/`Select`/`MoneyInput` (campo 44px, fundo `bg`, borda `line-strong`, foco limão), `Modal`, `Toast`, `SaveBar`.
- `GaugeArc` — meio-arco 96×56 da saúde financeira (`tone` = classe de stroke). `ProgressBar` — trilho `track` + limão. `MerchantLogo` — logo 32px raio 8, mesmo formato do monograma.
- `ReadOnlyBadge` — selo "Só visualização" no `PageHeader` quando a conta vinculada não pode editar a área. Permissões no front: `useCan()` de `lib/access.js` (`can('expenses.edit')`, `can('owner')`...) — só esconde botões; as rotas barram com `can:`.
- **Todo campo de valor usa `MoneyInput`** (`<Field money … />`) — nada de `type="number"` para dinheiro. Não use `text-red-400`/`text-green-600`: `colors.red`/`green` customizados substituem a escala padrão (classe não é gerada).

### Quarta pegadinha: cor de token sem triplet não aceita opacidade

`bg-bg/70` só funciona porque `bg`/`surface` agora leem `--color-bg-rgb`/`--color-surface-rgb` (triplets). Antes eram `var(--color-bg)` (hex) e o `/70` não gerava classe — o fundo escurecido dos modais simplesmente não aparecia. Token novo que precise de opacidade: sempre crie o `*-rgb` em triplet com espaço.

## Layout

`Layouts/AppLayout.jsx`: sidebar de 248px (marca, menu de 5 itens, card do casal com menu Perfil/Sair e status de sincronização — o Dashboard passa o botão de sincronizar em `sync`); abaixo de 861px vira barra fixa no topo com menu rolável e avatares. `GuestLayout` usa a mesma marca e superfícies.

### Quinta pegadinha: classes em arquivos `.js`

O `content` do Tailwind agora inclui `resources/js/**/*.js`. Antes só `.jsx` era varrido, e as classes de `lib/ownership.js` (ex: `bg-person1/14`) simplesmente não eram geradas — sem erro de build.

## Regra de ouro ao portar visual de um mockup

Se a tarefa é "levar esse visual para a tela real", o padrão é **fidelidade 1:1** — mesmos cards, mesmos textos, mesma estrutura — mesmo que a tela real ainda não tenha todos os dados por trás. Não redesenhar/renomear/remover cards para "encaixar" nos dados disponíveis sem perguntar antes. Depois de qualquer mudança de estilo, tirar um screenshot real (ver skill `run`) antes de dar como pronto — os dois bugs acima nunca geraram erro de build nem de console, só apareceram no visual renderizado.
