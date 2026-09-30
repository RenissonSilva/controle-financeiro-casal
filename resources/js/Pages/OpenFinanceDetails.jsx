import AppLayout from '@/Layouts/AppLayout';
import Card from '@/Components/ui/Card';
import Button from '@/Components/ui/Button';
import PageHeader from '@/Components/ui/PageHeader';
import SectionLabel from '@/Components/ui/SectionLabel';
import IconBadge from '@/Components/ui/IconBadge';
import { Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { ArrowLeft, ChevronDown, CreditCard, Landmark, RefreshCw, TrendingUp } from 'lucide-react';
import { dayMonth, firstName, fullDate, money, relativeTime } from '@/lib/format';

const KIND = {
    expense: { label: 'Despesa', className: 'bg-text/8 text-text/70' },
    income: { label: 'Receita', className: 'bg-green/16 text-green' },
    settlement: { label: 'Acerto', className: 'bg-teal/16 text-strong-accent' },
    ignored: { label: 'Ignorado', className: 'bg-text/6 text-text/45' },
};

function TransactionLine({ t }) {
    return (
        <div className="flex items-center gap-3 rounded-[10px] px-2 py-2 hover:bg-text/5">
            <span className="w-[42px] flex-none text-xs tabular-nums text-text/50">{dayMonth(t.date)}</span>
            <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium">{t.name}</div>
                <div className="truncate text-[11px] text-text/45">
                    {[t.prefix, t.kind_label, t.category, t.installment && `parcela ${t.installment}`, t.bank_category && `banco: ${t.bank_category}`].filter(Boolean).join(' · ')}
                </div>
            </div>
            <span className={`flex-none rounded-full px-2 py-[2px] text-[10.5px] font-medium ${KIND[t.kind].className}`}>{KIND[t.kind].label}</span>
            <span className={`w-[110px] flex-none text-right text-[13px] font-semibold tabular-nums ${t.direction === 'in' ? 'text-green' : ''}`}>
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
            <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full flex-wrap items-center gap-3 px-5 py-4 text-left">
                <IconBadge>{isCard ? <CreditCard size={13} strokeWidth={2.2} className="stroke-strong-accent" /> : <Landmark size={13} strokeWidth={2.2} className="stroke-strong-accent" />}</IconBadge>
                <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-semibold">
                        {isCard ? 'Cartão de crédito' : 'Conta'} · {account.name}
                        {account.number && <span className="ml-2 text-[12px] font-normal text-text/45">{account.number}</span>}
                    </div>
                    <div className="text-[11.5px] text-text/45">
                        {isCard
                            ? `Limite ${money(account.credit_limit)} · usado ${money(used)}${account.bill_due_date ? ` · última fatura venceu ${fullDate(account.bill_due_date)}` : ''}`
                            : 'Saldo disponível'}
                    </div>
                </div>
                {!isCard && <span className="font-heading text-[18px] font-semibold tracking-[-.02em]">{money(account.balance)}</span>}
                <ChevronDown size={16} className={`text-text/45 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="border-t border-text/8 px-3 py-2">
                    {account.future.length > 0 && (
                        <div className="mb-1 border-b border-text/8 pb-2">
                            <button type="button" onClick={() => setShowFuture((v) => !v)} className="flex w-full items-center gap-2 rounded-[10px] px-2 py-2 text-left text-[12.5px] text-text/60 hover:bg-text/5">
                                <ChevronDown size={14} className={`transition-transform ${showFuture ? 'rotate-180' : ''}`} />
                                {account.future.length} parcela(s) de faturas futuras · {money(futureTotal)} já comprometidos
                            </button>
                            {showFuture && account.future.map((t) => <TransactionLine key={t.id} t={t} />)}
                        </div>
                    )}
                    {account.transactions.length === 0 ? (
                        <p className="py-6 text-center text-[12.5px] text-text/45">Nenhuma transação nos últimos 3 meses.</p>
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
                <Link href={route('settings.show') + '#contas'} className="inline-flex items-center gap-1.5 text-[12.5px] text-text/55 hover:text-text">
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
                <p className="rounded-[12px] bg-red/10 px-4 py-3 text-[13px] text-red">Última sincronização falhou: {item.last_sync_error}</p>
            )}

            <section className="flex flex-col gap-4">
                <SectionLabel title="Contas" />
                {accounts.length === 0 ? (
                    <Card><p className="text-center text-[13px] text-text/50">Nenhuma conta sincronizada ainda.</p></Card>
                ) : (
                    accounts.map((account) => <AccountCard key={account.id} account={account} />)
                )}
            </section>

            {investments.length > 0 && (
                <section className="flex flex-col gap-4">
                    <SectionLabel title="Investimentos" />
                    <Card hover={false}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <IconBadge><TrendingUp size={13} strokeWidth={2.2} className="stroke-strong-accent" /></IconBadge>
                                <span className="text-[13px] font-semibold">Total investido</span>
                            </div>
                            <span className="font-heading text-[18px] font-semibold">{money(investments.reduce((s, i) => s + i.balance, 0))}</span>
                        </div>
                        <div className="mt-3 flex flex-col">
                            {investments.map((investment) => (
                                <div key={investment.id} className="flex items-center gap-3 rounded-[10px] px-2 py-2 hover:bg-text/5">
                                    <span className="min-w-0 flex-1 truncate text-[13px]">{investment.name}</span>
                                    <span className="text-[11.5px] text-text/45">{investment.type}</span>
                                    <span className="w-[120px] text-right text-[13px] font-semibold tabular-nums">{money(investment.balance)}</span>
                                </div>
                            ))}
                        </div>
                    </Card>
                </section>
            )}
        </AppLayout>
    );
}
