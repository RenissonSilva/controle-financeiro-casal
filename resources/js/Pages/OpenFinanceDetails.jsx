import AppLayout from '@/Layouts/AppLayout';
import Card from '@/Components/ui/Card';
import Button from '@/Components/ui/Button';
import PageHeader from '@/Components/ui/PageHeader';
import SectionLabel from '@/Components/ui/SectionLabel';
import IconBadge from '@/Components/ui/IconBadge';
import { Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { ArrowLeft, ChevronDown, CreditCard, Landmark, RefreshCw, TrendingUp } from 'lucide-react';
import { dayMonthLabel, firstName, fullDate, money, relativeTime } from '@/lib/format';

const KIND = {
    expense: { label: 'Despesa', className: 'bg-inset text-secondary' },
    income: { label: 'Receita', className: 'bg-accent/12 text-accent' },
    settlement: { label: 'Acerto', className: 'bg-inset text-secondary' },
    ignored: { label: 'Ignorado', className: 'border border-line-strong text-muted' },
};

function TransactionLine({ t }) {
    return (
        <div className="flex items-center gap-3 border-t border-line-row px-2 py-2.5 first:border-t-0">
            <span className="w-[48px] flex-none font-mono text-[13px] text-secondary">{dayMonthLabel(t.date)}</span>
            <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-medium">{t.name}</div>
                <div className="truncate text-[12px] text-muted">
                    {[t.prefix, t.kind_label, t.category, t.installment && `parcela ${t.installment}`, t.bank_category && `banco: ${t.bank_category}`].filter(Boolean).join(' · ')}
                </div>
            </div>
            <span className={`flex-none rounded-full px-[9px] py-[3px] text-[12px] max-[560px]:hidden ${KIND[t.kind].className}`}>{KIND[t.kind].label}</span>
            <span className={`w-[110px] flex-none whitespace-nowrap text-right font-mono text-[13px] ${t.direction === 'in' ? 'text-accent' : ''}`}>
                {t.direction === 'in' ? '+' : '−'}{money(t.amount)}
            </span>
        </div>
    );
}

function AccountCard({ account }) {
    const [open, setOpen] = useState(true);
    const [showFuture, setShowFuture] = useState(false);
    const futureTotal = account.future.reduce((sum, t) => sum + (t.direction === 'in' ? -t.amount : t.amount), 0);
    const isCard = account.type === 'CREDIT';
    const used = isCard && account.credit_limit ? account.credit_limit - (account.available_credit_limit ?? account.credit_limit) : null;

    return (
        <Card hover={false} className="p-0">
            <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full flex-wrap items-center gap-3 px-6 py-5 text-left">
                <span className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-inset text-secondary">{isCard ? <CreditCard size={16} strokeWidth={1.75} /> : <Landmark size={16} strokeWidth={1.75} />}</span>
                <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-semibold">
                        {isCard ? 'Cartão de crédito' : 'Conta'} · {account.name}
                        {account.number && <span className="ml-2 text-[12px] font-normal text-muted">{account.number}</span>}
                    </div>
                    <div className="text-[12px] text-muted">
                        {isCard
                            ? `Limite ${money(account.credit_limit)} · usado ${money(used)}${account.bill_due_date ? ` · última fatura venceu ${fullDate(account.bill_due_date)}` : ''}`
                            : 'Saldo disponível'}
                    </div>
                </div>
                {!isCard && <span className="whitespace-nowrap text-[20px] font-semibold tracking-[-0.02em] tabular-nums">{money(account.balance)}</span>}
                <ChevronDown size={16} className={`text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="border-t border-line px-4 py-2">
                    {account.future.length > 0 && (
                        <div className="mb-1 border-b border-line pb-2">
                            <button type="button" onClick={() => setShowFuture((v) => !v)} className="flex w-full items-center gap-2 rounded-[10px] px-2 py-2.5 text-left text-[13px] text-secondary hover:bg-raised">
                                <ChevronDown size={14} className={`transition-transform ${showFuture ? 'rotate-180' : ''}`} />
                                {account.future.length} parcela(s) de faturas futuras · {money(futureTotal)} já comprometidos
                            </button>
                            {showFuture && account.future.map((t) => <TransactionLine key={t.id} t={t} />)}
                        </div>
                    )}
                    {account.transactions.length === 0 ? (
                        <p className="py-6 text-center text-[13px] text-muted">Nenhuma transação nos últimos 3 meses.</p>
                    ) : (
                        <div className="scroll-thin flex max-h-[520px] flex-col overflow-y-auto pr-1">
                            {account.transactions.map((t) => <TransactionLine key={t.id} t={t} />)}
                        </div>
                    )}
                </div>
            )}
        </Card>
    );
}

export default function OpenFinanceDetails({ item, accounts, investments }) {
    const { couple } = usePage().props;
    const [syncing, setSyncing] = useState(false);
    const owner = firstName(item.owner === 'payer2' ? couple?.payer2_name : couple?.payer1_name);

    const sync = () => {
        setSyncing(true);
        router.post(route('openFinance.items.sync', item.id), {}, { preserveScroll: true, onFinish: () => setSyncing(false) });
    };

    return (
        <AppLayout title={item.connector_name ?? 'Conexão'}>
            <div>
                <Link href={route('settings.show') + '#contas'} className="inline-flex min-h-8 items-center gap-1.5 text-[13px] font-medium text-secondary no-underline hover:text-text">
                    <ArrowLeft size={14} /> Configurações · Contas conectadas
                </Link>
            </div>

            <PageHeader
                eyebrow={`Conta de ${owner}`}
                title={item.connector_name ?? 'Conexão'}
                description={`Status ${item.status} · sincronizado ${relativeTime(item.last_synced_at)}. Os últimos 3 meses de cada conta, como ficaram classificados aqui.`}
                actions={
                    <Button type="button" variant="secondary" onClick={sync} disabled={syncing}>
                        <RefreshCw size={14} strokeWidth={2.2} className={syncing ? 'animate-spin' : ''} /> {syncing ? 'Sincronizando…' : 'Sincronizar agora'}
                    </Button>
                }
            />

            {item.last_sync_error && (
                <p className="rounded-[14px] border border-red/30 bg-red/10 px-4 py-3 text-[13px] text-red">Última sincronização falhou: {item.last_sync_error}</p>
            )}

            <section className="flex flex-col gap-4">
                <SectionLabel title="Contas" />
                {accounts.length === 0 ? (
                    <Card><p className="text-center text-[13px] text-muted">Nenhuma conta sincronizada ainda.</p></Card>
                ) : (
                    accounts.map((account) => <AccountCard key={account.id} account={account} />)
                )}
            </section>

            {investments.length > 0 && (
                <section className="flex flex-col gap-4">
                    <SectionLabel title="Investimentos" />
                    <Card hover={false}>
                        <div className="flex items-center justify-between">
                            <h2 className="flex items-center gap-2 text-[15px] font-semibold">
                                <IconBadge><TrendingUp size={16} strokeWidth={1.75} /></IconBadge> Total investido
                            </h2>
                            <span className="text-[22px] font-semibold tracking-[-0.02em] tabular-nums">{money(investments.reduce((s, i) => s + i.balance, 0))}</span>
                        </div>
                        <div className="mt-3 flex flex-col">
                            {investments.map((investment) => (
                                <div key={investment.id} className="flex items-center gap-3 border-t border-line-row py-3 first:border-t-0">
                                    <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{investment.name}</span>
                                    <span className="rounded-full bg-inset px-2 py-[2px] text-[12px] text-secondary">{investment.type}</span>
                                    <span className="w-[120px] whitespace-nowrap text-right font-mono text-[13px]">{money(investment.balance)}</span>
                                </div>
                            ))}
                        </div>
                    </Card>
                </section>
            )}
        </AppLayout>
    );
}
