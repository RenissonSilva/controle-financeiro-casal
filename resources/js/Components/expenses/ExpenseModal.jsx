import { useForm } from '@inertiajs/react';
import { useEffect, useMemo } from 'react';
import Modal from '@/Components/ui/Modal';
import Field from '@/Components/ui/Field';
import Select from '@/Components/ui/Select';
import Button from '@/Components/ui/Button';
import Segmented from '@/Components/ui/Segmented';
import OwnershipToggle from '@/Components/ui/OwnershipToggle';
import { firstName, fullDate, money } from '@/lib/format';
import { patternMatches } from '@/lib/nameRule';

const blank = (defaultDate) => ({
    description: '',
    custom_name: '',
    name_pattern: '',
    amount: '',
    date: defaultDate,
    kind: 'expense',
    settlement_direction: 'in',
    category_id: '',
    ownership: 'both',
    source: 'payer1',
    notes: '',
    fixed_expense_id: '',
});

const fromRow = (row) => ({
    description: row.description,
    custom_name: row.custom_name ?? '',
    name_pattern: row.name_pattern ?? row.bank_name ?? '',
    amount: row.amount,
    date: row.date,
    kind: row.kind,
    settlement_direction: row.direction === 'out' ? 'out' : 'in',
    category_id: row.category_id ?? '',
    ownership: row.ownership,
    ownership_scope: row.ownership_scope ?? 'one',
    source: row.source,
    notes: row.notes ?? '',
    fixed_expense_id: row.fixed_expense_id ?? '',
});

const truncate = (text, max) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

// Criar (row = null) ou editar um lançamento.
export default function ExpenseModal({ show, row, rows = [], onClose, couple, categories, fixedExpenses, defaultDate }) {
    const isEditing = Boolean(row);
    const fromBank = row?.origin === 'open_finance';
    const partner = firstName(couple?.payer2_name);
    const me = firstName(couple?.payer1_name);

    const { data, setData, post, put, transform, processing, errors, reset, clearErrors } = useForm(isEditing ? fromRow(row) : blank(defaultDate));

    useEffect(() => {
        if (!show) return;
        clearErrors();
        setData(isEditing ? fromRow(row) : blank(defaultDate));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show, row?.id]);

    const submit = (e) => {
        e.preventDefault();
        const options = { preserveScroll: true, onSuccess: () => { reset(); onClose(); } };

        transform(({ custom_name, name_pattern, ...d }) => ({
            ...d,
            ...(fromBank ? { custom_name: custom_name?.trim() || null, name_pattern: name_pattern?.trim() || null } : {}),
            category_id: d.category_id || null,
            fixed_expense_id: d.fixed_expense_id || null,
        }));

        if (isEditing) {
            put(route('expenses.update', row.id), options);
        } else {
            post(route('expenses.store'), options);
        }
    };

    // Prévia: lançamentos deste mês que o filtro pega.
    const matched = useMemo(() => {
        if (!fromBank || !data.name_pattern?.trim()) return [];
        return rows.filter((r) => patternMatches(data.name_pattern, r));
    }, [fromBank, rows, data.name_pattern]);
    const matchedNames = [...new Set(matched.map((r) => r.bank_name))];

    const kinds = [
        { value: 'expense', label: 'Despesa' },
        { value: 'income', label: 'Receita' },
        { value: 'settlement', label: 'Acerto' },
        ...(isEditing ? [{ value: 'ignored', label: 'Ignorar' }] : []),
    ];

    return (
        <Modal show={show} onClose={onClose} title={isEditing ? 'Editar lançamento' : 'Novo lançamento'} maxWidth="lg">
            <form onSubmit={submit} className="flex flex-col gap-4">
                {fromBank && (
                    <div className="rounded-[12px] bg-text/[0.04] px-3.5 py-3 shadow-[inset_0_0_0_1px_rgb(var(--color-text-rgb)/0.08)]">
                        <div className="text-[13.5px] font-medium">{row.bank_name}</div>
                        <div className="mt-0.5 text-[12px] text-text/50">
                            {[row.prefix, fullDate(row.date), row.account_type === 'CREDIT' ? 'cartão de crédito' : 'conta', money(row.amount)].filter(Boolean).join(' · ')}
                        </div>
                        <div className="mt-1.5 text-[11.5px] text-text/40">Descrição, valor e data vêm do banco e não podem ser alterados.</div>
                    </div>
                )}

                {fromBank && (
                    <div className="flex flex-col gap-3">
                        <Field
                            label="Nome personalizado"
                            value={data.custom_name}
                            onChange={(e) => setData('custom_name', e.target.value)}
                            maxLength={255}
                            error={errors.custom_name}
                        />
                        {data.custom_name?.trim() && (
                            <div>
                                <Field
                                    label="Aplicar aos lançamentos com o nome"
                                    value={data.name_pattern}
                                    onChange={(e) => setData('name_pattern', e.target.value)}
                                    placeholder={row.bank_name}
                                    maxLength={255}
                                    error={errors.name_pattern}
                                />
                                <p className="mt-1.5 text-[11.5px] leading-relaxed text-text/45">
                                    Use <code className="text-text/70">%</code> para qualquer texto.
                                </p>
                                {data.name_pattern?.trim() && (
                                    <p className={`mt-1 text-[11.5px] ${matched.length ? 'text-text/60' : 'text-red'}`}>
                                        {matched.length
                                            ? `Neste mês: ${matched.length} ${matched.length === 1 ? 'lançamento' : 'lançamentos'} — ${matchedNames.slice(0, 4).join(', ')}${matchedNames.length > 4 ? '…' : ''}`
                                            : 'Não pega nenhum lançamento deste mês.'}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                )}

                <div>
                    <span className="mb-1.5 block text-[12.5px] font-medium text-text/70">Tipo</span>
                    <Segmented options={kinds} value={data.kind} onChange={(kind) => setData('kind', kind)} className="w-fit" />
                    {data.kind === 'ignored' && <p className="mt-1.5 text-[11.5px] text-text/45">Fica fora de todos os totais, do rateio e do acerto.</p>}
                    {data.kind === 'settlement' && <p className="mt-1.5 text-[11.5px] text-text/45">Dinheiro trocado entre vocês — não conta como receita nem despesa.</p>}
                </div>

                {!fromBank && (
                    <>
                        <Field
                            label="Descrição"
                            autoFocus={!isEditing}
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                            placeholder={data.kind === 'settlement' ? `Ex: ${partner} pagou em dinheiro` : 'Ex: Feira de sábado'}
                            error={errors.description}
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Valor" money value={data.amount} onChange={(e) => setData('amount', e.target.value)} error={errors.amount} />
                            <Field label="Data" type="date" value={data.date} onChange={(e) => setData('date', e.target.value)} error={errors.date} />
                        </div>
                    </>
                )}

                {data.kind === 'settlement' && !fromBank && (
                    <div>
                        <span className="mb-1.5 block text-[12.5px] font-medium text-text/70">Quem pagou quem</span>
                        <Segmented
                            options={[
                                { value: 'in', label: `${partner} pagou ${me}` },
                                { value: 'out', label: `${me} pagou ${partner}` },
                            ]}
                            value={data.settlement_direction}
                            onChange={(value) => setData('settlement_direction', value)}
                            className="w-fit"
                        />
                    </div>
                )}

                {data.kind === 'expense' && (
                    <>
                        <Select
                            label="Categoria"
                            value={data.category_id}
                            onChange={(e) => setData('category_id', e.target.value)}
                            options={[{ value: '', label: '— Sem categoria —' }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
                            error={errors.category_id}
                        />
                        <div>
                            <span className="mb-1.5 block text-[12.5px] font-medium text-text/70">De quem é o gasto</span>
                            <OwnershipToggle size="md" value={data.ownership} onChange={(value) => setData('ownership', value)} couple={couple} />
                            <p className="mt-1.5 text-[11.5px] text-text/45">"Nós" é dividido pela proporção de renda ({couple?.payer1_percent}% / {couple?.payer2_percent}%).</p>
                            {isEditing && (
                                <div className="mt-3">
                                    <span className="mb-1.5 block text-[12.5px] font-medium text-text/70">Vale para</span>
                                    <Segmented
                                        options={[
                                            { value: 'one', label: 'Só este lançamento' },
                                            { value: 'all', label: `Todos de ${truncate(row.custom_name || row.bank_name || row.description, 24)}` },
                                        ]}
                                        value={data.ownership_scope}
                                        onChange={(value) => setData('ownership_scope', value)}
                                        className="w-fit max-w-full"
                                    />
                                    <p className="mt-1.5 text-[11.5px] text-text/45">
                                        {data.ownership_scope === 'all'
                                            ? 'Aplica às cobranças do mesmo estabelecimento deste mês em diante e às que ainda vão chegar. Meses anteriores não mudam.'
                                            : 'As próximas cobranças do mesmo estabelecimento não seguem esta escolha.'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {!fromBank && data.kind !== 'settlement' && (
                    <div>
                        <span className="mb-1.5 block text-[12.5px] font-medium text-text/70">{data.kind === 'income' ? 'Recebido por' : 'Pago por'}</span>
                        <Segmented
                            options={[
                                { value: 'payer1', label: me },
                                { value: 'payer2', label: partner },
                            ]}
                            value={data.source}
                            onChange={(value) => setData('source', value)}
                            className="w-fit"
                        />
                        {data.kind === 'expense' && data.source === 'payer2' && (
                            <p className="mt-1.5 text-[11.5px] text-text/45">Gasto pago por {partner} — a sua parte abate o que {partner} te deve.</p>
                        )}
                    </div>
                )}

                {data.kind === 'expense' && fixedExpenses.length > 0 && (
                    <Select
                        label="É o pagamento de uma conta fixa?"
                        value={data.fixed_expense_id}
                        onChange={(e) => setData('fixed_expense_id', e.target.value)}
                        options={[{ value: '', label: 'Não' }, ...fixedExpenses.map((f) => ({ value: f.id, label: f.description }))]}
                        error={errors.fixed_expense_id}
                    />
                )}

                <Field label="Observação" value={data.notes} onChange={(e) => setData('notes', e.target.value)} placeholder="Opcional" error={errors.notes} />

                <div className="mt-1 flex justify-end gap-2.5">
                    <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" variant="secondary" disabled={processing}>
                        {processing ? 'Salvando...' : isEditing ? 'Salvar' : 'Adicionar'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
