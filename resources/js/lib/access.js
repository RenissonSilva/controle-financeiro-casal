import { usePage } from '@inertiajs/react';

// O que a conta logada pode fazer (props `auth.can` do HandleInertiaRequests):
// 'expenses.edit', 'expenses.delete', 'fixed.*', 'goals.*', 'settings.*' e 'owner'.
// Só esconde botões — o servidor barra de qualquer jeito.
export function useCan() {
    const { auth } = usePage().props;
    return (permission) => Boolean(auth?.can?.[permission]);
}
