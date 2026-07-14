import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useRef, useState } from 'react';

const OWNERSHIP_OPTIONS = [
    { value: 'payer1', label: 'Reni' },
    { value: 'payer2', label: 'Lua' },
    { value: 'both',   label: 'Nós' },
];

const OWNERSHIP_BADGE = {
    payer1: 'bg-emerald-100 text-emerald-700',
    payer2: 'bg-rose-100 text-rose-700',
    both:   'bg-amber-100 text-amber-700',
};

const fmt = (v) =>
    Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const monthLabel = (m) => {
    const label = new Date(`${m}-01T00:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return label.charAt(0).toUpperCase() + label.slice(1);
};

const SCOPE_OPTIONS = (settings) => [
    { value: 'payer1', label: settings.payer1_name },
    { value: 'payer2', label: settings.payer2_name },
    { value: 'both',   label: 'Compartilhado' },
];
const ALL_OWNERSHIPS = ['payer1', 'payer2', 'both'];

function buildCategoryGroups(rows) {
    const map = {};
    for (const r of rows) {
        const key = r.category ?? 'Sem categoria';
        if (!map[key]) map[key] = [];
        map[key].push(r.id);
    }
    return map;
}

// ─── Modal de adição manual ───────────────────────────────────────────────────
const EMPTY_FORM = { description: '', amount: '', date: '', category_id: '', ownership: 'both' };

function AddExpenseModal({ categories, currentMonth, source, ownerName, onAdded, onClose }) {
    const [form, setForm] = useState(() => ({
        ...EMPTY_FORM,
        date: currentMonth ? `${currentMonth}-01` : new Date().toISOString().slice(0, 10),
    }));
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    const set = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => ({ ...prev, [field]: undefined }));
    };

    const validate = () => {
        const e = {};
        if (!form.description.trim()) e.description = 'Informe a descrição.';
        if (!form.amount || Number(form.amount) <= 0) e.amount = 'Valor deve ser maior que zero.';
        if (!form.date) e.date = 'Informe a data.';
        return e;
    };

    const submit = async (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) { setErrors(errs); return; }

        setSubmitting(true);
        try {
            const { data } = await axios.post(route('expenses.store'), {
                description: form.description.trim(),
                amount:      Number(form.amount),
                date:        form.date,
                category_id: form.category_id || null,
                ownership:   form.ownership,
                source,
            });
            onAdded(data);
            onClose();
        } catch (err) {
            if (err.response?.status === 422) {
                const serverErrors = {};
                Object.entries(err.response.data.errors).forEach(([k, msgs]) => {
                    serverErrors[k] = msgs[0];
                });
                setErrors(serverErrors);
            }
        } finally {
            setSubmitting(false);
        }
    };

    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                    <div>
                        <h2 className="text-base font-semibold text-gray-800">Adicionar Despesa</h2>
                        <p className="text-xs text-gray-400">Extrato de <strong>{ownerName}</strong></p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={submit} className="space-y-4 px-6 py-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Descrição *</label>
                        <input
                            type="text"
                            autoFocus
                            value={form.description}
                            onChange={(e) => set('description', e.target.value)}
                            placeholder="Ex: Supermercado Extra"
                            className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none ${errors.description ? 'border-red-400' : 'border-gray-300'}`}
                        />
                        {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Valor (R$) *</label>
                            <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={form.amount}
                                onChange={(e) => set('amount', e.target.value)}
                                placeholder="0,00"
                                className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none ${errors.amount ? 'border-red-400' : 'border-gray-300'}`}
                            />
                            {errors.amount && <p className="mt-1 text-xs text-red-500">{errors.amount}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Data *</label>
                            <input
                                type="date"
                                value={form.date}
                                onChange={(e) => set('date', e.target.value)}
                                className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none ${errors.date ? 'border-red-400' : 'border-gray-300'}`}
                            />
                            {errors.date && <p className="mt-1 text-xs text-red-500">{errors.date}</p>}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Categoria</label>
                        <select
                            value={form.category_id}
                            onChange={(e) => set('category_id', e.target.value)}
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                        >
                            <option value="">— Sem categoria —</option>
                            {categories.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">De quem é o gasto?</label>
                        <div className="mt-2 flex gap-2">
                            {OWNERSHIP_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => set('ownership', opt.value)}
                                    className={`flex-1 rounded-lg border py-2 text-xs font-medium transition-colors ${
                                        form.ownership === opt.value
                                            ? OWNERSHIP_BADGE[opt.value] + ' border-transparent'
                                            : 'border-gray-300 text-gray-500 hover:bg-gray-50'
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-1">
                        <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
                            Cancelar
                        </button>
                        <button type="submit" disabled={submitting} className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
                            {submitting ? 'Salvando...' : 'Adicionar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Modal de exportação em PDF ───────────────────────────────────────────────
function ExportPdfModal({ availableMonths, currentMonth, settings, onClose }) {
    const [selectedMonths, setSelectedMonths] = useState(() =>
        availableMonths.includes(currentMonth) ? [currentMonth] : availableMonths.slice(0, 1)
    );
    const [ownerships, setOwnerships] = useState(ALL_OWNERSHIPS);
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState(null);

    const scopeOptions = SCOPE_OPTIONS(settings);
    const isTotal = ownerships.length === ALL_OWNERSHIPS.length;

    const toggleMonth = (m) => {
        setSelectedMonths((prev) =>
            prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
        );
    };

    const toggleOwnership = (value) => {
        setOwnerships((prev) =>
            prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value]
        );
    };

    const submit = async (e) => {
        e.preventDefault();
        if (selectedMonths.length === 0) {
            setError('Selecione ao menos um mês.');
            return;
        }
        if (ownerships.length === 0) {
            setError('Selecione ao menos uma opção em "O que exportar?".');
            return;
        }
        setError(null);
        setExporting(true);
        try {
            const response = await axios.post(
                route('expenses.exportPdf'),
                { months: selectedMonths, ownerships },
                { responseType: 'blob' }
            );
            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.download = 'despesas.pdf';
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            onClose();
        } catch {
            setError('Erro ao gerar o PDF. Tente novamente.');
        } finally {
            setExporting(false);
        }
    };

    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                    <h2 className="text-base font-semibold text-gray-800">Exportar PDF</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={submit} className="space-y-4 px-6 py-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Meses</label>
                        <p className="mb-2 text-xs text-gray-400">
                            Se mais de um mês for selecionado, cada um sai em uma página separada.
                        </p>
                        <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-gray-200 p-2">
                            {availableMonths.length === 0 && (
                                <p className="px-1 py-1 text-xs text-gray-400">Nenhum mês com despesas cadastradas.</p>
                            )}
                            {availableMonths.map((m) => (
                                <label key={m} className="flex items-center gap-2 rounded px-1 py-1 text-sm text-gray-700 hover:bg-gray-50">
                                    <input
                                        type="checkbox"
                                        checked={selectedMonths.includes(m)}
                                        onChange={() => toggleMonth(m)}
                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    {monthLabel(m)}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">O que exportar?</label>
                        <p className="mb-2 text-xs text-gray-400">Pode marcar mais de uma opção.</p>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setOwnerships(isTotal ? [] : ALL_OWNERSHIPS)}
                                className={`col-span-2 rounded-lg border py-2 text-xs font-medium transition-colors ${
                                    isTotal
                                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                        : 'border-gray-300 text-gray-500 hover:bg-gray-50'
                                }`}
                            >
                                Total (todos)
                            </button>
                            {scopeOptions.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => toggleOwnership(opt.value)}
                                    className={`rounded-lg border py-2 text-xs font-medium transition-colors ${
                                        ownerships.includes(opt.value)
                                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                            : 'border-gray-300 text-gray-500 hover:bg-gray-50'
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {error && <p className="text-xs text-red-500">{error}</p>}

                    <div className="flex justify-end gap-3 pt-1">
                        <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
                            Cancelar
                        </button>
                        <button type="submit" disabled={exporting} className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
                            {exporting ? 'Gerando...' : 'Exportar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Tabela de despesas (reutilizada nas duas abas) ───────────────────────────
function ExpenseTable({ rows, categories, onUpdate, onBatchOwnership, onDelete }) {
    const categoryGroups = buildCategoryGroups(rows);

    if (rows.length === 0) return null;

    return (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                        <tr>
                            <th className="px-4 py-3 text-left">Data</th>
                            <th className="px-4 py-3 text-left">Descrição</th>
                            <th className="px-4 py-3 text-left">Categoria</th>
                            <th className="px-4 py-3 text-right">Valor</th>
                            <th className="px-4 py-3 text-left">De quem é?</th>
                            <th className="px-4 py-3" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {Object.entries(categoryGroups).map(([cat, ids]) => (
                            <tr key={`group-${cat}`} className="bg-gray-50/60">
                                <td colSpan={2} className="px-4 py-2 text-xs font-semibold text-gray-600">
                                    {cat} ({ids.length})
                                </td>
                                <td />
                                <td />
                                <td className="px-4 py-2">
                                    <div className="flex gap-1">
                                        {OWNERSHIP_OPTIONS.map((opt) => (
                                            <button
                                                key={opt.value}
                                                onClick={() => onBatchOwnership(cat, opt.value)}
                                                className="rounded border border-gray-300 bg-white px-2 py-0.5 text-xs text-gray-600 hover:border-indigo-300 hover:bg-indigo-50"
                                            >
                                                Todos: {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </td>
                                <td />
                            </tr>
                        ))}

                        {rows.map((row) => (
                            <tr key={row.id} className="hover:bg-gray-50">
                                <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                                    {new Date(row.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                                </td>
                                <td className="px-4 py-3">
                                    <span className={row.status === 'pending' ? 'italic text-gray-400' : 'text-gray-800'}>
                                        {row.description}
                                    </span>
                                    {row.status === 'pending' && (
                                        <span className="ml-2 text-xs text-indigo-400">(categorizando...)</span>
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    <select
                                        value={row.category_id ?? ''}
                                        onChange={(e) =>
                                            onUpdate(row.id, 'category_id', e.target.value ? Number(e.target.value) : null)
                                        }
                                        className="rounded border border-gray-300 bg-white px-2 py-1 text-xs focus:border-indigo-400 focus:outline-none"
                                    >
                                        <option value="">— Sem categoria —</option>
                                        {categories.map((c) => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </td>
                                <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-800">
                                    {fmt(row.amount)}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex gap-1">
                                        {OWNERSHIP_OPTIONS.map((opt) => (
                                            <button
                                                key={opt.value}
                                                onClick={() => onUpdate(row.id, 'ownership', opt.value)}
                                                className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                                                    row.ownership === opt.value
                                                        ? OWNERSHIP_BADGE[opt.value]
                                                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                                }`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <button
                                        onClick={() => {
                                            if (!confirm('Remover esta despesa?')) return;
                                            onDelete(row.id);
                                        }}
                                        className="text-xs text-red-400 hover:text-red-600"
                                    >
                                        Remover
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Expenses({
    payer1Expenses: initialP1,
    payer2Expenses: initialP2,
    categories,
    month,
    activeTab: initialTab,
    hasPending,
    settings,
    availableMonths,
}) {
    const { flash } = usePage().props;

    // Estado separado por aba. Cada aba tem seus próprios rows e dirty flag.
    const [rows, setRows] = useState({ payer1: initialP1, payer2: initialP2 });
    const [dirty, setDirty] = useState({ payer1: false, payer2: false });
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState(null);
    const [activeTab, setActiveTab] = useState(initialTab);
    const [showModal, setShowModal] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);

    const currentRows = rows[activeTab];
    const isDirty = dirty[activeTab];

    const tabNames = { payer1: settings.payer1_name, payer2: settings.payer2_name };
    const tabColors = {
        payer1: { active: 'border-emerald-500 text-emerald-700', count: 'bg-emerald-100 text-emerald-600' },
        payer2: { active: 'border-rose-500 text-rose-700',       count: 'bg-rose-100 text-rose-600' },
    };

    // Polling enquanto houver categorização pendente.
    const pollRef = useRef(null);
    useEffect(() => {
        if (!hasPending) return;
        pollRef.current = setInterval(() => {
            router.reload({ only: ['payer1Expenses', 'payer2Expenses', 'hasPending'] });
        }, 5000);
        return () => clearInterval(pollRef.current);
    }, [hasPending]);

    // Sincroniza state local quando Inertia recarrega (ex: polling, delete).
    useEffect(() => { setRows({ payer1: initialP1, payer2: initialP2 }); }, [initialP1, initialP2]);

    const updateRow = (id, field, value) => {
        setRows((prev) => ({
            ...prev,
            [activeTab]: prev[activeTab].map((r) => (r.id === id ? { ...r, [field]: value } : r)),
        }));
        setDirty((prev) => ({ ...prev, [activeTab]: true }));
    };

    const batchOwnership = (categoryName, ownership) => {
        setRows((prev) => ({
            ...prev,
            [activeTab]: prev[activeTab].map((r) =>
                (r.category ?? 'Sem categoria') === categoryName ? { ...r, ownership } : r
            ),
        }));
        setDirty((prev) => ({ ...prev, [activeTab]: true }));
    };

    const handleDelete = (id) => {
        router.delete(route('expenses.destroy', id), {
            preserveScroll: true,
        });
    };

    const handleDeleteMonth = () => {
        const name = tabNames[activeTab];
        if (!confirm(`Remover TODAS as despesas de ${name} em ${month}? Esta ação não pode ser desfeita.`)) return;
        router.delete(route('expenses.destroyByMonth', { month, source: activeTab }), {
            preserveScroll: true,
        });
    };

    const handleAdded = (newExpense) => {
        if (newExpense.date.slice(0, 7) === month) {
            setRows((prev) => ({
                ...prev,
                [activeTab]: [newExpense, ...prev[activeTab]],
            }));
        }
        setSaveMsg('Despesa adicionada!');
        setTimeout(() => setSaveMsg(null), 3000);
    };

    const saveAll = async () => {
        setSaving(true);
        setSaveMsg(null);
        try {
            await axios.post(route('expenses.batch'), {
                expenses: currentRows.map((r) => ({
                    id:          r.id,
                    category_id: r.category_id,
                    ownership:   r.ownership,
                })),
            });
            setDirty((prev) => ({ ...prev, [activeTab]: false }));
            setSaveMsg('Despesas salvas com sucesso!');
        } catch {
            setSaveMsg('Erro ao salvar. Tente novamente.');
        } finally {
            setSaving(false);
        }
    };

    const changeMonth = (e) =>
        router.get(route('expenses.index'), { month: e.target.value, tab: activeTab });

    const switchTab = (tab) => {
        setActiveTab(tab);
        router.get(route('expenses.index'), { month, tab }, { preserveState: true, replace: true });
    };

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800">Revisão de Despesas</h2>}>
            <Head title="Despesas" />

            {showModal && (
                <AddExpenseModal
                    categories={categories}
                    currentMonth={month}
                    source={activeTab}
                    ownerName={tabNames[activeTab]}
                    onAdded={handleAdded}
                    onClose={() => setShowModal(false)}
                />
            )}

            {showExportModal && (
                <ExportPdfModal
                    availableMonths={availableMonths}
                    currentMonth={month}
                    settings={settings}
                    onClose={() => setShowExportModal(false)}
                />
            )}

            {flash?.success && (
                <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                    {flash.success}
                </div>
            )}

            {hasPending && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
                    <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Categorização por IA em andamento... a tabela será atualizada automaticamente.
                </div>
            )}

            {/* Toolbar: mês + ações */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-gray-600">Mês:</label>
                    <input
                        type="month"
                        value={month}
                        onChange={changeMonth}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
                    />
                </div>
                <div className="flex items-center gap-3">
                    {saveMsg && (
                        <span className={`text-sm ${saveMsg.includes('sucesso') || saveMsg === 'Despesa adicionada!' ? 'text-green-600' : 'text-red-500'}`}>
                            {saveMsg}
                        </span>
                    )}
                    {isDirty && (
                        <button
                            onClick={saveAll}
                            disabled={saving}
                            className="rounded-lg border border-indigo-300 bg-white px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-60"
                        >
                            {saving ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                    )}
                    {currentRows.length > 0 && (
                        <button
                            onClick={handleDeleteMonth}
                            className="flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                        >
                            <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Limpar mês
                        </button>
                    )}
                    <button
                        onClick={() => setShowExportModal(true)}
                        className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                    >
                        <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H8a2 2 0 01-2-2V5a2 2 0 012-2h6l6 6v11a2 2 0 01-2 2z" />
                        </svg>
                        Exportar PDF
                    </button>
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                    >
                        <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Adicionar Despesa
                    </button>
                </div>
            </div>

            {/* Abas Reni / Lua */}
            <div className="mb-4 flex border-b border-gray-200">
                {(['payer1', 'payer2']).map((tab) => {
                    const isActive = activeTab === tab;
                    const count = rows[tab].length;
                    const colors = tabColors[tab];
                    return (
                        <button
                            key={tab}
                            onClick={() => switchTab(tab)}
                            className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-medium transition-colors ${
                                isActive
                                    ? colors.active
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            {tabNames[tab]}
                            <span className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${isActive ? colors.count : 'bg-gray-100 text-gray-500'}`}>
                                {count}
                            </span>
                            {/* Indicador de alterações não salvas */}
                            {dirty[tab] && (
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" title="Há alterações não salvas" />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Conteúdo da aba ativa */}
            {currentRows.length === 0 ? (
                <div className="rounded-xl border border-gray-200 bg-white py-16 text-center shadow-sm">
                    <p className="text-gray-400">
                        Nenhuma despesa de <strong>{tabNames[activeTab]}</strong> neste mês.
                    </p>
                    <div className="mt-3 flex justify-center gap-4">
                        <a href={route('import.show')} className="text-sm text-indigo-500 underline">
                            Importar CSV
                        </a>
                        <span className="text-gray-300">|</span>
                        <button onClick={() => setShowModal(true)} className="text-sm text-indigo-500 underline">
                            Adicionar manualmente
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <div className="mb-2 text-right text-xs text-gray-400">
                        {currentRows.length} despesa(s) · Total:{' '}
                        <strong>{fmt(currentRows.reduce((s, r) => s + r.amount, 0))}</strong>
                    </div>
                    <ExpenseTable
                        rows={currentRows}
                        categories={categories}
                        onUpdate={updateRow}
                        onBatchOwnership={batchOwnership}
                        onDelete={handleDelete}
                    />
                </>
            )}
        </AuthenticatedLayout>
    );
}
