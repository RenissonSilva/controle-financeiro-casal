import AppLayout from '@/Layouts/AppLayout';
import Card from '@/Components/ui/Card';
import PageHeader from '@/Components/ui/PageHeader';
import SectionHeader from '@/Components/ui/SectionHeader';
import CycleSwitcher from '@/Components/ui/CycleSwitcher';
import IconBadge from '@/Components/ui/IconBadge';
import { Link, usePage } from '@inertiajs/react';
import { ArrowLeftRight, CalendarClock, ChevronLeft, UserRound, Users } from 'lucide-react';
import { dayMonth, firstName, money, percent } from '@/lib/format';

const sum = (items, key) => items.reduce((total, item) => total + Number(item[key] || 0), 0);

// "+R$ 200,00 no acerto" / "−R$ 60,00 no acerto" / "fora do acerto".
function impactLabel(impact) {
    if (Math.abs(impact) < 0.005) return 'fora do acerto';
    return `${impact > 0 ? '+' : '−'}${money(Math.abs(impact))} no acerto`;
}

export default function Settlement({ cycle, summary, lines, fixed }) {
    const { couple } = usePage().props;
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

    return (
        <AppLayout title={`Acerto com ${partner}`}>
            <PageHeader
                eyebrow={
                    <Link href={route('dashboard')} className="inline-flex items-center gap-1 hover:text-text">
                        <ChevronLeft size={13} strokeWidth={2.4} /> Dashboard
                    </Link>
                }
                title={`Acerto com ${partner}`}
                description={`Tudo de que ${partner} faz parte neste mês: gastos dela, a parte dela nos compartilhados e nas contas fixas do próximo mês.`}
                actions={<CycleSwitcher cycle={cycle} routeName="settlement.index" />}
            />

            {/* Resumo */}
            <section className="flex flex-wrap items-stretch gap-[clamp(14px,1.6vw,20px)]">
                <Card className="flex flex-[1.4_1_320px] flex-col gap-3.5">
                    <div className="flex items-center gap-2">
                        <IconBadge><ArrowLeftRight size={13} strokeWidth={2.2} className="stroke-strong-accent" /></IconBadge>
                        <span className="text-[13px] font-semibold tracking-[-.01em]">
                            {due > 0.009 ? `${partner} te deve` : due < -0.009 ? `Você deve a ${partner}` : 'Tudo acertado'}
                        </span>
                    </div>
                    <div className={`font-heading text-[clamp(26px,2.6vw,32px)] font-medium tracking-[-.02em] ${due < -0.009 ? 'text-red' : ''}`}>
                        {money(Math.abs(due))}
                    </div>
                </Card>
            </section>

            {/* Listas */}
            <section className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] items-start gap-[clamp(14px,1.6vw,20px)]">
                <LineGroup
                    icon={<UserRound size={13} strokeWidth={2.2} className="stroke-strong-accent" />}
                    title={`Gastos de ${partner}`}
                    subtitle="100% dela"
                    total={sum(own, 'payer2_share')}
                    empty={`Nenhum gasto só de ${partner} neste mês.`}
                    rows={own.map((l) => ({ key: l.id, date: l.date, name: l.name, details: details(l), value: l.payer2_share, note: impactLabel(l.impact) }))}
                />

                <LineGroup
                    icon={<Users size={13} strokeWidth={2.2} className="stroke-strong-accent" />}
                    title="Compartilhados"
                    subtitle={`Parte de ${partner}: ${percent(couple?.payer2_percent, 0)}`}
                    total={sum(shared, 'payer2_share')}
                    empty="Nenhum gasto compartilhado neste mês."
                    rows={shared.map((l) => ({ key: l.id, date: l.date, name: l.name, details: details(l), value: l.payer2_share, note: impactLabel(l.impact) }))}
                />

                <LineGroup
                    icon={<CalendarClock size={13} strokeWidth={2.2} className="stroke-strong-accent" />}
                    title="Contas fixas"
                    subtitle={`Do próximo mês · parte de ${partner}`}
                    total={sum(fixed, 'payer2_share')}
                    empty={`Nenhuma conta fixa com parte de ${partner} no próximo mês.`}
                    rows={fixed.map((f) => ({
                        key: `fixed-${f.id}`,
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
                        icon={<ArrowLeftRight size={13} strokeWidth={2.2} className="stroke-strong-accent" />}
                        title={`Gastos de ${me} pagos por ${partner}`}
                        subtitle="Abatem do acerto"
                        total={-sum(paidForMe, 'payer1_share')}
                        rows={paidForMe.map((l) => ({ key: l.id, date: l.date, name: l.name, details: details(l), value: -l.payer1_share, note: impactLabel(l.impact) }))}
                    />
                )}

            </section>
        </AppLayout>
    );
}

function LineGroup({ icon, title, subtitle, total, rows, empty }) {
    return (
        <Card hover={false} className="flex flex-col">
            <SectionHeader
                className="mb-3"
                icon={icon}
                title={title}
                subtitle={subtitle}
                action={total !== undefined && <span className="font-heading text-[15px] font-semibold tabular-nums">{money(total)}</span>}
            />
            {rows.length === 0 ? (
                <p className="px-2.5 py-6 text-center text-[12.5px] text-text/45">{empty}</p>
            ) : (
                <div className="flex flex-col gap-0.5">
                    {rows.map((row) => (
                        <div key={row.key} className={`flex items-center gap-3 rounded-[10px] px-2.5 py-2 transition-colors hover:bg-text/5 ${row.muted ? 'opacity-70' : ''}`}>
                            <span className="w-[42px] flex-none text-xs font-medium tabular-nums text-text/50">{dayMonth(row.date)}</span>
                            <div className="min-w-0 flex-1">
                                <span className="block truncate text-[13px] font-medium">{row.name}</span>
                                <span className="block truncate text-[11px] text-text/45">{row.details}</span>
                            </div>
                            <div className="flex-none text-right">
                                <div className="text-[13px] font-semibold tabular-nums">{money(row.value)}</div>
                                {row.note && <div className="text-[10.5px] tabular-nums text-text/40">{row.note}</div>}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
}
