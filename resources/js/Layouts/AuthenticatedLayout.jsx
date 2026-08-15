import Breadcrumbs from '@/Components/Breadcrumbs';
import Dropdown from '@/Components/Dropdown';
import NavLink from '@/Components/NavLink';
import ResponsiveNavLink from '@/Components/ResponsiveNavLink';
import { Link, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { ChevronDown, Menu, X } from 'lucide-react';

export default function AuthenticatedLayout({ header, breadcrumbs = [], children }) {
    const user = usePage().props.auth.user;
    const [showNav, setShowNav] = useState(false);

    const navItems = [
        { href: route('dashboard'),      label: 'Dashboard',     routeKey: 'dashboard' },
        { href: route('expenses.index'), label: 'Despesas',      routeKey: 'expenses.index' },
        { href: route('import.show'),    label: 'Importar CSV',  routeKey: 'import.show' },
        { href: route('categories.index'), label: 'Categorias', routeKey: 'categories.index' },
        { href: route('categorizationRules.index'), label: 'Regras', routeKey: 'categorizationRules.index' },
        { href: route('fixedExpenses.index'), label: 'Despesas Fixas', routeKey: 'fixedExpenses.index' },
        { href: route('openFinance.index'), label: 'Open Finance', routeKey: 'openFinance.index' },
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
                                        <ChevronDown className="h-4 w-4" strokeWidth={2.5} />
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
                            {showNav ? <X className="h-6 w-6" strokeWidth={2} /> : <Menu className="h-6 w-6" strokeWidth={2} />}
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

            <Breadcrumbs items={breadcrumbs} />

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
