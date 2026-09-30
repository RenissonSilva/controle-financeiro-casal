// Controle segmentado (filtros "Todos · Nós · Reni · Lua").
// options: [{ value, label, count? }]
export default function Segmented({ options, value, onChange, size = 'md', className = '' }) {
    const item = size === 'sm' ? 'h-8 px-2.5 text-[13px]' : 'h-9 px-3 text-[13px]';

    return (
        <div className={`flex max-w-full gap-0.5 overflow-x-auto rounded-[10px] border border-line bg-surface p-[3px] scroll-none ${className}`}>
            {options.map((option) => {
                const active = value === option.value;
                return (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => onChange(option.value)}
                        aria-pressed={active}
                        className={`inline-flex flex-none items-center gap-1.5 whitespace-nowrap rounded-[8px] font-medium transition-colors ${item} ${
                            active ? 'bg-inset text-text' : 'text-muted hover:text-text'
                        }`}
                    >
                        {option.label}
                        {option.count != null && (
                            <span className={`font-mono text-[12px] tabular-nums ${active ? 'text-secondary' : 'text-muted/80'}`}>{option.count}</span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
