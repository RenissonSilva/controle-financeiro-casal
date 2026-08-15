import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { theme } from '@/theme/tokens';

// data: [{ nome, cor, valor, pct }]
// Recharts (Pie/Cell/Tooltip.contentStyle) recebe cor via props JS, não className —
// por isso theme.x ainda é usado aqui, mesmo com o resto convertido para Tailwind.
export default function DonutChart({ data, totalLabel = 'Total', totalValue, tooltipSuffix = '' }) {
    return (
        <div className="mt-1.5 flex flex-1 flex-wrap items-center justify-center gap-[18px]">
            <div className="relative h-[170px] w-[170px] flex-none">
                <div className="absolute -inset-2.5 rounded-full bg-[radial-gradient(circle,rgb(var(--color-accent-rgb)/0.15)_0%,transparent_70%)]" />
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            dataKey="valor"
                            nameKey="nome"
                            cx="50%"
                            cy="50%"
                            innerRadius={54}
                            outerRadius={70}
                            startAngle={90}
                            endAngle={-270}
                            paddingAngle={4}
                            cornerRadius={8}
                            stroke="none"
                        >
                            {data.map((c) => (
                                <Cell key={c.nome} fill={c.cor} />
                            ))}
                        </Pie>
                        <Tooltip
                            formatter={(value, name) => [`${value}${tooltipSuffix}`, name]}
                            contentStyle={{
                                background: theme.surface,
                                border: `1px solid rgba(${theme.textRgb},.12)`,
                                borderRadius: 8,
                                color: theme.text,
                                fontSize: 12,
                            }}
                            itemStyle={{ color: theme.text }}
                        />
                    </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 z-[2] grid place-content-center text-center">
                    <div className="text-[11px] uppercase tracking-[.1em] text-text/45">{totalLabel}</div>
                    <div className="font-heading text-xl font-semibold tracking-[-.02em]">{totalValue}</div>
                </div>
            </div>
            <div className="flex min-w-[120px] flex-1 flex-col gap-[9px]">
                {data.map((c) => (
                    <div key={c.nome} className="flex items-center gap-2 rounded-md px-1.5 py-[3px]">
                        <span className="h-2 w-2 flex-none rounded-full" style={{ background: c.cor, boxShadow: `0 0 6px ${c.cor}` }} />
                        <span className="flex-1 truncate text-[12.5px] font-medium">{c.nome}</span>
                        <span className="text-[12.5px] font-semibold tabular-nums text-text/80">{c.pct}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
