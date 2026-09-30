// Botão de ação principal (limão) — mesmo visual do Button variant="primary".
export default function PrimaryButton({
    className = '',
    disabled,
    children,
    ...props
}) {
    return (
        <button
            {...props}
            className={`inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-[10px] bg-accent px-[18px] text-[14px] font-semibold text-on-accent transition-[filter] hover:brightness-[1.06] disabled:pointer-events-none disabled:opacity-60 ${className}`}
            disabled={disabled}
        >
            {children}
        </button>
    );
}
