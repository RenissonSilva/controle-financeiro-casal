import { Link } from '@inertiajs/react';

const BASE = 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] border font-sans no-underline cursor-pointer transition-[filter,background-color,color] duration-150 disabled:pointer-events-none disabled:opacity-50';

const SIZES = {
    md: 'h-11 px-[18px] text-[14px]',
    sm: 'h-9 px-3 text-[13px]',
};

const VARIANTS = {
    // Ação principal da tela (limão).
    primary: 'border-transparent bg-accent font-semibold text-on-accent hover:brightness-[1.06]',
    // Contorno — ações secundárias.
    secondary: 'border-line-strong bg-transparent font-medium text-text hover:bg-raised',
    // Só texto — ações de apoio (Cancelar, Editar...).
    ghost: 'border-transparent bg-transparent font-medium text-secondary hover:bg-raised hover:text-text',
    // Escuro sobre o card limão ("Registrar acerto").
    dark: 'border-transparent bg-on-accent font-semibold text-text hover:bg-raised',
};

// variant: 'primary' | 'secondary' | 'ghost' | 'dark' · size: 'md' | 'sm'
export default function Button({ variant = 'secondary', size = 'md', className = '', href, children, ...props }) {
    const classes = `${BASE} ${SIZES[size]} ${VARIANTS[variant]} ${className}`;

    if (href) {
        return (
            <Link href={href} className={classes} {...props}>
                {children}
            </Link>
        );
    }

    return (
        <button className={classes} {...props}>
            {children}
        </button>
    );
}
