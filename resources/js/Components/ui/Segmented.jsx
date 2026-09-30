// Controle segmentado (filtros "Todos · Nós · Reni · Lua"), no estilo das Configurações.
// options: [{ value, label, count? }]
export default function Segmented({ options, value, onChange, size = 'md', className = '' }) {
    const item = size === 'sm' ? 'px-[9px] py-[4px] text-[12px]' : 'px-[11px] py-[6px] text-[12.5px]';

    return (
        <div className={`flex gap-0.5 rounded-[10px] bg-text/[0.035] p-[3px] shadow-[inset_0_0_0_1px_rgb(var(--color-text-rgb)/0.09)] ${className}`}>
            {options.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    onClick={() => onChange(option.value)}
                    className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-[8px] ${item} transition-colors ${
                        value === option.value ? 'bg-teal/30 text-text' : 'text-text/60 hover:bg-text/8'
                    }`}
                >
                    {option.label}
                    {option.count != null && (
                        <span className={`tabular-nums ${value === option.value ? 'text-text/70' : 'text-text/40'}`}>{option.count}</span>
                    )}
                </button>
            ))}
        </div>
    );
}
