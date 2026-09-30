import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import SectionHeader from '@/Components/ui/SectionHeader';
import TextInput from '@/Components/TextInput';
import { Transition } from '@headlessui/react';
import { Link, useForm, usePage } from '@inertiajs/react';
import { UserRound } from 'lucide-react';

export default function UpdateProfileInformation({ mustVerifyEmail, status, className = '' }) {
    const user = usePage().props.auth.user;

    const { data, setData, patch, errors, processing, recentlySuccessful } = useForm({
        name: user.name,
        email: user.email,
    });

    const submit = (e) => {
        e.preventDefault();

        patch(route('profile.update'), { preserveScroll: true });
    };

    return (
        <section className={className}>
            <SectionHeader
                icon={<UserRound size={13} strokeWidth={2.2} className="stroke-strong-accent" />}
                title="Perfil"
                subtitle="Nome e e-mail usados para entrar."
            />

            <form onSubmit={submit} className="mt-5 flex flex-col gap-4">
                <div>
                    <InputLabel htmlFor="name" value="Nome" />
                    <TextInput id="name" value={data.name} onChange={(e) => setData('name', e.target.value)} required autoComplete="name" />
                    <InputError className="mt-1.5" message={errors.name} />
                </div>

                <div>
                    <InputLabel htmlFor="email" value="E-mail" />
                    <TextInput id="email" type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} required autoComplete="username" />
                    <InputError className="mt-1.5" message={errors.email} />
                </div>

                {mustVerifyEmail && user.email_verified_at === null && (
                    <div className="text-[13px] text-text/70">
                        Seu e-mail ainda não foi confirmado.{' '}
                        <Link href={route('verification.send')} method="post" as="button" className="text-strong-accent underline-offset-2 hover:underline">
                            Reenviar o e-mail de confirmação.
                        </Link>
                        {status === 'verification-link-sent' && (
                            <div className="mt-2 font-medium text-green">Um novo link foi enviado para o seu e-mail.</div>
                        )}
                    </div>
                )}

                <div className="flex items-center gap-4">
                    <PrimaryButton disabled={processing}>Salvar</PrimaryButton>
                    <Transition show={recentlySuccessful} enter="transition ease-in-out" enterFrom="opacity-0" leave="transition ease-in-out" leaveTo="opacity-0">
                        <p className="text-[13px] text-green">Salvo.</p>
                    </Transition>
                </div>
            </form>
        </section>
    );
}
