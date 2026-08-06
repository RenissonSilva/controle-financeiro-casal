import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

const PLUGGY_CONNECT_SCRIPT_URL = 'https://cdn.pluggy.ai/pluggy-connect/v2.8.2/pluggy-connect.js';

const OWNER_OPTIONS = [
    { value: 'payer1', label: 'Reni' },
    { value: 'payer2', label: 'Lua' },
];

const OWNER_BADGE = {
    payer1: 'bg-emerald-100 text-emerald-700',
    payer2: 'bg-rose-100 text-rose-700',
};

const STATUS_BADGE = {
    UPDATED:     'bg-emerald-100 text-emerald-700',
    UPDATING:    'bg-amber-100 text-amber-700',
    LOGIN_ERROR: 'bg-red-100 text-red-700',
    OUTDATED:    'bg-red-100 text-red-700',
};

function useScript(src) {
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) {
            setLoaded(true);
            return;
        }

        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = () => setLoaded(true);
        document.body.appendChild(script);
    }, [src]);

    return loaded;
}

export default function OpenFinance({ items, useSandbox }) {
    const { flash } = usePage().props;
    const scriptLoaded = useScript(PLUGGY_CONNECT_SCRIPT_URL);
    const [owner, setOwner] = useState('payer1');
    const [connecting, setConnecting] = useState(false);

    const handleConnect = async () => {
        setConnecting(true);
        try {
            const { data } = await window.axios.post(route('openFinance.connectToken'));

            const pluggyConnect = new window.PluggyConnect({
                connectToken: data.accessToken,
                includeSandbox: useSandbox,
                onSuccess: (itemData) => {
                    router.post(route('openFinance.items.store'), {
                        item_id: itemData.item.id,
                        connector_name: itemData.item.connector?.name ?? null,
                        owner,
                    }, { preserveScroll: true });
                },
                onError: (error) => {
                    console.error('Pluggy Connect error', error);
                    alert('Não foi possível conectar ao banco. Tente novamente.');
                },
            });

            pluggyConnect.init();
        } catch (error) {
            console.error(error);
            alert('Não foi possível iniciar a conexão. Verifique as credenciais do Pluggy no .env.');
        } finally {
            setConnecting(false);
        }
    };

    const handleSync = (item) => {
        router.post(route('openFinance.items.sync', item.id), {}, { preserveScroll: true });
    };

    const handleOwnerChange = (item, newOwner) => {
        router.put(route('openFinance.items.update', item.id), { owner: newOwner }, { preserveScroll: true });
    };

    const handleRemove = (item) => {
        if (!confirm(`Remover a conexão com "${item.connector_name ?? 'este banco'}"? As despesas já importadas não serão apagadas.`)) return;
        router.delete(route('openFinance.items.destroy', item.id), { preserveScroll: true });
    };

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800">Open Finance</h2>}>
            <Head title="Open Finance" />

            {flash?.success && (
                <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                    {flash.success}
                </div>
            )}

            <p className="mb-6 max-w-2xl text-sm text-gray-500">
                Conecte suas contas bancárias via Open Finance (Pluggy) para importar despesas automaticamente.
                As transações novas entram como pendentes e passam pela categorização por IA, igual à importação por CSV.
            </p>

            <div className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Conta de</label>
                    <div className="mt-2 flex gap-2">
                        {OWNER_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => setOwner(opt.value)}
                                className={`rounded-lg border px-4 py-2 text-xs font-medium transition-colors ${
                                    owner === opt.value
                                        ? OWNER_BADGE[opt.value] + ' border-transparent'
                                        : 'border-gray-300 text-gray-500 hover:bg-gray-50'
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    onClick={handleConnect}
                    disabled={!scriptLoaded || connecting}
                    className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                    {connecting ? 'Abrindo...' : !scriptLoaded ? 'Carregando...' : 'Conectar novo banco'}
                </button>
            </div>

            {items.length === 0 ? (
                <div className="rounded-xl border border-gray-200 bg-white py-16 text-center shadow-sm">
                    <p className="text-gray-400">Nenhuma conexão criada ainda.</p>
                </div>
            ) : (
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                                <tr>
                                    <th className="px-4 py-3 text-left">Banco</th>
                                    <th className="px-4 py-3 text-left">Conta de</th>
                                    <th className="px-4 py-3 text-center">Status</th>
                                    <th className="px-4 py-3 text-left">Última sincronização</th>
                                    <th className="px-4 py-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {items.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium text-gray-800">
                                            {item.connector_name ?? <span className="text-gray-400">—</span>}
                                        </td>
                                        <td className="px-4 py-3">
                                            <select
                                                value={item.owner}
                                                onChange={(e) => handleOwnerChange(item, e.target.value)}
                                                className={`rounded-full border-0 px-2 py-0.5 text-xs font-medium ${OWNER_BADGE[item.owner]}`}
                                            >
                                                {OWNER_OPTIONS.map((opt) => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[item.status] ?? 'bg-gray-100 text-gray-500'}`}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">
                                            {item.last_synced_at ?? <span className="text-gray-400">Nunca</span>}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right">
                                            <Link href={route('openFinance.items.show', item.id)} className="mr-3 text-xs text-gray-500 hover:text-gray-700">
                                                Ver dados
                                            </Link>
                                            <button onClick={() => handleSync(item)} className="mr-3 text-xs text-indigo-500 hover:text-indigo-700">
                                                Sincronizar
                                            </button>
                                            <button onClick={() => handleRemove(item)} className="text-xs text-red-400 hover:text-red-600">
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
