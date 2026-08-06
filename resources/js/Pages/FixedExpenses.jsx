import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

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

const EMPTY_FORM = { description: '', amount: '', due_day: '', category_id: '', ownership: 'both', active: true };

// ─── Modal de criação/edição de despesa fixa ──────────────────────────────────
function FixedExpenseFormModal({ categories, fixedExpense, onClose }) {
    const isEditing = Boolean(fixedExpense);
    const { data, setData, post, put, processing, errors, reset } = useForm(
        fixedExpense
            ? {
                  description: fixedExpense.description,
                  amount:      fixedExpense.amount,
                  due_day:     fixedExpense.due_day,
                  category_id: fixedExpense.category_id ?? '',
                  ownership:   fixedExpense.ownership,
                  active:      fixedExpense.active,
              }
            : EMPTY_FORM
    );

    const submit = (e) => {
        e.preventDefault();
        const options = {
            preserveScroll: true,
            onSuccess: () => { reset(); onClose(); },
        };

        if (isEditing) {
            put(route('fixedExpenses.update', fixedExpense.id), options);
        } else {
            post(route('fixedExpenses.store'), options);
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
                    <h2 className="text-base font-semibold text-gray-800">
                        {isEditing ? 'Editar Despesa Fixa' : 'Nova Despesa Fixa'}
                    </h2>
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
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                            placeholder="Ex: Aluguel"
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
                                value={data.amount}
                                onChange={(e) => setData('amount', e.target.value)}
                                className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none ${errors.amount ? 'border-red-400' : 'border-gray-300'}`}
                            />
                            {errors.amount && <p className="mt-1 text-xs text-red-500">{errors.amount}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Dia da cobrança *</label>
                            <input
                                type="number"
                                min="1"
                                max="31"
                                value={data.due_day}
                                onChange={(e) => setData('due_day', e.target.value)}
                                placeholder="Ex: 10"
                                className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none ${errors.due_day ? 'border-red-400' : 'border-gray-300'}`}
                            />
                            {errors.due_day && <p className="mt-1 text-xs text-red-500">{errors.due_day}</p>}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Categoria</label>
                        <select
                            value={data.category_id}
                            onChange={(e) => setData('category_id', e.target.value)}
                            className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none ${errors.category_id ? 'border-red-400' : 'border-gray-300'}`}
                        >
                            <option value="">— Sem categoria —</option>
                            {categories.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        {errors.category_id && <p className="mt-1 text-xs text-red-500">{errors.category_id}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Pagador *</label>
                        <div className="mt-2 flex gap-2">
                            {OWNERSHIP_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setData('ownership', opt.value)}
                                    className={`flex-1 rounded-lg border py-2 text-xs font-medium transition-colors ${
                                        data.ownership === opt.value
                                            ? OWNERSHIP_BADGE[opt.value] + ' border-transparent'
                                            : 'border-gray-300 text-gray-500 hover:bg-gray-50'
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                        {errors.ownership && <p className="mt-1 text-xs text-red-500">{errors.ownership}</p>}
                    </div>

                    <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                            type="checkbox"
                            checked={data.active}
                            onChange={(e) => setData('active', e.target.checked)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        Ativa (aparece nas próximas cobranças do dashboard)
                    </label>

                    <div className="flex justify-end gap-3 pt-1">
                        <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
                            Cancelar
                        </button>
                        <button type="submit" disabled={processing} className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
                            {processing ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar Despesa Fixa'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function FixedExpenses({ fixedExpenses, categories }) {
    const { flash } = usePage().props;
    const [showModal, setShowModal] = useState(false);
    const [editingExpense, setEditingExpense] = useState(null);

    const openCreate = () => { setEditingExpense(null); setShowModal(true); };
    const openEdit = (expense) => { setEditingExpense(expense); setShowModal(true); };
    const closeModal = () => { setShowModal(false); setEditingExpense(null); };

    const handleDelete = (expense) => {
        if (!confirm(`Remover a despesa fixa "${expense.description}"?`)) return;
        router.delete(route('fixedExpenses.destroy', expense.id), { preserveScroll: true });
    };

    const total = fixedExpenses.filter((e) => e.active).reduce((sum, e) => sum + Number(e.amount), 0);

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800">Despesas Fixas</h2>}>
            <Head title="Despesas Fixas" />

            {showModal && (
                <FixedExpenseFormModal categories={categories} fixedExpense={editingExpense} onClose={closeModal} />
            )}

            {flash?.success && (
                <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                    {flash.success}
                </div>
            )}

            <p className="mb-4 max-w-2xl text-sm text-gray-500">
                Cadastre as despesas fixas mensais (aluguel, assinaturas, financiamentos...). Elas aparecem
                automaticamente no dashboard como expectativa de cobrança, com base no dia informado.
            </p>

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-gray-500">
                    Total mensal ativo: <span className="font-semibold text-gray-800">{fmt(total)}</span>
                </p>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                    <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Nova Despesa Fixa
                </button>
            </div>

            {fixedExpenses.length === 0 ? (
                <div className="rounded-xl border border-gray-200 bg-white py-16 text-center shadow-sm">
                    <p className="text-gray-400">Nenhuma despesa fixa cadastrada ainda.</p>
                    <button onClick={openCreate} className="mt-3 text-sm text-indigo-500 underline">
                        Criar a primeira despesa fixa
                    </button>
                </div>
            ) : (
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                                <tr>
                                    <th className="px-4 py-3 text-left">Descrição</th>
                                    <th className="px-4 py-3 text-right">Valor</th>
                                    <th className="px-4 py-3 text-center">Dia</th>
                                    <th className="px-4 py-3 text-left">Categoria</th>
                                    <th className="px-4 py-3 text-left">Pagador</th>
                                    <th className="px-4 py-3 text-center">Status</th>
                                    <th className="px-4 py-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {fixedExpenses.map((expense) => (
                                    <tr key={expense.id} className={`hover:bg-gray-50 ${!expense.active ? 'opacity-50' : ''}`}>
                                        <td className="px-4 py-3 font-medium text-gray-800">{expense.description}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right text-gray-600">{fmt(expense.amount)}</td>
                                        <td className="px-4 py-3 text-center text-gray-600">{expense.due_day}</td>
                                        <td className="px-4 py-3 text-gray-700">{expense.category ?? <span className="text-gray-400">—</span>}</td>
                                        <td className="px-4 py-3">
                                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${OWNERSHIP_BADGE[expense.ownership]}`}>
                                                {OWNERSHIP_OPTIONS.find((o) => o.value === expense.ownership)?.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${expense.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                                {expense.active ? 'Ativa' : 'Inativa'}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right">
                                            <button onClick={() => openEdit(expense)} className="mr-3 text-xs text-indigo-500 hover:text-indigo-700">
                                                Editar
                                            </button>
                                            <button onClick={() => handleDelete(expense)} className="text-xs text-red-400 hover:text-red-600">
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
