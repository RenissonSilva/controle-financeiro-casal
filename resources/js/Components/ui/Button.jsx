import { Link } from '@inertiajs/react';

const BASE = 'inline-flex items-center justify-center gap-1.5 rounded-[9px] px-4 py-2 cursor-pointer no-underline font-heading font-medium text-sm leading-[1.2] text-text bg-transparent border border-transparent transition-colors disabled:pointer-events-none disabled:opacity-50';

const VARIANTS = {
    secondary: 'border-text/16 hover:bg-text/7',
    ghost: 'text-teal hover:bg-teal/10',
};

// variant: 'secondary' | 'ghost'
export default function Button({ variant = 'secondary', className = '', href, children, ...props }) {
    const classes = `${BASE} ${VARIANTS[variant]} ${className}`;

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
