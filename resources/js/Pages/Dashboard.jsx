import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import {
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

const fmt = (v) =>
    Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function SummaryCard({ label, value, sub, color = 'indigo' }) {
    const colors = {
        indigo:  'bg-indigo-50  border-indigo-200  text-indigo-700',
        emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
        rose:    'bg-rose-50    border-rose-200    text-rose-700',
        amber:   'bg-amber-50   border-amber-200   text-amber-700',
    };
    return (
        <div className={`rounded-xl border p-5 ${colors[color]}`}>
            <p className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</p>
            <p className="mt-1 text-2xl font-bold">{fmt(value)}</p>
            {sub && <p className="mt-1 text-xs opacity-60">{sub}</p>}
        </div>
    );
}

export default function Dashboard({ month, settings, summary, byCategory, monthlyEvolution }) {
    const changeMonth = (e) => router.get(route('dashboard'), { month: e.target.value });

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800">Dashboard</h2>}>
            <Head title="Dashboard" />

            {/* Seletor de mês */}
            <div className="mb-6 flex items-center gap-3">
                <label className="text-sm font-medium text-gray-600">Mês:</label>
                <input
                    type="month"
                    value={month}
                    onChange={changeMonth}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
                />
            </div>

            {/* Cards de resumo */}
            <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
                <SummaryCard label="Total do Mês" value={summary.total} color="indigo" />
                <SummaryCard
                    label={`${settings.payer1_name} paga`}
                    value={summary.payer1_grand}
                    sub={`Individual ${fmt(summary.payer1_individual)} + Rateio ${fmt(summary.payer1_shared)} (${settings.payer1_percent}%)`}
                    color="emerald"
                />
                <SummaryCard
                    label={`${settings.payer2_name} paga`}
                    value={summary.payer2_grand}
                    sub={`Individual ${fmt(summary.payer2_individual)} + Rateio ${fmt(summary.payer2_shared)} (${settings.payer2_percent}%)`}
                    color="rose"
                />
                <SummaryCard label="Gastos Compartilhados" value={summary.shared_total} color="amber" />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Gráfico de pizza — gastos por categoria */}
                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <h3 className="mb-4 text-sm font-semibold text-gray-700">Gastos por Categoria</h3>
                    {byCategory.length === 0 ? (
                        <p className="py-8 text-center text-sm text-gray-400">Nenhuma despesa neste mês.</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                                <Pie
                                    data={byCategory}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={90}
                                    label={({ name, percent }) =>
                                        `${name} ${(percent * 100).toFixed(0)}%`
                                    }
                                >
                                    {byCategory.map((entry, i) => (
                                        <Cell key={i} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(v) => fmt(v)} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Gráfico de linha — evolução mensal */}
                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <h3 className="mb-4 text-sm font-semibold text-gray-700">Evolução dos Últimos 6 Meses</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={monthlyEvolution}>
                            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(1)}k`} />
                            <Tooltip formatter={(v) => fmt(v)} />
                            <Line
                                type="monotone"
                                dataKey="total"
                                stroke="#6366f1"
                                strokeWidth={2}
                                dot={{ r: 4 }}
                                name="Total"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Nota sobre o rateio */}
            <p className="mt-6 text-xs text-gray-400">
                * O rateio dos gastos "Nós" é proporcional à renda:{' '}
                {settings.payer1_name} {settings.payer1_percent}% /{' '}
                {settings.payer2_name} {settings.payer2_percent}%.{' '}
                Ajuste em{' '}
                <a href={route('settings.show')} className="text-indigo-500 underline">
                    Configurações
                </a>.
            </p>
        </AuthenticatedLayout>
    );
}
