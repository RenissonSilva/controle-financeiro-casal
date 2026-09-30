import AppLayout from '@/Layouts/AppLayout';
import Card from '@/Components/ui/Card';
import PageHeader from '@/Components/ui/PageHeader';
import SectionLabel from '@/Components/ui/SectionLabel';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';

export default function Edit({ mustVerifyEmail, status }) {
    return (
        <AppLayout title="Minha conta">
            <PageHeader title="Minha conta" description="Seu login no Sovinna: nome, e-mail e senha." />

            <section className="flex flex-col gap-4">
                <SectionLabel title="Dados de acesso" />
                <section className="grid grid-cols-[repeat(auto-fit,minmax(340px,1fr))] items-start gap-5">
                    <Card hover={false}>
                        <UpdateProfileInformationForm mustVerifyEmail={mustVerifyEmail} status={status} />
                    </Card>
                    <Card hover={false}>
                        <UpdatePasswordForm />
                    </Card>
                </section>
            </section>

            <section className="flex flex-col gap-4">
                <SectionLabel title="Zona de perigo" />
                <Card hover={false}>
                    <DeleteUserForm />
                </Card>
            </section>
        </AppLayout>
    );
}
