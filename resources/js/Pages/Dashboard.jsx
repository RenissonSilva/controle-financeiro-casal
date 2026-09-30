import AppLayout from '@/Layouts/AppLayout';
import Card from '@/Components/ui/Card';
import SectionHeader from '@/Components/ui/SectionHeader';
import ProgressBar from '@/Components/ui/ProgressBar';
import TransactionRow from '@/Components/ui/TransactionRow';
import DonutChart from '@/Components/ui/DonutChart';
import GaugeArc from '@/Components/ui/GaugeArc';
import { theme } from '@/theme/tokens';
import { Link, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { CreditCard, ArrowUp, ArrowDown, Target, Wallet, Clock, PieChart, History, ArrowLeftRight, RefreshCw } from 'lucide-react';
import { dayMonth, deadlineLabel, firstName, money, moneyParts, moneyShort, monthName, relativeTime } from '@/lib/format';

// Tom do selo/medidor conforme a nota da saúde financeira.
const HEALTH_TONE = {
    Excelente: { text: 'text-green', dot: 'bg-strong-accent shadow-[0_0_10px_2px_rgb(var(--color-strong-accent-rgb)/0.7)]' },
    Boa: { text: 'text-green', dot: 'bg-strong-accent shadow-[0_0_10px_2px_rgb(var(--color-strong-accent-rgb)/0.7)]' },
    Atenção: { text: 'text-lime', dot: 'bg-lime shadow-[0_0_10px_2px_rgb(var(--color-soft-text-rgb)/0.6)]' },
    Crítica: { text: 'text-red', dot: 'bg-red shadow-[0_0_10px_2px_rgb(var(--color-expense-rgb)/0.6)]' },
};

// Pontos do saldo → caminho do sparkline no mesmo viewBox 220×44 do mockup.
function sparkline(points) {
    if (!points?.length) return null;

    const values = points.map((p) => p.total);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const step = 220 / Math.max(points.length - 1, 1);
    const coords = values.map((v, i) => [Math.round(i * step), Math.round(34 - ((v - min) / span) * 28)]);
    const line = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`).join(' ');

    return { line, area: `${line} L220 44 L0 44Z`, last: coords[coords.length - 1] };
}

// Top 4 categorias + "Outras" (a rosca fica legível com muitas categorias pequenas).
function donutData(items, total) {
    const positives = items.filter((c) => c.value > 0);
    const top = positives.slice(0, 4);
    const rest = positives.slice(4).reduce((sum, c) => sum + c.value, 0);
    const slices = rest > 0 ? [...top, { name: 'Outras', color: theme.chartDeep, value: rest }] : top;
    const base = total > 0 ? total : slices.reduce((sum, c) => sum + c.value, 0) || 1;

    return slices.map((c) => ({
        nome: c.name,
        cor: c.color || theme.chartMid,
        valor: Math.round(c.value * 100) / 100,
        pct: `${Math.round((c.value / base) * 100)}%`,
    }));
}

function historyRow(row, couple) {
    const partner = firstName(couple?.payer2_name);
    const isIn = row.direction === 'in';

    let categoria = row.category;
    if (row.kind === 'income') categoria = 'Receita';
    if (row.kind === 'settlement') categoria = isIn ? `Acerto · ${partner} pagou` : `Acerto · para ${partner}`;
    if (row.kind === 'expense' && isIn) categoria = `Estorno${row.category ? ` · ${row.category}` : ''}`;

    return {
        key: row.id,
        date: dayMonth(row.date),
        nome: row.name,
        categoria: categoria || 'Sem categoria',
        valor: money(row.amount),
        tipo: isIn ? 'receita' : 'despesa',
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
    const tone = HEALTH_TONE[health?.label] ?? HEALTH_TONE.Boa;
    const partner = firstName(couple?.payer2_name);

    const [balanceInt, balanceCents] = moneyParts(balance?.total ?? 0);
    const spark = sparkline(balance?.points);
    const change = balance?.change_percent;
    const flowTotal = (cashFlow.income || 0) + (cashFlow.expenses || 0);
    const incomeWidth = flowTotal > 0 ? Math.round((cashFlow.income / flowTotal) * 100) : 50;
    const estimated = cashFlow.estimated_balance;
    const donut = donutData(categories.items, categories.total);

    return (
        <AppLayout title="Dashboard">
            {/* Hero Section */}
            <section className="flex flex-wrap items-center justify-between gap-5">
                <div>
                    <h1 className="mb-2.5 text-[clamp(34px,4.5vw,52px)] font-medium leading-[1.02] tracking-[-.03em]">
                        Bem-vindo, <span className="text-strong-accent">{greetingName}</span>
                    </h1>
                    <div className="inline-flex items-center gap-2 rounded-full bg-teal/12 py-[5px] pl-2.5 pr-3.5 shadow-[inset_0_0_0_1px_rgb(var(--color-accent-rgb)/0.35)] backdrop-blur">
                        <span className={`h-[7px] w-[7px] rounded-full ${tone.dot}`} />
                        <span className={`text-[13px] ${tone.text}`}>
                            {health ? health.message : 'Conecte seu banco para acompanhar sua saúde financeira'}
                        </span>
                    </div>
                </div>

                {/* Saúde financeira (Glass Badge Pill) */}
                <Card
                    bg={false}
                    title={health ? healthTitle(health) : undefined}
                    className="flex items-center gap-[18px] rounded-[20px] bg-[linear-gradient(135deg,var(--color-health-card-grad-start)_0%,rgb(var(--color-text-rgb)/0.03)_100%)] px-[22px] py-3 shadow-[inset_0_0_0_1px_rgb(var(--color-accent-rgb)/0.25),0_12px_32px_-8px_rgba(0,0,0,0.25)] backdrop-blur-md"
                >
                    <GaugeArc score={health?.score ?? 0} />
                    <div>
                        <div className="text-[13.5px] font-semibold tracking-[-.01em]">Saúde financeira</div>
                        <div className={`mt-px text-xs font-semibold ${tone.text}`}>{health ? `${health.label} · 30 dias` : 'Sem dados ainda'}</div>
                    </div>
                </Card>
            </section>

            <section className="mt-[clamp(14px,2vw,24px)] flex flex-wrap items-center justify-between gap-[clamp(14px,1.6vw,20px)]">
                <SyncStatus sync={sync} state={syncState} onSync={runSync} />
                <div className="text-xs uppercase tracking-[.12em] text-text/70">{cycle.label}</div>
            </section>

            {/* Top Row: Saldo Total (Hero), Fluxo de Caixa, Acerto, Meta */}
            <section className="flex flex-wrap items-stretch gap-[clamp(14px,1.6vw,20px)]">
                {/* Saldo Total - Hero Card */}
                <Card
                    bg={false}
                    className="relative flex flex-[1_1_240px] flex-col justify-between overflow-hidden bg-[linear-gradient(135deg,rgb(var(--color-accent-rgb)/0.32)_0%,var(--color-hero-card-grad-start)_50%,var(--color-surface)_100%)]"
                >
                    <div className="relative z-[1]">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-[7px] text-xs font-semibold text-text">
                                <span className="grid h-[26px] w-[26px] flex-none place-items-center rounded-full bg-teal/16">
                                    <CreditCard size={13} strokeWidth={2.2} className="stroke-strong-accent" />
                                </span>
                                Saldo Total
                            </div>
                            <span className="rounded-full bg-[linear-gradient(90deg,var(--color-strong-accent),var(--color-accent))] px-2.5 py-[3px] text-[11px] font-bold text-bg shadow-[0_2px_8px_rgba(0,0,0,0.25)]">
                                Principal
                            </span>
                        </div>
                        {balance ? (
                            <>
                                <div
                                    title={`Conta ${money(balance.accounts)} + investimentos ${money(balance.investments)}`}
                                    className="mt-3.5 font-heading text-[clamp(28px,2.8vw,38px)] font-semibold leading-none tracking-[-.03em] text-text [text-shadow:0_2px_12px_rgba(0,0,0,0.3)]"
                                >
                                    {balanceInt}<span className="text-[.55em] opacity-80">{balanceCents}</span>
                                </div>
                                {change != null && (
                                    <div className={`mt-2.5 flex items-center gap-2 text-[12.5px] ${change >= 0 ? 'text-green' : 'text-red'}`}>
                                        <span
                                            className={`inline-flex items-center gap-[3px] rounded-md bg-black/40 px-2 py-[2px] font-semibold ${
                                                change >= 0 ? 'shadow-[inset_0_0_0_1px_var(--color-income)]' : 'shadow-[inset_0_0_0_1px_var(--color-expense)]'
                                            }`}
                                        >
                                            {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(1).replace('.', ',')}%
                                        </span>
                                        <span className="font-medium text-text/65">vs. {monthName(balance.previous_month)}</span>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="mt-3.5 text-[13px] leading-[1.5] text-text/60">
                                Conecte sua conta em{' '}
                                <Link href={route('settings.show') + '#contas'} className="text-strong-accent underline-offset-2 hover:underline">
                                    Configurações
                                </Link>{' '}
                                para ver o saldo real.
                            </div>
                        )}
                    </div>
                    {spark && (
                        <svg viewBox="0 0 220 44" preserveAspectRatio="none" className="relative z-[1] mt-4 h-[38px] w-full overflow-visible">
                            <defs>
                                <linearGradient id="sovinna-spark" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0" stopColor={theme.strongAccent} stopOpacity=".65" />
                                    <stop offset="1" stopColor={theme.strongAccent} stopOpacity="0" />
                                </linearGradient>
                            </defs>
                            <path d={spark.area} fill="url(#sovinna-spark)" />
                            <path d={spark.line} fill="none" className="stroke-strong-accent" strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" />
                            <circle cx={spark.last[0]} cy={spark.last[1]} r="3.8" className="fill-strong-accent" />
                        </svg>
                    )}
                </Card>

                {/* Fluxo do Mês (Painel Unificado para Receitas & Despesas) */}
                <Card className="flex flex-[2_1_440px] flex-col justify-between">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="grid h-[26px] w-[26px] flex-none place-items-center rounded-full bg-teal/16">
                                <Wallet size={13} strokeWidth={2.2} className="stroke-strong-accent" />
                            </span>
                            <span className="text-[13px] font-semibold tracking-[-.01em] text-text">Fluxo de Caixa</span>
                        </div>
                        <div
                            className="text-[11.5px] text-text/50"
                            title={cashFlow.pending_fixed > 0 ? `Já desconta ${money(cashFlow.pending_fixed)} de contas fixas que ainda vão sair (sua parte)` : undefined}
                        >
                            Balanço estimado:{' '}
                            <strong className={`font-semibold ${estimated >= 0 ? 'text-green' : 'text-red'}`}>
                                {estimated >= 0 ? '+' : '−'}{money(Math.abs(estimated))}
                            </strong>
                        </div>
                    </div>

                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                        <div className="flex items-center gap-2.5">
                            <span className="grid h-[26px] w-[26px] flex-none place-items-center rounded-full bg-teal/16">
                                <ArrowUp size={13} strokeWidth={2.5} className="stroke-green" />
                            </span>
                            <div>
                                <div className="text-[11.5px] text-text/55">Receitas</div>
                                <div className="font-heading text-[19px] font-semibold tracking-[-.02em] text-green">{money(cashFlow.income)}</div>
                            </div>
                        </div>

                        <div className="w-px self-stretch bg-text/10" />

                        <div className="flex items-center justify-end gap-2.5 text-right">
                            <div>
                                <div className="text-[11.5px] text-text/55" title="Seus gastos individuais + sua parte dos compartilhados">
                                    Despesas <span className="text-text/35">· sua parte</span>
                                </div>
                                <div className="font-heading text-[19px] font-semibold tracking-[-.02em] text-red">{money(cashFlow.expenses)}</div>
                            </div>
                            <span className="grid h-[26px] w-[26px] flex-none place-items-center rounded-full bg-red/16">
                                <ArrowDown size={13} strokeWidth={2.5} className="stroke-red" />
                            </span>
                        </div>
                    </div>

                    <div className="mt-4">
                        <div className="flex h-1.5 overflow-hidden rounded-full bg-text/8">
                            <div className="h-full rounded-l-full bg-green [transition:width_1s_ease]" style={{ width: `${incomeWidth}%` }} />
                            <div className="h-full rounded-r-full bg-red/85" style={{ width: `${100 - incomeWidth}%` }} />
                        </div>
                    </div>
                </Card>

                {/* Acerto do casal */}
                <Card className="flex flex-[1_1_260px] flex-col justify-between gap-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="grid h-[26px] w-[26px] flex-none place-items-center rounded-full bg-teal/16">
                                <ArrowLeftRight size={13} strokeWidth={2.2} className="stroke-strong-accent" />
                            </span>
                            <span className="text-[13px] font-semibold tracking-[-.01em] text-text">Acerto com {partner}</span>
                        </div>
                        <Link href={route('settlement.index', { month: cycle.month })} className="text-xs font-semibold text-strong-accent hover:underline">
                            Detalhes
                        </Link>
                    </div>

                    <div>
                        <div className="text-[11.5px] text-text/55">
                            {settlement.due > 0.009 ? `${partner} te deve` : settlement.due < -0.009 ? `Você deve a ${partner}` : 'Tudo acertado'}
                        </div>
                        <div className={`font-heading text-[clamp(24px,2.4vw,28px)] font-medium tracking-[-.02em] ${settlement.due < -0.009 ? 'text-red' : 'text-text'}`}>
                            {money(Math.abs(settlement.due))}
                        </div>
                    </div>

                    <div className="text-xs text-text/45">Lançamentos do mês + contas fixas do próximo</div>
                </Card>

                {/* Meta · Investimentos */}
                <Card className="flex flex-[1.2_1_300px] flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="grid h-[26px] w-[26px] flex-none place-items-center rounded-full bg-teal/16">
                                <Target size={13} strokeWidth={2.2} className="stroke-strong-accent" />
                            </span>
                            <span className="text-[13px] font-semibold tracking-[-.01em] text-text">Meta · {goal ? goal.name : 'Investimentos'}</span>
                        </div>
                        {goal && <span className="text-xs font-bold text-strong-accent">{Math.round(goal.percent)}%</span>}
                    </div>

                    {goal ? (
                        <>
                            <div className="flex flex-wrap items-baseline gap-2">
                                <span className="font-heading text-[clamp(24px,2.4vw,28px)] font-medium tracking-[-.02em] text-text">{moneyShort(goal.current)}</span>
                                <span className="text-xs text-text/45">
                                    de {moneyShort(goal.target)}
                                    {goal.deadline && ` · até ${deadlineLabel(goal.deadline)}`}
                                </span>
                            </div>

                            <ProgressBar value={goal.percent} />
                        </>
                    ) : (
                        <p className="text-[13px] leading-[1.5] text-text/60">
                            Defina quanto vocês querem juntar — o progresso usa o saldo investido no banco.{' '}
                            <Link href={route('goals.index')} className="text-strong-accent hover:underline">Criar meta</Link>
                        </p>
                    )}
                </Card>
            </section>

            {/* Bottom Row: Próximas Despesas, Despesas Por Categoria, Histórico */}
            <section className="grid grid-cols-[repeat(auto-fit,minmax(290px,1fr))] items-stretch gap-[clamp(14px,1.6vw,20px)]">
                {/* Próximas despesas */}
                <Card className="flex flex-col">
                    <SectionHeader
                        className="mb-3"
                        icon={<Clock size={13} strokeWidth={2.2} className="stroke-strong-accent" />}
                        title="Próximas despesas"
                        action={
                            <span className="rounded-full bg-teal/12 px-[9px] py-[3px] text-[11px] font-medium text-strong-accent">
                                {upcoming.length} {upcoming.length === 1 ? 'gasto' : 'gastos'}
                            </span>
                        }
                    />
                    <div className="scroll-thin flex max-h-[220px] flex-col gap-1 overflow-y-auto pr-1">
                        {upcoming.length === 0 ? (
                            <EmptyLine>Todas as contas fixas deste mês já foram pagas.</EmptyLine>
                        ) : (
                            upcoming.map((item) => (
                                <TransactionRow
                                    key={item.key}
                                    date={dayMonth(item.date)}
                                    nome={item.name}
                                    categoria={[
                                        item.category,
                                        item.status === 'late' ? 'pagamento não encontrado' : null,
                                        item.estimated && item.status !== 'open' ? 'valor estimado' : null,
                                    ].filter(Boolean).join(' · ')}
                                    valor={money(item.amount)}
                                    tipo="despesa"
                                    merchant={item.merchant}
                                />
                            ))
                        )}
                    </div>
                </Card>

                {/* Despesas por categoria */}
                <Card className="flex flex-col">
                    <SectionHeader
                        className="mb-2.5"
                        icon={<PieChart size={13} strokeWidth={2.2} className="stroke-strong-accent" />}
                        title="Despesas por categoria"
                    />
                    {donut.length === 0 ? (
                        <EmptyLine>Nenhuma despesa neste mês ainda.</EmptyLine>
                    ) : (
                        <DonutChart data={donut} totalLabel="Sua parte" totalValue={moneyShort(categories.total)} valueFormatter={money} />
                    )}
                </Card>

                {/* Histórico de gastos */}
                <Card className="flex flex-col">
                    <SectionHeader
                        className="mb-3"
                        icon={<History size={13} strokeWidth={2.2} className="stroke-strong-accent" />}
                        title="Histórico de movimentações"
                    />
                    <div className="scroll-thin flex max-h-[220px] flex-col gap-1 overflow-y-auto pr-1">
                        {history.length === 0 ? (
                            <EmptyLine>Nenhuma movimentação ainda.</EmptyLine>
                        ) : (
                            history.map((row) => {
                                const h = historyRow(row, couple);
                                return <TransactionRow key={h.key} date={h.date} nome={h.nome} categoria={h.categoria} valor={h.valor} tipo={h.tipo} merchant={h.merchant} />;
                            })
                        )}
                    </div>
                </Card>
            </section>
        </AppLayout>
    );
}

function healthTitle(health) {
    const { savings, reserve, card } = health.parts;
    return [
        savings && `Sobrou ${savings.rate.toString().replace('.', ',')}% da renda nos últimos 30 dias`,
        reserve && `Reserva: ${reserve.months.toString().replace('.', ',')} meses de gastos`,
        card && `Limite do cartão usado: ${card.usage.toString().replace('.', ',')}%`,
    ].filter(Boolean).join('\n');
}

function EmptyLine({ children }) {
    return <p className="px-2.5 py-6 text-center text-[12.5px] text-text/45">{children}</p>;
}

function SyncStatus({ sync, state, onSync }) {
    if (!sync.has_connection) {
        return (
            <Link href={route('settings.show') + '#contas'} className="text-xs text-text/50 hover:text-text/80">
                Nenhum banco conectado · conectar
            </Link>
        );
    }

    return (
        <button
            type="button"
            onClick={onSync}
            disabled={state.running}
            title={state.error || 'Buscar transações novas no banco'}
            className={`inline-flex items-center gap-1.5 text-xs transition-colors ${state.error ? 'text-red' : 'text-text/50 hover:text-text/80'}`}
        >
            <RefreshCw size={12} strokeWidth={2.2} className={state.running ? 'animate-spin' : ''} />
            {state.running ? 'Sincronizando com o banco…' : state.error ? 'Falha ao sincronizar · tentar de novo' : `Sincronizado ${relativeTime(sync.last_synced_at)}`}
        </button>
    );
}
