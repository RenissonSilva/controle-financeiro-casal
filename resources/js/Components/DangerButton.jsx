export default function DangerButton({
    className = '',
    disabled,
    children,
    ...props
}) {
    return (
        <button
            {...props}
            className={`inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-[10px] bg-red px-[18px] text-[14px] font-semibold text-on-accent transition-[filter] hover:brightness-[1.06] disabled:pointer-events-none disabled:opacity-50 ${className}`}
            disabled={disabled}
        >
            {children}
        </button>
    );
}
