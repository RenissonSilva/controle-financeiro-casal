import AppLayout from '@/Layouts/AppLayout';
import Card from '@/Components/ui/Card';
import SectionHeader from '@/Components/ui/SectionHeader';
import Button from '@/Components/ui/Button';
import Modal from '@/Components/ui/Modal';
import Field from '@/Components/ui/Field';
import Select from '@/Components/ui/Select';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Wallet, CreditCard, Tag, ListFilter, Plus, Pencil, Trash2, RefreshCw,
    Search, Minus, Check, Clock,
} from 'lucide-react';

const OWNERSHIP_BADGE = {
    payer1: 'bg-green/16 text-green',
    payer2: 'bg-red/16 text-red',
    both:   'bg-teal/16 text-strong-accent',
};
const OWNERSHIP_CYCLE = ['both', 'payer1', 'payer2'];
const PALETA = ['#f0a04b', '#e2703a', '#5ec1e0', '#a78bfa', '#43c39a', '#8fa3b0', '#f0576b', '#dcee8e', '#43a9ab', '#c9a0dc'];
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const REF_SALARIO = 1000;
const EMPTY_RULE = { pattern: '', amount: '', category_id: '', ownership: 'both' };

const pad2 = (n) => String(n).padStart(2, '0');
const fmt = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const firstName = (name) => (name || '').trim().split(' ')[0] || '?';
const clonar = (o) => JSON.parse(JSON.stringify(o));

function cycleInfo(closingDay) {
    const day = Math.min(28, Math.max(1, Number(closingDay) || 1));
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), day);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, day - 1);
    const exampleInside = new Date(start.getFullYear(), start.getMonth(), day);
    const exampleOutside = new Date(start.getFullYear(), start.getMonth() + 1, day);
    return {
        startLabel: `${pad2(start.getDate())} ${MESES[start.getMonth()]}`,
        endLabel: `${pad2(end.getDate())} ${MESES[end.getMonth()]}`,
        exampleInsideLabel: `${pad2(exampleInside.getDate())}/${pad2(exampleInside.getMonth() + 1)}`,
        exampleOutsideLabel: `${pad2(exampleOutside.getDate())}/${pad2(exampleOutside.getMonth() + 1)}`,
    };
}

const cycleOwnership = (current) => OWNERSHIP_CYCLE[(OWNERSHIP_CYCLE.indexOf(current) + 1) % OWNERSHIP_CYCLE.length];

function buildBase(settings, categories, rules) {
    return {
        payer1_name: settings.payer1_name,
        payer2_name: settings.payer2_name,
        payer1_salary: settings.payer1_salary,
        payer2_salary: settings.payer2_salary,
        card_closing_day: settings.card_closing_day,
        categories: categories.map((c) => ({ ...c })),
        rules: rules.map((r) => ({ ...r })),
    };
}

function computeDiff(draft, base) {
    const generalKeys = ['payer1_name', 'payer2_name', 'payer1_salary', 'payer2_salary', 'card_closing_day'];
    const generalChanged = generalKeys.some((k) => String(draft[k]) !== String(base[k]));
    const generalPayload = {
        payer1_name: draft.payer1_name,
        payer2_name: draft.payer2_name,
        payer1_salary: draft.payer1_salary,
        payer2_salary: draft.payer2_salary,
        card_closing_day: draft.card_closing_day,
    };

    const baseCatById = new Map(base.categories.map((c) => [c.id, c]));
    const draftCatIds = new Set();
    const categoriesToCreate = [];
    const categoriesToUpdate = [];
    draft.categories.forEach((c) => {
        if (c.id == null) { categoriesToCreate.push(c); return; }
        draftCatIds.add(c.id);
        const b = baseCatById.get(c.id);
        if (b && (b.name !== c.name || b.color !== c.color || b.default_ownership !== c.default_ownership)) {
            categoriesToUpdate.push(c);
        }
    });
    const categoriesToDelete = base.categories.filter((c) => !draftCatIds.has(c.id));

    const baseRuleById = new Map(base.rules.map((r) => [r.id, r]));
    const draftRuleIds = new Set();
    const rulesToUpdate = [];
    draft.rules.forEach((r) => {
        draftRuleIds.add(r.id);
        const b = baseRuleById.get(r.id);
        if (b && b.ownership !== r.ownership) rulesToUpdate.push(r);
    });
    const rulesToDelete = base.rules.filter((r) => !draftRuleIds.has(r.id));

    return { generalChanged, generalPayload, categoriesToCreate, categoriesToUpdate, categoriesToDelete, rulesToUpdate, rulesToDelete };
}

function diffCount(diff) {
    return (diff.generalChanged ? 1 : 0)
        + diff.categoriesToCreate.length + diff.categoriesToUpdate.length + diff.categoriesToDelete.length
        + diff.rulesToUpdate.length + diff.rulesToDelete.length;
}

// Só regras têm um caminho de mutação externa ao rascunho (o RuleModal salva na
// hora). Ao chegarem props novas, preserva o "trocar dono" pendente do usuário
// em vez de sobrescrever com o valor antigo do servidor.
function reconcileRules(freshRules, oldBaseRules, draftRules) {
    const oldById = new Map(oldBaseRules.map((r) => [r.id, r]));
    const draftById = new Map(draftRules.map((r) => [r.id, r]));
    const result = [];
    freshRules.forEach((fresh) => {
        const old = oldById.get(fresh.id);
        if (!old) { result.push({ ...fresh }); return; }
        const inDraft = draftById.get(fresh.id);
        if (!inDraft) return;
        const ownershipChangedLocally = inDraft.ownership !== old.ownership;
        result.push({ ...fresh, ownership: ownershipChangedLocally ? inDraft.ownership : fresh.ownership });
    });
    return result;
}

// ─── Modal de criação/edição de regra ─────────────────────────────────────────
function RuleModal({ rule, show, categories, ownershipOptions, onClose }) {
    const isEditing = Boolean(rule);
    const { data, setData, post, put, processing, errors } = useForm(
        rule
            ? { pattern: rule.pattern, amount: rule.amount ?? '', category_id: rule.category_id, ownership: rule.ownership }
            : EMPTY_RULE
    );

    const submit = (e) => {
        e.preventDefault();
        const options = { preserveScroll: true, onSuccess: onClose };
        if (isEditing) {
            put(route('categorizationRules.update', rule.id), options);
        } else {
            post(route('categorizationRules.store'), options);
        }
    };

    return (
        <Modal show={show} onClose={onClose} title={isEditing ? 'Editar regra' : 'Nova regra'}>
            <form onSubmit={submit} className="flex flex-col gap-4">
                <Field
                    label="Trecho da descrição"
                    autoFocus
                    value={data.pattern}
                    onChange={(e) => setData('pattern', e.target.value)}
                    placeholder="Ex: hbomax"
                    error={errors.pattern}
                />
                <p className="-mt-2 text-[11.5px] text-text/45">
                    Aplica quando a descrição da despesa contiver esse trecho, em qualquer posição.
                </p>

                <Field
                    label="Valor (R$)"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={data.amount}
                    onChange={(e) => setData('amount', e.target.value)}
                    placeholder="Opcional — em branco vale para qualquer valor"
                    error={errors.amount}
                />

                <Select
                    label="Categoria"
                    value={data.category_id}
                    onChange={(e) => setData('category_id', e.target.value)}
                    options={[{ value: '', label: '— Selecione —' }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
                    error={errors.category_id}
                />

                <Select
                    label="Pagador"
                    value={data.ownership}
                    onChange={(e) => setData('ownership', e.target.value)}
                    options={ownershipOptions}
                    error={errors.ownership}
                />

                <div className="mt-1 flex justify-end gap-2.5">
                    <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" variant="secondary" disabled={processing}>
                        {processing ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar regra'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

// ─── Card de pagador (avatar + nome editável + renda + cota) ──────────────────
function PayerCard({ name, onNameChange, salary, onSalaryChange, percentLabel, avatarClass, percentClass, cotaLabel, cotaValue, error }) {
    const initial = (name.trim()[0] || '?').toUpperCase();
    return (
        <div className="rounded-[14px] bg-text/[0.04] p-4 shadow-[inset_0_0_0_1px_rgb(var(--color-text-rgb)/0.08)]">
            <div className="flex items-center gap-2.5">
                <div className={`grid h-8 w-8 flex-none place-items-center rounded-full text-[12.5px] font-semibold ${avatarClass}`}>
                    {initial}
                </div>
                <input
                    value={name}
                    onChange={onNameChange}
                    aria-label="Nome do pagador"
                    className="-ml-2 min-w-0 flex-1 rounded-lg border-0 bg-transparent px-2 py-1.5 font-heading text-[16px] font-medium tracking-[-.01em] text-text transition-colors hover:bg-text/6 focus:bg-text/8 focus:outline-none"
                />
                <div className={`flex-none text-right font-heading text-[19px] font-medium tracking-[-.02em] tabular-nums ${percentClass}`}>
                    {percentLabel}
                </div>
            </div>

            <div className="mt-4 flex flex-col gap-1.5">
                <span className="text-[12px] text-text/60">Renda mensal</span>
                <div className="flex items-center gap-1 rounded-[10px] bg-[#0c1620] px-3.5 shadow-[inset_0_0_0_1px_rgb(var(--color-accent-rgb)/0.28)] focus-within:shadow-[inset_0_0_0_1px_var(--color-accent)]">
                    <span className="text-[13px] text-text/50">R$</span>
                    <input
                        type="number" min="0" step="0.01"
                        value={salary}
                        onChange={onSalaryChange}
                        aria-label="Renda mensal"
                        className="min-w-0 flex-1 border-0 bg-transparent py-2.5 text-[15px] tabular-nums text-text focus:outline-none"
                    />
                </div>
            </div>

            <div className="mt-3.5 flex items-baseline justify-between gap-2.5 border-t border-text/8 pt-3">
                <span className="text-[12px] text-text/50">{cotaLabel}</span>
                <span className="font-heading text-[15px] tabular-nums text-text">{cotaValue}</span>
            </div>
            {error && <p className="mt-1.5 text-[11.5px] text-red-400/90">{error}</p>}
        </div>
    );
}

// ─── Linha de categoria (dot de cor, nome inline, dono cíclico) ───────────────
function CategoryRow({ category, editing, onToggleEdit, onRename, onColorChange, onCycleOwner, onDelete, ownershipLabel }) {
    return (
        <div className="flex items-center gap-2.5 rounded-[12px] px-1.5 py-2 transition-colors hover:bg-text/6">
            <span className="relative h-2.5 w-2.5 flex-none">
                <span className="absolute inset-0 rounded-full" style={{ background: category.color, boxShadow: `0 0 6px ${category.color}` }} />
                <input
                    type="color"
                    value={category.color}
                    onChange={(e) => onColorChange(e.target.value)}
                    aria-label={`Cor da categoria ${category.name}`}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
            </span>

            {editing ? (
                <input
                    autoFocus
                    value={category.name}
                    onChange={(e) => onRename(e.target.value)}
                    onBlur={onToggleEdit}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur(); }}
                    aria-label="Nome da categoria"
                    className="min-w-0 flex-1 rounded-[7px] border-0 bg-[#213d51] px-2 py-[3px] text-[14px] text-text shadow-[inset_0_0_0_1px_var(--color-accent)] focus:outline-none"
                />
            ) : (
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{category.name}</span>
            )}

            <button
                type="button"
                onClick={onCycleOwner}
                title="Alternar responsável"
                className={`flex-none rounded-full px-2 py-[3px] text-[11px] font-medium transition-[filter] hover:brightness-125 ${OWNERSHIP_BADGE[category.default_ownership]}`}
            >
                {ownershipLabel(category.default_ownership)}
            </button>

            <span className="w-16 flex-none text-right text-[11px] text-text/40">{category.expenses_count} desp.</span>

            <button type="button" onClick={onToggleEdit} aria-label="Renomear categoria" className="grid h-7 w-7 flex-none place-items-center rounded-full text-text/50 transition-colors hover:bg-text/10 hover:text-text">
                <Pencil size={13} strokeWidth={2.2} />
            </button>
            <button type="button" onClick={onDelete} aria-label="Excluir categoria" className="grid h-7 w-7 flex-none place-items-center rounded-full text-text/50 transition-colors hover:bg-text/10 hover:text-red-400">
                <Trash2 size={13} strokeWidth={2.2} />
            </button>
        </div>
    );
}

// ─── Linha de regra (dono cíclico, editar via modal, excluir) ─────────────────
function RuleRow({ rule, onCycleOwner, onEdit, onDelete, ownershipLabel }) {
    return (
        <div className="flex items-center gap-2.5 rounded-[12px] px-1.5 py-2 transition-colors hover:bg-text/6">
            <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium">{rule.pattern}</div>
                <div className="truncate text-[11px] text-text/45">
                    {rule.category} · {rule.amount != null ? fmt(rule.amount) : 'qualquer valor'}
                </div>
            </div>
            <button
                type="button"
                onClick={onCycleOwner}
                title="Alternar responsável"
                className={`flex-none rounded-full px-2 py-[3px] text-[11px] font-medium transition-[filter] hover:brightness-125 ${OWNERSHIP_BADGE[rule.ownership]}`}
            >
                {ownershipLabel(rule.ownership)}
            </button>
            <button type="button" onClick={onEdit} aria-label="Editar regra" className="grid h-7 w-7 flex-none place-items-center rounded-full text-text/50 transition-colors hover:bg-text/10 hover:text-text">
                <Pencil size={13} strokeWidth={2.2} />
            </button>
            <button type="button" onClick={onDelete} aria-label="Excluir regra" className="grid h-7 w-7 flex-none place-items-center rounded-full text-text/50 transition-colors hover:bg-text/10 hover:text-red-400">
                <Trash2 size={13} strokeWidth={2.2} />
            </button>
        </div>
    );
}

// ─── Rótulo de seção (eyebrow + linha esmaecida), como no mockup ──────────────
function SectionLabel({ title }) {
    return (
        <div className="flex items-baseline gap-3">
            <h2 className="font-heading text-[13px] font-medium uppercase tracking-[.1em] text-text/55">{title}</h2>
            <div className="h-px min-w-[40px] flex-1 bg-[linear-gradient(90deg,rgb(var(--color-text-rgb)/0.16),transparent_90%)]" />
        </div>
    );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Settings({ settings, categories, rules }) {
    const { flash } = usePage().props;

    const [base, setBase] = useState(() => buildBase(settings, categories, rules));
    const [draft, setDraft] = useState(() => buildBase(settings, categories, rules));
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const [editingKey, setEditingKey] = useState(null);
    const [novaCategoria, setNovaCategoria] = useState('');
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [toast, setToast] = useState(null);
    const toastTimer = useRef(null);

    // Ressincroniza quando os props do Inertia mudam (ex: regra criada/editada
    // pelo modal, que salva na hora). Se não há nada pendente, adota tudo; se há,
    // só reconcilia as regras (único caminho de mutação externa) preservando
    // edições locais ainda não salvas.
    useEffect(() => {
        const freshBase = buildBase(settings, categories, rules);
        const dirty = diffCount(computeDiff(draft, base)) > 0;
        setBase(freshBase);
        if (!dirty) {
            setDraft(freshBase);
        } else {
            setDraft((prev) => ({ ...prev, rules: reconcileRules(freshBase.rules, base.rules, prev.rules) }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [settings, categories, rules]);

    const showToast = (message) => {
        setToast(message);
        clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(null), 2600);
    };
    useEffect(() => () => clearTimeout(toastTimer.current), []);
    useEffect(() => {
        if (flash?.success && !saving) showToast(flash.success);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [flash?.success]);

    const diff = useMemo(() => computeDiff(draft, base), [draft, base]);
    const changesCount = diffCount(diff);
    const isDirty = changesCount > 0;

    const ownershipOptions = [
        { value: 'payer1', label: draft.payer1_name || 'Pagador 1' },
        { value: 'payer2', label: draft.payer2_name || 'Pagador 2' },
        { value: 'both', label: 'Nós' },
    ];
    const ownershipLabel = (value) => ownershipOptions.find((o) => o.value === value)?.label ?? value;

    const req = (method, url, data, onErr) => new Promise((resolve) => {
        const options = {
            preserveScroll: true,
            onError: (errs) => { onErr?.(errs); resolve(false); },
            onSuccess: () => resolve(true),
        };
        if (method === 'delete') router.delete(url, options);
        else router[method](url, data, options);
    });

    const salvar = async () => {
        if (saving || !isDirty) return;
        setSaving(true);
        setErrors({});

        const steps = [];
        if (diff.generalChanged) {
            steps.push(() => req('put', route('settings.update'), diff.generalPayload, setErrors));
        }
        diff.categoriesToDelete.forEach((cat) => steps.push(() => req('delete', route('categories.destroy', cat.id))));
        diff.categoriesToUpdate.forEach((cat) => steps.push(() => req('put', route('categories.update', cat.id), {
            name: cat.name, color: cat.color, default_ownership: cat.default_ownership,
        })));
        diff.categoriesToCreate.forEach((cat) => steps.push(() => req('post', route('categories.store'), {
            name: cat.name, color: cat.color, default_ownership: cat.default_ownership,
        })));
        diff.rulesToDelete.forEach((rule) => steps.push(() => req('delete', route('categorizationRules.destroy', rule.id))));
        diff.rulesToUpdate.forEach((rule) => steps.push(() => req('put', route('categorizationRules.update', rule.id), {
            pattern: rule.pattern, amount: rule.amount, category_id: rule.category_id, ownership: rule.ownership,
        })));

        let ok = true;
        for (const step of steps) {
            ok = await step();
            if (!ok) break;
        }

        setSaving(false);
        showToast(ok ? 'Configurações salvas' : 'Não foi possível salvar tudo — confira os campos e tente de novo.');
    };

    const discard = () => {
        setDraft(clonar(base));
        setEditingKey(null);
        setNovaCategoria('');
        setErrors({});
    };

    // ---- Geral ----
    const setGeneral = (key) => (e) => setDraft((d) => ({ ...d, [key]: e.target.value }));

    const salary1 = Number(draft.payer1_salary) || 0;
    const salary2 = Number(draft.payer2_salary) || 0;
    const totalSalary = salary1 + salary2;
    const p1 = totalSalary > 0 ? (salary1 / totalSalary) * 100 : 50;
    const p2 = 100 - p1;

    const stepDay = (delta) => setDraft((d) => {
        const cur = Math.min(28, Math.max(1, Number(d.card_closing_day) || 1));
        let next = cur + delta;
        if (next < 1) next = 28;
        if (next > 28) next = 1;
        return { ...d, card_closing_day: next };
    });
    const cycle = cycleInfo(draft.card_closing_day);

    // ---- Categorias ----
    const updateCategory = (key, patch) => setDraft((d) => ({
        ...d,
        categories: d.categories.map((c) => (c.id ?? c.tempKey) === key ? { ...c, ...patch } : c),
    }));

    const addCategory = () => {
        const name = novaCategoria.trim();
        if (!name) return;
        setDraft((d) => ({
            ...d,
            categories: [...d.categories, {
                id: null,
                tempKey: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                name,
                color: PALETA[d.categories.length % PALETA.length],
                default_ownership: 'both',
                expenses_count: 0,
            }],
        }));
        setNovaCategoria('');
    };

    const deleteCategory = (category) => {
        const key = category.id ?? category.tempKey;
        const warning = category.expenses_count > 0
            ? ` Ela está em uso em ${category.expenses_count} despesa(s), que ficarão sem categoria.`
            : '';
        if (!confirm(`Remover a categoria "${category.name}"? Isso só é aplicado quando você salvar as alterações.${warning}`)) return;
        setDraft((d) => ({ ...d, categories: d.categories.filter((c) => (c.id ?? c.tempKey) !== key) }));
        if (editingKey === key) setEditingKey(null);
    };

    const totalExpensesCount = draft.categories.reduce((t, c) => t + c.expenses_count, 0);
    const categoryFilters = [
        { value: 'all', label: 'Todos' },
        { value: 'both', label: 'Nós' },
        { value: 'payer1', label: firstName(draft.payer1_name) },
        { value: 'payer2', label: firstName(draft.payer2_name) },
    ];
    const visibleCategories = draft.categories.filter((c) => (
        (filter === 'all' || c.default_ownership === filter)
        && (!search.trim() || c.name.toLowerCase().includes(search.trim().toLowerCase()))
    ));

    // ---- Regras ----
    const [ruleModalOpen, setRuleModalOpen] = useState(false);
    const [editingRule, setEditingRule] = useState(null);
    const [applying, setApplying] = useState(false);

    const openCreateRule = () => { setEditingRule(null); setRuleModalOpen(true); };
    const openEditRule = (rule) => { setEditingRule(rule); setRuleModalOpen(true); };
    const closeRuleModal = () => setRuleModalOpen(false);

    const updateRuleOwnership = (rule, ownership) => setDraft((d) => ({
        ...d,
        rules: d.rules.map((r) => r.id === rule.id ? { ...r, ownership } : r),
    }));

    const deleteRule = (rule) => {
        if (!confirm(`Remover a regra "${rule.pattern}"? Isso só é aplicado quando você salvar as alterações.`)) return;
        setDraft((d) => ({ ...d, rules: d.rules.filter((r) => r.id !== rule.id) }));
    };

    const applyRules = () => {
        if (!confirm('Isso vai revisar todas as despesas já lançadas e recategorizar as que baterem com alguma regra. Continuar?')) return;
        setApplying(true);
        router.post(route('categorizationRules.apply'), {}, { preserveScroll: true, onFinish: () => setApplying(false) });
    };

    return (
        <AppLayout title="Configurações">
            <Head title="Configurações" />

            <section>
                <p className="mb-2 font-heading text-[12px] uppercase tracking-[.12em] text-text/60">Conta compartilhada</p>
                <h1 className="text-[clamp(28px,3vw,36px)] font-medium tracking-[-.02em]">Configurações</h1>
                <p className="mt-1 max-w-[52ch] text-[13px] text-text/50">
                    Como a despesa é dividida entre vocês, quando o mês financeiro vira e para onde cada gasto vai.
                </p>
            </section>

            {/* Divisão da despesa */}
            <section className="flex flex-col gap-4">
                <SectionLabel title="Divisão da despesa" />
                <Card className="flex flex-col gap-5">
                    <SectionHeader
                        icon={<Wallet size={13} strokeWidth={2.2} className="stroke-strong-accent" />}
                        title="Proporção por renda"
                        subtitle="Gastos marcados como Nós são divididos nesta proporção. Quem ganha mais assume a fatia maior."
                    />

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <PayerCard
                            name={draft.payer1_name}
                            onNameChange={setGeneral('payer1_name')}
                            salary={draft.payer1_salary}
                            onSalaryChange={setGeneral('payer1_salary')}
                            percentLabel={`${p1.toFixed(1).replace('.', ',')}%`}
                            avatarClass="bg-green text-bg"
                            percentClass="text-green"
                            cotaLabel={`Cabe a ${firstName(draft.payer1_name)} em ${fmt(REF_SALARIO)}`}
                            cotaValue={fmt(REF_SALARIO * p1 / 100)}
                            error={errors.payer1_name || errors.payer1_salary}
                        />
                        <PayerCard
                            name={draft.payer2_name}
                            onNameChange={setGeneral('payer2_name')}
                            salary={draft.payer2_salary}
                            onSalaryChange={setGeneral('payer2_salary')}
                            percentLabel={`${p2.toFixed(1).replace('.', ',')}%`}
                            avatarClass="bg-red text-bg"
                            percentClass="text-red"
                            cotaLabel={`Cabe a ${firstName(draft.payer2_name)} em ${fmt(REF_SALARIO)}`}
                            cotaValue={fmt(REF_SALARIO * p2 / 100)}
                            error={errors.payer2_name || errors.payer2_salary}
                        />
                    </div>

                    <div>
                        <div className="flex h-2.5 overflow-hidden rounded-full bg-text/8">
                            <div
                                className="bg-[linear-gradient(90deg,var(--color-progress-grad-start),var(--color-progress-grad-end))] transition-[width] duration-300"
                                style={{ width: `${p1}%` }}
                            />
                            <div className="flex-1 bg-[linear-gradient(90deg,var(--color-strong-accent),var(--color-soft-text))]" />
                        </div>
                        <div className="mt-2 flex justify-between text-[12px] text-text/50">
                            <span>{firstName(draft.payer1_name)} paga {fmt(REF_SALARIO * p1 / 100)} de cada {fmt(REF_SALARIO)}</span>
                            <span>{firstName(draft.payer2_name)} paga {fmt(REF_SALARIO * p2 / 100)}</span>
                        </div>
                    </div>
                </Card>
            </section>

            {/* Mês financeiro */}
            <section className="flex flex-col gap-4">
                <SectionLabel title="Mês financeiro" />
                <Card>
                    <SectionHeader
                        icon={<CreditCard size={13} strokeWidth={2.2} className="stroke-strong-accent" />}
                        title="Fechamento do cartão"
                        subtitle="O mês do app acompanha a fatura, não o calendário. Escolha o dia em que ela fecha."
                    />

                    <div className="mt-4 flex flex-wrap gap-[clamp(20px,3vw,40px)]">
                        <div className="min-w-[240px] flex-1">
                            <div className="inline-flex items-center gap-1 rounded-[12px] bg-[#0c1620] p-[5px] shadow-[inset_0_0_0_1px_rgb(var(--color-accent-rgb)/0.28)]">
                                <button type="button" onClick={() => stepDay(-1)} aria-label="Dia anterior" className="grid h-[34px] w-[34px] flex-none place-items-center rounded-[9px] text-text/75 transition-colors hover:bg-text/8 hover:text-text">
                                    <Minus size={16} strokeWidth={2.4} />
                                </button>
                                <span className="w-[52px] text-center font-heading text-[22px] font-medium tabular-nums text-text">
                                    {pad2(draft.card_closing_day)}
                                </span>
                                <button type="button" onClick={() => stepDay(1)} aria-label="Dia seguinte" className="grid h-[34px] w-[34px] flex-none place-items-center rounded-[9px] text-text/75 transition-colors hover:bg-text/8 hover:text-text">
                                    <Plus size={16} strokeWidth={2.4} />
                                </button>
                            </div>
                            <p className="mt-2.5 text-[12px] text-text/45">Entre 1 e 28 — dias maiores não existem em fevereiro.</p>
                            {errors.card_closing_day && <p className="mt-1 text-[11.5px] text-red-400/90">{errors.card_closing_day}</p>}
                        </div>

                        <div className="min-w-[260px] flex-1 rounded-[14px] bg-text/[0.04] p-[18px] shadow-[inset_0_0_0_1px_rgb(var(--color-text-rgb)/0.08)]">
                            <div className="text-[12px] uppercase tracking-[.1em] text-text/50">Ciclo atual</div>
                            <div className="mt-2.5 flex flex-wrap items-center gap-3 font-heading text-[clamp(17px,2vw,21px)] font-medium tabular-nums tracking-[-.015em]">
                                <span>{cycle.startLabel}</span>
                                <span className="h-px min-w-[20px] flex-1 bg-[linear-gradient(90deg,var(--color-accent),var(--color-soft-text))]" />
                                <span>{cycle.endLabel}</span>
                            </div>
                            <div className="mt-4 flex flex-col gap-2.5 text-[12.5px] leading-[1.45] text-text/60">
                                <div className="flex gap-2">
                                    <Check size={14} strokeWidth={2.2} className="mt-0.5 flex-none stroke-strong-accent" />
                                    <span>Uma compra em {cycle.exampleInsideLabel} entra neste ciclo.</span>
                                </div>
                                <div className="flex gap-2">
                                    <Clock size={14} strokeWidth={2.2} className="mt-0.5 flex-none stroke-red" />
                                    <span>Uma compra em {cycle.exampleOutsideLabel} já cai no ciclo seguinte.</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            </section>

            {/* Para onde vai cada gasto */}
            <section className="flex flex-col gap-4">
                <SectionLabel title="Para onde vai cada gasto" />
                <section className="grid grid-cols-[repeat(auto-fit,minmax(340px,1fr))] items-start gap-[clamp(14px,1.6vw,20px)]">
                    <Card className="flex flex-col">
                        <SectionHeader
                            icon={<Tag size={13} strokeWidth={2.2} className="stroke-strong-accent" />}
                            title="Categorias"
                            action={
                                <span className="text-[12.5px] text-text/45">
                                    {draft.categories.length} categorias · {totalExpensesCount.toLocaleString('pt-BR')} despesas
                                </span>
                            }
                        />

                        <div className="mt-3.5 flex flex-wrap items-center gap-2">
                            <div className="flex min-w-[130px] flex-1 items-center gap-2 rounded-[10px] bg-text/[0.04] px-3 shadow-[inset_0_0_0_1px_rgb(var(--color-text-rgb)/0.1)] focus-within:shadow-[inset_0_0_0_1px_var(--color-accent)]">
                                <Search size={14} strokeWidth={1.9} className="flex-none text-text/45" />
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Buscar categoria"
                                    aria-label="Buscar categoria"
                                    className="min-w-0 flex-1 border-0 bg-transparent py-[9px] text-[13.5px] text-text placeholder:text-text/40 focus:outline-none"
                                />
                            </div>
                            <div className="flex gap-0.5 rounded-[10px] bg-text/[0.035] p-[3px] shadow-[inset_0_0_0_1px_rgb(var(--color-text-rgb)/0.09)]">
                                {categoryFilters.map((f) => (
                                    <button
                                        key={f.value}
                                        type="button"
                                        onClick={() => setFilter(f.value)}
                                        className={`rounded-[8px] px-[11px] py-[6px] text-[12.5px] transition-colors ${filter === f.value ? 'bg-teal/28 text-text' : 'text-text/60 hover:bg-text/8'}`}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="scroll-thin mt-1.5 flex max-h-[320px] flex-col overflow-y-auto pr-1">
                            {draft.categories.length === 0 ? (
                                <p className="py-6 text-center text-[12.5px] text-text/45">Nenhuma categoria cadastrada ainda.</p>
                            ) : visibleCategories.length === 0 ? (
                                <p className="py-6 text-center text-[12.5px] text-text/45">Nenhuma categoria com esse filtro.</p>
                            ) : (
                                visibleCategories.map((category) => {
                                    const key = category.id ?? category.tempKey;
                                    return (
                                        <CategoryRow
                                            key={key}
                                            category={category}
                                            editing={editingKey === key}
                                            onToggleEdit={() => setEditingKey((k) => (k === key ? null : key))}
                                            onRename={(name) => updateCategory(key, { name })}
                                            onColorChange={(color) => updateCategory(key, { color })}
                                            onCycleOwner={() => updateCategory(key, { default_ownership: cycleOwnership(category.default_ownership) })}
                                            onDelete={() => deleteCategory(category)}
                                            ownershipLabel={ownershipLabel}
                                        />
                                    );
                                })
                            )}
                        </div>

                        <div className="mt-3 flex items-center gap-2 rounded-[10px] bg-text/[0.04] px-3 shadow-[inset_0_0_0_1px_rgb(var(--color-strong-accent-rgb)/0.22)] focus-within:shadow-[inset_0_0_0_1px_var(--color-strong-accent)]">
                            <Plus size={15} className="flex-none stroke-strong-accent" />
                            <input
                                value={novaCategoria}
                                onChange={(e) => setNovaCategoria(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') addCategory(); }}
                                placeholder="Nova categoria — digite e pressione Enter"
                                aria-label="Nova categoria"
                                className="min-w-0 flex-1 border-0 bg-transparent py-2.5 text-[13.5px] text-text placeholder:text-text/40 focus:outline-none"
                            />
                            {novaCategoria.trim() && (
                                <button type="button" onClick={addCategory} className="flex-none rounded-[8px] bg-strong-accent px-3 py-1 text-[12.5px] text-bg hover:bg-lime">
                                    Criar
                                </button>
                            )}
                        </div>
                    </Card>

                    <Card className="flex flex-col">
                        <SectionHeader
                            icon={<ListFilter size={13} strokeWidth={2.2} className="stroke-strong-accent" />}
                            title="Regras de categorização"
                            action={<span className="text-[12.5px] text-text/45">{draft.rules.length} ativas</span>}
                        />
                        <p className="mt-1.5 max-w-[46ch] text-[13px] leading-[1.5] text-text/55">
                            Quando a descrição de uma transação bate com o termo, ela recebe a categoria e o responsável sozinha.
                        </p>

                        <div className="mt-2 flex flex-col">
                            {draft.rules.length === 0 ? (
                                <p className="py-6 text-center text-[12.5px] text-text/45">Nenhuma regra cadastrada ainda.</p>
                            ) : (
                                draft.rules.map((rule) => (
                                    <RuleRow
                                        key={rule.id}
                                        rule={rule}
                                        onCycleOwner={() => updateRuleOwnership(rule, cycleOwnership(rule.ownership))}
                                        onEdit={() => openEditRule(rule)}
                                        onDelete={() => deleteRule(rule)}
                                        ownershipLabel={ownershipLabel}
                                    />
                                ))
                            )}
                        </div>

                        <div className="mt-3 flex items-center justify-end gap-2">
                            <Button type="button" variant="secondary" onClick={openCreateRule}>
                                <Plus size={14} strokeWidth={2.2} /> Nova regra
                            </Button>
                            <Button type="button" variant="ghost" onClick={applyRules} disabled={applying || draft.rules.length === 0}>
                                <RefreshCw size={14} strokeWidth={2.2} className={applying ? 'animate-spin' : ''} /> {applying ? 'Aplicando...' : 'Aplicar regras'}
                            </Button>
                        </div>
                    </Card>
                </section>
            </section>

            {isDirty && <div className="h-20" />}

            {isDirty && (
                <div className="fixed inset-x-0 bottom-0 z-40 bg-[linear-gradient(180deg,transparent,var(--color-bg)_45%)] px-[clamp(16px,3vw,40px)] pb-[18px] pt-3.5">
                    <div className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-3.5 rounded-[14px] bg-surface px-4 py-3 shadow-[inset_0_0_0_1px_rgb(var(--color-accent-rgb)/0.4),0_12px_34px_rgba(0,0,0,0.45)]">
                        <span className="min-w-[180px] flex-1 text-[13.5px] text-text/80">
                            {changesCount === 1 ? '1 alteração não salva' : `${changesCount} alterações não salvas`}
                        </span>
                        <Button type="button" variant="secondary" onClick={discard} disabled={saving}>Descartar</Button>
                        <button
                            type="button"
                            onClick={salvar}
                            disabled={saving}
                            className="rounded-[9px] bg-lime px-[18px] py-2.5 font-heading text-[13px] font-medium text-bg transition-colors hover:bg-strong-accent disabled:pointer-events-none disabled:opacity-60"
                        >
                            {saving ? 'Salvando...' : 'Salvar alterações'}
                        </button>
                    </div>
                </div>
            )}

            {toast && (
                <div className="fixed bottom-[26px] left-1/2 z-50 flex -translate-x-1/2 items-center gap-2.5 rounded-full bg-surface px-[18px] py-[11px] text-[13.5px] text-green shadow-[inset_0_0_0_1px_rgb(var(--color-income-rgb)/0.4),0_10px_28px_rgba(0,0,0,0.4)]">
                    <Check size={15} strokeWidth={2.2} className="stroke-green" />
                    {toast}
                </div>
            )}

            <RuleModal
                key={editingRule ? `edit-${editingRule.id}` : 'new'}
                show={ruleModalOpen}
                rule={editingRule}
                categories={categories}
                ownershipOptions={ownershipOptions}
                onClose={closeRuleModal}
            />
        </AppLayout>
    );
}
