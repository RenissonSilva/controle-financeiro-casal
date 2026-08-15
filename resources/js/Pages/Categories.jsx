import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { X, Plus } from 'lucide-react';

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

const EMPTY_FORM = { name: '', color: '#6366f1', default_ownership: 'both' };

// ─── Modal de criação/edição de categoria ─────────────────────────────────────
function CategoryFormModal({ category, onClose }) {
    const isEditing = Boolean(category);
    const { data, setData, post, put, processing, errors, reset } = useForm(
        category
            ? {
                  name:              category.name,
                  color:             category.color,
                  default_ownership: category.default_ownership,
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
            put(route('categories.update', category.id), options);
        } else {
            post(route('categories.store'), options);
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
                        {isEditing ? 'Editar Categoria' : 'Nova Categoria'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="h-5 w-5" strokeWidth={2} />
                    </button>
                </div>

                <form onSubmit={submit} className="space-y-4 px-6 py-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Nome *</label>
                        <input
                            type="text"
                            autoFocus
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            placeholder="Ex: Alimentação"
                            className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none ${errors.name ? 'border-red-400' : 'border-gray-300'}`}
                        />
                        {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Cor</label>
                        <div className="mt-1 flex items-center gap-2">
                            <input
                                type="color"
                                value={data.color}
                                onChange={(e) => setData('color', e.target.value)}
                                className="h-9 w-12 cursor-pointer rounded border border-gray-300 p-1"
                            />
                            <input
                                type="text"
                                value={data.color}
                                onChange={(e) => setData('color', e.target.value)}
                                className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none ${errors.color ? 'border-red-400' : 'border-gray-300'}`}
                            />
                        </div>
                        {errors.color && <p className="mt-1 text-xs text-red-500">{errors.color}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Pagador padrão *</label>
                        <div className="mt-2 flex gap-2">
                            {OWNERSHIP_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setData('default_ownership', opt.value)}
                                    className={`flex-1 rounded-lg border py-2 text-xs font-medium transition-colors ${
                                        data.default_ownership === opt.value
                                            ? OWNERSHIP_BADGE[opt.value] + ' border-transparent'
                                            : 'border-gray-300 text-gray-500 hover:bg-gray-50'
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                        <p className="mt-1 text-xs text-gray-400">
                            Usado como pagador sugerido quando uma despesa é categorizada nessa categoria (via IA ou importação).
                        </p>
                        {errors.default_ownership && <p className="mt-1 text-xs text-red-500">{errors.default_ownership}</p>}
                    </div>

                    <div className="flex justify-end gap-3 pt-1">
                        <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
                            Cancelar
                        </button>
                        <button type="submit" disabled={processing} className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
                            {processing ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar Categoria'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Categories({ categories }) {
    const { flash } = usePage().props;
    const [showModal, setShowModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);

    const openCreate = () => { setEditingCategory(null); setShowModal(true); };
    const openEdit = (category) => { setEditingCategory(category); setShowModal(true); };
    const closeModal = () => { setShowModal(false); setEditingCategory(null); };

    const handleDelete = (category) => {
        const warning = category.expenses_count > 0
            ? ` Ela está em uso em ${category.expenses_count} despesa(s), que ficarão sem categoria.`
            : '';
        if (!confirm(`Remover a categoria "${category.name}"?${warning}`)) return;
        router.delete(route('categories.destroy', category.id), { preserveScroll: true });
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold text-gray-800">Categorias</h2>}
            breadcrumbs={[{ label: 'Categorias' }]}
        >
            <Head title="Categorias" />

            {showModal && (
                <CategoryFormModal category={editingCategory} onClose={closeModal} />
            )}

            {flash?.success && (
                <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                    {flash.success}
                </div>
            )}

            <p className="mb-4 max-w-2xl text-sm text-gray-500">
                Gerencie as categorias de despesas. O "pagador padrão" é sugerido automaticamente quando uma
                despesa é categorizada nessa categoria pela IA ou pela importação do CSV.
            </p>

            <div className="mb-4 flex justify-end">
                <button
                    onClick={openCreate}
                    className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                    <Plus className="h-4 w-4" strokeWidth={2} />
                    Nova Categoria
                </button>
            </div>

            {categories.length === 0 ? (
                <div className="rounded-xl border border-gray-200 bg-white py-16 text-center shadow-sm">
                    <p className="text-gray-400">Nenhuma categoria cadastrada ainda.</p>
                    <button onClick={openCreate} className="mt-3 text-sm text-indigo-500 underline">
                        Criar a primeira categoria
                    </button>
                </div>
            ) : (
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                                <tr>
                                    <th className="px-4 py-3 text-left">Categoria</th>
                                    <th className="px-4 py-3 text-left">Pagador padrão</th>
                                    <th className="px-4 py-3 text-right">Despesas</th>
                                    <th className="px-4 py-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {categories.map((category) => (
                                    <tr key={category.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className="h-3 w-3 flex-shrink-0 rounded-full"
                                                    style={{ backgroundColor: category.color }}
                                                />
                                                <span className="font-medium text-gray-800">{category.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${OWNERSHIP_BADGE[category.default_ownership]}`}>
                                                {OWNERSHIP_OPTIONS.find((o) => o.value === category.default_ownership)?.label}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right text-gray-600">
                                            {category.expenses_count}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right">
                                            <button onClick={() => openEdit(category)} className="mr-3 text-xs text-indigo-500 hover:text-indigo-700">
                                                Editar
                                            </button>
                                            <button onClick={() => handleDelete(category)} className="text-xs text-red-400 hover:text-red-600">
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
