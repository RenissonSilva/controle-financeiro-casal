// bg=false → o caller assume o próprio background (ex: gradientes de destaque)
// via className, evitando disputa de especificidade com o bg-surface padrão.
export default function Card({ hover = true, bg = true, className = '', children, ...props }) {
    const classes = [
        'rounded-[18px] p-5 shadow-[inset_0_0_0_1px_rgb(var(--color-text-rgb)/0.08),0_8px_24px_-6px_rgba(0,0,0,0.2)]',
        bg && 'bg-surface',
        hover && 'transition-transform duration-200 ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-0.5',
        className,
    ].filter(Boolean).join(' ');

    return (
        <div className={classes} {...props}>
            {children}
        </div>
    );
}
