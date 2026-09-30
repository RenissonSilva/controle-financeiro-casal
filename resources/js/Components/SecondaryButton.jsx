export default function SecondaryButton({
    type = 'button',
    className = '',
    disabled,
    children,
    ...props
}) {
    return (
        <button
            {...props}
            type={type}
            className={`inline-flex items-center justify-center gap-1.5 rounded-[9px] border border-text/16 px-4 py-2 font-heading text-sm font-medium text-text transition-colors hover:bg-text/7 focus:outline-none focus:ring-2 focus:ring-teal/50 disabled:pointer-events-none disabled:opacity-50 ${className}`}
            disabled={disabled}
        >
            {children}
        </button>
    );
}
