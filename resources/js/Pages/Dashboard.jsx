import AppLayout from '@/Layouts/AppLayout';
import Card from '@/Components/ui/Card';
import Button from '@/Components/ui/Button';
import PageHeader from '@/Components/ui/PageHeader';
import CycleSwitcher from '@/Components/ui/CycleSwitcher';
import ProgressBar from '@/Components/ui/ProgressBar';
import GaugeArc from '@/Components/ui/GaugeArc';
import MerchantLogo from '@/Components/ui/MerchantLogo';
import { lighten, theme, tint } from '@/theme/tokens';
import { Link, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { ArrowDown, ArrowLeftRight, ArrowUp, ChevronRight, Plus, RefreshCw, Target } from 'lucide-react';
import { dayMonthLabel, daysUntil, deadlineLabel, firstName, money, moneyShort, monthName, parseDate, relativeTime } from '@/lib/format';

// Status da saúde financeira: cor do arco e do rótulo.
const HEALTH_TONE = {
    Excelente: { text: 'text-accent', arc: 'stroke-accent' },
    Boa: { text: 'text-accent', arc: 'stroke-accent' },
    Atenção: { text: 'text-warning', arc: 'stroke-warning' },
    Crítica: { text: 'text-red', arc: 'stroke-red' },
};

const MONTHS_UPPER = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

// Top 4 categorias + "Outras" (a lista fica legível com muitas categorias pequenas).
function categoryRows(items, total) {
    const positives = items.filter((c) => c.value > 0);
    const top = positives.slice(0, 4);
    const rest = positives.slice(4).reduce((sum, c) => sum + c.value, 0);
    const slices = rest > 0 ? [...top, { name: 'Outras', color: theme.catOutras, value: rest }] : top;
    const base = total > 0 ? total : slices.reduce((sum, c) => sum + c.value, 0) || 1;
    const max = Math.max(...slices.map((c) => c.value), 1);

    return slices.map((c) => ({
        name: c.name,
        color: c.color || theme.catFallback,
        value: c.value,
        share: (c.value / base) * 100,
        width: (c.value / max) * 100,
    }));
}

// Etiqueta de categoria da tabela: cor da categoria, ou neutra para receita/acerto/sem categoria.
function historyRow(row, couple) {
    const partner = firstName(couple?.payer2_name);
    const isIn = row.direction === 'in';

    let label = row.category || 'Sem categoria';
    let color = row.color;
    if (row.kind === 'income') [label, color] = ['Receita', theme.accent];
    if (row.kind === 'settlement') [label, color] = [isIn ? `Acerto · ${partner} pagou` : `Acerto · para ${partner}`, null];
    if (row.kind === 'expense' && isIn) label = `Estorno${row.category ? ` · ${row.category}` : ''}`;

    return {
        key: row.id,
        date: dayMonthLabel(row.date),
        name: row.name,
        label,
        color,
        value: `${isIn ? '+' : '−'}${money(row.amount)}`,
        isIn,
        merchant: row.kind === 'settlement' ? null : row.merchant,
    };
}

// Pede uma sincronização ao abrir quando os dados estão velhos (sem precisar de fila).
function useAutoSync(sync) {
    const [state, setState] = useState({ running: false, error: sync.error });

    const run = () => {
        setState({ running: true, error: null });
        axios
            .post(route('openFinance.sync'))
            .then(() => router.reload({ onFinish: () => setState({ running: false, error: null }) }))
            .catch((err) => setState({ running: false, error: err.response?.data?.errors?.[0] || 'Falha ao sincronizar.' }));
    };

    useEffect(() => {
        if (sync.has_connection && sync.stale) run();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return [state, run];
}

export default function Dashboard({ greetingName, cycle, health, balance, cashFlow, goal, upcoming, categories, history, settlement, sync }) {
    const { couple } = usePage().props;
    const [syncState, runSync] = useAutoSync(sync);
    const partner = firstName(couple?.payer2_name);
    const monthParams = cycle.is_current ? {} : { month: cycle.month };
    const syncStatus = <SyncStatus sync={sync} state={syncState} onSync={runSync} />;

    return (
        <AppLayout title="Dashboard" sync={syncStatus}>
            <PageHeader
                title={`Bem-vindo, ${greetingName}`}
                description={
                    <>
                        Visão geral de {cycle.label.charAt(0).toLowerCase() + cycle.label.slice(1)}
                        <span className="mt-1 flex desk:hidden">{syncStatus}</span>
                    </>
                }
                actions={
                    <>
                        <CycleSwitcher cycle={cycle} routeName="dashboard" />
                        <Button variant="primary" href={route('expenses.index', { ...monthParams, new: 1 })} className="max-[560px]:flex-1">
                            <Plus size={14} strokeWidth={2.2} /> Novo lançamento
                        </Button>
                    </>
                }
            />

            <Kpis balance={balance} cashFlow={cashFlow} cycle={cycle} />

            <div className="grid grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] gap-5 max-[1100px]:grid-cols-1">
                <CategoriesCard categories={categories} />

                <div className="flex min-w-0 flex-col gap-5">
                    <SettleCard settlement={settlement} partner={partner} cycle={cycle} monthParams={monthParams} />
                    <HealthCard health={health} />
                </div>

                <HistoryCard history={history} couple={couple} />

                <div className="flex min-w-0 flex-col gap-5">
                    <UpcomingCard upcoming={upcoming} />
                    <GoalCard goal={goal} />
                </div>
            </div>
        </AppLayout>
    );
}

function CardHead({ children, className = '' }) {
    return <div className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 ${className}`}>{children}</div>;
}

function CardTitle({ id, children, className = '' }) {
    return <h2 id={id} className={`m-0 flex items-center gap-2 text-[15px] font-semibold ${className}`}>{children}</h2>;
}

function CardLink({ href, children, className = 'text-secondary hover:text-text' }) {
    return (
        <Link href={href} className={`inline-flex min-h-8 items-center gap-1 text-[13px] font-medium no-underline ${className}`}>
            {children} <ChevronRight size={14} strokeWidth={2} />
        </Link>
    );
}

// ---------- KPIs ----------
function Kpis({ balance, cashFlow, cycle }) {
    const change = balance?.change_percent;
    const income = cashFlow.income || 0;
    const expenses = cashFlow.expenses || 0;
    const spentShare = income > 0 ? (expenses / income) * 100 : null;
    const estimated = cashFlow.estimated_balance;
    const monthOf = monthName(cycle.month);

    return (
        <section aria-label="Resumo do mês" className="grid grid-cols-4 gap-px overflow-hidden rounded-2xl border border-line bg-line max-[1280px]:grid-cols-2 max-[560px]:grid-cols-1">
            <Kpi label="Saldo total" tag="Principal">
                {balance ? (
                    <>
                        <KpiValue title={`Conta ${money(balance.accounts)} + investimentos ${money(balance.investments)}`}>{money(balance.total)}</KpiValue>
                        <KpiFoot>
                            {change != null ? (
                                <>
                                    <span className={`inline-flex items-center gap-[3px] rounded-md px-2 py-[2px] font-semibold ${change >= 0 ? 'bg-accent/12 text-accent' : 'bg-red/14 text-red'}`}>
                                        {change >= 0 ? <ArrowUp size={12} strokeWidth={2.5} /> : <ArrowDown size={12} strokeWidth={2.5} />}
                                        {Math.abs(change).toFixed(1).replace('.', ',')}%
                                    </span>
                                    vs. {monthName(balance.previous_month)}
                                </>
                            ) : (
                                'Conta + investimentos'
                            )}
                        </KpiFoot>
                    </>
                ) : (
                    <>
                        <KpiValue className="text-muted">—</KpiValue>
                        <KpiFoot>
                            <Link href={route('settings.show') + '#contas'} className="text-secondary underline-offset-2 hover:text-text hover:underline">
                                Conectar banco
                            </Link>
                        </KpiFoot>
                    </>
                )}
            </Kpi>

            <Kpi label="Receitas">
                <KpiValue>{money(income)}</KpiValue>
                <KpiFoot>Entradas de {monthOf}</KpiFoot>
            </Kpi>

            <Kpi label="Despesas · sua parte" title="Seus gastos individuais + sua parte dos compartilhados">
                <KpiValue>{money(expenses)}</KpiValue>
                <KpiFoot>
                    {spentShare != null ? (
                        <>
                            <span className="h-1 w-16 flex-none overflow-hidden rounded-sm bg-track">
                                <span className="block h-full bg-red" style={{ width: `${Math.min(100, spentShare)}%` }} />
                            </span>
                            {Math.round(spentShare)}% da receita
                        </>
                    ) : (
                        'Sem receita no mês'
                    )}
                </KpiFoot>
            </Kpi>

            <Kpi label="Balanço estimado">
                <KpiValue className={estimated >= 0 ? 'text-accent' : 'text-red'}>
                    {estimated >= 0 ? '+' : '−'}{money(Math.abs(estimated))}
                </KpiValue>
                <KpiFoot title={cashFlow.pending_fixed > 0 ? `Já desconta ${money(cashFlow.pending_fixed)} de contas fixas que ainda vão sair (sua parte)` : undefined}>
                    {cashFlow.pending_fixed > 0 ? `Receitas − despesas − fixas a pagar` : 'Receitas − despesas'}
                </KpiFoot>
            </Kpi>
        </section>
    );
}

function Kpi({ label, tag, title, children }) {
    return (
        <div className="flex min-w-0 flex-col gap-2.5 bg-surface px-6 py-[22px]" title={title}>
            <div className="flex items-center justify-between gap-2 text-[13px] text-muted">
                <span>{label}</span>
                {tag && <span className="rounded-full border border-line-strong px-2 py-[2px] text-[11px] text-secondary">{tag}</span>}
            </div>
            {children}
        </div>
    );
}

function KpiValue({ className = '', title, children }) {
    return <div title={title} className={`whitespace-nowrap text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] tabular-nums ${className}`}>{children}</div>;
}

function KpiFoot({ title, children }) {
    return <div title={title} className="flex items-center gap-2 text-[13px] text-muted">{children}</div>;
}

// ---------- Despesas por categoria ----------
function CategoriesCard({ categories }) {
    const rows = categoryRows(categories.items, categories.total);

    return (
        <Card className="flex flex-col gap-5" aria-labelledby="cat-title">
            <CardHead>
                <CardTitle id="cat-title">Despesas por categoria</CardTitle>
                <span className="text-[13px] text-muted">
                    Sua parte · <strong className="font-medium tabular-nums text-text">{money(categories.total)}</strong>
                </span>
            </CardHead>

            {rows.length === 0 ? (
                <EmptyLine>Nenhuma despesa neste mês ainda.</EmptyLine>
            ) : (
                <>
                    <div className="flex h-3 gap-[3px]" aria-hidden="true">
                        {rows.map((c) => (
                            <span key={c.name} className="rounded-[3px]" style={{ flex: `${c.share} 1 0`, background: c.color }} />
                        ))}
                    </div>
                    <ul className="m-0 list-none p-0">
                        {rows.map((c) => (
                            <li
                                key={c.name}
                                title={money(c.value)}
                                className="grid h-[42px] grid-cols-[160px_minmax(0,1fr)_56px] items-center gap-4 border-t border-line-soft max-[560px]:grid-cols-[108px_minmax(0,1fr)_44px] max-[560px]:gap-3"
                            >
                                <span className="flex min-w-0 items-center gap-2.5">
                                    <span className="h-2 w-2 flex-none rounded-[2px]" style={{ background: c.color }} />
                                    <span className="truncate">{c.name}</span>
                                </span>
                                <span className="h-1.5 overflow-hidden rounded-[3px] bg-line-soft">
                                    <span className="block h-full origin-left rounded-[3px] [animation:riseBar_.8s_cubic-bezier(.2,.8,.2,1)]" style={{ width: `${c.width}%`, background: c.color }} />
                                </span>
                                <span className="text-right font-mono text-[13px]">{Math.round(c.share)}%</span>
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </Card>
    );
}

// ---------- Acerto (card de destaque) ----------
function SettleCard({ settlement, partner, cycle, monthParams }) {
    const due = settlement.due;
    const owes = due > 0.009 ? `${partner} te deve` : due < -0.009 ? `Você deve a ${partner}` : 'Tudo acertado';

    return (
        <Card bg={false} className="flex flex-col gap-3.5 border border-accent bg-accent text-on-accent" aria-labelledby="settle-title">
            <CardHead>
                <CardTitle id="settle-title" className="text-[14px]">
                    <ArrowLeftRight size={14} strokeWidth={2} /> Acerto com {partner}
                </CardTitle>
                <CardLink href={route('settlement.index', { month: cycle.month })} className="font-semibold text-on-accent hover:opacity-80">
                    Detalhes
                </CardLink>
            </CardHead>
            <div>
                <span className="block text-[14px] text-on-accent-2">{owes}</span>
                <span className="block text-[42px] font-semibold leading-[1.1] tracking-[-0.035em] tabular-nums max-[560px]:text-[36px]">
                    {money(Math.abs(due))}
                </span>
            </div>
            <p className="m-0 text-[13px] leading-[1.45] text-on-accent-2">Lançamentos do mês + contas fixas do próximo</p>
            <Button variant="dark" href={route('expenses.index', { ...monthParams, new: 'settlement' })} className="self-start">
                Registrar acerto
            </Button>
        </Card>
    );
}

// ---------- Saúde financeira ----------
function HealthCard({ health }) {
    const tone = HEALTH_TONE[health?.label] ?? HEALTH_TONE.Boa;

    return (
        <Card className="flex flex-row items-center gap-5 px-6 py-5" title={health ? healthTitle(health) : undefined} aria-labelledby="health-title">
            <GaugeArc score={health?.score ?? 0} tone={tone.arc} />
            <div className="flex flex-col gap-0.5">
                <h2 id="health-title" className="m-0 text-[13px] font-normal text-muted">Saúde financeira</h2>
                {health ? (
                    <>
                        <div className="flex items-baseline gap-2">
                            <span className="text-[28px] font-semibold tracking-[-0.02em] tabular-nums">{health.score}%</span>
                            <span className={`text-[13px] font-semibold ${tone.text}`}>{health.label}</span>
                        </div>
                        <span className="text-[12px] text-muted">Últimos 30 dias</span>
                    </>
                ) : (
                    <>
                        <span className="text-[28px] font-semibold tracking-[-0.02em] text-muted">—</span>
                        <span className="text-[12px] text-muted">Conecte seu banco para acompanhar</span>
                    </>
                )}
            </div>
        </Card>
    );
}

function healthTitle(health) {
    const { savings, reserve, card } = health.parts;
    return [
        health.message,
        savings && `Sobrou ${savings.rate.toString().replace('.', ',')}% da renda nos últimos 30 dias`,
        reserve && `Reserva: ${reserve.months.toString().replace('.', ',')} meses de gastos`,
        card && `Limite do cartão usado: ${card.usage.toString().replace('.', ',')}%`,
    ].filter(Boolean).join('\n');
}

// ---------- Últimas movimentações ----------
function HistoryCard({ history, couple }) {
    const th = 'sticky top-0 z-[1] bg-surface pb-2.5 text-left text-[12px] font-medium text-muted shadow-[inset_0_-1px_0_var(--color-line)]';

    return (
        <Card className="flex flex-col gap-4" aria-labelledby="tx-title">
            <CardHead>
                <CardTitle id="tx-title">Últimas movimentações</CardTitle>
                <CardLink href={route('expenses.index')}>Ver todas</CardLink>
            </CardHead>

            {history.length === 0 ? (
                <EmptyLine>Nenhuma movimentação ainda.</EmptyLine>
            ) : (
                <div className="scroll-thin max-h-[420px] overflow-auto">
                    <table className="w-full table-fixed border-collapse text-[14px]">
                        <thead>
                            <tr>
                                <th scope="col" className={`${th} w-[90px] max-[560px]:w-[64px]`}>Data</th>
                                <th scope="col" className={th}>Descrição</th>
                                <th scope="col" className={`${th} w-[140px] max-[560px]:hidden`}>Categoria</th>
                                <th scope="col" className={`${th} w-[110px] text-right max-[560px]:w-[100px]`}>Valor</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.map((raw) => {
                                const row = historyRow(raw, couple);
                                return (
                                    <tr key={row.key} className="border-b border-line-row last:border-b-0">
                                        <td className="whitespace-nowrap py-3 pr-2 align-middle font-mono text-[13px] text-secondary">{row.date}</td>
                                        <td className="py-3 pr-3 align-middle">
                                            <span className="flex min-w-0 items-center gap-3 font-medium">
                                                {row.merchant ? <MerchantLogo merchant={row.merchant} /> : <Monogram name={row.name} />}
                                                <span className="min-w-0 truncate" title={row.name}>{row.name}</span>
                                            </span>
                                        </td>
                                        <td className="py-3 pr-2 align-middle max-[560px]:hidden">
                                            <CategoryPill label={row.label} color={row.color} />
                                        </td>
                                        <td className={`whitespace-nowrap py-3 text-right align-middle font-mono text-[13px] ${row.isIn ? 'text-accent' : ''}`}>{row.value}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </Card>
    );
}

function Monogram({ name }) {
    return (
        <span className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-inset text-[12px] font-semibold text-secondary">
            {(name || '?').trim().charAt(0).toUpperCase()}
        </span>
    );
}

function CategoryPill({ label, color }) {
    const style = color ? { background: tint(color, 0.12), color: lighten(color, 0.3) } : undefined;
    return (
        <span title={label} className={`inline-block max-w-[140px] truncate whitespace-nowrap rounded-full px-[9px] py-[3px] align-middle text-[12px] ${color ? '' : 'bg-inset text-secondary'}`} style={style}>
            {label}
        </span>
    );
}

// ---------- Próximas despesas ----------
function UpcomingCard({ upcoming }) {
    return (
        <Card className="flex flex-col gap-4" aria-labelledby="bills-title">
            <CardHead>
                <CardTitle id="bills-title">Próximas despesas</CardTitle>
                <span className="rounded-full bg-inset px-2 py-[2px] text-[12px] text-secondary">{upcoming.length}</span>
            </CardHead>

            {upcoming.length === 0 ? (
                <EmptyLine>Todas as contas fixas deste mês já foram pagas.</EmptyLine>
            ) : (
                <div className="scroll-thin -mr-2 flex max-h-[296px] flex-col gap-4 overflow-y-auto pr-2">
                    {upcoming.map((item) => <Bill key={item.key} item={item} />)}
                </div>
            )}
        </Card>
    );
}

function Bill({ item }) {
    const date = parseDate(item.date);
    const days = daysUntil(item.date);
    const when = item.status === 'late' ? 'atrasada' : days === 0 ? 'hoje' : days === 1 ? 'amanhã' : days > 0 ? `em ${days} dias` : `há ${-days} dias`;
    const sub = [item.category, item.status === 'late' ? 'pagamento não encontrado' : null, item.estimated && item.status !== 'open' ? 'valor estimado' : null]
        .filter(Boolean)
        .join(' · ');

    return (
        <div className="flex items-center gap-3.5 max-[560px]:flex-wrap">
            <div className="flex h-14 w-[52px] flex-none flex-col items-center justify-center gap-px rounded-[10px] bg-inset">
                <b className="text-[20px] font-semibold leading-none">{date.getDate()}</b>
                <small className="text-[11px] tracking-[0.06em] text-muted">{MONTHS_UPPER[date.getMonth()]}</small>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                <span className="truncate text-[14px] font-medium">{item.name}</span>
                <span className="truncate text-[12px] text-muted">{sub}</span>
            </div>
            <div className="flex flex-col items-end gap-[3px] max-[560px]:w-full max-[560px]:flex-row-reverse max-[560px]:items-baseline max-[560px]:justify-between max-[560px]:border-t max-[560px]:border-line-row max-[560px]:pt-3">
                <span className="whitespace-nowrap font-mono text-[14px] text-red">−{money(item.amount)}</span>
                <span className={`text-[12px] ${item.status === 'late' ? 'text-red' : 'text-muted'}`}>{when}</span>
            </div>
        </div>
    );
}

// ---------- Meta ----------
function GoalCard({ goal }) {
    return (
        <Card className="flex flex-1 flex-col gap-3" aria-labelledby="goal-title">
            <CardHead>
                <CardTitle id="goal-title">
                    <Target size={16} strokeWidth={1.75} className="text-muted" />
                    Meta · {goal ? goal.name : 'Investimentos'}
                </CardTitle>
                {goal && <span className="text-[13px] font-semibold tabular-nums text-accent">{Math.round(goal.percent)}%</span>}
            </CardHead>

            {goal ? (
                <>
                    <div className="flex flex-wrap items-baseline gap-2">
                        <span className="text-[28px] font-semibold tracking-[-0.02em] tabular-nums">{moneyShort(goal.current)}</span>
                        <span className="text-[13px] text-muted">
                            de {moneyShort(goal.target)}
                            {goal.deadline && ` · até ${deadlineLabel(goal.deadline)}`}
                        </span>
                    </div>
                    <ProgressBar value={goal.percent} />
                    <CardLink href={route('goals.index')} className="self-start text-secondary hover:text-text">Ver metas</CardLink>
                </>
            ) : (
                <>
                    <p className="m-0 max-w-[46ch] text-[13px] leading-[1.5] text-muted">
                        Defina quanto vocês querem juntar — o progresso usa o saldo investido no banco.
                    </p>
                    <Button variant="secondary" href={route('goals.index', { new: 1 })} className="mt-1 self-start">
                        <Plus size={14} strokeWidth={2} /> Criar meta
                    </Button>
                </>
            )}
        </Card>
    );
}

function EmptyLine({ children }) {
    return <p className="m-0 py-6 text-center text-[13px] text-muted">{children}</p>;
}

function SyncStatus({ sync, state, onSync }) {
    if (!sync.has_connection) {
        return (
            <Link href={route('settings.show') + '#contas'} className="inline-flex items-center gap-2 text-[12px] text-muted no-underline hover:text-text">
                <RefreshCw size={14} strokeWidth={2} className="flex-none" /> Nenhum banco conectado · conectar
            </Link>
        );
    }

    return (
        <button
            type="button"
            onClick={onSync}
            disabled={state.running}
            title={state.error || 'Buscar transações novas no banco'}
            className={`inline-flex items-center gap-2 text-left text-[12px] transition-colors ${state.error ? 'text-red' : 'text-muted hover:text-text'}`}
        >
            <RefreshCw size={14} strokeWidth={2} className={`flex-none ${state.running ? 'animate-spin' : ''}`} />
            {state.running ? 'Sincronizando com o banco…' : state.error ? 'Falha ao sincronizar · tentar de novo' : `Sincronizado ${relativeTime(sync.last_synced_at)}`}
        </button>
    );
}
