import DangerButton from '@/Components/DangerButton';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import Modal from '@/Components/ui/Modal';
import SecondaryButton from '@/Components/SecondaryButton';
import SectionHeader from '@/Components/ui/SectionHeader';
import TextInput from '@/Components/TextInput';
import { useForm } from '@inertiajs/react';
import { useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';

export default function DeleteUserForm({ className = '' }) {
    const [confirmingUserDeletion, setConfirmingUserDeletion] = useState(false);
    const passwordInput = useRef();

    const { data, setData, delete: destroy, processing, reset, errors, clearErrors } = useForm({
        password: '',
    });

    const deleteUser = (e) => {
        e.preventDefault();

        destroy(route('profile.destroy'), {
            preserveScroll: true,
            onSuccess: () => closeModal(),
            onError: () => passwordInput.current.focus(),
            onFinish: () => reset(),
        });
    };

    const closeModal = () => {
        setConfirmingUserDeletion(false);
        clearErrors();
        reset();
    };

    return (
        <section className={`flex flex-wrap items-center justify-between gap-4 ${className}`}>
            <SectionHeader
                icon={<Trash2 size={13} strokeWidth={2.2} className="stroke-red" />}
                title="Apagar meu login"
                subtitle="Remove só o seu usuário. Os dados financeiros do casal continuam no sistema."
            />

            <DangerButton onClick={() => setConfirmingUserDeletion(true)}>Apagar login</DangerButton>

            <Modal show={confirmingUserDeletion} onClose={closeModal} title="Apagar seu login?">
                <form onSubmit={deleteUser} className="flex flex-col gap-4">
                    <p className="text-[13px] leading-[1.5] text-secondary">
                        Esta ação não pode ser desfeita. Digite sua senha para confirmar.
                    </p>

                    <div>
                        <InputLabel htmlFor="password" value="Senha" className="sr-only" />
                        <TextInput
                            id="password"
                            type="password"
                            name="password"
                            ref={passwordInput}
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            isFocused
                            placeholder="Senha"
                        />
                        <InputError message={errors.password} className="mt-1.5" />
                    </div>

                    <div className="flex justify-end gap-2.5">
                        <SecondaryButton onClick={closeModal}>Cancelar</SecondaryButton>
                        <DangerButton disabled={processing}>Apagar login</DangerButton>
                    </div>
                </form>
            </Modal>
        </section>
    );
}
