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

    const remove = (goal) => {
        if (confirm(`Remover a meta "${goal.name}"?`)) router.delete(route('goals.destroy', goal.id), { preserveScroll: true });
    };

    return (
        <AppLayout title="Metas">
            <PageHeader
                eyebrow="Planejamento"
                title="Metas"
                description="Quanto vocês querem juntar e até quando. Metas ligadas aos investimentos acompanham o saldo real do banco."
                actions={
                    <Button type="button" variant="secondary" onClick={() => setEditing({ show: true, goal: null })}>
                        <Plus size={14} strokeWidth={2.2} /> Nova meta
                    </Button>
                }
            />

            <section className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] items-stretch gap-[clamp(14px,1.6vw,20px)]">
                {goals.length === 0 && (
                    <Card className="flex flex-col items-start gap-3">
                        <IconBadge><Target size={13} strokeWidth={2.2} className="stroke-strong-accent" /></IconBadge>
                        <p className="text-[13px] leading-[1.5] text-text/60">
                            Nenhuma meta ainda. Crie uma — a primeira aparece no card "Meta" da Home.
                        </p>
                        <Button type="button" variant="ghost" onClick={() => setEditing({ show: true, goal: null })}>
                            <Plus size={14} strokeWidth={2.2} /> Criar meta
                        </Button>
                    </Card>
                )}

                {goals.map((goal) => (
                    <Card key={goal.id} className="flex flex-col gap-4">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2">
                                <IconBadge><Target size={13} strokeWidth={2.2} className="stroke-strong-accent" /></IconBadge>
                                <span className="truncate text-[13px] font-semibold tracking-[-.01em]">{goal.name}</span>
                                {goal.is_primary && <span className="rounded-full bg-teal/16 px-2 py-[1px] text-[10.5px] font-medium text-strong-accent">na Home</span>}
                            </div>
                            <span className="text-xs font-bold text-strong-accent">{Math.round(goal.percent)}%</span>
                        </div>

                        <div className="flex flex-wrap items-baseline gap-2">
                            <span className="font-heading text-[26px] font-medium tracking-[-.02em]">{moneyShort(goal.current)}</span>
                            <span className="text-xs text-text/45">
                                de {moneyShort(goal.target_amount)}{goal.deadline && ` · até ${deadlineLabel(goal.deadline)}`}
                            </span>
                        </div>

                        <ProgressBar value={goal.percent} />

                        <div className="text-[12px] leading-relaxed text-text/50">
                            {goal.tracking === 'investments' ? 'Acompanha o saldo investido conectado.' : 'Progresso informado manualmente.'}
                            {goal.monthly_needed > 0 && <> Para chegar no prazo: <strong className="text-text/80">{money(goal.monthly_needed)}/mês</strong>.</>}
                            {goal.percent >= 100 && <strong className="text-green"> Meta alcançada!</strong>}
                        </div>

                        <div className="mt-auto flex items-center gap-1 border-t border-text/8 pt-3">
                            {!goal.is_primary && (
                                <Button type="button" variant="ghost" className="px-2.5 py-1.5 text-[12.5px]" onClick={() => router.post(route('goals.primary', goal.id), {}, { preserveScroll: true })}>
                                    <Star size={13} /> Mostrar na Home
                                </Button>
                            )}
                            <Button type="button" variant="ghost" className="ml-auto px-2.5 py-1.5 text-[12.5px]" onClick={() => setEditing({ show: true, goal })}>
                                <Pencil size={13} /> Editar
                            </Button>
                            <button type="button" onClick={() => remove(goal)} aria-label="Remover meta" className="grid h-8 w-8 place-items-center rounded-full text-text/45 hover:bg-text/10 hover:text-red">
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
                        <div className="flex items-center gap-2">
                            <IconBadge><Landmark size={13} strokeWidth={2.2} className="stroke-strong-accent" /></IconBadge>
                            <span className="text-[13px] font-semibold">Saldo investido</span>
                        </div>
                        <span className="font-heading text-[20px] font-semibold tracking-[-.02em]">{money(invested)}</span>
                    </div>
                    {investments.length === 0 ? (
                        <p className="mt-3 text-[12.5px] text-text/45">Nenhum investimento com saldo nas contas conectadas.</p>
                    ) : (
                        <div className="mt-3 flex flex-col">
                            {investments.map((investment) => (
                                <div key={investment.id} className="flex items-center gap-3 rounded-[10px] px-2 py-2 hover:bg-text/5">
                                    <span className="min-w-0 flex-1 truncate text-[13px]">{investment.name}</span>
                                    <span className="text-[11.5px] text-text/45">{investment.type}</span>
                                    <span className="w-[120px] text-right text-[13px] font-semibold tabular-nums">{money(investment.balance)}</span>
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
                    <span className="mb-1.5 block text-[12.5px] font-medium text-text/70">Como medir o progresso</span>
                    <Segmented
                        value={data.tracking}
                        onChange={(tracking) => setData('tracking', tracking)}
                        options={[
                            { value: 'investments', label: 'Saldo investido' },
                            { value: 'manual', label: 'Informar manualmente' },
                        ]}
                        className="w-fit"
                    />
                    <p className="mt-1.5 text-[11.5px] text-text/45">
                        {data.tracking === 'investments'
                            ? `Usa o total investido nas contas conectadas (hoje ${money(invested)}).`
                            : 'Você atualiza quanto já juntou.'}
                    </p>
                </div>

                {data.tracking === 'manual' && (
                    <Field label="Já juntado" money value={data.manual_amount} onChange={(e) => setData('manual_amount', e.target.value)} error={errors.manual_amount} />
                )}

                <label className="flex items-center gap-2.5 text-[13px]">
                    <input type="checkbox" checked={data.is_primary} onChange={(e) => setData('is_primary', e.target.checked)} className="h-4 w-4 rounded border-text/25 bg-transparent text-teal focus:ring-teal/40 focus:ring-offset-0" />
                    Mostrar esta meta na Home
                </label>

                <div className="mt-1 flex justify-end gap-2.5">
                    <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" variant="secondary" disabled={processing}>{processing ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar meta'}</Button>
                </div>
            </form>
        </Modal>
    );
}
