import { Link } from '@inertiajs/react';

export default function Breadcrumbs({ items = [] }) {
    if (items.length === 0) {
        return null;
    }

    const crumbs = [{ label: 'Dashboard', href: route('dashboard') }, ...items];

    return (
        <nav aria-label="breadcrumb" className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
            <ol className="flex flex-wrap items-center gap-1 text-sm text-gray-500">
                {crumbs.map((crumb, index) => {
                    const isLast = index === crumbs.length - 1;
                    return (
                        <li key={index} className="flex items-center gap-1">
                            {index > 0 && <span className="text-gray-300">/</span>}
                            {isLast || !crumb.href ? (
                                <span className={isLast ? 'font-medium text-gray-700' : ''} aria-current={isLast ? 'page' : undefined}>
                                    {crumb.label}
                                </span>
                            ) : (
                                <Link href={crumb.href} className="hover:text-gray-700 hover:underline">
                                    {crumb.label}
                                </Link>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
