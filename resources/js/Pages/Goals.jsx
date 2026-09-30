import AppLayout from '@/Layouts/AppLayout';
import Card from '@/Components/ui/Card';
import Button from '@/Components/ui/Button';
import Modal from '@/Components/ui/Modal';
import Field from '@/Components/ui/Field';
import PageHeader from '@/Components/ui/PageHeader';
import SectionLabel from '@/Components/ui/SectionLabel';
import Segmented from '@/Components/ui/Segmented';
import ProgressBar from '@/Components/ui/ProgressBar';
import IconBadge from '@/Components/ui/IconBadge';
import { router, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { Landmark, Pencil, Plus, Star, Target, Trash2 } from 'lucide-react';
import { deadlineLabel, money, moneyShort } from '@/lib/format';

export default function Goals({ goals, invested, investments }) {
    const [editing, setEditing] = useState({ show: false, goal: null });

    // Vindo do Dashboard ("Criar meta"): abre o modal direto.
    useEffect(() => {
        const url = new URL(window.location.href);
        if (!url.searchParams.has('new')) return;
        setEditing({ show: true, goal: null });
        url.searchParams.delete('new');
        window.history.replaceState(window.history.state, '', url);
    }, []);

    const remove = (goal) => {
        if (confirm(`Remover a meta "${goal.name}"?`)) router.delete(route('goals.destroy', goal.id), { preserveScroll: true });
    };

    return (
        <AppLayout title="Metas">
            <PageHeader
                title="Metas"
                description="Quanto vocês querem juntar e até quando. Metas ligadas aos investimentos acompanham o saldo real do banco."
                actions={
                    <Button type="button" variant="primary" onClick={() => setEditing({ show: true, goal: null })} className="max-[560px]:flex-1">
                        <Plus size={14} strokeWidth={2.2} /> Nova meta
                    </Button>
                }
            />

            <section className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,320px),1fr))] items-stretch gap-5">
                {goals.length === 0 && (
                    <Card className="flex flex-col items-start gap-3">
                        <h2 className="flex items-center gap-2 text-[15px] font-semibold">
                            <IconBadge><Target /></IconBadge> Nenhuma meta ainda
                        </h2>
                        <p className="max-w-[46ch] text-[13px] leading-[1.5] text-muted">
                            Crie uma — a primeira aparece no card "Meta" da Home.
                        </p>
                        <Button type="button" variant="secondary" className="mt-1" onClick={() => setEditing({ show: true, goal: null })}>
                            <Plus size={14} strokeWidth={2.2} /> Criar meta
                        </Button>
                    </Card>
                )}

                {goals.map((goal) => (
                    <Card key={goal.id} className="flex flex-col gap-4">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2">
                                <IconBadge><Target /></IconBadge>
                                <span className="truncate text-[15px] font-semibold">{goal.name}</span>
                                {goal.is_primary && <span className="flex-none rounded-full border border-line-strong px-2 py-[2px] text-[11px] text-secondary">na Home</span>}
                            </div>
                            <span className="text-[13px] font-semibold tabular-nums text-accent">{Math.round(goal.percent)}%</span>
                        </div>

                        <div className="flex flex-wrap items-baseline gap-2">
                            <span className="text-[28px] font-semibold tracking-[-0.02em] tabular-nums">{moneyShort(goal.current)}</span>
                            <span className="text-[13px] text-muted">
                                de {moneyShort(goal.target_amount)}{goal.deadline && ` · até ${deadlineLabel(goal.deadline)}`}
                            </span>
                        </div>

                        <ProgressBar value={goal.percent} />

                        <div className="text-[13px] leading-relaxed text-muted">
                            {goal.tracking === 'investments' ? 'Acompanha o saldo investido conectado.' : 'Progresso informado manualmente.'}
                            {goal.monthly_needed > 0 && <> Para chegar no prazo: <strong className="font-medium text-text">{money(goal.monthly_needed)}/mês</strong>.</>}
                            {goal.percent >= 100 && <strong className="font-semibold text-accent"> Meta alcançada!</strong>}
                        </div>

                        <div className="mt-auto flex items-center gap-1 border-t border-line pt-3">
                            {!goal.is_primary && (
                                <Button type="button" variant="ghost" size="sm" onClick={() => router.post(route('goals.primary', goal.id), {}, { preserveScroll: true })}>
                                    <Star size={14} strokeWidth={1.75} /> Mostrar na Home
                                </Button>
                            )}
                            <Button type="button" variant="ghost" size="sm" className="ml-auto" onClick={() => setEditing({ show: true, goal })}>
                                <Pencil size={14} strokeWidth={1.75} /> Editar
                            </Button>
                            <button type="button" onClick={() => remove(goal)} aria-label="Remover meta" className="grid h-9 w-9 place-items-center rounded-[10px] text-muted hover:bg-raised hover:text-red">
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </Card>
                ))}
            </section>

            <section className="flex flex-col gap-4">
                <SectionLabel title="Investimentos conectados" />
                <Card hover={false}>
                    <div className="flex items-center justify-between">
                        <h2 className="flex items-center gap-2 text-[15px] font-semibold">
                            <IconBadge><Landmark /></IconBadge> Saldo investido
                        </h2>
                        <span className="text-[22px] font-semibold tracking-[-0.02em] tabular-nums">{money(invested)}</span>
                    </div>
                    {investments.length === 0 ? (
                        <p className="mt-3 text-[13px] text-muted">Nenhum investimento com saldo nas contas conectadas.</p>
                    ) : (
                        <div className="mt-3 flex flex-col">
                            {investments.map((investment) => (
                                <div key={investment.id} className="flex items-center gap-3 border-t border-line-row py-3 first:border-t-0">
                                    <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{investment.name}</span>
                                    <span className="rounded-full bg-inset px-2 py-[2px] text-[12px] text-secondary">{investment.type}</span>
                                    <span className="w-[120px] whitespace-nowrap text-right font-mono text-[13px]">{money(investment.balance)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </section>

            <GoalModal show={editing.show} goal={editing.goal} invested={invested} onClose={() => setEditing({ show: false, goal: null })} />
        </AppLayout>
    );
}

const EMPTY = { name: '', target_amount: '', deadline: '', tracking: 'investments', manual_amount: '', is_primary: false };

function GoalModal({ show, goal, invested, onClose }) {
    const isEditing = Boolean(goal);
    const { data, setData, post, put, transform, processing, errors, clearErrors } = useForm(EMPTY);

    useEffect(() => {
        if (!show) return;
        clearErrors();
        setData(goal ? {
            name: goal.name, target_amount: goal.target_amount, deadline: goal.deadline ?? '', tracking: goal.tracking,
            manual_amount: goal.manual_amount ?? '', is_primary: goal.is_primary,
        } : EMPTY);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show, goal?.id]);

    const submit = (e) => {
        e.preventDefault();
        transform((d) => ({ ...d, deadline: d.deadline || null, manual_amount: d.manual_amount || 0 }));
        const options = { preserveScroll: true, onSuccess: onClose };
        isEditing ? put(route('goals.update', goal.id), options) : post(route('goals.store'), options);
    };

    return (
        <Modal show={show} onClose={onClose} title={isEditing ? 'Editar meta' : 'Nova meta'}>
            <form onSubmit={submit} className="flex flex-col gap-4">
                <Field label="Nome" autoFocus value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="Ex: Reserva de emergência" error={errors.name} />
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Valor-alvo" money value={data.target_amount} onChange={(e) => setData('target_amount', e.target.value)} error={errors.target_amount} />
                    <Field label="Prazo" type="date" value={data.deadline} onChange={(e) => setData('deadline', e.target.value)} error={errors.deadline} />
                </div>

                <div>
                    <span className="mb-1.5 block text-[13px] font-medium text-secondary">Como medir o progresso</span>
                    <Segmented
                        value={data.tracking}
                        onChange={(tracking) => setData('tracking', tracking)}
                        options={[
                            { value: 'investments', label: 'Saldo investido' },
                            { value: 'manual', label: 'Informar manualmente' },
                        ]}
                        className="w-fit"
                    />
                    <p className="mt-1.5 text-[12px] text-muted">
                        {data.tracking === 'investments'
                            ? `Usa o total investido nas contas conectadas (hoje ${money(invested)}).`
                            : 'Você atualiza quanto já juntou.'}
                    </p>
                </div>

                {data.tracking === 'manual' && (
                    <Field label="Já juntado" money value={data.manual_amount} onChange={(e) => setData('manual_amount', e.target.value)} error={errors.manual_amount} />
                )}

                <label className="flex items-center gap-2.5 text-[14px]">
                    <input type="checkbox" checked={data.is_primary} onChange={(e) => setData('is_primary', e.target.checked)} className="h-4 w-4 rounded border-line-strong bg-transparent text-accent focus:ring-accent/40 focus:ring-offset-0" />
                    Mostrar esta meta na Home
                </label>

                <div className="mt-1 flex justify-end gap-2.5">
                    <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" variant="primary" disabled={processing}>{processing ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar meta'}</Button>
                </div>
            </form>
        </Modal>
    );
}
