// Cabeçalho de card: título 15/600 (ícone opcional em cinza) + subtítulo mudo + ação à direita.
export default function SectionHeader({ title, subtitle, icon, action, className = '' }) {
    return (
        <div className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 ${className}`}>
            <div className="min-w-0">
                <h2 className="flex items-center gap-2 text-[15px] font-semibold">
                    {icon && <span className="grid flex-none place-items-center text-muted [&_svg]:h-4 [&_svg]:w-4">{icon}</span>}
                    {title}
                </h2>
                {subtitle && <span className="mt-0.5 block text-[13px] text-muted">{subtitle}</span>}
            </div>
            {action}
        </div>
    );
}
