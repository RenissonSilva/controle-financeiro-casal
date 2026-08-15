import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { X, RefreshCw, Plus } from 'lucide-react';

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

const EMPTY_FORM = { pattern: '', amount: '', category_id: '', ownership: 'both' };

// ─── Modal de criação/edição de regra ─────────────────────────────────────────
function RuleFormModal({ categories, rule, onClose }) {
    const isEditing = Boolean(rule);
    const { data, setData, post, put, processing, errors, reset } = useForm(
        rule
            ? {
                  pattern:     rule.pattern,
                  amount:      rule.amount ?? '',
                  category_id: rule.category_id,
                  ownership:   rule.ownership,
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
            put(route('categorizationRules.update', rule.id), options);
        } else {
            post(route('categorizationRules.store'), options);
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
                        {isEditing ? 'Editar Regra' : 'Nova Regra'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="h-5 w-5" strokeWidth={2} />
                    </button>
                </div>

                <form onSubmit={submit} className="space-y-4 px-6 py-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Trecho da descrição *</label>
                        <input
                            type="text"
                            autoFocus
                            value={data.pattern}
                            onChange={(e) => setData('pattern', e.target.value)}
                            placeholder="Ex: hbomax"
                            className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none ${errors.pattern ? 'border-red-400' : 'border-gray-300'}`}
                        />
                        <p className="mt-1 text-xs text-gray-400">
                            Aplica quando a descrição da despesa contiver esse trecho, em qualquer posição.
                        </p>
                        {errors.pattern && <p className="mt-1 text-xs text-red-500">{errors.pattern}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Valor (R$)</label>
                        <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={data.amount}
                            onChange={(e) => setData('amount', e.target.value)}
                            placeholder="Opcional — deixe em branco para qualquer valor"
                            className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none ${errors.amount ? 'border-red-400' : 'border-gray-300'}`}
                        />
                        {errors.amount && <p className="mt-1 text-xs text-red-500">{errors.amount}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Categoria *</label>
                        <select
                            value={data.category_id}
                            onChange={(e) => setData('category_id', e.target.value)}
                            className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none ${errors.category_id ? 'border-red-400' : 'border-gray-300'}`}
                        >
                            <option value="">— Selecione —</option>
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

                    <div className="flex justify-end gap-3 pt-1">
                        <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
                            Cancelar
                        </button>
                        <button type="submit" disabled={processing} className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
                            {processing ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar Regra'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function CategorizationRules({ rules, categories }) {
    const { flash } = usePage().props;
    const [showModal, setShowModal] = useState(false);
    const [editingRule, setEditingRule] = useState(null);
    const [applying, setApplying] = useState(false);

    const openCreate = () => { setEditingRule(null); setShowModal(true); };
    const openEdit = (rule) => { setEditingRule(rule); setShowModal(true); };
    const closeModal = () => { setShowModal(false); setEditingRule(null); };

    const handleDelete = (rule) => {
        if (!confirm(`Remover a regra "${rule.pattern}"?`)) return;
        router.delete(route('categorizationRules.destroy', rule.id), { preserveScroll: true });
    };

    const handleApply = () => {
        if (!confirm('Isso vai revisar todas as despesas já lançadas e recategorizar as que baterem com alguma regra. Continuar?')) return;
        setApplying(true);
        router.post(route('categorizationRules.apply'), {}, {
            preserveScroll: true,
            onFinish: () => setApplying(false),
        });
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold text-gray-800">Regras de Categorização</h2>}
            breadcrumbs={[{ label: 'Regras' }]}
        >
            <Head title="Regras de Categorização" />

            {showModal && (
                <RuleFormModal categories={categories} rule={editingRule} onClose={closeModal} />
            )}

            {flash?.success && (
                <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                    {flash.success}
                </div>
            )}

            <p className="mb-4 max-w-2xl text-sm text-gray-500">
                Crie regras para categorizar despesas automaticamente sempre que aparecer uma cobrança
                parecida — na importação do CSV e ao usar "Categorizar com IA". A regra bate quando a
                descrição contém o trecho informado (e, se você definir um valor, quando o valor também for igual).
            </p>

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <button
                    onClick={handleApply}
                    disabled={applying || rules.length === 0}
                    className="flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-white px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-60"
                >
                    <RefreshCw className="h-4 w-4" strokeWidth={2} />
                    {applying ? 'Aplicando...' : 'Aplicar regras às despesas existentes'}
                </button>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                    <Plus className="h-4 w-4" strokeWidth={2} />
                    Nova Regra
                </button>
            </div>

            {rules.length === 0 ? (
                <div className="rounded-xl border border-gray-200 bg-white py-16 text-center shadow-sm">
                    <p className="text-gray-400">Nenhuma regra cadastrada ainda.</p>
                    <button onClick={openCreate} className="mt-3 text-sm text-indigo-500 underline">
                        Criar a primeira regra
                    </button>
                </div>
            ) : (
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                                <tr>
                                    <th className="px-4 py-3 text-left">Descrição contém</th>
                                    <th className="px-4 py-3 text-right">Valor</th>
                                    <th className="px-4 py-3 text-left">Categoria</th>
                                    <th className="px-4 py-3 text-left">Pagador</th>
                                    <th className="px-4 py-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {rules.map((rule) => (
                                    <tr key={rule.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium text-gray-800">{rule.pattern}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right text-gray-600">
                                            {rule.amount != null ? fmt(rule.amount) : <span className="text-gray-400">qualquer valor</span>}
                                        </td>
                                        <td className="px-4 py-3 text-gray-700">{rule.category}</td>
                                        <td className="px-4 py-3">
                                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${OWNERSHIP_BADGE[rule.ownership]}`}>
                                                {OWNERSHIP_OPTIONS.find((o) => o.value === rule.ownership)?.label}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right">
                                            <button onClick={() => openEdit(rule)} className="mr-3 text-xs text-indigo-500 hover:text-indigo-700">
                                                Editar
                                            </button>
                                            <button onClick={() => handleDelete(rule)} className="text-xs text-red-400 hover:text-red-600">
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
