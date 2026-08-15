export default function SectionHeader({ title, subtitle, icon, action, className = '' }) {
    return (
        <div className={`flex items-baseline justify-between gap-3 ${className}`}>
            <div className="flex items-center gap-2">
                {icon && (
                    <span className="grid h-[26px] w-[26px] flex-none place-items-center rounded-full bg-accent/16">
                        {icon}
                    </span>
                )}
                <div>
                    <h2 className="text-[15px] font-semibold">{title}</h2>
                    {subtitle && <span className="block text-[11.5px] text-text/45">{subtitle}</span>}
                </div>
            </div>
            {action}
        </div>
    );
}
