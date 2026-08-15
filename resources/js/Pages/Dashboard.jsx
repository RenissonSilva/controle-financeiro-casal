import AppLayout from '@/Layouts/AppLayout';
import Card from '@/Components/ui/Card';
import SectionHeader from '@/Components/ui/SectionHeader';
import ProgressBar from '@/Components/ui/ProgressBar';
import TransactionRow from '@/Components/ui/TransactionRow';
import DonutChart from '@/Components/ui/DonutChart';
import GaugeArc from '@/Components/ui/GaugeArc';
import Button from '@/Components/ui/Button';
import { theme } from '@/theme/tokens';
import { CreditCard, ArrowUp, ArrowDown, Target, Wallet, Clock, PieChart, History } from 'lucide-react';

const NOME = 'Reni';
const SCORE = 62;

const PROXIMAS = [
    { nome: 'Aluguel', cat: 'Moradia', venc: '10/08', valor: 'R$ 2.150,00', tipo: 'despesa' },
    { nome: 'Depósito Salário', cat: 'Renda', venc: '11/08', valor: 'R$ 4.850,00', tipo: 'receita' },
    { nome: 'Cartão Nubank', cat: 'Cartão de Crédito', venc: '12/08', valor: 'R$ 1.284,30', tipo: 'despesa' },
    { nome: 'Energia · Enel', cat: 'Utilidades', venc: '15/08', valor: 'R$ 187,40', tipo: 'despesa' },
    { nome: 'Rendimento Inv.', cat: 'Investimentos', venc: '16/08', valor: 'R$ 320,00', tipo: 'receita' },
    { nome: 'Internet · Vivo', cat: 'Serviços', venc: '18/08', valor: 'R$ 119,90', tipo: 'despesa' },
];

const HISTORICO = [
    { nome: 'Mercado Central', cat: 'Alimentação', data: '02/08', valor: 'R$ 412,80', tipo: 'despesa' },
    { nome: 'Projeto Freelance', cat: 'Renda Extra', data: '02/08', valor: 'R$ 1.500,00', tipo: 'receita' },
    { nome: 'Posto Shell', cat: 'Transporte', data: '01/08', valor: 'R$ 260,00', tipo: 'despesa' },
    { nome: 'Farmácia São João', cat: 'Saúde', data: '31/07', valor: 'R$ 96,50', tipo: 'despesa' },
    { nome: 'Academia Pulse', cat: 'Lazer', data: '30/07', valor: 'R$ 149,00', tipo: 'despesa' },
    { nome: 'Academia Pulse 2', cat: 'Lazer', data: '30/07', valor: 'R$ 149,00', tipo: 'despesa' },
    { nome: 'Academia Pulse 3', cat: 'Lazer', data: '30/07', valor: 'R$ 149,00', tipo: 'despesa' },
];

const DESPESAS_CATEGORIA = [
    { cor: theme.chartLight, nome: 'Moradia', pct: '35%', valor: 35 },
    { cor: theme.chartMid, nome: 'Alimentação', pct: '30%', valor: 30 },
    { cor: theme.chartDeep, nome: 'Transporte', pct: '35%', valor: 35 },
];

export default function Dashboard() {
    return (
        <AppLayout title="Dashboard">
            {/* Hero Section */}
            <section className="flex flex-wrap items-center justify-between gap-5">
                <div>
                    <h1 className="mb-2.5 text-[clamp(34px,4.5vw,52px)] font-medium leading-[1.02] tracking-[-.03em]">
                        Bem-vindo, <span className="text-strong-accent">{NOME}</span>
                    </h1>
                    <div className="inline-flex items-center gap-2 rounded-full bg-accent/12 py-[5px] pl-2.5 pr-3.5 shadow-[inset_0_0_0_1px_rgb(var(--color-accent-rgb)/0.35)] backdrop-blur">
                        <span className="h-[7px] w-[7px] rounded-full bg-strong-accent shadow-[0_0_10px_2px_rgb(var(--color-strong-accent-rgb)/0.7)]" />
                        <span className="text-[13px] text-soft-text">Suas finanças estão saudáveis</span>
                    </div>
                </div>

                {/* Saúde financeira (Glass Badge Pill) */}
                
                <Card
                    bg={false}
                    className="flex items-center gap-[18px] rounded-[20px] bg-[linear-gradient(135deg,var(--color-health-card-grad-start)_0%,rgb(var(--color-text-rgb)/0.03)_100%)] px-[22px] py-3 shadow-[inset_0_0_0_1px_rgb(var(--color-accent-rgb)/0.25),0_12px_32px_-8px_rgba(0,0,0,0.25)] backdrop-blur-md"
                >
                    <GaugeArc score={SCORE} />
                    <div>
                        <div className="text-[13.5px] font-semibold tracking-[-.01em]">Saúde financeira</div>
                        <div className="mt-px text-xs text-expense">Excelente · 30 dias</div>
                    </div>
                </Card>
            </section>

            <section className="mt-[clamp(14px,2vw,24px)] flex justify-end gap-[clamp(14px,1.6vw,20px)]">
                <div className="text-xs uppercase tracking-[.12em] text-text/60">Agosto de 2026</div>
            </section>

            {/* Top Row: Saldo Total (Hero), Fluxo de Caixa (Unificado), Meta Investimentos */}
            <section className="flex flex-wrap items-stretch gap-[clamp(14px,1.6vw,20px)]">
                {/* Saldo Total - Hero Card */}
                <Card
                    bg={false}
                    className="relative flex flex-[1_1_240px] flex-col justify-between overflow-hidden bg-[linear-gradient(135deg,rgb(var(--color-accent-rgb)/0.32)_0%,var(--color-hero-card-grad-start)_50%,var(--color-surface)_100%)]"
                >
                    <div className="relative z-[1]">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-[7px] text-xs font-semibold text-text">
                                <CreditCard size={15} strokeWidth={2} className="stroke-strong-accent" />
                                Saldo Total
                            </div>
                            <span className="rounded-full bg-[linear-gradient(90deg,var(--color-strong-accent),var(--color-accent))] px-2.5 py-[3px] text-[11px] font-bold text-bg shadow-[0_2px_8px_rgba(0,0,0,0.25)]">
                                Principal
                            </span>
                        </div>
                        <div className="mt-3.5 font-heading text-[clamp(28px,2.8vw,38px)] font-semibold leading-none tracking-[-.03em] text-text [text-shadow:0_2px_12px_rgba(0,0,0,0.3)]">
                            R$ 18.420<span className="text-[.55em] opacity-80">,90</span>
                        </div>
                        <div className="mt-2.5 flex items-center gap-2 text-[12.5px] text-income">
                            <span className="inline-flex items-center gap-[3px] rounded-md bg-black/40 px-2 py-[2px] font-semibold shadow-[inset_0_0_0_1px_var(--color-income)]">
                                ▲ 4,8%
                            </span>
                            <span className="font-medium text-text/65">vs. julho</span>
                        </div>
                    </div>
                    <svg viewBox="0 0 220 44" preserveAspectRatio="none" className="relative z-[1] mt-4 h-[38px] w-full overflow-visible">
                        <defs>
                            <linearGradient id="sovinna-spark" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0" stopColor={theme.strongAccent} stopOpacity=".65" />
                                <stop offset="1" stopColor={theme.strongAccent} stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        <path d="M0 34 L24 30 L48 33 L72 22 L96 26 L120 15 L144 19 L168 12 L192 16 L220 6 L220 44 L0 44Z" fill="url(#sovinna-spark)" />
                        <path d="M0 34 L24 30 L48 33 L72 22 L96 26 L120 15 L144 19 L168 12 L192 16 L220 6" fill="none" className="stroke-strong-accent" strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" />
                        <circle cx="220" cy="6" r="3.8" className="fill-strong-accent" />
                    </svg>
                </Card>

                {/* Fluxo do Mês (Painel Unificado para Receitas & Despesas) */}
                <Card className="flex flex-[2_1_440px] flex-col justify-between">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="grid h-[26px] w-[26px] flex-none place-items-center rounded-full bg-accent/16">
                                <Wallet size={13} strokeWidth={2.2} className="stroke-strong-accent" />
                            </span>
                            <span className="text-[13px] font-semibold tracking-[-.01em] text-text">Fluxo de Caixa</span>
                        </div>
                        <div className="text-[11.5px] text-text/50">
                            Balanço estimado: <strong className="font-semibold text-income">+R$ 3.537,60</strong>
                        </div>
                    </div>

                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                        <div className="flex items-center gap-2.5">
                            <span className="grid h-[26px] w-[26px] flex-none place-items-center rounded-full bg-accent/16">
                                <ArrowUp size={13} strokeWidth={2.5} className="stroke-income" />
                            </span>
                            <div>
                                <div className="text-[11.5px] text-text/55">Receitas</div>
                                <div className="font-heading text-[19px] font-semibold tracking-[-.02em] text-income">R$ 9.850,00</div>
                            </div>
                        </div>

                        <div className="w-px self-stretch bg-text/10" />

                        <div className="flex items-center justify-end gap-2.5 text-right">
                            <div>
                                <div className="text-[11.5px] text-text/55">Despesas</div>
                                <div className="font-heading text-[19px] font-semibold tracking-[-.02em] text-expense">R$ 6.312,40</div>
                            </div>
                            <span className="grid h-[26px] w-[26px] flex-none place-items-center rounded-full bg-expense/16">
                                <ArrowDown size={13} strokeWidth={2.5} className="stroke-expense" />
                            </span>
                        </div>
                    </div>

                    <div className="mt-4">
                        <div className="flex h-1.5 overflow-hidden rounded-full bg-text/8">
                            <div className="h-full w-[36%] rounded-l-full bg-income [transition:width_1s_ease]" />
                            <div className="h-full w-[64%] rounded-r-full bg-expense/85" />
                        </div>
                    </div>
                </Card>

                {/* Meta · Investimentos */}
                <Card className="flex flex-[1.2_1_300px] flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="grid h-[26px] w-[26px] flex-none place-items-center rounded-full bg-accent/16">
                                <Target size={13} strokeWidth={2.2} className="stroke-strong-accent" />
                            </span>
                            <span className="text-[13px] font-semibold tracking-[-.01em] text-text">Meta · Investimentos</span>
                        </div>
                        <span className="text-xs font-bold text-strong-accent">70%</span>
                    </div>

                    <div className="flex flex-wrap items-baseline gap-2">
                        <span className="font-heading text-[clamp(24px,2.4vw,28px)] font-medium tracking-[-.02em] text-text">R$ 21.000</span>
                        <span className="text-xs text-text/45">de R$ 30.000 · até dez/26</span>
                    </div>

                    <ProgressBar value={70} />
                </Card>
            </section>

            {/* Bottom Row: Próximas Despesas (Checklist), Despesas Por Categoria (Graphic Spotlight), Histórico (Timeline Feed) */}
            <section className="grid grid-cols-[repeat(auto-fit,minmax(290px,1fr))] items-stretch gap-[clamp(14px,1.6vw,20px)]">
                {/* Próximas despesas */}
                <Card className="flex flex-col">
                    <SectionHeader
                        className="mb-3"
                        icon={<Clock size={13} strokeWidth={2.2} className="stroke-strong-accent" />}
                        title="Próximas despesas"
                        action={
                            <span className="rounded-full bg-accent/12 px-[9px] py-[3px] text-[11px] font-medium text-strong-accent">
                                {PROXIMAS.length} gastos
                            </span>
                        }
                    />
                    <div className="scroll-thin flex max-h-[220px] flex-col gap-1 overflow-y-auto pr-1">
                        {PROXIMAS.map((d, index) => (
                            <TransactionRow key={d.nome + index} date={d.venc} nome={d.nome} categoria={d.cat} valor={d.valor} tipo={d.tipo} />
                        ))}
                    </div>
                </Card>

                {/* Despesas por categoria */}
                <Card className="flex flex-col">
                    <SectionHeader
                        className="mb-2.5"
                        icon={<PieChart size={13} strokeWidth={2.2} className="stroke-strong-accent" />}
                        title="Despesas por categoria"
                        action={<span className="text-[11.5px] text-text/45">agosto</span>}
                    />
                    <DonutChart data={DESPESAS_CATEGORIA} totalValue="R$ 6.312" tooltipSuffix="%" />
                </Card>

                {/* Histórico de gastos */}
                <Card className="flex flex-col">
                    <SectionHeader
                        className="mb-3"
                        icon={<History size={13} strokeWidth={2.2} className="stroke-strong-accent" />}
                        title="Histórico de movimentações"
                    />
                    <div className="scroll-thin flex max-h-[220px] flex-col gap-1 overflow-y-auto pr-1">
                        {HISTORICO.map((h, index) => (
                            <TransactionRow key={h.nome + index} date={h.data} nome={h.nome} categoria={h.cat} valor={h.valor} tipo={h.tipo} />
                        ))}
                    </div>
                </Card>
            </section>
        </AppLayout>
    );
}
