import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, usePage } from '@inertiajs/react';

export default function Settings({ settings }) {
    const { flash } = usePage().props;

    const { data, setData, put, processing, errors } = useForm({
        payer1_name:   settings.payer1_name,
        payer2_name:   settings.payer2_name,
        payer1_salary: settings.payer1_salary,
        payer2_salary: settings.payer2_salary,
    });

    const totalSalary = Number(data.payer1_salary) + Number(data.payer2_salary);
    const p1 = totalSalary > 0 ? ((data.payer1_salary / totalSalary) * 100).toFixed(1) : 50;
    const p2 = totalSalary > 0 ? ((data.payer2_salary / totalSalary) * 100).toFixed(1) : 50;

    const submit = (e) => {
        e.preventDefault();
        put(route('settings.update'));
    };

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800">Configurações</h2>}>
            <Head title="Configurações" />

            {flash?.success && (
                <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 border border-green-200">
                    {flash.success}
                </div>
            )}

            <div className="max-w-2xl">
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h3 className="mb-1 text-base font-semibold text-gray-800">Rendas dos Pagadores</h3>
                    <p className="mb-5 text-sm text-gray-500">
                        As rendas definem a proporção de responsabilidade em gastos compartilhados.
                    </p>

                    <form onSubmit={submit} className="space-y-5">
                        {/* Pagador 1 */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Nome do Pagador 1</label>
                                <input
                                    type="text"
                                    value={data.payer1_name}
                                    onChange={(e) => setData('payer1_name', e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                                />
                                {errors.payer1_name && <p className="mt-1 text-xs text-red-500">{errors.payer1_name}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Renda Mensal (R$)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={data.payer1_salary}
                                    onChange={(e) => setData('payer1_salary', e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                                />
                                {errors.payer1_salary && <p className="mt-1 text-xs text-red-500">{errors.payer1_salary}</p>}
                            </div>
                        </div>

                        {/* Pagador 2 */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Nome do Pagador 2</label>
                                <input
                                    type="text"
                                    value={data.payer2_name}
                                    onChange={(e) => setData('payer2_name', e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                                />
                                {errors.payer2_name && <p className="mt-1 text-xs text-red-500">{errors.payer2_name}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Renda Mensal (R$)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={data.payer2_salary}
                                    onChange={(e) => setData('payer2_salary', e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                                />
                                {errors.payer2_salary && <p className="mt-1 text-xs text-red-500">{errors.payer2_salary}</p>}
                            </div>
                        </div>

                        {/* Preview de percentuais */}
                        <div className="rounded-lg bg-indigo-50 p-4">
                            <p className="text-sm font-medium text-indigo-700">Responsabilidade proporcional:</p>
                            <div className="mt-2 flex gap-6">
                                <span className="text-sm text-indigo-600">
                                    <strong>{data.payer1_name || 'Pagador 1'}:</strong> {p1}%
                                </span>
                                <span className="text-sm text-indigo-600">
                                    <strong>{data.payer2_name || 'Pagador 2'}:</strong> {p2}%
                                </span>
                            </div>
                            {/* Barra visual de proporção */}
                            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-indigo-200">
                                <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${p1}%` }} />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={processing}
                            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                        >
                            {processing ? 'Salvando...' : 'Salvar Configurações'}
                        </button>
                    </form>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
