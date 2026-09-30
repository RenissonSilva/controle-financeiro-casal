import { Link } from '@inertiajs/react';

// Login, cadastro e recuperação de senha — mesma marca e superfícies do app.
export default function GuestLayout({ children, title, subtitle }) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 py-10 font-sans text-[14px] text-text antialiased">
            <Link href="/" className="mb-8 flex items-center gap-2.5 text-text no-underline">
                <svg width="36" height="24" viewBox="0 0 30 20" aria-hidden="true">
                    <circle cx="10" cy="10" r="8" fill="none" stroke="var(--color-accent)" strokeWidth="2.2" />
                    <circle cx="20" cy="10" r="8" fill="none" stroke="var(--color-text)" strokeWidth="2.2" />
                </svg>
                <span className="text-[26px] font-semibold tracking-[-0.03em]">sovinna</span>
            </Link>

            <div className="w-full max-w-[420px] rounded-2xl border border-line bg-surface p-7">
                {title && <h1 className="text-[22px] font-semibold tracking-[-0.02em]">{title}</h1>}
                {subtitle && <p className="mt-1 text-[14px] leading-[1.5] text-muted">{subtitle}</p>}
                <div className={title || subtitle ? 'mt-6' : ''}>{children}</div>
            </div>
        </div>
    );
}
