import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';

const OWNER_LABEL = {
    payer1: 'Reni',
    payer2: 'Lua',
};

const STATUS_BADGE = {
    UPDATED:     'bg-emerald-100 text-emerald-700',
    UPDATING:    'bg-amber-100 text-amber-700',
    LOGIN_ERROR: 'bg-red-100 text-red-700',
    OUTDATED:    'bg-red-100 text-red-700',
};

const fmt = (v) =>
    Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtDate = (v) => (v ? new Date(v).toLocaleDateString('pt-BR') : '—');

function AccountCard({ account }) {
    const [open, setOpen] = useState(true);

    return (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left"
            >
                <div>
                    <p className="font-medium text-gray-800">
                        {account.name ?? 'Conta'}
                        {account.number ? <span className="ml-2 text-xs text-gray-400">{account.number}</span> : null}
                    </p>
                    <p className="text-xs uppercase tracking-wide text-gray-400">
                        {[account.type, account.subtype].filter(Boolean).join(' · ') || '—'}
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-xs text-gray-400">Saldo</p>
                        <p className={`font-semibold ${Number(account.balance) < 0 ? 'text-red-600' : 'text-gray-800'}`}>
                            {account.balance != null ? fmt(account.balance) : '—'}
                        </p>
                    </div>
                    <span className="text-gray-400">{open ? '▲' : '▼'}</span>
                </div>
            </button>

            {open && (
                <div className="border-t border-gray-100">
                    {account.transactions.length === 0 ? (
                        <p className="px-4 py-6 text-center text-sm text-gray-400">Nenhuma transação nos últimos 3 meses.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                                    <tr>
                                        <th className="px-4 py-2 text-left">Data</th>
                                        <th className="px-4 py-2 text-left">Descrição</th>
                                        <th className="px-4 py-2 text-left">Categoria</th>
                                        <th className="px-4 py-2 text-center">Tipo</th>
                                        <th className="px-4 py-2 text-right">Valor</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {account.transactions.map((t) => (
                                        <tr key={t.id} className="hover:bg-gray-50">
                                            <td className="whitespace-nowrap px-4 py-2 text-gray-600">{fmtDate(t.date)}</td>
                                            <td className="px-4 py-2 text-gray-800">{t.description}</td>
                                            <td className="px-4 py-2 text-gray-500">{t.category ?? <span className="text-gray-300">—</span>}</td>
                                            <td className="px-4 py-2 text-center">
                                                <span
                                                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                                        t.type === 'CREDIT' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                                                    }`}
                                                >
                                                    {t.type === 'CREDIT' ? 'Entrada' : 'Saída'}
                                                </span>
                                            </td>
                                            <td className={`whitespace-nowrap px-4 py-2 text-right font-medium ${t.type === 'CREDIT' ? 'text-emerald-600' : 'text-gray-800'}`}>
                                                {fmt(t.amount)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function OpenFinanceDetails({ item, accounts }) {
    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center gap-3">
                    <Link href={route('openFinance.index')} className="text-sm text-gray-400 hover:text-gray-600">
                        ← Open Finance
                    </Link>
                    <h2 className="text-xl font-semibold text-gray-800">{item.connector_name ?? 'Conexão'}</h2>
                </div>
            }
        >
            <Head title={item.connector_name ?? 'Open Finance'} />

            <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <span className="text-sm text-gray-500">Conta de <strong className="text-gray-700">{OWNER_LABEL[item.owner] ?? item.owner}</strong></span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[item.status] ?? 'bg-gray-100 text-gray-500'}`}>
                    {item.status}
                </span>
                <span className="text-sm text-gray-400">Última sincronização: {item.last_synced_at ?? 'Nunca'}</span>
            </div>

            {accounts.length === 0 ? (
                <div className="rounded-xl border border-gray-200 bg-white py-16 text-center shadow-sm">
                    <p className="text-gray-400">Nenhuma conta encontrada para esta conexão.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {accounts.map((account) => (
                        <AccountCard key={account.id} account={account} />
                    ))}
                </div>
            )}
        </AuthenticatedLayout>
    );
}
