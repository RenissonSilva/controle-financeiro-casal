// Botão de ação principal (mesmo do "Salvar alterações" das Configurações).
export default function PrimaryButton({
    className = '',
    disabled,
    children,
    ...props
}) {
    return (
        <button
            {...props}
            className={`inline-flex items-center justify-center gap-1.5 rounded-[9px] bg-teal/80 px-[18px] py-2.5 font-heading text-[13px] font-medium text-text transition-colors hover:bg-teal/70 focus:outline-none focus:ring-2 focus:ring-teal/50 disabled:pointer-events-none disabled:opacity-60 ${className}`}
            disabled={disabled}
        >
            {children}
        </button>
    );
}
