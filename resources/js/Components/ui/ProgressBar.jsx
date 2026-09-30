// Barra de progresso (0-100) — trilho neutro, preenchimento em limão.
export default function ProgressBar({ value = 0, className = 'bg-accent' }) {
    return (
        <div className="h-1.5 overflow-hidden rounded-[3px] bg-track">
            <div
                className={`h-full origin-left rounded-[3px] [animation:riseBar_.8s_cubic-bezier(.2,.8,.2,1)] ${className}`}
                style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
            />
        </div>
    );
}
