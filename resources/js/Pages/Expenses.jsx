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

function AddExpenseModal({ categories, currentMonth, onAdded, onClose }) {
    const [form, setForm] = useState(() => ({
        ...EMPTY_FORM,
        // Pré-preenche a data com o primeiro dia do mês atual da tabela.
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
            });
            onAdded(data);
            onClose();
        } catch (err) {
            // Erros de validação do Laravel (422)
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

    // Fecha com ESC
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                    <h2 className="text-base font-semibold text-gray-800">Adicionar Despesa</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Formulário */}
                <form onSubmit={submit} className="space-y-4 px-6 py-5">
                    {/* Descrição */}
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

                    {/* Valor + Data em linha */}
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

                    {/* Categoria */}
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

                    {/* De quem é? */}
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

                    {/* Ações */}
                    <div className="flex justify-end gap-3 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                        >
                            {submitting ? 'Salvando...' : 'Adicionar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Expenses({ expenses: initialExpenses, categories, month, hasPending }) {
    const { flash } = usePage().props;

    const [rows, setRows] = useState(initialExpenses);
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState(null);
    const [showModal, setShowModal] = useState(false);

    // Polling enquanto houver despesas pendentes de categorização.
    const pollRef = useRef(null);
    useEffect(() => {
        if (!hasPending) return;
        pollRef.current = setInterval(() => {
            router.reload({ only: ['expenses', 'hasPending'] });
        }, 5000);
        return () => clearInterval(pollRef.current);
    }, [hasPending]);

    useEffect(() => {
        setRows(initialExpenses);
    }, [initialExpenses]);

    const updateRow = (id, field, value) => {
        setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
        setDirty(true);
    };

    const batchOwnership = (categoryName, ownership) => {
        setRows((prev) =>
            prev.map((r) =>
                (r.category ?? 'Sem categoria') === categoryName ? { ...r, ownership } : r
            )
        );
        setDirty(true);
    };

    // Callback quando o modal adiciona uma nova despesa com sucesso.
    const handleAdded = (newExpense) => {
        // Insere no topo apenas se o mês da despesa bate com o filtro atual.
        const expMonth = newExpense.date.slice(0, 7);
        if (expMonth === month) {
            setRows((prev) => [newExpense, ...prev]);
            setDirty(true); // a nova já está no BD, mas force save caso o usuário edite outras
        }
        setSaveMsg('Despesa adicionada com sucesso!');
        setTimeout(() => setSaveMsg(null), 3000);
    };

    const saveAll = async () => {
        setSaving(true);
        setSaveMsg(null);
        try {
            await axios.post(route('expenses.batch'), {
                expenses: rows.map((r) => ({
                    id:          r.id,
                    category_id: r.category_id,
                    ownership:   r.ownership,
                })),
            });
            setDirty(false);
            setSaveMsg('Despesas salvas com sucesso!');
        } catch {
            setSaveMsg('Erro ao salvar. Tente novamente.');
        } finally {
            setSaving(false);
        }
    };

    const changeMonth = (e) => router.get(route('expenses.index'), { month: e.target.value });

    const categoryGroups = buildCategoryGroups(rows);

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800">Revisão de Despesas</h2>}>
            <Head title="Despesas" />

            {showModal && (
                <AddExpenseModal
                    categories={categories}
                    currentMonth={month}
                    onAdded={handleAdded}
                    onClose={() => setShowModal(false)}
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

            {/* Toolbar */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-gray-600">Mês:</label>
                    <input
                        type="month"
                        value={month}
                        onChange={changeMonth}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
                    />
                    <span className="text-sm text-gray-500">{rows.length} despesa(s)</span>
                </div>
                <div className="flex items-center gap-3">
                    {saveMsg && (
                        <span className={`text-sm ${saveMsg.includes('sucesso') ? 'text-green-600' : 'text-red-500'}`}>
                            {saveMsg}
                        </span>
                    )}
                    {dirty && (
                        <button
                            onClick={saveAll}
                            disabled={saving}
                            className="rounded-lg border border-indigo-300 bg-white px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-60"
                        >
                            {saving ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                    )}
                    {/* Botão principal de adição manual */}
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

            {rows.length === 0 ? (
                <div className="rounded-xl border border-gray-200 bg-white py-16 text-center shadow-sm">
                    <p className="text-gray-400">Nenhuma despesa neste mês.</p>
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
                                {/* Sub-header de batch por categoria */}
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
                                                        onClick={() => batchOwnership(cat, opt.value)}
                                                        className="rounded border border-gray-300 bg-white px-2 py-0.5 text-xs text-gray-600 hover:bg-indigo-50 hover:border-indigo-300"
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
                                            <span className={row.status === 'pending' ? 'text-gray-400 italic' : 'text-gray-800'}>
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
                                                    updateRow(row.id, 'category_id', e.target.value ? Number(e.target.value) : null)
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
                                                        onClick={() => updateRow(row.id, 'ownership', opt.value)}
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
                                                    router.delete(route('expenses.destroy', row.id));
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
            )}
        </AuthenticatedLayout>
    );
}
