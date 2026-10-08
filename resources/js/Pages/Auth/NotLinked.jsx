import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, usePage } from '@inertiajs/react';

// Conta criada sem convite (ou desvinculada): não vê nenhum dado até abrir um link de convite.
export default function NotLinked() {
    const { auth } = usePage().props;

    return (
        <GuestLayout
            title="Conta ainda não vinculada"
            subtitle="Para ver as finanças do casal, abra o link de convite que a conta principal te enviar. Ele vincula esta conta na hora."
        >
            <Head title="Aguardando vínculo" />

            <div className="flex items-center justify-between gap-3 border-t border-line pt-4 text-[13px]">
                <span className="min-w-0 truncate text-muted">{auth?.user?.email}</span>
                <Link href={route('logout')} method="post" as="button" className="flex-none font-medium text-secondary hover:text-text">
                    Sair
                </Link>
            </div>
        </GuestLayout>
    );
}
