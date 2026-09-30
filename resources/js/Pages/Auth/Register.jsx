import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <GuestLayout title="Criar conta">
            <Head title="Criar conta" />

            <form onSubmit={submit} className="flex flex-col gap-4">
                <div>
                    <InputLabel htmlFor="name" value="Nome" />
                    <TextInput id="name" name="name" value={data.name} autoComplete="name" isFocused={true} onChange={(e) => setData('name', e.target.value)} required />
                    <InputError message={errors.name} className="mt-1.5" />
                </div>

                <div>
                    <InputLabel htmlFor="email" value="E-mail" />
                    <TextInput id="email" type="email" name="email" value={data.email} autoComplete="username" onChange={(e) => setData('email', e.target.value)} required />
                    <InputError message={errors.email} className="mt-1.5" />
                </div>

                <div>
                    <InputLabel htmlFor="password" value="Senha" />
                    <TextInput id="password" type="password" name="password" value={data.password} autoComplete="new-password" onChange={(e) => setData('password', e.target.value)} required />
                    <InputError message={errors.password} className="mt-1.5" />
                </div>

                <div>
                    <InputLabel htmlFor="password_confirmation" value="Confirme a senha" />
                    <TextInput
                        id="password_confirmation"
                        type="password"
                        name="password_confirmation"
                        value={data.password_confirmation}
                        autoComplete="new-password"
                        onChange={(e) => setData('password_confirmation', e.target.value)}
                        required
                    />
                    <InputError message={errors.password_confirmation} className="mt-1.5" />
                </div>

                <div className="mt-1 flex items-center justify-between gap-3">
                    <Link href={route('login')} className="text-[13px] text-muted underline-offset-2 hover:text-text hover:underline">
                        Já tem conta? Entrar
                    </Link>
                    <PrimaryButton disabled={processing}>Criar conta</PrimaryButton>
                </div>
            </form>
        </GuestLayout>
    );
}
