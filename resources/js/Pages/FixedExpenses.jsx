import AppLayout from '@/Layouts/AppLayout';
import Card from '@/Components/ui/Card';
import Button from '@/Components/ui/Button';
import Modal from '@/Components/ui/Modal';
import Field, { INPUT_CLASSES } from '@/Components/ui/Field';
import MoneyInput from '@/Components/ui/MoneyInput';
import Select from '@/Components/ui/Select';
import PageHeader from '@/Components/ui/PageHeader';
import SectionLabel from '@/Components/ui/SectionLabel';
import CycleSwitcher from '@/Components/ui/CycleSwitcher';
import OwnershipToggle from '@/Components/ui/OwnershipToggle';
import IconBadge from '@/Components/ui/IconBadge';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { router, useForm, usePage } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { AlertTriangle, CalendarClock, Check, CircleDashed, Link2, Link2Off, MoreHorizontal, Pencil, Plus, Trash2, Wallet, CheckCircle2, Hourglass } from 'lucide-react';
import { dayMonth, formatDocument, money } from '@/lib/format';
import { OWNERSHIP_BADGE, ownershipLabel } from '@/lib/ownership';

const STATUS = {
    paid: { label: 'Paga', icon: Check, className: 'bg-accent/12 text-accent' },
    upcoming: { label: 'A vencer', icon: CalendarClock, className: 'bg-inset text-secondary' },
    late: { label: 'Não encontrada', icon: AlertTriangle, className: 'bg-red/14 text-red' },
};

export default function FixedExpenses({ cycle, fixedExpenses, totals, payees, categories }) {
    const { couple } = usePage().props;
    const [editing, setEditing] = useState({ show: false, item: null });
    const [linking, setLinking] = useState(null);

    const inCycle = fixedExpenses.filter((f) => f.active && f.occurrence);
    const outside = fixedExpenses.filter((f) => !f.active || !f.occurrence);

    const remove = (item) => {
        if (confirm(`Remover a conta fixa "${item.description}"? Os pagamentos continuam em Lançamentos.`)) {
            router.delete(route('fixedExpenses.destroy', item.id), { preserveScroll: true });
        }
    };

    const unlink = (item) => {
        if (confirm('Desfazer o vínculo? Essa cobrança não será mais reconhecida automaticamente neste mês.')) {
            router.post(route('fixedExpenses.unlink', item.id), { month: cycle.month }, { preserveScroll: true });
        }
    };

    return (
        <AppLayout title="Contas fixas">
            <PageHeader
                title="Contas fixas"
                description="Aluguel, contas e assinaturas. Quando o pagamento chega pelo banco, a conta fica paga sozinha — e conta uma vez só."
                actions={
                    <>
                        <CycleSwitcher cycle={cycle} routeName="fixedExpenses.index" />
                        <Button type="button" variant="primary" onClick={() => setEditing({ show: true, item: null })} className="max-[560px]:flex-1">
                            <Plus size={14} strokeWidth={2.2} /> Nova conta fixa
                        </Button>
                    </>
                }
            />

            <section aria-label="Resumo do mês" className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-line bg-line max-[860px]:grid-cols-1">
                <SummaryCard icon={<Wallet />} label="Previsto no mês" value={totals.planned} />
                <SummaryCard icon={<CheckCircle2 />} label="Já pago" value={totals.paid} valueClass="text-accent" />
                <SummaryCard icon={<Hourglass />} label="Falta pagar" value={totals.pending} valueClass={totals.pending > 0 ? 'text-red' : 'text-text'} />
            </section>

            <section className="flex flex-col gap-4">
                <SectionLabel title={`Contas de ${cycle.label.split(' de ')[0].toLowerCase()}`} />

                <Card hover={false} className="p-3">
                    {inCycle.length === 0 ? (
                        <p className="py-12 text-center text-[13px] text-muted">Nenhuma conta fixa cobrada neste mês.</p>
                    ) : (
                        <div className="flex flex-col">
                            {inCycle.map((item) => (
                                <FixedRow
                                    key={item.id}
                                    item={item}
                                    couple={couple}
                                    payees={payees}
                                    onEdit={() => setEditing({ show: true, item })}
                                    onLink={() => setLinking(item)}
                                    onUnlink={() => unlink(item)}
                                    onRemove={() => remove(item)}
                                />
                            ))}
                        </div>
                    )}
                </Card>
            </section>

            {outside.length > 0 && (
                <section className="flex flex-col gap-4">
                    <SectionLabel title="Fora deste mês ou inativas" />
                    <Card hover={false} className="p-3">
                        {outside.map((item) => (
                            <FixedRow key={item.id} item={item} couple={couple} payees={payees} muted onEdit={() => setEditing({ show: true, item })} onRemove={() => remove(item)} />
                        ))}
                    </Card>
                </section>
            )}

            <FixedExpenseModal
                show={editing.show}
                item={editing.item}
                onClose={() => setEditing({ show: false, item: null })}
                categories={categories}
                payees={payees}
                couple={couple}
            />

            <LinkPaymentModal item={linking} month={cycle.month} onClose={() => setLinking(null)} />
        </AppLayout>
    );
}

function SummaryCard({ icon, label, value, valueClass = 'text-text' }) {
    return (
        <div className="flex min-w-0 flex-col gap-2.5 bg-surface px-6 py-[22px]">
            <div className="flex items-center justify-between gap-2 text-[13px] text-muted">
                <span>{label}</span>
                <IconBadge>{icon}</IconBadge>
            </div>
            <span className={`whitespace-nowrap text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] tabular-nums ${valueClass}`}>{money(value)}</span>
        </div>
    );
}

function matcherLabel(item, payees) {
    if (item.match_document) {
        const payee = payees.find((p) => p.document === item.match_document);
        return `Pix para ${payee?.name ?? formatDocument(item.match_document)}`;
    }
    if (item.match_pattern) return `descrição contém "${item.match_pattern}"`;
    return null;
}

function FixedRow({ item, couple, payees, muted = false, onEdit, onLink, onUnlink, onRemove }) {
    const occurrence = item.occurrence;
    const status = occurrence ? STATUS[occurrence.status] : null;
    const Icon = status?.icon ?? CircleDashed;
    const matcher = matcherLabel(item, payees);

    return (
        <div className={`flex flex-wrap items-center gap-3 rounded-[10px] px-2 py-2.5 transition-colors hover:bg-raised sm:flex-nowrap ${muted ? 'opacity-60' : ''}`}>
            <span className={`grid h-8 w-8 flex-none place-items-center rounded-lg ${status?.className ?? 'bg-inset text-muted'}`} title={status?.label}>
                <Icon size={15} strokeWidth={2} />
            </span>

            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[14px] font-medium">{item.description}</span>
                    {item.category && (
                        <span className="inline-flex items-center gap-1.5 text-[12px] text-muted">
                            <span className="h-2 w-2 rounded-[2px]" style={{ background: item.color }} />
                            {item.category}
                        </span>
                    )}
                    <span className={`rounded-full px-2 py-[1px] text-[12px] font-medium ${OWNERSHIP_BADGE[item.ownership]}`}>{ownershipLabel(couple, item.ownership)}</span>
                    {!item.active && <span className="rounded-full bg-inset px-2 py-[1px] text-[12px] text-muted">Inativa</span>}
                </div>
                <div className="mt-0.5 truncate text-[12px] text-muted">
                    {occurrence?.payment ? (
                        <>Paga em {dayMonth(occurrence.payment.date)} · {occurrence.payment.description}</>
                    ) : occurrence ? (
                        <>Vence {dayMonth(occurrence.due_date)} · {status?.label.toLowerCase()}</>
                    ) : (
                        <>Todo dia {item.due_day}{item.start_date || item.end_date ? ' · fora da vigência neste mês' : ''}</>
                    )}
                    {' · '}
                    {matcher ? (
                        <span>reconhece: {matcher}</span>
                    ) : (
                        <button type="button" onClick={onEdit} className="text-warning hover:underline">definir como reconhecer o pagamento</button>
                    )}
                </div>
            </div>

            <OccurrenceAmount item={item} />

            <Menu as="div" className="relative flex-none">
                <MenuButton aria-label="Ações" className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-inset hover:text-text">
                    <MoreHorizontal size={15} strokeWidth={2.2} />
                </MenuButton>
                <MenuItems anchor="bottom end" className="z-50 mt-1 w-56 rounded-[14px] bg-surface p-1.5 text-[14px] text-text border border-line focus:outline-none">
                    <MenuItem>
                        <button type="button" onClick={onEdit} className="flex w-full items-center gap-2 rounded-[8px] px-3 py-2.5 text-left data-[focus]:bg-raised">
                            <Pencil size={14} strokeWidth={1.75} className="text-muted" /> Editar
                        </button>
                    </MenuItem>
                    {occurrence && !occurrence.payment && onLink && (
                        <MenuItem>
                            <button type="button" onClick={onLink} className="flex w-full items-center gap-2 rounded-[8px] px-3 py-2.5 text-left data-[focus]:bg-raised">
                                <Link2 size={14} strokeWidth={1.75} className="text-muted" /> Vincular pagamento
                            </button>
                        </MenuItem>
                    )}
                    {occurrence?.payment && onUnlink && (
                        <MenuItem>
                            <button type="button" onClick={onUnlink} className="flex w-full items-center gap-2 rounded-[8px] px-3 py-2.5 text-left data-[focus]:bg-raised">
                                <Link2Off size={14} strokeWidth={1.75} className="text-muted" /> Desfazer vínculo
                            </button>
                        </MenuItem>
                    )}
                    <MenuItem>
                        <button type="button" onClick={onRemove} className="flex w-full items-center gap-2 rounded-[8px] px-3 py-2.5 text-left text-red data-[focus]:bg-raised">
                            <Trash2 size={13} /> Remover
                        </button>
                    </MenuItem>
                </MenuItems>
            </Menu>
        </div>
    );
}

// Valor do mês. Conta variável ainda não paga: clique para informar o valor real do mês.
function OccurrenceAmount({ item }) {
    const occurrence = item.occurrence;
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState(occurrence?.planned_amount ?? item.amount);

    if (!occurrence) {
        return <span className="w-[130px] flex-none whitespace-nowrap text-right font-mono text-[13px] text-muted">{item.variable_amount ? '≈ ' : ''}{money(item.amount)}</span>;
    }

    if (occurrence.payment) {
        const diff = occurrence.payment.amount - occurrence.planned_amount;
        return (
            <div className="w-[130px] flex-none text-right">
                <div className="whitespace-nowrap font-mono text-[13px]">{money(occurrence.payment.amount)}</div>
                {Math.abs(diff) >= 0.01 && (
                    <div className="text-[12px] text-muted">previsto {money(occurrence.planned_amount)}</div>
                )}
            </div>
        );
    }

    if (!item.variable_amount) {
        return <span className="w-[130px] flex-none whitespace-nowrap text-right font-mono text-[13px]">{money(occurrence.amount)}</span>;
    }

    if (editing) {
        const save = (e) => {
            e.preventDefault();
            router.put(route('fixedExpenses.occurrence.update', item.id), { due_date: occurrence.due_date, amount: value }, { preserveScroll: true, onSuccess: () => setEditing(false) });
        };

        return (
            <form onSubmit={save} className="w-[130px] flex-none">
                <MoneyInput
                    autoFocus value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onBlur={() => setEditing(false)}
                    className="h-9 w-full rounded-[8px] border border-line-strong bg-bg px-2 py-1 text-right font-mono text-[13px] text-text focus:border-accent focus:outline-none focus:ring-0"
                />
            </form>
        );
    }

    return (
        <div className="flex w-[130px] flex-none flex-col items-end">
            <button type="button" onClick={() => { setValue(occurrence.amount); setEditing(true); }} title="Clique para informar o valor real deste mês" className="whitespace-nowrap font-mono text-[13px] hover:underline">
                {occurrence.has_amount_override ? '' : '≈ '}{money(occurrence.amount)}
            </button>
            {occurrence.has_amount_override ? (
                <button
                    type="button"
                    onClick={() => router.delete(route('fixedExpenses.occurrence.destroy', occurrence.occurrence_id), { preserveScroll: true })}
                    className="text-[12px] text-muted hover:text-accent hover:underline"
                >
                    ajustado · voltar à estimativa
                </button>
            ) : (
                <span className="text-[12px] text-muted">estimado</span>
            )}
        </div>
    );
}

const EMPTY = {
    description: '', amount: '', variable_amount: false, due_day: '', start_date: '', end_date: '',
    category_id: '', ownership: 'both', match_document: '', match_pattern: '', active: true,
};

function FixedExpenseModal({ show, item, onClose, categories, payees, couple }) {
    const isEditing = Boolean(item);
    const { data, setData, post, put, transform, processing, errors, clearErrors } = useForm(EMPTY);

    useEffect(() => {
        if (!show) return;
        clearErrors();
        setData(item ? {
            description: item.description, amount: item.amount, variable_amount: item.variable_amount, due_day: item.due_day,
            start_date: item.start_date ?? '', end_date: item.end_date ?? '', category_id: item.category_id ?? '', ownership: item.ownership,
            match_document: item.match_document ?? '', match_pattern: item.match_pattern ?? '', active: item.active,
        } : EMPTY);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show, item?.id]);

    const knownPayee = payees.some((p) => p.document === data.match_document);
    const matcherMode = data.match_document ? 'document' : data.match_pattern ? 'pattern' : 'none';

    const submit = (e) => {
        e.preventDefault();
        transform((d) => ({ ...d, category_id: d.category_id || null, start_date: d.start_date || null, end_date: d.end_date || null }));
        const options = { preserveScroll: true, onSuccess: onClose };
        isEditing ? put(route('fixedExpenses.update', item.id), options) : post(route('fixedExpenses.store'), options);
    };

    return (
        <Modal show={show} onClose={onClose} title={isEditing ? 'Editar conta fixa' : 'Nova conta fixa'} maxWidth="lg">
            <form onSubmit={submit} className="flex flex-col gap-4">
                <Field label="Descrição" autoFocus value={data.description} onChange={(e) => setData('description', e.target.value)} placeholder="Ex: Aluguel" error={errors.description} />

                <div className="grid grid-cols-2 gap-3">
                    <Field
                        label={data.variable_amount ? 'Valor estimado' : 'Valor'}
                        money
                        value={data.amount} onChange={(e) => setData('amount', e.target.value)} error={errors.amount}
                    />
                    <Field label="Dia da cobrança" type="number" min="1" max="31" value={data.due_day} onChange={(e) => setData('due_day', e.target.value)} placeholder="Ex: 10" error={errors.due_day} />
                </div>

                <label className="flex items-start gap-2.5 text-[14px]">
                    <input type="checkbox" checked={data.variable_amount} onChange={(e) => setData('variable_amount', e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-line-strong bg-transparent text-accent focus:ring-accent/40 focus:ring-offset-0" />
                    <span>
                        Valor muda todo mês (luz, água…)
                        <span className="block text-[12px] text-muted">O valor acima vira estimativa até o pagamento real chegar.</span>
                    </span>
                </label>

                <div>
                    <span className="mb-1.5 block text-[13px] font-medium text-secondary">Como reconhecer o pagamento no banco</span>
                    <select
                        value={matcherMode === 'document' ? (knownPayee ? data.match_document : '__doc') : matcherMode === 'pattern' ? '__pattern' : ''}
                        onChange={(e) => {
                            const value = e.target.value;
                            if (value === '__pattern') { setData((d) => ({ ...d, match_document: '', match_pattern: d.match_pattern || d.description })); }
                            else if (value === '') { setData((d) => ({ ...d, match_document: '', match_pattern: '' })); }
                            else if (value !== '__doc') { setData((d) => ({ ...d, match_document: value, match_pattern: '' })); }
                        }}
                        className={`${INPUT_CLASSES} pr-9`}
                    >
                        <option value="" className="bg-surface">Não reconhecer (só previsão)</option>
                        {payees.map((p) => (
                            <option key={p.document} value={p.document} className="bg-surface">
                                Pix para {p.name} · {p.count}× · último {money(p.last_amount)}
                            </option>
                        ))}
                        {matcherMode === 'document' && !knownPayee && <option value="__doc" className="bg-surface">CPF/CNPJ {formatDocument(data.match_document)}</option>}
                        <option value="__pattern" className="bg-surface">Por um trecho da descrição…</option>
                    </select>
                    {matcherMode === 'pattern' && (
                        <Field className="mt-2" value={data.match_pattern} onChange={(e) => setData('match_pattern', e.target.value)} placeholder='Ex: NEW LINK' error={errors.match_pattern} />
                    )}
                    <p className="mt-1.5 text-[12px] text-muted">O pagamento é procurado no mesmo mês financeiro da cobrança.</p>
                </div>

                <Select
                    label="Categoria"
                    value={data.category_id}
                    onChange={(e) => setData('category_id', e.target.value)}
                    options={[{ value: '', label: '— Sem categoria —' }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
                    error={errors.category_id}
                />

                <div>
                    <span className="mb-1.5 block text-[13px] font-medium text-secondary">De quem é a conta</span>
                    <OwnershipToggle size="md" value={data.ownership} onChange={(value) => setData('ownership', value)} couple={couple} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <Field label="Começa em" type="date" value={data.start_date} onChange={(e) => setData('start_date', e.target.value)} error={errors.start_date} />
                    <Field label="Termina em" type="date" value={data.end_date} onChange={(e) => setData('end_date', e.target.value)} error={errors.end_date} />
                </div>
                <p className="-mt-2 text-[12px] text-muted">Opcional. Sem início, vale a partir deste mês; sem fim, não expira.</p>

                <label className="flex items-center gap-2.5 text-[14px]">
                    <input type="checkbox" checked={data.active} onChange={(e) => setData('active', e.target.checked)} className="h-4 w-4 rounded border-line-strong bg-transparent text-accent focus:ring-accent/40 focus:ring-offset-0" />
                    Ativa
                </label>

                <div className="mt-1 flex justify-end gap-2.5">
                    <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" variant="primary" disabled={processing}>{processing ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar conta fixa'}</Button>
                </div>
            </form>
        </Modal>
    );
}

// Escolher na mão qual lançamento pagou a conta deste mês.
function LinkPaymentModal({ item, month, onClose }) {
    const [rows, setRows] = useState(null);

    useEffect(() => {
        if (!item) return;
        setRows(null);
        axios.get(route('fixedExpenses.candidates', item.id), { params: { month } }).then(({ data }) => setRows(data.rows));
    }, [item, month]);

    const link = (row) => router.post(route('fixedExpenses.link', item.id), { month, expense_id: row.id }, { preserveScroll: true, onSuccess: onClose });

    return (
        <Modal show={Boolean(item)} onClose={onClose} title={item ? `Qual lançamento pagou "${item.description}"?` : ''} maxWidth="lg">
            {rows === null ? (
                <p className="py-8 text-center text-[13px] text-muted">Carregando…</p>
            ) : rows.length === 0 ? (
                <p className="py-8 text-center text-[13px] text-muted">Nenhuma despesa livre neste mês.</p>
            ) : (
                <div className="scroll-thin -mx-2 flex max-h-[420px] flex-col overflow-y-auto">
                    {rows.map((row) => (
                        <button key={row.id} type="button" onClick={() => link(row)} className="flex items-center gap-3 rounded-[10px] px-2 py-2.5 text-left hover:bg-raised">
                            <span className="w-[44px] flex-none font-mono text-[12px] text-secondary">{dayMonth(row.date)}</span>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-[14px] font-medium">{row.name}</span>
                                <span className="block truncate text-[12px] text-muted">{[row.prefix, row.category].filter(Boolean).join(' · ')}</span>
                            </span>
                            <span className="whitespace-nowrap font-mono text-[13px]">{money(row.amount)}</span>
                        </button>
                    ))}
                </div>
            )}
            <div className="mt-3 flex justify-end">
                <Button type="button" variant="ghost" onClick={onClose}>Fechar</Button>
            </div>
        </Modal>
    );
}
