import { Link } from '@inertiajs/react';

const BASE = 'inline-flex items-center justify-center gap-1.5 cursor-pointer no-underline font-heading font-medium text-sm leading-[1.2] text-text bg-transparent border border-transparent';

const VARIANTS = {
    secondary: 'border-text/16 hover:bg-text/7',
    ghost: 'text-accent hover:bg-accent/10',
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
