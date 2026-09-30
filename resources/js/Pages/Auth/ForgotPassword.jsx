import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function ForgotPassword({ status }) {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('password.email'));
    };

    return (
        <GuestLayout title="Esqueceu a senha?" subtitle="Informe seu e-mail e enviaremos um link para você escolher uma senha nova.">
            <Head title="Recuperar senha" />

            {status && <div className="mb-4 text-[13px] font-medium text-green">{status}</div>}

            <form onSubmit={submit} className="flex flex-col gap-4">
                <div>
                    <InputLabel htmlFor="email" value="E-mail" />
                    <TextInput id="email" type="email" name="email" value={data.email} isFocused={true} onChange={(e) => setData('email', e.target.value)} />
                    <InputError message={errors.email} className="mt-1.5" />
                </div>

                <div className="mt-1 flex items-center justify-between gap-3">
                    <Link href={route('login')} className="text-[13px] text-muted underline-offset-2 hover:text-text hover:underline">
                        Voltar para o login
                    </Link>
                    <PrimaryButton disabled={processing}>Enviar link</PrimaryButton>
                </div>
            </form>
        </GuestLayout>
    );
}
