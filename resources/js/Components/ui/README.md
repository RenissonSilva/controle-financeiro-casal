# Design system Sovinna

Padrão visual oficial do produto — portado 1:1 do antigo mockup `Sovinna.jsx` para `Pages/Dashboard.jsx`. Toda tela nova deve compor a partir destes tokens e componentes em vez de reintroduzir cor/estilo ad-hoc.

## Tokens

Fonte única de cor: [`resources/js/theme/tokens.js`](../../theme/tokens.js) (tema "Maré", fixo — sem seletor de tema em runtime). Os mesmos valores são espelhados como CSS vars estáticas em [`resources/css/app.css`](../../../css/app.css) e viram classes Tailwind via `tailwind.config.js` (`bg-surface`, `text-accent`, `text-strong-accent`, `bg-income`, etc. — ver a lista completa em `colors` no config).

```jsx
// preferir sempre a classe Tailwind:
<div className="bg-surface text-accent" />

// só usar o objeto `theme` (theme/tokens.js) onde className não alcança:
// atributos de SVG (fill/stroke/stopColor em <defs>), o objeto contentStyle
// do Tooltip do Recharts, ou cor vinda de dado dinâmico (ex: cor de categoria).
import { theme } from '@/theme/tokens';
<stop stopColor={theme.strongAccent} />
```

As outras 10 paletas exploradas antes de fixar em "Maré" ficam arquivadas em `theme/archive-themes.js`, sem uso ativo.

### Duas pegadinhas do Tailwind que já causaram bug visual real aqui — leia antes de mexer em cor

1. **O valor da CSS var precisa ser separado por espaço, não por vírgula.** `tailwind.config.js` usa o padrão `rgb(var(--x-rgb) / <alpha-value>)` (sintaxe moderna). Se `--x-rgb` estiver definido como `"223, 238, 240"` (vírgula, formato legado de `rgba()`), o resultado vira `rgb(223, 238, 240 / 1)` — **CSS inválido**, descartado silenciosamente pelo navegador (sem erro no console, a cor simplesmente não aplica). Tem que ser `--x-rgb: 223 238 240;` (espaço). Todos os tokens em `app.css` já seguem isso — se adicionar um novo, mantenha o padrão.
2. **Modificador de opacidade "solto" (`bg-accent/16`) só funciona se o número estiver na escala padrão do Tailwind** (0,5,10,20,25,30,40,50,60,70,75,80,90,95,100). Fora disso (`/16`, `/8`, `/45`...), a classe não é gerada — de novo, sem erro, só não aparece no CSS final. Os valores usados no design já foram adicionados em `theme.extend.opacity` no `tailwind.config.js`; se precisar de um novo valor fora da lista, adicione lá (ou use a sintaxe com colchete `/[0.16]`, que sempre funciona).
3. **Não misture gradiente + cor sólida num único `bg-[...]`** (ex: `bg-[linear-gradient(...),var(--color-bg)]`). Isso é válido como propriedade `background` (shorthand), mas a classe arbitrária `bg-[...]` do Tailwind vira só `background-image` OU `background-color` (inferido pelo valor) — misturar os dois no mesmo bracket quebra a declaração inteira. Use duas classes separadas: `bg-bg bg-[linear-gradient(...)]`.

## Componentes

- `Card` — wrapper com padding/radius/shadow/hover padrão. `bg={false}` remove o `bg-surface` default (para cards com gradiente custom via `className`, evitando disputa de especificidade entre duas classes `bg-*`).
- `SectionHeader` — título + subtítulo mudo (opcional) + ação à direita (opcional), para o topo de um `Card`.
- `TransactionRow` — linha de lançamento (data, seta receita/despesa, nome/categoria, valor). Requer `tipo: 'receita' | 'despesa'`.
- `DonutChart` — gráfico de rosca (Recharts) com total central e legenda. Cor de cada fatia vem de `data[].cor` (dado dinâmico → `style` inline ali é esperado, não dá pra virar classe Tailwind).
- `ProgressBar` — barra de progresso em gradiente (`value` de 0 a 100).
- `Button` — variantes `secondary` / `ghost`; aceita `href` (vira `Link` do Inertia) ou fica como `<button>` decorativo (sem `href`/`onClick`) — replique o comportamento do mockup: nem todo botão do Sovinna é funcional ainda.
- `GaugeArc` — arco de progresso 0-100 usado no card "Saúde financeira". **Não existe hoje uma fórmula real dessa métrica** (ver PLANNING.md) — só usar com valor real quando essa métrica for implementada; até lá, é só o visual do mockup. Gradiente/filtro de glow do SVG usam `theme.x` (atributos de `<defs>`/`<stop>` não são estilizáveis via `className`).

## Layout

`Layouts/AppLayout.jsx` é o layout das telas migradas para o padrão Sovinna. `Layouts/AuthenticatedLayout.jsx` continua servindo as telas ainda não migradas — não deve ser alterado até a vez de cada tela.

## Regra de ouro ao portar visual de um mockup

Se a tarefa é "levar esse visual para a tela real", o padrão é **fidelidade 1:1** — mesmos cards, mesmos textos, mesma estrutura — mesmo que a tela real ainda não tenha todos os dados por trás. Não redesenhar/renomear/remover cards para "encaixar" nos dados disponíveis sem perguntar antes. Depois de qualquer mudança de estilo, tirar um screenshot real (ver skill `run`) antes de dar como pronto — os dois bugs acima nunca geraram erro de build nem de console, só apareceram no visual renderizado.
