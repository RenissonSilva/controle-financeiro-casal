// Ícone ao lado do título de card. tone: 'accent' (padrão, cinza) | 'income' | 'expense'.
const TONES = {
    accent: 'text-muted',
    income: 'text-accent',
    expense: 'text-red',
};

export default function IconBadge({ children, tone = 'accent', className = '' }) {
    return (
        <span className={`grid flex-none place-items-center [&_svg]:h-4 [&_svg]:w-4 ${TONES[tone]} ${className}`}>
            {children}
        </span>
    );
}
