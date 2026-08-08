import { router } from '@inertiajs/react';
import { useState } from 'react';

const fmt = (v) =>
    Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtDate = (v) =>
    new Date(v + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

// Valor de uma despesa fixa variável (ex: conta de luz): permite ajustar o valor real
// daquela cobrança específica sem alterar a estimativa base cadastrada.
function FixedExpenseAmount({ item }) {
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState(item.amount);

    if (!item.variable_amount) {
        return <span className="w-24 text-right text-sm font-medium text-gray-700">{fmt(item.amount)}</span>;
    }

    if (editing) {
        const save = (e) => {
            e.preventDefault();
            router.put(
                route('fixedExpenses.occurrence.update', item.id),
                { due_date: item.due_date, amount: value },
                { preserveScroll: true, onSuccess: () => setEditing(false) }
            );
        };

        return (
            <form onSubmit={save} className="flex items-center gap-1">
                <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    autoFocus
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onBlur={() => setEditing(false)}
                    className="w-24 rounded border border-gray-300 px-2 py-1 text-right text-sm focus:border-indigo-500 focus:outline-none"
                />
            </form>
        );
    }

    const restoreEstimate = (e) => {
        e.stopPropagation();
        router.delete(route('fixedExpenses.occurrence.destroy', item.occurrence_id), { preserveScroll: true });
    };

    return (
        <div className="flex flex-col items-end">
            <button
                type="button"
                onClick={() => { setValue(item.amount); setEditing(true); }}
                className="text-right text-sm font-medium text-gray-700 hover:underline"
                title="Clique para ajustar o valor real deste mês"
            >
                {fmt(item.amount)}
            </button>
            {item.occurrence_id ? (
                <button type="button" onClick={restoreEstimate} className="text-[10px] text-gray-400 hover:text-indigo-500 hover:underline">
                    ajustado · restaurar estimativa
                </button>
            ) : (
                <span className="text-[10px] text-gray-400">estimado</span>
            )}
        </div>
    );
}

// Painel com a projeção das despesas fixas para o ciclo de fatura selecionado.
// Reutilizado no Dashboard e na tela de Despesas.
export default function FixedExpensesPanel({ fixedExpenses, className = '' }) {
    return (
        <div className={`rounded-xl border border-gray-200 bg-white p-5 shadow-sm ${className}`}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-gray-700">Despesas Fixas do Mês</h3>
                <p className="text-sm text-gray-500">
                    Expectativa total: <span className="font-semibold text-gray-800">{fmt(fixedExpenses.total)}</span>
                </p>
            </div>

            {fixedExpenses.items.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">
                    Nenhuma despesa fixa cadastrada para este ciclo.{' '}
                    <a href={route('fixedExpenses.index')} className="text-indigo-500 underline">
                        Cadastrar despesas fixas
                    </a>.
                </p>
            ) : (
                <ul className="divide-y divide-gray-100">
                    {fixedExpenses.items.map((item) => (
                        <li key={item.id} className="flex items-center justify-between gap-3 py-2.5">
                            <div className="flex min-w-0 items-center gap-3">
                                <span
                                    className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                                    style={{ backgroundColor: item.color }}
                                />
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-gray-800">{item.description}</p>
                                    <p className="text-xs text-gray-400">
                                        {item.category ?? 'Sem categoria'} · Cobra em {fmtDate(item.due_date)}
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-shrink-0 items-center gap-3">
                                <span
                                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                        item.is_upcoming
                                            ? 'bg-amber-100 text-amber-700'
                                            : 'bg-gray-100 text-gray-500'
                                    }`}
                                >
                                    {item.is_upcoming ? 'Próxima' : 'Já cobrada'}
                                </span>
                                <FixedExpenseAmount item={item} />
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
