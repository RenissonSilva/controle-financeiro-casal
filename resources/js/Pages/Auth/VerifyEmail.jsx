import PrimaryButton from '@/Components/PrimaryButton';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function VerifyEmail({ status }) {
    const { post, processing } = useForm({});

    const submit = (e) => {
        e.preventDefault();

        post(route('verification.send'));
    };

    return (
        <GuestLayout
            title="Confirme seu e-mail"
            subtitle="Enviamos um link de confirmação para o seu e-mail. Se não chegou, podemos mandar outro."
        >
            <Head title="Confirmar e-mail" />

            {status === 'verification-link-sent' && (
                <div className="mb-4 text-[13px] font-medium text-green">Um novo link foi enviado para o seu e-mail.</div>
            )}

            <form onSubmit={submit}>
                <div className="flex items-center justify-between gap-3">
                    <Link href={route('logout')} method="post" as="button" className="text-[13px] text-muted underline-offset-2 hover:text-text hover:underline">
                        Sair
                    </Link>
                    <PrimaryButton disabled={processing}>Reenviar e-mail</PrimaryButton>
                </div>
            </form>
        </GuestLayout>
    );
}
