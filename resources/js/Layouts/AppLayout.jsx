import { Head, Link, usePage } from '@inertiajs/react';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { useEffect, useRef, useState } from 'react';
import { LogOut, UserRound } from 'lucide-react';
import { theme } from '@/theme/tokens';
import Toast from '@/Components/ui/Toast';

const NAV = [
    { label: 'Dashboard', route: 'dashboard', active: ['dashboard', 'settlement.*'] },
    { label: 'Lançamentos', route: 'expenses.index', active: ['expenses.*'] },
    { label: 'Contas fixas', route: 'fixedExpenses.index', active: ['fixedExpenses.*'] },
    { label: 'Metas', route: 'goals.index', active: ['goals.*'] },
    { label: 'Configurações', route: 'settings.show', active: ['settings.*', 'openFinance.*', 'profile.*'] },
];

// Mostra o flash (back()->with('success'|'error')) de cada resposta como toast.
function useFlashToast() {
    const { flash } = usePage().props;
    const [toast, setToast] = useState(null);
    const timer = useRef(null);

    useEffect(() => {
        const message = flash?.error || flash?.success;
        if (!message) return;

        setToast({ message, tone: flash?.error ? 'error' : 'success' });
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setToast(null), flash?.error ? 5000 : 2800);
    }, [flash]);

    useEffect(() => () => clearTimeout(timer.current), []);

    return toast;
}

function Header() {
    const { auth, couple } = usePage().props;
    const initial = (couple?.payer1_name || auth?.user?.name || '?').trim().charAt(0).toUpperCase();
    const isActive = (patterns) => patterns.some((pattern) => route().current(pattern));

    return (
        <header className="mb-[clamp(24px,4vw,44px)] flex flex-wrap items-center gap-4">
            <div className="mr-auto flex items-center gap-2">
                <Link
                    href={route('dashboard')}
                    className="text-[50px] font-medium tracking-[-.01em]"
                    style={{ fontFamily: '"Avalon Alt", var(--font-heading)' }}
                >
                    Sovinna
                </Link>
            </div>

            <nav className="scroll-thin flex max-w-full gap-0.5 overflow-x-auto rounded-full bg-text/12 p-1 shadow-[inset_0_0_0_1px_rgb(var(--color-text-rgb)/0.14)]">
                {NAV.map((item) => (
                    <Link
                        key={item.route}
                        href={route(item.route)}
                        className={`whitespace-nowrap rounded-full px-[18px] py-[7px] text-[13.5px] transition-colors duration-150 ${
                            isActive(item.active)
                                ? 'bg-teal/40 text-text shadow-[inset_0_0_0_1px_rgb(var(--color-accent-rgb)/0.55)]'
                                : 'text-text/90 hover:bg-text/14 hover:text-text'
                        }`}
                    >
                        {item.label}
                    </Link>
                ))}
            </nav>

            <div className="ml-auto flex items-center gap-2.5">
                <Menu as="div" className="relative">
                    <MenuButton
                        aria-label="Menu da conta"
                        className="grid h-[34px] w-[34px] place-items-center rounded-full bg-blue text-[12.5px] font-semibold text-lime shadow-[0_0_0_1px_rgb(var(--color-accent-rgb)/0.45)] transition-[filter] hover:brightness-110"
                    >
                        {initial}
                    </MenuButton>
                    <MenuItems
                        anchor="bottom end"
                        className="z-50 mt-2 w-52 rounded-[14px] bg-surface p-1.5 text-[13px] text-text shadow-[inset_0_0_0_1px_rgb(var(--color-text-rgb)/0.1),0_12px_32px_rgba(0,0,0,0.45)] focus:outline-none"
                    >
                        <div className="px-3 pb-2 pt-1.5">
                            <div className="truncate font-medium">{auth?.user?.name}</div>
                            <div className="truncate text-[11.5px] text-text/45">{auth?.user?.email}</div>
                        </div>
                        <MenuItem>
                            <Link href={route('profile.edit')} className="flex items-center gap-2 rounded-[9px] px-3 py-2 data-[focus]:bg-text/8">
                                <UserRound size={14} strokeWidth={2} className="text-text/60" /> Perfil
                            </Link>
                        </MenuItem>
                        <MenuItem>
                            <Link href={route('logout')} method="post" as="button" className="flex w-full items-center gap-2 rounded-[9px] px-3 py-2 text-left data-[focus]:bg-text/8">
                                <LogOut size={14} strokeWidth={2} className="text-text/60" /> Sair
                            </Link>
                        </MenuItem>
                    </MenuItems>
                </Menu>
            </div>
        </header>
    );
}

export default function AppLayout({ title, children }) {
    const toast = useFlashToast();

    return (
        <>
            <Head title={title}>
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link href="https://fonts.bunny.net/css?family=poppins:400,500,600,700&display=swap" rel="stylesheet" />
            </Head>

            {/* O mockup usava px-[clamp(280px,3vw,40px)] — sempre 280px (mínimo > máximo), o que
                espremia notebooks e quebrava o celular. Largura máxima de 1360px centralizada dá o
                mesmo resultado em telas de 1920px e se adapta às menores. */}
            <div className="relative isolate min-h-screen bg-bg bg-[radial-gradient(1100px_520px_at_78%_-8%,var(--color-ambient-glow)_0%,transparent_60%)] px-[clamp(16px,3vw,40px)] pb-12 pt-5 font-sans text-text transition-[background]">
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

                <div className="mx-auto w-full max-w-[1360px]">
                    <Header />
                    <div className="flex flex-col gap-[clamp(20px,2.4vw,32px)]">{children}</div>
                </div>
            </div>

            <Toast message={toast?.message} tone={toast?.tone} />
        </>
    );
}
