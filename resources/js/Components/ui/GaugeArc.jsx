import { theme } from '@/theme/tokens';

// Arco de progresso 0-100 usado no card "Saúde financeira". Não há hoje uma
// fórmula dessa métrica definida no backend (ver PLANNING.md) — não alimentar
// com valores fictícios fora do contexto de um mockup.
// Gradiente/filtro do SVG usam theme.x (atributos de <defs>/<stop> não são
// estilizáveis via className).
export default function GaugeArc({ score }) {
    const offset = 283 - 283 * (Math.max(0, Math.min(100, score)) / 100);

    return (
        <div className="relative h-[50px] w-[84px]">
            <svg viewBox="0 0 220 124" className="block w-full overflow-visible">
                <defs>
                    <linearGradient id="gauge" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0" stopColor={theme.gaugeStart} />
                        <stop offset="1" stopColor={theme.strongAccent} />
                    </linearGradient>
                    <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
                        <feGaussianBlur stdDeviation="6" result="b" />
                        <feMerge>
                            <feMergeNode in="b" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>
                <path d="M20 110 A 90 90 0 0 1 200 110" fill="none" className="stroke-text/[0.09]" strokeWidth={17} strokeLinecap="round" />
                <path
                    d="M20 110 A 90 90 0 0 1 200 110"
                    fill="none"
                    stroke="url(#gauge)"
                    strokeWidth={17}
                    strokeLinecap="round"
                    filter="url(#glow)"
                    strokeDasharray="283"
                    strokeDashoffset={offset}
                    className="[animation:drawArc_1.1s_cubic-bezier(.2,.8,.2,1)]"
                />
            </svg>
            <div className="absolute inset-x-0 bottom-0.5 text-center">
                <span className="font-heading text-[15px] font-semibold">{score}%</span>
            </div>
        </div>
    );
}
