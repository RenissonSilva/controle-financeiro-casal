import Dropdown from '@/Components/Dropdown';
import NavLink from '@/Components/NavLink';
import ResponsiveNavLink from '@/Components/ResponsiveNavLink';
import { Link, usePage } from '@inertiajs/react';
import { useState } from 'react';

export default function AuthenticatedLayout({ header, children }) {
    const user = usePage().props.auth.user;
    const [showNav, setShowNav] = useState(false);

    const navItems = [
        { href: route('dashboard'),      label: 'Dashboard',     routeKey: 'dashboard' },
        { href: route('expenses.index'), label: 'Despesas',      routeKey: 'expenses.index' },
        { href: route('import.show'),    label: 'Importar CSV',  routeKey: 'import.show' },
        { href: route('settings.show'),  label: 'Configurações', routeKey: 'settings.show' },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="border-b border-gray-200 bg-white shadow-sm">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center justify-between">
                        {/* Logo + nav desktop */}
                        <div className="flex items-center gap-8">
                            <Link href="/" className="text-lg font-bold text-indigo-600">
                                💰 FinançasCasal
                            </Link>
                            <div className="hidden sm:flex sm:gap-6">
                                {navItems.map((item) => (
                                    <NavLink
                                        key={item.routeKey}
                                        href={item.href}
                                        active={route().current(item.routeKey)}
                                    >
                                        {item.label}
                                    </NavLink>
                                ))}
                            </div>
                        </div>

                        {/* Dropdown usuário (desktop) */}
                        <div className="hidden sm:flex sm:items-center">
                            <Dropdown>
                                <Dropdown.Trigger>
                                    <button className="inline-flex items-center gap-1 rounded-md border border-transparent bg-white px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700">
                                        {user.name}
                                        <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </Dropdown.Trigger>
                                <Dropdown.Content>
                                    <Dropdown.Link href={route('profile.edit')}>Perfil</Dropdown.Link>
                                    <Dropdown.Link href={route('logout')} method="post" as="button">Sair</Dropdown.Link>
                                </Dropdown.Content>
                            </Dropdown>
                        </div>

                        {/* Hamburguer (mobile) */}
                        <button
                            onClick={() => setShowNav((v) => !v)}
                            className="-me-2 flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 sm:hidden"
                        >
                            <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                                <path className={!showNav ? 'block' : 'hidden'} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                                <path className={showNav ? 'block' : 'hidden'} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Nav mobile */}
                {showNav && (
                    <div className="sm:hidden">
                        <div className="space-y-1 pb-3 pt-2">
                            {navItems.map((item) => (
                                <ResponsiveNavLink key={item.routeKey} href={item.href} active={route().current(item.routeKey)}>
                                    {item.label}
                                </ResponsiveNavLink>
                            ))}
                        </div>
                        <div className="border-t border-gray-200 pb-1 pt-4">
                            <div className="px-4 text-sm text-gray-500">{user.email}</div>
                            <div className="mt-3 space-y-1">
                                <ResponsiveNavLink href={route('profile.edit')}>Perfil</ResponsiveNavLink>
                                <ResponsiveNavLink method="post" href={route('logout')} as="button">Sair</ResponsiveNavLink>
                            </div>
                        </div>
                    </div>
                )}
            </nav>

            {header && (
                <header className="bg-white shadow-sm">
                    <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
                        {header}
                    </div>
                </header>
            )}

            <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
    );
}
