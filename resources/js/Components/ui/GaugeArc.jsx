// Meio-arco 0-100 do card "Saúde financeira" (96×56). `tone` é a classe de
// stroke do arco: stroke-warning (Atenção), stroke-accent (Boa/Excelente), stroke-red (Crítica).
export default function GaugeArc({ score, tone = 'stroke-warning' }) {
    const value = Math.max(0, Math.min(100, score || 0));
    const arc = 'M8 52 A40 40 0 0 1 88 52';

    return (
        <svg width="96" height="56" viewBox="0 0 96 56" aria-hidden="true" className="flex-none">
            <path d={arc} fill="none" className="stroke-track" strokeWidth="8" strokeLinecap="round" />
            {value > 0 && (
                <path d={arc} fill="none" className={tone} strokeWidth="8" strokeLinecap="round" pathLength="100" strokeDasharray={`${value} 100`} />
            )}
        </svg>
    );
}
