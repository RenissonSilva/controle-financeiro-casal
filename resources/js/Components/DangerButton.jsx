export default function DangerButton({
    className = '',
    disabled,
    children,
    ...props
}) {
    return (
        <button
            {...props}
            className={`inline-flex items-center justify-center gap-1.5 rounded-[9px] bg-red/85 px-4 py-2 font-heading text-sm font-medium text-bg transition-colors hover:bg-red focus:outline-none focus:ring-2 focus:ring-red/50 disabled:pointer-events-none disabled:opacity-50 ${className}`}
            disabled={disabled}
        >
            {children}
        </button>
    );
}
