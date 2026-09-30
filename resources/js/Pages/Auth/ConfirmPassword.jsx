import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm } from '@inertiajs/react';

export default function ConfirmPassword() {
    const { data, setData, post, processing, errors, reset } = useForm({
        password: '',
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('password.confirm'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <GuestLayout title="Confirme sua senha" subtitle="Esta é uma área protegida. Confirme sua senha para continuar.">
            <Head title="Confirmar senha" />

            <form onSubmit={submit} className="flex flex-col gap-4">
                <div>
                    <InputLabel htmlFor="password" value="Senha" />
                    <TextInput id="password" type="password" name="password" value={data.password} isFocused={true} onChange={(e) => setData('password', e.target.value)} />
                    <InputError message={errors.password} className="mt-1.5" />
                </div>

                <div className="mt-1 flex justify-end">
                    <PrimaryButton disabled={processing}>Confirmar</PrimaryButton>
                </div>
            </form>
        </GuestLayout>
    );
}
