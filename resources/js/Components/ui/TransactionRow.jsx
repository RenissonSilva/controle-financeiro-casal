const ArrowUp = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="19" x2="12" y2="5" />
        <polyline points="5 12 12 5 19 12" />
    </svg>
);

const ArrowDown = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <polyline points="19 12 12 19 5 12" />
    </svg>
);

// Linha de lançamento usada nas listas "Próximas despesas" e "Histórico".
// tipo: 'receita' (seta verde para cima) | 'despesa' (seta prateada para baixo).
export default function TransactionRow({ date, nome, categoria, valor, tipo }) {
    const isReceita = tipo === 'receita';

    return (
        <div className="flex items-center gap-3 rounded-[10px] px-2.5 py-2 transition-colors duration-150 hover:bg-text/5">
            <span className="min-w-[42px] flex-shrink-0 text-xs font-medium text-text/50">{date}</span>

            <div
                className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${
                    isReceita ? 'bg-[#22c55e]/15 text-[#8ED79B]' : 'bg-[#b9bebe]/15 text-[#b9bfbf]'
                }`}
            >
                {isReceita ? <ArrowUp /> : <ArrowDown />}
            </div>

            <div className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium">{nome}</span>
                {categoria && <span className="block truncate text-[11px] text-text/45">{categoria}</span>}
            </div>

            <span className={`flex-shrink-0 text-[13px] font-semibold tabular-nums ${isReceita ? 'text-[#8ED79B]' : 'text-[#b9bfbf]'}`}>
                {isReceita ? `+${valor}` : `-${valor}`}
            </span>
        </div>
    );
}
