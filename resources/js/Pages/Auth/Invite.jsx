import Button from '@/Components/ui/Button';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { Eye, PencilOff } from 'lucide-react';

// O que a conta vinculada pode fazer — o mesmo texto para quem cria a conta e para quem já tem.
function WhatYouGet({ ownerName }) {
    return (
        <ul className="flex flex-col gap-3 text-[13px] leading-[1.5] text-secondary">
            <li className="flex gap-2.5">
                <Eye size={16} strokeWidth={1.75} className="mt-0.5 flex-none text-accent" />
                <span>Você vê tudo: lançamentos, contas fixas, metas e o acerto do mês.</span>
            </li>
            <li className="flex gap-2.5">
                <PencilOff size={16} strokeWidth={1.75} className="mt-0.5 flex-none text-muted" />
                <span>Criar, editar e excluir só no que {ownerName} liberar.</span>
            </li>
        </ul>
    );
}

// Link de convite aberto: cria a conta, entra ou aceita (já logado). Ver InviteController.
export default function Invite({ token, valid, ownerName, state }) {
    const { post, processing } = useForm({});

    if (!valid) {
        return (
            <GuestLayout title="Convite inválido" subtitle="Este link expirou ou já foi usado. Peça um link novo para a conta principal.">
                <Head title="Convite" />
                <Button href="/" variant="secondary">Ir para o início</Button>
            </GuestLayout>
        );
    }

    if (state === 'owner') {
        return (
            <GuestLayout title="Este é o seu link de convite" subtitle="Envie para quem você quer vincular — a pessoa cria a conta por ele e já entra vinculada.">
                <Head title="Convite" />
                <Button href={route('settings.show') + '#acesso'} variant="secondary">Voltar para Configurações</Button>
            </GuestLayout>
        );
    }

    if (state === 'member') {
        return (
            <GuestLayout title="Sua conta já está vinculada" subtitle="Você já vê as finanças do casal.">
                <Head title="Convite" />
                <Button href={route('dashboard')} variant="primary">Ir para o Dashboard</Button>
            </GuestLayout>
        );
    }

    return (
        <GuestLayout title="Convite para o Sovinna" subtitle={`${ownerName} quer compartilhar as finanças do casal com você.`}>
            <Head title="Convite" />

            <WhatYouGet ownerName={ownerName} />

            {state === 'guest' ? (
                <div className="mt-6 flex flex-col gap-2.5">
                    <Button href={route('register')} variant="primary">Criar minha conta</Button>
                    <Button href={route('login')} variant="ghost">Já tenho conta — entrar</Button>
                </div>
            ) : (
                <div className="mt-6 flex flex-col gap-2.5">
                    <Button type="button" variant="primary" disabled={processing} onClick={() => post(route('invites.accept', token))}>
                        {processing ? 'Vinculando…' : 'Aceitar convite'}
                    </Button>
                    <Link href={route('logout')} method="post" as="button" className="h-11 text-[13px] text-muted hover:text-text">
                        Entrar com outra conta
                    </Link>
                </div>
            )}
        </GuestLayout>
    );
}
