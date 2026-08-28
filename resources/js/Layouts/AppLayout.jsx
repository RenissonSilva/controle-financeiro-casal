import { Head, Link } from '@inertiajs/react';
import { theme } from '@/theme/tokens';
import Button from '@/Components/ui/Button';

export default function AppLayout({ title, children }) {
    return (
        <>
            <Head title={title}>
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link href="https://fonts.bunny.net/css?family=poppins:400,500,600,700&display=swap" rel="stylesheet" />
            </Head>

            <div className="relative isolate min-h-screen bg-bg bg-[radial-gradient(1100px_520px_at_78%_-8%,var(--color-ambient-glow)_0%,transparent_60%)] px-[clamp(280px,3vw,40px)] pb-12 pt-5 font-sans text-text transition-[background]">
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

                <header className="mb-[clamp(24px,4vw,44px)] flex flex-wrap items-center gap-4">
                    <div className="mr-auto flex items-center gap-2">
                        <span
                            className="text-[50px] font-medium tracking-[-.01em]"
                            style={{ fontFamily: '"Avalon Alt", var(--font-heading)' }}
                        >
                            Sovinna
                        </span>
                    </div>

                    <nav className="flex gap-0.5 rounded-full bg-text/12 p-1 shadow-[inset_0_0_0_1px_rgb(var(--color-text-rgb)/0.14)]">
                        <Link
                            href={route('dashboard')}
                            className="rounded-full bg-teal/40 px-[18px] py-[7px] text-[13.5px] text-text shadow-[inset_0_0_0_1px_rgb(var(--color-accent-rgb)/0.55)]"
                        >
                            Dashboard
                        </Link>
                        <a
                            href="#"
                            className="rounded-full px-[18px] py-[7px] text-[13.5px] text-text/90 transition-colors duration-150 hover:bg-text/14 hover:text-text"
                        >
                            Metas
                        </a>
                        <Link
                            href={route('settings.show')}
                            className="rounded-full px-[18px] py-[7px] text-[13.5px] text-text/90 transition-colors duration-150 hover:bg-text/14 hover:text-text"
                        >
                            Configurações
                        </Link>
                    </nav>

                    <div className="ml-auto flex items-center gap-2.5">
                        <div className="grid h-[34px] w-[34px] place-items-center rounded-full bg-blue text-[12.5px] font-semibold text-lime shadow-[0_0_0_1px_rgb(var(--color-accent-rgb)/0.45)]">
                            R
                        </div>
                    </div>
                </header>

                <div className="flex flex-col gap-[clamp(20px,2.4vw,32px)]">{children}</div>
            </div>
        </>
    );
}
