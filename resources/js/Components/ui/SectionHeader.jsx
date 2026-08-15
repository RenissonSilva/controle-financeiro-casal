export default function SectionHeader({ title, subtitle, action, className = '' }) {
    return (
        <div className={`flex items-baseline justify-between gap-3 ${className}`}>
            <div>
                <h2 className="text-[15px] font-semibold">{title}</h2>
                {subtitle && <span className="block text-[11.5px] text-text/45">{subtitle}</span>}
            </div>
            {action}
        </div>
    );
}
