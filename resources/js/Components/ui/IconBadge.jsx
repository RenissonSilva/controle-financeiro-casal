// Círculo de 26px com ícone, usado nos títulos de card do Sovinna.
// tone: 'accent' (padrão) | 'income' | 'expense'
const TONES = {
    accent: 'bg-teal/16',
    income: 'bg-teal/16',
    expense: 'bg-red/16',
};

export default function IconBadge({ children, tone = 'accent', className = '' }) {
    return (
        <span className={`grid h-[26px] w-[26px] flex-none place-items-center rounded-full ${TONES[tone]} ${className}`}>
            {children}
        </span>
    );
}
