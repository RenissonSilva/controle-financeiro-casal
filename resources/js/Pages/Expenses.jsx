import AppLayout from '@/Layouts/AppLayout';
import Card from '@/Components/ui/Card';
import Button from '@/Components/ui/Button';
import PageHeader from '@/Components/ui/PageHeader';
import SectionLabel from '@/Components/ui/SectionLabel';
import Segmented from '@/Components/ui/Segmented';
import CycleSwitcher from '@/Components/ui/CycleSwitcher';
import SaveBar from '@/Components/ui/SaveBar';
import IconBadge from '@/Components/ui/IconBadge';
import ExpenseRow from '@/Components/expenses/ExpenseRow';
import ExpenseModal from '@/Components/expenses/ExpenseModal';
import ExportPdfModal from '@/Components/expenses/ExportPdfModal';
import { router, usePage } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight, FileDown, Plus, RefreshCw, Search, Sparkles, Users, Wallet, PieChart, X } from 'lucide-react';
import { firstName, money, monthLabel, parseDate, percent, relativeTime } from '@/lib/format';
import { OWNERSHIP_BADGE, ownershipOptions } from '@/lib/ownership';

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

export default function Expenses({ cycle, availableMonths, rows, summary, categories, fixedExpenses, lastSyncedAt, hasConnection }) {
    const { couple } = usePage().props;
    const partner = firstName(couple?.payer2_name);
    const me = firstName(couple?.payer1_name);

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
        expense: rows.filter((r) => r.kind === 'expense').length,
        income: rows.filter((r) => r.kind === 'income').length,
        settlement: rows.filter((r) => r.kind === 'settlement').length,
        ignored: rows.filter((r) => r.kind === 'ignored').length,
        all: rows.length,
        uncategorized: rows.filter((r) => r.kind === 'expense' && !r.category_id).length,
    }), [rows]);

    const visible = useMemo(() => {
        const term = search.trim().toLowerCase();
        return withDrafts.filter((r) => {
            if (type !== 'all' && r.kind !== type) return false;
            if (owner !== 'all' && (r.kind !== 'expense' || r.ownership !== owner)) return false;
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
                eyebrow="Mês financeiro"
                title="Lançamentos"
                description="Tudo que entrou e saiu no mês. Ajuste categoria e quem paga — o rateio e o acerto são recalculados na hora."
                actions={<CycleSwitcher cycle={cycle} routeName="expenses.index" />}
            />

            {/* Resumo do mês */}
            <section className="flex flex-wrap items-stretch gap-[clamp(14px,1.6vw,20px)]">
                <Card className="flex flex-[1.4_1_320px] flex-col gap-3.5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <IconBadge><Users size={13} strokeWidth={2.2} className="stroke-strong-accent" /></IconBadge>
                            <span className="text-[13px] font-semibold tracking-[-.01em]">Total do casal</span>
                        </div>
                        <span className="font-heading text-[19px] font-semibold tracking-[-.02em]">{money(split.total)}</span>
                    </div>
                    <div className="flex h-2 overflow-hidden rounded-full bg-text/8">
                        <div className="bg-green/85" style={{ width: `${(split.payer1_total / shareTotal) * 100}%` }} />
                        <div className="flex-1 bg-red/85" />
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-[12px]">
                        {[
                            { name: me, total: split.payer1_total, individual: split.payer1_individual, shared: split.payer1_shared, pct: couple?.payer1_percent, dot: 'bg-green' },
                            { name: partner, total: split.payer2_total, individual: split.payer2_individual, shared: split.payer2_shared, pct: couple?.payer2_percent, dot: 'bg-red' },
                        ].map((p) => (
                            <div key={p.name}>
                                <div className="flex items-center gap-1.5 text-text/60"><span className={`h-2 w-2 rounded-full ${p.dot}`} />{p.name}</div>
                                <div className="font-heading text-[16px] font-semibold tracking-[-.01em]">{money(p.total)}</div>
                                <div className="text-[11px] leading-snug text-text/45">
                                    {money(p.individual)} individuais + {money(p.shared)} ({percent(p.pct)} de "Nós")
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                <SettlementCard settlement={settlement} partner={partner} me={me} />

                <Card className="flex flex-[1_1_240px] flex-col justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <IconBadge><Wallet size={13} strokeWidth={2.2} className="stroke-strong-accent" /></IconBadge>
                        <span className="text-[13px] font-semibold tracking-[-.01em]">Seu mês</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <div className="text-[11.5px] text-text/55">Receitas</div>
                            <div className="font-heading text-[17px] font-semibold text-green">{money(flow.income)}</div>
                        </div>
                        <div>
                            <div className="text-[11.5px] text-text/55">Sua parte</div>
                            <div className="font-heading text-[17px] font-semibold text-red">{money(flow.expenses)}</div>
                        </div>
                    </div>
                    <div className="text-[12px] text-text/50">
                        Sobra: <strong className={flow.balance >= 0 ? 'text-green' : 'text-red'}>{money(flow.balance)}</strong>
                        {flow.pending_fixed > 0 && <> · contas fixas a pagar: {money(flow.pending_fixed)}</>}
                    </div>
                </Card>

                <Card className="flex flex-[1_1_240px] flex-col gap-2.5">
                    <div className="flex items-center gap-2">
                        <IconBadge><PieChart size={13} strokeWidth={2.2} className="stroke-strong-accent" /></IconBadge>
                        <span className="text-[13px] font-semibold tracking-[-.01em]">Por categoria</span>
                    </div>
                    <div className="scroll-thin flex max-h-[120px] flex-col gap-1.5 overflow-y-auto pr-1">
                        {summary.by_category.length === 0 && <span className="text-[12px] text-text/45">Sem despesas no mês.</span>}
                        {summary.by_category.map((c) => (
                            <div key={c.name} className="flex items-center gap-2 text-[12.5px]">
                                <span className="h-2 w-2 flex-none rounded-full" style={{ background: c.color }} />
                                <span className="min-w-0 flex-1 truncate">{c.name}</span>
                                <span className="tabular-nums text-text/70">{money(c.value)}</span>
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
                            <Button type="button" variant="secondary" onClick={() => setModal({ show: true, row: null })}>
                                <Plus size={14} strokeWidth={2.2} /> Lançamento
                            </Button>
                        </div>
                    }
                />

                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex min-w-[180px] flex-1 items-center gap-2 rounded-[10px] bg-text/[0.04] px-3 shadow-[inset_0_0_0_1px_rgb(var(--color-text-rgb)/0.1)] focus-within:shadow-[inset_0_0_0_1px_var(--color-accent)]">
                        <Search size={14} strokeWidth={1.9} className="flex-none text-text/45" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar lançamento"
                            aria-label="Buscar lançamento"
                            className="min-w-0 flex-1 border-0 bg-transparent py-[9px] text-[13.5px] text-text placeholder:text-text/40 focus:outline-none focus:ring-0"
                        />
                        {search && (
                            <button type="button" onClick={() => setSearch('')} aria-label="Limpar busca" className="text-text/45 hover:text-text">
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
                            className={`rounded-full px-3 py-[6px] text-[12px] font-medium transition-colors ${
                                onlyUncategorized ? 'bg-lime/20 text-lime shadow-[inset_0_0_0_1px_rgb(var(--color-soft-text-rgb)/0.5)]' : 'text-lime/80 shadow-[inset_0_0_0_1px_rgb(var(--color-soft-text-rgb)/0.25)] hover:bg-lime/10'
                            }`}
                        >
                            Sem categoria · {counts.uncategorized}
                        </button>
                    )}
                    <Segmented value={groupBy} onChange={setGroupBy} size="sm" options={[{ value: 'day', label: 'Por dia' }, { value: 'category', label: 'Por categoria' }]} />
                </div>

                {selectedIds.length > 0 && (
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
                            <p className="text-[13px] text-text/50">
                                {rows.length === 0 ? 'Nenhum lançamento neste mês.' : 'Nenhum lançamento com esses filtros.'}
                            </p>
                            {rows.length === 0 && (
                                <button type="button" onClick={() => setModal({ show: true, row: null })} className="mt-3 text-[13px] text-strong-accent hover:underline">
                                    Adicionar um lançamento manual
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-3 px-2 pb-2 text-[11px] uppercase tracking-[.08em] text-text/40">
                                <input
                                    type="checkbox"
                                    checked={allVisibleSelected}
                                    onChange={toggleSelectAll}
                                    aria-label="Selecionar todos"
                                    className="h-4 w-4 rounded border-text/25 bg-transparent text-teal focus:ring-teal/40 focus:ring-offset-0"
                                />
                                <span className="flex-1">{visible.length} {visible.length === 1 ? 'lançamento' : 'lançamentos'}</span>
                                {counts.uncategorized > 0 && type === 'expense' && (
                                    <button
                                        type="button"
                                        onClick={() => categorizeWithAi(rows.filter((r) => r.kind === 'expense' && !r.category_id).map((r) => r.id))}
                                        disabled={aiRunning}
                                        className="inline-flex items-center gap-1 normal-case tracking-normal text-strong-accent hover:underline disabled:opacity-50"
                                    >
                                        <Sparkles size={12} /> {aiRunning ? 'Categorizando…' : `Categorizar ${counts.uncategorized} com IA`}
                                    </button>
                                )}
                            </div>

                            <div className="flex flex-col gap-3">
                                {groups.map((group) => (
                                    <div key={group.key}>
                                        <GroupHeader
                                            group={group}
                                            groupBy={groupBy}
                                            couple={couple}
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
                rows={rows}
                onClose={() => setModal({ show: false, row: null })}
                couple={couple}
                categories={categories}
                fixedExpenses={fixedExpenses}
                defaultDate={defaultDate}
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

function GroupHeader({ group, groupBy, couple, onOwnershipAll }) {
    const hasExpenses = group.items.some((r) => r.kind === 'expense');

    return (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-2 pb-1 pt-1.5">
            <span className="text-[12px] font-semibold text-text/70">{groupBy === 'day' ? dayHeader(group.key) : group.key}</span>
            <span className="text-[11.5px] text-text/40">
                {group.items.length} · {money(group.total)}
            </span>
            {groupBy === 'category' && hasExpenses && (
                <div className="ml-auto flex items-center gap-1 text-[11px] text-text/40">
                    Todos:
                    {ownershipOptions(couple).map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => onOwnershipAll(option.value)}
                            className={`rounded-full px-2 py-[2px] font-medium transition-[filter] hover:brightness-125 ${OWNERSHIP_BADGE[option.value]}`}
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
        <div className="flex flex-wrap items-center gap-2.5 rounded-[14px] bg-teal/12 px-3.5 py-2.5 shadow-[inset_0_0_0_1px_rgb(var(--color-accent-rgb)/0.35)]">
            <span className="text-[13px] font-medium">{count} selecionado{count > 1 ? 's' : ''}</span>
            <select
                defaultValue=""
                onChange={(e) => { if (e.target.value !== '') onCategory(e.target.value === 'none' ? null : Number(e.target.value)); e.target.value = ''; }}
                aria-label="Definir categoria"
                className="rounded-[8px] border-0 bg-text/8 py-1.5 pl-2.5 pr-8 text-[12.5px] text-text focus:ring-1 focus:ring-teal/50"
            >
                <option value="" className="bg-surface">Definir categoria…</option>
                <option value="none" className="bg-surface">Sem categoria</option>
                {categories.map((c) => <option key={c.id} value={c.id} className="bg-surface">{c.name}</option>)}
            </select>
            <div className="flex items-center gap-1 text-[12px] text-text/60">
                Quem paga:
                {ownershipOptions(couple).map((option) => (
                    <button key={option.value} type="button" onClick={() => onOwnership(option.value)} className={`rounded-full px-2.5 py-1 text-[11.5px] font-medium hover:brightness-125 ${OWNERSHIP_BADGE[option.value]}`}>
                        {option.label}
                    </button>
                ))}
            </div>
            <Button type="button" variant="ghost" onClick={onAi} disabled={aiRunning}>
                <Sparkles size={14} strokeWidth={2.2} /> {aiRunning ? 'Categorizando…' : 'Categorizar com IA'}
            </Button>
            <button type="button" onClick={onClear} className="ml-auto text-[12px] text-text/55 hover:text-text">Limpar seleção</button>
        </div>
    );
}

function SettlementCard({ settlement, partner, me }) {
    const due = settlement.due;
    const owes = due > 0.009 ? `${partner} te deve` : due < -0.009 ? `Você deve a ${partner}` : 'Tudo acertado';

    return (
        <Card className="flex flex-[1.2_1_280px] flex-col gap-3">
            <div className="flex items-center gap-2">
                <IconBadge><ArrowLeftRight size={13} strokeWidth={2.2} className="stroke-strong-accent" /></IconBadge>
                <span className="text-[13px] font-semibold tracking-[-.01em]">Acerto com {partner}</span>
            </div>
            <div>
                <div className="text-[11.5px] text-text/55">{owes}</div>
                <div className={`font-heading text-[24px] font-medium tracking-[-.02em] ${due < -0.009 ? 'text-red' : ''}`}>{money(Math.abs(due))}</div>
            </div>
            <div className="text-[12px] leading-relaxed text-text/50">
                Parte de {partner} no que {me} pagou neste mês e nas contas fixas do próximo, menos a parte de {me} no que {partner} pagou.
            </div>
        </Card>
    );
}
