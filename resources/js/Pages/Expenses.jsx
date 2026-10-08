import AppLayout from '@/Layouts/AppLayout';
import Card from '@/Components/ui/Card';
import Button from '@/Components/ui/Button';
import PageHeader from '@/Components/ui/PageHeader';
import SectionLabel from '@/Components/ui/SectionLabel';
import Segmented from '@/Components/ui/Segmented';
import CycleSwitcher from '@/Components/ui/CycleSwitcher';
import SaveBar from '@/Components/ui/SaveBar';
import IconBadge from '@/Components/ui/IconBadge';
import ReadOnlyBadge from '@/Components/ui/ReadOnlyBadge';
import ExpenseRow from '@/Components/expenses/ExpenseRow';
import ExpenseModal from '@/Components/expenses/ExpenseModal';
import ExportPdfModal from '@/Components/expenses/ExportPdfModal';
import { Link, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight, ChevronRight, FileDown, Plus, RefreshCw, Search, Sparkles, Users, Wallet, PieChart, X } from 'lucide-react';
import { firstName, money, monthLabel, parseDate, percent, relativeTime } from '@/lib/format';
import { OWNERSHIP_BADGE, ownershipOptions } from '@/lib/ownership';
import { useCan } from '@/lib/access';

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

// '2026-09-10' → 'Qui, 10 de set'
const dayHeader = (date) => {
    const d = parseDate(date);
    const weekday = WEEKDAYS[d.getDay()];
    return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
};

// Valor com sinal para somas de "despesa líquida" (estorno abate).
const expenseValue = (row) => (row.kind !== 'expense' ? 0 : row.direction === 'in' ? -row.amount : row.amount);

// Aba do lançamento. O que você ignorou continua na aba de onde saiu (apagado, sem somar);
// os ignorados automáticos (fatura, aplicação, entre contas) e por regra ficam só em "Ignorados".
const tabOf = (row) => (row.kind === 'ignored' && row.kind_reason === 'user' ? (row.direction === 'in' ? 'income' : 'expense') : row.kind);

export default function Expenses({ cycle, availableMonths, rows, summary, categories, fixedExpenses, lastSyncedAt, hasConnection }) {
    const { couple } = usePage().props;
    const partner = firstName(couple?.payer2_name);
    const me = firstName(couple?.payer1_name);
    const can = useCan();
    const canEdit = can('expenses.edit');
    const canDelete = can('expenses.delete');

    const [drafts, setDrafts] = useState({});
    const [selected, setSelected] = useState(() => new Set());
    const [type, setType] = useState('expense');
    const [owner, setOwner] = useState('all');
    const [search, setSearch] = useState('');
    const [onlyUncategorized, setOnlyUncategorized] = useState(false);
    const [groupBy, setGroupBy] = useState('day');
    const [modal, setModal] = useState({ show: false, row: null });
    const [exportOpen, setExportOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [aiRunning, setAiRunning] = useState(false);

    // Vindo do Dashboard ("Novo lançamento" / "Registrar acerto"): abre o modal já no tipo certo.
    useEffect(() => {
        const url = new URL(window.location.href);
        const intent = url.searchParams.get('new');
        if (!intent) return;
        if (canEdit) setModal({ show: true, row: null, kind: intent === 'settlement' ? 'settlement' : 'expense' });
        url.searchParams.delete('new');
        window.history.replaceState(window.history.state, '', url);
    }, []);

    // Mudou de mês: descarta rascunho e seleção.
    useEffect(() => {
        setDrafts({});
        setSelected(new Set());
    }, [cycle.month]);

    // Linhas novas do servidor: mantém só a seleção que ainda existe.
    useEffect(() => {
        setSelected((prev) => new Set([...prev].filter((id) => rows.some((r) => r.id === id))));
    }, [rows]);

    const withDrafts = useMemo(() => rows.map((r) => (drafts[r.id] ? { ...r, ...drafts[r.id] } : r)), [rows, drafts]);

    const counts = useMemo(() => ({
        expense: rows.filter((r) => tabOf(r) === 'expense').length,
        income: rows.filter((r) => tabOf(r) === 'income').length,
        settlement: rows.filter((r) => r.kind === 'settlement').length,
        ignored: rows.filter((r) => r.kind === 'ignored').length,
        all: rows.length,
        uncategorized: rows.filter((r) => r.kind === 'expense' && !r.category_id).length,
    }), [rows]);

    const visible = useMemo(() => {
        const term = search.trim().toLowerCase();
        return withDrafts.filter((r) => {
            if (type !== 'all' && r.kind !== type && tabOf(r) !== type) return false;
            if (owner !== 'all' && (tabOf(r) !== 'expense' || r.ownership !== owner)) return false;
            if (onlyUncategorized && (r.kind !== 'expense' || r.category_id)) return false;
            if (term && !`${r.name} ${r.description} ${r.notes ?? ''} ${r.category ?? ''}`.toLowerCase().includes(term)) return false;
            return true;
        });
    }, [withDrafts, type, owner, onlyUncategorized, search]);

    const groups = useMemo(() => {
        const map = new Map();
        const categoryName = (r) => {
            if (r.kind === 'income') return 'Receitas';
            if (r.kind === 'settlement') return `Acertos com ${partner}`;
            if (r.kind === 'ignored') return 'Ignorados';
            return categories.find((c) => c.id === r.category_id)?.name ?? 'Sem categoria';
        };

        visible.forEach((r) => {
            const key = groupBy === 'day' ? r.date : categoryName(r);
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(r);
        });

        const list = [...map.entries()].map(([key, items]) => ({ key, items, total: items.reduce((s, r) => s + expenseValue(r), 0) }));
        return groupBy === 'day' ? list : list.sort((a, b) => b.total - a.total);
    }, [visible, groupBy, categories, partner]);

    // ---- Rascunho de categoria/quem paga ----
    const changeRow = (row, patch) => {
        const original = rows.find((r) => r.id === row.id);
        setDrafts((prev) => {
            const next = { ...(prev[row.id] || {}), ...patch };
            const unchanged = Object.keys(next).every((k) => next[k] === original[k]);
            const copy = { ...prev };
            if (unchanged) delete copy[row.id];
            else copy[row.id] = next;
            return copy;
        });
    };

    const applyToMany = (ids, patch) => ids.forEach((id) => changeRow({ id }, patch));

    const saveDrafts = () => {
        const expenses = Object.keys(drafts).map((id) => {
            const row = withDrafts.find((r) => r.id === Number(id));
            return { id: row.id, category_id: row.category_id, ownership: row.ownership };
        });
        setSaving(true);
        router.post(route('expenses.batch'), { expenses }, {
            preserveScroll: true,
            onSuccess: () => setDrafts({}),
            onFinish: () => setSaving(false),
        });
    };

    // ---- Seleção ----
    const toggleSelect = (id) => setSelected((prev) => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });
    const allVisibleSelected = visible.length > 0 && visible.every((r) => selected.has(r.id));
    const toggleSelectAll = () => setSelected(allVisibleSelected ? new Set() : new Set(visible.map((r) => r.id)));
    const selectedIds = [...selected];

    const categorizeWithAi = async (ids) => {
        if (!ids.length) return;
        setAiRunning(true);
        try {
            await axios.post(route('expenses.categorize'), { ids });
            setSelected(new Set());
            router.reload({ only: ['rows', 'summary'] });
        } finally {
            setAiRunning(false);
        }
    };

    const sync = () => {
        setSyncing(true);
        router.post(route('openFinance.sync'), {}, { preserveScroll: true, onFinish: () => setSyncing(false) });
    };

    const toggleIgnore = (row) => router.post(route('expenses.toggleIgnore', row.id), {}, { preserveScroll: true });
    const destroy = (row) => {
        if (confirm(`Excluir "${row.name}"? Esta ação não pode ser desfeita.`)) {
            router.delete(route('expenses.destroy', row.id), { preserveScroll: true });
        }
    };

    const split = summary.split;
    const flow = summary.cash_flow;
    const settlement = summary.settlement;
    const shareTotal = split.payer1_total + split.payer2_total || 1;
    const defaultDate = cycle.is_current ? new Date().toISOString().slice(0, 10) : cycle.start;

    return (
        <AppLayout title="Lançamentos">
            <PageHeader
                title="Lançamentos"
                description="Tudo que entrou e saiu no mês. Ajuste categoria e quem paga — o rateio e o acerto são recalculados na hora."
                actions={
                    <>
                        <CycleSwitcher cycle={cycle} routeName="expenses.index" />
                        {canEdit ? (
                            <Button type="button" variant="primary" onClick={() => setModal({ show: true, row: null })} className="max-[560px]:flex-1">
                                <Plus size={14} strokeWidth={2.2} /> Novo lançamento
                            </Button>
                        ) : (
                            <ReadOnlyBadge />
                        )}
                    </>
                }
            />

            {/* Resumo do mês */}
            <section className="grid grid-cols-2 items-stretch gap-5 max-[640px]:grid-cols-1 min-[1600px]:grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]">
                <Card className="flex flex-col gap-4">
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="flex items-center gap-2 text-[15px] font-semibold">
                            <IconBadge><Users /></IconBadge> Total do casal
                        </h2>
                        <span className="text-[20px] font-semibold tracking-[-0.02em] tabular-nums">{money(split.total)}</span>
                    </div>
                    <div className="flex h-3 gap-[3px]">
                        <div className="rounded-[3px] bg-person1" style={{ flex: `${(split.payer1_total / shareTotal) * 100} 1 0` }} />
                        <div className="rounded-[3px] bg-person2" style={{ flex: `${(split.payer2_total / shareTotal) * 100} 1 0` }} />
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-[13px]">
                        {[
                            { name: me, total: split.payer1_total, individual: split.payer1_individual, shared: split.payer1_shared, pct: couple?.payer1_percent, dot: 'bg-person1' },
                            { name: partner, total: split.payer2_total, individual: split.payer2_individual, shared: split.payer2_shared, pct: couple?.payer2_percent, dot: 'bg-person2' },
                        ].map((p) => (
                            <div key={p.name} className="min-w-0">
                                <div className="flex items-center gap-2 text-muted"><span className={`h-2 w-2 rounded-[2px] ${p.dot}`} />{p.name}</div>
                                <div className="mt-0.5 text-[17px] font-semibold tracking-[-0.01em] tabular-nums">{money(p.total)}</div>
                                <div className="text-[12px] leading-snug text-muted">
                                    {money(p.individual)} individuais + {money(p.shared)} ({percent(p.pct)} de "Nós")
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                <SettlementCard settlement={settlement} partner={partner} me={me} month={cycle.month} />

                <Card className="flex flex-col justify-between gap-4">
                    <h2 className="flex items-center gap-2 text-[15px] font-semibold">
                        <IconBadge><Wallet /></IconBadge> Seu mês
                    </h2>
                    <div className="flex flex-wrap gap-x-6 gap-y-3">
                        <div>
                            <div className="text-[13px] text-muted">Receitas</div>
                            <div className="text-[18px] font-semibold tabular-nums">{money(flow.income)}</div>
                        </div>
                        <div>
                            <div className="text-[13px] text-muted">Sua parte</div>
                            <div className="text-[18px] font-semibold tabular-nums">{money(flow.expenses)}</div>
                        </div>
                    </div>
                    <div className="text-[13px] text-muted">
                        Sobra: <strong className={`font-semibold tabular-nums ${flow.balance >= 0 ? 'text-accent' : 'text-red'}`}>{flow.balance >= 0 ? '+' : '−'}{money(Math.abs(flow.balance))}</strong>
                        {flow.pending_fixed > 0 && <> · contas fixas a pagar: {money(flow.pending_fixed)}</>}
                    </div>
                </Card>

                <Card className="flex flex-col gap-3">
                    <h2 className="flex items-center gap-2 text-[15px] font-semibold">
                        <IconBadge><PieChart /></IconBadge> Por categoria
                    </h2>
                    <div className="scroll-thin -mr-2 flex max-h-[128px] flex-col overflow-y-auto pr-2">
                        {summary.by_category.length === 0 && <span className="text-[13px] text-muted">Sem despesas no mês.</span>}
                        {summary.by_category.map((c) => (
                            <div key={c.name} className="flex items-center gap-2.5 border-t border-line-soft py-[7px] text-[13px] first:border-t-0 first:pt-0">
                                <span className="h-2 w-2 flex-none rounded-[2px]" style={{ background: c.color }} />
                                <span className="min-w-0 flex-1 truncate">{c.name}</span>
                                <span className="font-mono text-[13px] text-secondary">{money(c.value)}</span>
                            </div>
                        ))}
                    </div>
                </Card>
            </section>

            {/* Lista */}
            <section className="flex flex-col gap-4">
                <SectionLabel
                    title={`${monthLabel(cycle.month)} · ${counts.all} lançamentos`}
                    action={
                        <div className="flex flex-wrap items-center gap-2">
                            {hasConnection && (
                                <Button type="button" variant="ghost" onClick={sync} disabled={syncing} title={`Última sincronização: ${relativeTime(lastSyncedAt)}`}>
                                    <RefreshCw size={14} strokeWidth={2.2} className={syncing ? 'animate-spin' : ''} />
                                    {syncing ? 'Sincronizando…' : 'Sincronizar'}
                                </Button>
                            )}
                            <Button type="button" variant="secondary" onClick={() => setExportOpen(true)}>
                                <FileDown size={14} strokeWidth={2.2} /> PDF
                            </Button>
                        </div>
                    }
                />

                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex min-w-[180px] flex-1 items-center gap-2 h-11 rounded-[10px] border border-line bg-surface px-3 focus-within:border-accent">
                        <Search size={14} strokeWidth={1.9} className="flex-none text-muted" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar lançamento"
                            aria-label="Buscar lançamento"
                            className="min-w-0 flex-1 border-0 bg-transparent py-0 text-[14px] text-text placeholder:text-muted/70 focus:outline-none focus:ring-0"
                        />
                        {search && (
                            <button type="button" onClick={() => setSearch('')} aria-label="Limpar busca" className="text-muted hover:text-text">
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    <Segmented
                        value={type}
                        onChange={setType}
                        options={[
                            { value: 'expense', label: 'Despesas', count: counts.expense },
                            { value: 'income', label: 'Receitas', count: counts.income },
                            { value: 'settlement', label: 'Acertos', count: counts.settlement },
                            { value: 'ignored', label: 'Ignorados', count: counts.ignored },
                            { value: 'all', label: 'Todos' },
                        ]}
                    />
                    <Segmented value={owner} onChange={setOwner} options={[{ value: 'all', label: 'Todos' }, ...ownershipOptions(couple)]} />
                    {counts.uncategorized > 0 && (
                        <button
                            type="button"
                            onClick={() => setOnlyUncategorized((v) => !v)}
                            aria-pressed={onlyUncategorized}
                            className={`h-9 rounded-full border px-3 text-[13px] font-medium transition-colors ${
                                onlyUncategorized ? 'border-warning/50 bg-warning/14 text-warning' : 'border-warning/25 text-warning/85 hover:bg-warning/8'
                            }`}
                        >
                            Sem categoria · {counts.uncategorized}
                        </button>
                    )}
                    <Segmented value={groupBy} onChange={setGroupBy} size="sm" options={[{ value: 'day', label: 'Por dia' }, { value: 'category', label: 'Por categoria' }]} />
                </div>

                {canEdit && selectedIds.length > 0 && (
                    <BulkBar
                        count={selectedIds.length}
                        categories={categories}
                        couple={couple}
                        aiRunning={aiRunning}
                        onCategory={(categoryId) => applyToMany(selectedIds.filter((id) => rows.find((r) => r.id === id)?.kind === 'expense'), { category_id: categoryId })}
                        onOwnership={(ownership) => applyToMany(selectedIds.filter((id) => rows.find((r) => r.id === id)?.kind === 'expense'), { ownership })}
                        onAi={() => categorizeWithAi(selectedIds)}
                        onClear={() => setSelected(new Set())}
                    />
                )}

                <Card hover={false} className="p-3">
                    {visible.length === 0 ? (
                        <div className="py-14 text-center">
                            <p className="text-[13px] text-muted">
                                {rows.length === 0 ? 'Nenhum lançamento neste mês.' : 'Nenhum lançamento com esses filtros.'}
                            </p>
                            {rows.length === 0 && canEdit && (
                                <button type="button" onClick={() => setModal({ show: true, row: null })} className="mt-3 text-[13px] font-medium text-secondary underline-offset-2 hover:text-text hover:underline">
                                    Adicionar um lançamento manual
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-3 border-b border-line px-2 pb-2.5 text-[12px] font-medium text-muted">
                                {canEdit && (
                                    <input
                                        type="checkbox"
                                        checked={allVisibleSelected}
                                        onChange={toggleSelectAll}
                                        aria-label="Selecionar todos"
                                        className="h-4 w-4 rounded border-line-strong bg-transparent text-accent focus:ring-accent/40 focus:ring-offset-0"
                                    />
                                )}
                                <span className="flex-1">{visible.length} {visible.length === 1 ? 'lançamento' : 'lançamentos'}</span>
                                {canEdit && counts.uncategorized > 0 && type === 'expense' && (
                                    <button
                                        type="button"
                                        onClick={() => categorizeWithAi(rows.filter((r) => r.kind === 'expense' && !r.category_id).map((r) => r.id))}
                                        disabled={aiRunning}
                                        className="inline-flex items-center gap-1.5 text-secondary hover:text-text disabled:opacity-50"
                                    >
                                        <Sparkles size={13} className="text-accent" /> {aiRunning ? 'Categorizando…' : `Categorizar ${counts.uncategorized} com IA`}
                                    </button>
                                )}
                            </div>

                            <div className="mt-1 flex flex-col gap-3">
                                {groups.map((group) => (
                                    <div key={group.key}>
                                        <GroupHeader
                                            group={group}
                                            groupBy={groupBy}
                                            couple={couple}
                                            canEdit={canEdit}
                                            onOwnershipAll={(ownership) => applyToMany(group.items.filter((r) => r.kind === 'expense').map((r) => r.id), { ownership })}
                                        />
                                        <div className="flex flex-col">
                                            {group.items.map((row) => (
                                                <ExpenseRow
                                                    key={row.id}
                                                    row={row}
                                                    couple={couple}
                                                    categories={categories}
                                                    showDate={groupBy !== 'day'}
                                                    selected={selected.has(row.id)}
                                                    onToggleSelect={() => toggleSelect(row.id)}
                                                    onChange={(patch) => changeRow(row, patch)}
                                                    onEdit={() => setModal({ show: true, row: rows.find((r) => r.id === row.id) })}
                                                    onToggleIgnore={() => toggleIgnore(row)}
                                                    onDelete={() => destroy(row)}
                                                    canEdit={canEdit}
                                                    canDelete={canDelete}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </Card>
            </section>

            <SaveBar count={Object.keys(drafts).length} saving={saving} onSave={saveDrafts} onDiscard={() => setDrafts({})} />

            <ExpenseModal
                show={modal.show}
                row={modal.row}
                initialKind={modal.kind}
                rows={rows}
                onClose={() => setModal({ show: false, row: null })}
                couple={couple}
                categories={categories}
                fixedExpenses={fixedExpenses}
                defaultDate={defaultDate}
                readOnly={!canEdit}
            />

            <ExportPdfModal
                show={exportOpen}
                onClose={() => setExportOpen(false)}
                availableMonths={availableMonths}
                currentMonth={cycle.month}
                couple={couple}
            />
        </AppLayout>
    );
}

function GroupHeader({ group, groupBy, couple, canEdit, onOwnershipAll }) {
    const hasExpenses = canEdit && group.items.some((r) => r.kind === 'expense');

    return (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-2 pb-1 pt-2">
            <span className="text-[13px] font-semibold text-secondary">{groupBy === 'day' ? dayHeader(group.key) : group.key}</span>
            <span className="font-mono text-[12px] text-muted">
                {group.items.length} · {money(group.total)}
            </span>
            {groupBy === 'category' && hasExpenses && (
                <div className="ml-auto flex items-center gap-1 text-[12px] text-muted">
                    Todos:
                    {ownershipOptions(couple).map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => onOwnershipAll(option.value)}
                            className={`rounded-full px-2.5 py-[2px] font-medium transition-[filter] hover:brightness-125 ${OWNERSHIP_BADGE[option.value]}`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function BulkBar({ count, categories, couple, aiRunning, onCategory, onOwnership, onAi, onClear }) {
    return (
        <div className="flex flex-wrap items-center gap-2.5 rounded-[14px] border border-line-strong bg-raised px-4 py-2.5">
            <span className="text-[14px] font-medium">{count} selecionado{count > 1 ? 's' : ''}</span>
            <select
                defaultValue=""
                onChange={(e) => { if (e.target.value !== '') onCategory(e.target.value === 'none' ? null : Number(e.target.value)); e.target.value = ''; }}
                aria-label="Definir categoria"
                className="h-9 rounded-[8px] border border-line-strong bg-bg py-0 pl-2.5 pr-8 text-[13px] text-text focus:border-accent focus:ring-0"
            >
                <option value="" className="bg-surface">Definir categoria…</option>
                <option value="none" className="bg-surface">Sem categoria</option>
                {categories.map((c) => <option key={c.id} value={c.id} className="bg-surface">{c.name}</option>)}
            </select>
            <div className="flex items-center gap-1 text-[13px] text-muted">
                Quem paga:
                {ownershipOptions(couple).map((option) => (
                    <button key={option.value} type="button" onClick={() => onOwnership(option.value)} className={`rounded-full px-2.5 py-1 text-[12px] font-medium hover:brightness-125 ${OWNERSHIP_BADGE[option.value]}`}>
                        {option.label}
                    </button>
                ))}
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={onAi} disabled={aiRunning}>
                <Sparkles size={14} strokeWidth={2.2} className="text-accent" /> {aiRunning ? 'Categorizando…' : 'Categorizar com IA'}
            </Button>
            <button type="button" onClick={onClear} className="ml-auto text-[13px] text-muted hover:text-text">Limpar seleção</button>
        </div>
    );
}

function SettlementCard({ settlement, partner, me, month }) {
    const due = settlement.due;
    const owes = due > 0.009 ? `${partner} te deve` : due < -0.009 ? `Você deve a ${partner}` : 'Tudo acertado';

    return (
        <Card bg={false} className="flex flex-col gap-3 border border-accent bg-accent text-on-accent">
            <div className="flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-[14px] font-semibold">
                    <ArrowLeftRight size={14} strokeWidth={2} /> Acerto com {partner}
                </h2>
                <Link href={route('settlement.index', { month })} className="inline-flex min-h-8 items-center gap-1 text-[13px] font-semibold text-on-accent no-underline hover:opacity-80">
                    Detalhes <ChevronRight size={14} strokeWidth={2} />
                </Link>
            </div>
            <div>
                <div className="text-[14px] text-on-accent-2">{owes}</div>
                <div className="text-[32px] font-semibold leading-[1.1] tracking-[-0.03em] tabular-nums">{money(Math.abs(due))}</div>
            </div>
            <div className="text-[13px] leading-[1.45] text-on-accent-2">
                Parte de {partner} no que {me} pagou neste mês e nas contas fixas do próximo, menos a parte de {me} no que {partner} pagou.
            </div>
        </Card>
    );
}
