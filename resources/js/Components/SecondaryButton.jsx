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
            className={`inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-[10px] border border-line-strong px-[18px] text-[14px] font-medium text-text transition-colors hover:bg-raised disabled:pointer-events-none disabled:opacity-50 ${className}`}
            disabled={disabled}
        >
            {children}
        </button>
    );
}
