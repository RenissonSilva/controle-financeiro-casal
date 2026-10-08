import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Login({ status, canResetPassword, invitedBy = null }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <GuestLayout title="Entrar" subtitle="As finanças de vocês dois, num lugar só.">
            <Head title="Entrar" />

            {status && <div className="mb-4 text-[13px] font-medium text-green">{status}</div>}
            {invitedBy && (
                <div className="mb-4 rounded-[10px] border border-line bg-bg/40 px-3.5 py-2.5 text-[13px] text-secondary">
                    Entre para aceitar o convite de {invitedBy}.
                </div>
            )}

            <form onSubmit={submit} className="flex flex-col gap-4">
                <div>
                    <InputLabel htmlFor="email" value="E-mail" />
                    <TextInput
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        autoComplete="username"
                        isFocused={true}
                        onChange={(e) => setData('email', e.target.value)}
                    />
                    <InputError message={errors.email} className="mt-1.5" />
                </div>

                <div>
                    <InputLabel htmlFor="password" value="Senha" />
                    <TextInput
                        id="password"
                        type="password"
                        name="password"
                        value={data.password}
                        autoComplete="current-password"
                        onChange={(e) => setData('password', e.target.value)}
                    />
                    <InputError message={errors.password} className="mt-1.5" />
                </div>

                <label className="flex items-center gap-2 text-[13px] text-secondary">
                    <Checkbox name="remember" checked={data.remember} onChange={(e) => setData('remember', e.target.checked)} />
                    Manter conectado
                </label>

                <div className="mt-1 flex items-center justify-between gap-3">
                    {canResetPassword ? (
                        <Link href={route('password.request')} className="text-[13px] text-muted underline-offset-2 hover:text-text hover:underline">
                            Esqueceu a senha?
                        </Link>
                    ) : <span />}

                    <PrimaryButton disabled={processing}>Entrar</PrimaryButton>
                </div>
            </form>
        </GuestLayout>
    );
}
