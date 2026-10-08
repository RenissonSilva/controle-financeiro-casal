import { Head, Link, usePage } from '@inertiajs/react';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { useEffect, useRef, useState } from 'react';
import { History, LayoutGrid, List, LogOut, Repeat, SlidersHorizontal, Target, RefreshCw, UserRound } from 'lucide-react';
import Toast from '@/Components/ui/Toast';
import { firstName, relativeTime } from '@/lib/format';

const NAV = [
    { label: 'Dashboard', route: 'dashboard', active: ['dashboard', 'settlement.*'], icon: LayoutGrid },
    { label: 'Lançamentos', route: 'expenses.index', active: ['expenses.*'], icon: List },
    { label: 'Contas fixas', route: 'fixedExpenses.index', active: ['fixedExpenses.*'], icon: Repeat },
    { label: 'Metas', route: 'goals.index', active: ['goals.*'], icon: Target },
    { label: 'Configurações', route: 'settings.show', active: ['settings.*', 'openFinance.*', 'profile.*', 'history.*'], icon: SlidersHorizontal },
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

// Dois anéis entrelaçados (limão + texto) — marca do Sovinna.
function Brand() {
    return (
        <Link href={route('dashboard')} className="flex min-h-[44px] items-center gap-2.5 text-text no-underline desk:px-2">
            <svg width="30" height="20" viewBox="0 0 30 20" aria-hidden="true" className="flex-none">
                <circle cx="10" cy="10" r="8" fill="none" stroke="var(--color-accent)" strokeWidth="2.2" />
                <circle cx="20" cy="10" r="8" fill="none" stroke="var(--color-text)" strokeWidth="2.2" />
            </svg>
            <span className="text-[20px] font-semibold tracking-[-0.03em] max-[560px]:hidden">sovinna</span>
        </Link>
    );
}

function Avatars({ couple }) {
    const initial = (name, fallback) => (firstName(name) === '?' ? fallback : firstName(name).charAt(0).toUpperCase());

    return (
        <span className="flex">
            <span title={firstName(couple?.payer1_name)} className="grid h-[34px] w-[34px] place-items-center rounded-full border-2 border-surface bg-person1 text-[13px] font-semibold text-on-accent">
                {initial(couple?.payer1_name, '1')}
            </span>
            <span title={firstName(couple?.payer2_name)} className="-ml-[9px] grid h-[34px] w-[34px] place-items-center rounded-full border-2 border-surface bg-person2 text-[13px] font-semibold text-on-accent">
                {initial(couple?.payer2_name, '2')}
            </span>
        </span>
    );
}

// "Conta principal" ou, na conta vinculada, de quem ela vê os dados e se só visualiza.
function accessLabel(auth) {
    if (auth?.can?.owner) return 'Conta principal';
    if (!auth?.owner_name) return null;

    const canChange = Object.entries(auth.can ?? {}).some(([permission, allowed]) => permission !== 'owner' && allowed);
    return `Vinculada a ${firstName(auth.owner_name)}${canChange ? '' : ' · só visualização'}`;
}

function AccountMenuItems({ anchor }) {
    const { auth } = usePage().props;
    const item = 'flex w-full items-center gap-2.5 rounded-[8px] px-3 py-2.5 text-left data-[focus]:bg-raised';
    const access = accessLabel(auth);

    return (
        <MenuItems
            anchor={anchor}
            className="z-50 w-56 rounded-[14px] border border-line bg-surface p-1.5 text-[14px] text-text [--anchor-gap:8px] focus:outline-none"
        >
            <div className="px-3 pb-2 pt-1.5">
                <div className="truncate font-medium">{auth?.user?.name}</div>
                <div className="truncate text-[12px] text-muted">{auth?.user?.email}</div>
                {access && <div className="mt-1.5 truncate text-[12px] text-secondary">{access}</div>}
            </div>
            <MenuItem>
                <Link href={route('profile.edit')} className={item}>
                    <UserRound size={15} strokeWidth={1.75} className="text-muted" /> Perfil
                </Link>
            </MenuItem>
            {auth?.can?.owner && (
                <MenuItem>
                    <Link href={route('history.index')} className={item}>
                        <History size={15} strokeWidth={1.75} className="text-muted" /> Histórico de mudanças
                    </Link>
                </MenuItem>
            )}
            <MenuItem>
                <Link href={route('logout')} method="post" as="button" className={item}>
                    <LogOut size={15} strokeWidth={1.75} className="text-muted" /> Sair
                </Link>
            </MenuItem>
        </MenuItems>
    );
}

// Rodapé da sidebar: casal + menu da conta + status da sincronização.
// `sync` substitui a linha de status (o Dashboard passa o botão de sincronizar).
function CoupleCard({ sync }) {
    const { couple } = usePage().props;

    return (
        <div className="flex flex-col gap-3.5 rounded-[14px] border border-line bg-surface p-4">
            <Menu as="div" className="relative">
                <MenuButton className="flex w-full items-center gap-3 rounded-[10px] text-left" aria-label="Menu da conta">
                    <Avatars couple={couple} />
                    <span className="min-w-0">
                        <span className="block truncate text-[14px] font-semibold">
                            {firstName(couple?.payer1_name)} &amp; {firstName(couple?.payer2_name)}
                        </span>
                        <span className="block text-[12px] text-muted">Finanças do casal</span>
                    </span>
                </MenuButton>
                <AccountMenuItems anchor="top start" />
            </Menu>
            <div className="flex items-center gap-2 border-t border-line pt-3 text-[12px] text-muted">
                {sync ?? (
                    <>
                        <RefreshCw size={14} strokeWidth={2} className="flex-none" />
                        {couple?.last_synced_at ? `Sincronizado ${relativeTime(couple.last_synced_at)}` : 'Nenhum banco conectado'}
                    </>
                )}
            </div>
        </div>
    );
}

function Sidebar({ sync }) {
    const { couple } = usePage().props;
    const isActive = (patterns) => patterns.some((pattern) => route().current(pattern));

    return (
        <aside className="sticky top-0 z-10 min-w-0 border-b border-line-soft bg-bg desk:static desk:border-b-0 desk:border-r">
            <div className="flex min-w-0 items-center gap-3 px-4 py-2.5 desk:sticky desk:top-0 desk:h-screen desk:flex-col desk:items-stretch desk:gap-8 desk:px-4 desk:pb-6 desk:pt-7">
                <Brand />

                <nav aria-label="Principal" className="scroll-none flex min-w-0 flex-1 gap-1 overflow-x-auto desk:flex-none desk:flex-col desk:overflow-visible">
                    {NAV.map(({ label, route: name, active, icon: Icon }) => {
                        const current = isActive(active);
                        return (
                            <Link
                                key={name}
                                href={route(name)}
                                aria-current={current ? 'page' : undefined}
                                className={`flex h-11 flex-none items-center gap-3 whitespace-nowrap rounded-[10px] px-3 text-[14px] font-medium no-underline transition-colors duration-150 ${
                                    current ? 'bg-raised text-text' : 'text-[#9AA0A9] hover:bg-surface hover:text-text'
                                }`}
                            >
                                <Icon size={18} strokeWidth={1.75} className={current ? 'text-accent' : ''} />
                                {label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="hidden flex-1 desk:block" />

                <div className="hidden desk:block">
                    <CoupleCard sync={sync} />
                </div>

                {/* Celular: o card do casal some, o menu da conta fica nos avatares. */}
                <Menu as="div" className="relative flex-none desk:hidden">
                    <MenuButton aria-label="Menu da conta" className="flex h-11 items-center">
                        <Avatars couple={couple} />
                    </MenuButton>
                    <AccountMenuItems anchor="bottom end" />
                </Menu>
            </div>
        </aside>
    );
}

export default function AppLayout({ title, sync, children }) {
    const toast = useFlashToast();

    return (
        <>
            <Head title={title} />

            <div className="min-h-screen bg-bg font-sans text-[14px] text-text antialiased desk:grid desk:grid-cols-[248px_minmax(0,1fr)]">
                <Sidebar sync={sync} />
                <main className="flex min-w-0 flex-col gap-5 px-4 pb-8 pt-6 desk:px-10 desk:py-8">{children}</main>
            </div>

            <Toast message={toast?.message} tone={toast?.tone} />
        </>
    );
}
