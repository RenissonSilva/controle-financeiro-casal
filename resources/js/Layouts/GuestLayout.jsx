import { Head, Link } from '@inertiajs/react';
import { theme } from '@/theme/tokens';

// Login, cadastro e recuperação de senha — mesmo fundo e logotipo da Home.
export default function GuestLayout({ children, title, subtitle }) {
    return (
        <>
            <Head>
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link href="https://fonts.bunny.net/css?family=poppins:400,500,600,700&display=swap" rel="stylesheet" />
            </Head>

            <div className="relative isolate flex min-h-screen flex-col items-center justify-center bg-bg bg-[radial-gradient(1100px_520px_at_78%_-8%,var(--color-ambient-glow)_0%,transparent_60%)] px-4 py-10 font-sans text-text">
                {theme.bgImage && (
                    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
                        <img
                            src={theme.bgImage}
                            alt=""
                            className="absolute inset-0 h-full w-full object-cover opacity-70 brightness-90"
                            style={{ objectPosition: theme.bgImagePosition || 'center' }}
                        />
                        <div className="absolute inset-0 bg-teal mix-blend-color opacity-60" />
                        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.5)_0%,rgba(0,0,0,.28)_24%,var(--color-bg)_76%)]" />
                    </div>
                )}

                <Link href="/" className="mb-6 text-[56px] font-medium leading-none tracking-[-.01em]" style={{ fontFamily: '"Avalon Alt", var(--font-heading)' }}>
                    Sovinna
                </Link>

                <div className="w-full max-w-[420px] rounded-[18px] bg-surface/95 p-7 shadow-[inset_0_0_0_1px_rgb(var(--color-text-rgb)/0.08),0_18px_48px_-12px_rgba(0,0,0,0.55)] backdrop-blur">
                    {title && <h1 className="text-[22px] font-medium tracking-[-.02em]">{title}</h1>}
                    {subtitle && <p className="mt-1 text-[13px] leading-[1.5] text-text/55">{subtitle}</p>}
                    <div className={title || subtitle ? 'mt-5' : ''}>{children}</div>
                </div>
            </div>
        </>
    );
}
