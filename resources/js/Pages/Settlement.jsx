import AppLayout from '@/Layouts/AppLayout';
import Card from '@/Components/ui/Card';
import PageHeader from '@/Components/ui/PageHeader';
import SectionHeader from '@/Components/ui/SectionHeader';
import CycleSwitcher from '@/Components/ui/CycleSwitcher';
import Button from '@/Components/ui/Button';
import MerchantLogo from '@/Components/ui/MerchantLogo';
import ExpenseIcon from '@/Components/expenses/ExpenseIcon';
import { Link, usePage } from '@inertiajs/react';
import { useCan } from '@/lib/access';
import { ArrowLeftRight, CalendarClock, ChevronLeft, UserRound, Users } from 'lucide-react';
import { dayMonth, dayMonthLabel, firstName, money, percent } from '@/lib/format';

const sum = (items, key) => items.reduce((total, item) => total + Number(item[key] || 0), 0);

// "+R$ 200,00 no acerto" / "−R$ 60,00 no acerto" / "fora do acerto".
function impactLabel(impact) {
    if (Math.abs(impact) < 0.005) return 'fora do acerto';
    return `${impact > 0 ? '+' : '−'}${money(Math.abs(impact))} no acerto`;
}

export default function Settlement({ cycle, summary, lines, fixed }) {
    const { couple } = usePage().props;
    const can = useCan();
    const partner = firstName(couple?.payer2_name);
    const me = firstName(couple?.payer1_name);
    const due = summary.due;

    const own = lines.filter((l) => l.ownership === 'payer2');
    const shared = lines.filter((l) => l.ownership === 'both');
    const paidForMe = lines.filter((l) => l.ownership === 'payer1');

    const details = (line) => [
        line.category || 'Sem categoria',
        line.ownership === 'both' && `${percent(couple?.payer2_percent, 0)} de ${money(line.amount)}`,
        line.source === 'payer2' && `pago por ${partner}`,
        line.installment && !line.name.includes(line.installment) && `parcela ${line.installment}`,
        line.direction === 'in' && 'estorno',
    ].filter(Boolean).join(' · ');

    const lineRow = (line, value) => ({
        key: line.id, icon: <ExpenseIcon row={line} />, date: line.date, name: line.name, details: details(line), value, note: impactLabel(line.impact),
    });

    return (
        <AppLayout title={`Acerto com ${partner}`}>
            <PageHeader
                eyebrow={
                    <Link href={route('dashboard', cycle.is_current ? {} : { month: cycle.month })} className="inline-flex min-h-8 items-center gap-1 font-medium text-secondary no-underline hover:text-text">
                        <ChevronLeft size={14} strokeWidth={2} /> Dashboard
                    </Link>
                }
                title={`Acerto com ${partner}`}
                description={`Tudo de que ${partner} faz parte neste mês: gastos dela, a parte dela nos compartilhados e nas contas fixas do próximo mês.`}
                actions={<CycleSwitcher cycle={cycle} routeName="settlement.index" />}
            />

            {/* Resumo */}
            <section className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.55fr)] gap-5 max-[1100px]:grid-cols-1">
                <Card bg={false} className="flex flex-col gap-3.5 border border-accent bg-accent text-on-accent">
                    <h2 className="flex items-center gap-2 text-[14px] font-semibold">
                        <ArrowLeftRight size={14} strokeWidth={2} /> Acerto com {partner}
                    </h2>
                    <div>
                        <span className="block text-[14px] text-on-accent-2">
                            {due > 0.009 ? `${partner} te deve` : due < -0.009 ? `Você deve a ${partner}` : 'Tudo acertado'}
                        </span>
                        <span className="block text-[42px] font-semibold leading-[1.1] tracking-[-0.035em] tabular-nums max-[560px]:text-[36px]">
                            {money(Math.abs(due))}
                        </span>
                    </div>
                    <p className="text-[13px] leading-[1.45] text-on-accent-2">Lançamentos do mês + contas fixas do próximo</p>
                    {can('expenses.edit') && (
                        <Button variant="dark" href={route('expenses.index', { ...(cycle.is_current ? {} : { month: cycle.month }), new: 'settlement' })} className="self-start">
                            Registrar acerto
                        </Button>
                    )}
                </Card>
            </section>

            {/* Listas */}
            <section className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] items-start gap-5">
                <LineGroup
                    icon={<UserRound size={16} strokeWidth={1.75} />}
                    title={`Gastos de ${partner}`}
                    subtitle="100% dela"
                    total={sum(own, 'payer2_share')}
                    empty={`Nenhum gasto só de ${partner} neste mês.`}
                    rows={own.map((l) => lineRow(l, l.payer2_share))}
                />

                <LineGroup
                    icon={<Users size={16} strokeWidth={1.75} />}
                    title="Compartilhados"
                    subtitle={`Parte de ${partner}: ${percent(couple?.payer2_percent, 0)}`}
                    total={sum(shared, 'payer2_share')}
                    empty="Nenhum gasto compartilhado neste mês."
                    rows={shared.map((l) => lineRow(l, l.payer2_share))}
                />

                <LineGroup
                    icon={<CalendarClock size={16} strokeWidth={1.75} />}
                    title="Contas fixas"
                    subtitle={`Do próximo mês · parte de ${partner}`}
                    total={sum(fixed, 'payer2_share')}
                    empty={`Nenhuma conta fixa com parte de ${partner} no próximo mês.`}
                    rows={fixed.map((f) => ({
                        key: `fixed-${f.id}`,
                        icon: <FixedIcon item={f} />,
                        date: f.due_date,
                        name: f.name,
                        details: [
                            f.status === 'paid' ? `paga em ${dayMonth(f.paid_at)}` : f.status === 'late' ? 'pagamento não encontrado' : 'a vencer',
                            f.category || 'Conta fixa',
                            f.ownership === 'both' && `${percent(couple?.payer2_percent, 0)} de ${money(f.amount)}`,
                            f.estimated && 'valor estimado',
                        ].filter(Boolean).join(' · '),
                        value: f.payer2_share,
                        note: impactLabel(f.payer2_share),
                        muted: f.status !== 'paid',
                    }))}
                />

                {paidForMe.length > 0 && (
                    <LineGroup
                        icon={<ArrowLeftRight size={16} strokeWidth={1.75} />}
                        title={`Gastos de ${me} pagos por ${partner}`}
                        subtitle="Abatem do acerto"
                        total={-sum(paidForMe, 'payer1_share')}
                        rows={paidForMe.map((l) => lineRow(l, -l.payer1_share))}
                    />
                )}

            </section>
        </AppLayout>
    );
}

// Logo da empresa da conta fixa; senão o ícone de conta fixa.
function FixedIcon({ item }) {
    if (item.merchant) return <MerchantLogo merchant={item.merchant} />;

    return (
        <span className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-inset text-secondary">
            <CalendarClock size={13} strokeWidth={2.2} />
        </span>
    );
}

function LineGroup({ icon, title, subtitle, total, rows, empty }) {
    return (
        <Card hover={false} className="flex flex-col">
            <SectionHeader
                className="mb-4"
                icon={icon}
                title={title}
                subtitle={subtitle}
                action={total !== undefined && <span className="whitespace-nowrap font-mono text-[14px] font-medium">{money(total)}</span>}
            />
            {rows.length === 0 ? (
                <p className="py-6 text-center text-[13px] text-muted">{empty}</p>
            ) : (
                <div className="flex flex-col">
                    {rows.map((row) => (
                        <div key={row.key} className={`flex items-center gap-3 border-t border-line-row py-3 first:border-t-0 ${row.muted ? 'opacity-70' : ''}`}>
                            <span className="w-[48px] flex-none font-mono text-[13px] text-secondary">{dayMonthLabel(row.date)}</span>
                            {row.icon}
                            <div className="min-w-0 flex-1">
                                <span className="block truncate text-[14px] font-medium">{row.name}</span>
                                <span className="block truncate text-[12px] text-muted">{row.details}</span>
                            </div>
                            <div className="flex-none text-right">
                                <div className="whitespace-nowrap font-mono text-[13px]">{money(row.value)}</div>
                                {row.note && <div className="whitespace-nowrap text-[12px] text-muted">{row.note}</div>}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
}
