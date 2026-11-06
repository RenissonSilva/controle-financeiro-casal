import { useForm } from '@inertiajs/react';
import { useEffect, useMemo } from 'react';
import Modal from '@/Components/ui/Modal';
import Field from '@/Components/ui/Field';
import Select from '@/Components/ui/Select';
import Button from '@/Components/ui/Button';
import Segmented from '@/Components/ui/Segmented';
import OwnershipToggle from '@/Components/ui/OwnershipToggle';
import { firstName, fullDate, money, monthShort, percent } from '@/lib/format';
import { patternMatches } from '@/lib/nameRule';
import { purchasePlan, round2, savedPayer1Total } from '@/lib/split';

const blank = (defaultDate, kind = 'expense') => ({
    description: '',
    custom_name: '',
    name_pattern: '',
    amount: '',
    date: defaultDate,
    kind,
    settlement_direction: 'in',
    category_id: '',
    ownership: 'both',
    split: 'income',
    payer1_share: '',
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
    split: row.custom_payer1_share != null ? 'custom' : 'income',
    payer1_share: row.custom_payer1_share != null ? savedPayer1Total(row).toFixed(2) : '',
    source: row.source,
    notes: row.notes ?? '',
    fixed_expense_id: row.fixed_expense_id ?? '',
});

const truncate = (text, max) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

// Criar (row = null) ou editar um lançamento. readOnly: conta vinculada sem permissão só vê os detalhes.
export default function ExpenseModal({ show, row, initialKind, rows = [], onClose, couple, categories, fixedExpenses, defaultDate, readOnly = false }) {
    const isEditing = Boolean(row);
    const fromBank = row?.origin === 'open_finance';
    const partner = firstName(couple?.payer2_name);
    const me = firstName(couple?.payer1_name);

    const { data, setData, post, put, transform, processing, errors, reset, clearErrors } = useForm(isEditing ? fromRow(row) : blank(defaultDate));

    useEffect(() => {
        if (!show) return;
        clearErrors();
        setData(isEditing ? fromRow(row) : blank(defaultDate, initialKind));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show, row?.id]);

    const submit = (e) => {
        e.preventDefault();
        if (readOnly) return;
        const options = { preserveScroll: true, onSuccess: () => { reset(); onClose(); } };

        transform(({ custom_name, name_pattern, ...d }) => {
            // Divisão só existe em despesa "Nós"; a definida à mão não mexe no "Vale para".
            const shared = d.kind === 'expense' && d.ownership === 'both';
            const custom = shared && d.split === 'custom';

            return {
                ...d,
                ...(fromBank ? { custom_name: custom_name?.trim() || null, name_pattern: name_pattern?.trim() || null } : {}),
                category_id: d.category_id || null,
                fixed_expense_id: d.fixed_expense_id || null,
                split: shared ? d.split : null,
                payer1_share: custom ? d.payer1_share || 0 : null,
                ...(custom ? { ownership_scope: null } : {}),
            };
        });

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

    // Total que a divisão reparte: a compra toda (parcelada) ou o valor do lançamento.
    const purchase = isEditing && row.purchase ? row.purchase : null;
    const plan = purchase ? purchasePlan(purchase, row, data.payer1_share) : null;
    const splitTotal = plan ? plan.total : Number(data.amount) || 0;
    const incomeSplit = (total) => round2(total * (Number(couple?.payer1_percent) || 0) / 100).toFixed(2);

    const chooseSplit = (split) => {
        setData((d) => ({
            ...d,
            split,
            // Começa da divisão pela renda, para só ajustar.
            payer1_share: split === 'custom' && d.payer1_share === '' && splitTotal > 0 ? incomeSplit(splitTotal) : d.payer1_share,
        }));
    };

    const kinds = [
        { value: 'expense', label: 'Despesa' },
        { value: 'income', label: 'Receita' },
        { value: 'settlement', label: 'Acerto' },
        ...(isEditing ? [{ value: 'ignored', label: 'Ignorar' }] : []),
    ];

    return (
        <Modal show={show} onClose={onClose} title={readOnly ? 'Detalhes do lançamento' : isEditing ? 'Editar lançamento' : 'Novo lançamento'} maxWidth="lg">
            <form onSubmit={submit} className="flex flex-col gap-4">
                <fieldset disabled={readOnly} className="m-0 flex min-w-0 flex-col gap-4 border-0 p-0">
                    {fromBank && (
                        <div className="rounded-[12px] border border-line bg-bg/40 px-3.5 py-3">
                            <div className="text-[14px] font-medium">{row.bank_name}</div>
                            <div className="mt-0.5 font-mono text-[12px] text-secondary">
                                {[row.prefix, fullDate(row.date), row.account_type === 'CREDIT' ? 'cartão de crédito' : 'conta', money(row.amount)].filter(Boolean).join(' · ')}
                            </div>
                            <div className="mt-1.5 text-[12px] text-muted">Descrição, valor e data vêm do banco e não podem ser alterados.</div>
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
                                    <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
                                        Use <code className="text-secondary">%</code> para qualquer texto.
                                    </p>
                                    {data.name_pattern?.trim() && (
                                        <p className={`mt-1 text-[12px] ${matched.length ? 'text-secondary' : 'text-red'}`}>
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
                        <span className="mb-1.5 block text-[13px] font-medium text-secondary">Tipo</span>
                        <Segmented options={kinds} value={data.kind} onChange={(kind) => setData('kind', kind)} className="w-fit" />
                        {data.kind === 'ignored' && <p className="mt-1.5 text-[12px] text-muted">Fica fora de todos os totais, do rateio e do acerto.</p>}
                        {data.kind === 'settlement' && <p className="mt-1.5 text-[12px] text-muted">Dinheiro trocado entre vocês — não conta como receita nem despesa.</p>}
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
                            <span className="mb-1.5 block text-[13px] font-medium text-secondary">Quem pagou quem</span>
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
                                <span className="mb-1.5 block text-[13px] font-medium text-secondary">De quem é o gasto</span>
                                <OwnershipToggle size="md" value={data.ownership} onChange={(value) => setData('ownership', value)} couple={couple} />
                                {data.ownership === 'both' && (
                                    <div className="mt-3">
                                        <span className="mb-1.5 block text-[13px] font-medium text-secondary">Como dividir</span>
                                        <Segmented
                                            options={[
                                                { value: 'income', label: 'Pela renda' },
                                                { value: 'custom', label: 'Valores definidos' },
                                            ]}
                                            value={data.split}
                                            onChange={chooseSplit}
                                            className="w-fit max-w-full"
                                        />
                                    </div>
                                )}
                                {data.ownership === 'both' && data.split === 'custom' ? (
                                    <CustomSplit
                                        data={data}
                                        setData={setData}
                                        error={errors.payer1_share}
                                        total={splitTotal}
                                        plan={plan}
                                        row={row}
                                        me={me}
                                        partner={partner}
                                    />
                                ) : (
                                    <p className="mt-1.5 text-[12px] text-muted">"Nós" é dividido pela proporção de renda ({couple?.payer1_percent}% / {couple?.payer2_percent}%).</p>
                                )}
                                {isEditing && !(data.ownership === 'both' && data.split === 'custom') && (
                                    <div className="mt-3">
                                        <span className="mb-1.5 block text-[13px] font-medium text-secondary">Vale para</span>
                                        <Segmented
                                            options={[
                                                { value: 'one', label: 'Só este lançamento' },
                                                { value: 'all', label: `Todos de ${truncate(row.custom_name || row.bank_name || row.description, 24)}` },
                                            ]}
                                            value={data.ownership_scope}
                                            onChange={(value) => setData('ownership_scope', value)}
                                            className="w-fit max-w-full"
                                        />
                                        <p className="mt-1.5 text-[12px] text-muted">
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
                            <span className="mb-1.5 block text-[13px] font-medium text-secondary">{data.kind === 'income' ? 'Recebido por' : 'Pago por'}</span>
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
                                <p className="mt-1.5 text-[12px] text-muted">Gasto pago por {partner} — a sua parte abate o que {partner} te deve.</p>
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

                    <Field label="Observação" value={data.notes} onChange={(e) => setData('notes', e.target.value)} placeholder={readOnly ? '' : 'Opcional'} error={errors.notes} />
                </fieldset>

                <div className="mt-1 flex justify-end gap-2.5">
                    {readOnly ? (
                        <Button type="button" variant="secondary" onClick={onClose}>Fechar</Button>
                    ) : (
                        <>
                            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
                            <Button type="submit" variant="primary" disabled={processing}>
                                {processing ? 'Salvando...' : isEditing ? 'Salvar' : 'Adicionar'}
                            </Button>
                        </>
                    )}
                </div>
            </form>
        </Modal>
    );
}

// Quanto cada um paga, em reais. Editar um lado recalcula o outro (as partes somam o total). Em compra
// parcelada o total é o da compra e a prévia mostra a parte de cada um em cada parcela.
function CustomSplit({ data, setData, error, total, plan, row, me, partner }) {
    const payer1 = Number(data.payer1_share) || 0;
    const payer2 = round2(total - payer1);
    const over = payer1 > total + 0.001;
    const current = row?.purchase?.items.find((item) => item.id === row.id)?.number;
    const pct = (value) => (total > 0 ? percent((value / total) * 100) : '—');

    const setPayer1 = (value) => setData('payer1_share', value);
    const setPayer2 = (value) => setData('payer1_share', value === '' ? total.toFixed(2) : Math.max(round2(total - Number(value)), 0).toFixed(2));

    return (
        <div className="mt-3 flex flex-col gap-2.5">
            {plan && (
                <p className="text-[12px] leading-relaxed text-muted">
                    Compra em {row.purchase.count}× · total {plan.estimated ? 'estimado ' : ''}
                    <span className="font-mono text-secondary">{money(total)}</span>. Informe quanto cada um paga na compra toda.
                </p>
            )}
            <div className="grid grid-cols-2 gap-3">
                <Field
                    label={<span className="flex items-center gap-2"><span className="h-2 w-2 rounded-[2px] bg-person1" />{me}</span>}
                    money
                    value={data.payer1_share}
                    onChange={(e) => setPayer1(e.target.value)}
                    aria-label={`Parte de ${me}`}
                />
                <Field
                    label={<span className="flex items-center gap-2"><span className="h-2 w-2 rounded-[2px] bg-person2" />{partner}</span>}
                    money
                    value={over ? '' : payer2.toFixed(2)}
                    onChange={(e) => setPayer2(e.target.value)}
                    aria-label={`Parte de ${partner}`}
                />
            </div>
            {over || error ? (
                <p className="text-[12px] text-red">{error || `As partes precisam somar ${money(total)}.`}</p>
            ) : (
                <p className="text-[12px] text-muted">
                    {me} {pct(payer1)} · {partner} {pct(payer2)} de {money(total)}
                </p>
            )}

            {plan && !over && (
                <div className="rounded-[12px] border border-line bg-bg/40 px-3.5 py-2">
                    {plan.slots.map((slot) => (
                        <div key={slot.number} className={`flex items-baseline justify-between gap-3 py-1 text-[12px] ${slot.item ? '' : 'text-muted'}`}>
                            <span className={`whitespace-nowrap font-mono ${slot.number === current ? 'text-text' : 'text-secondary'}`}>
                                {slot.number}/{row.purchase.count}
                                {slot.item ? ` · ${monthShort(slot.item.competence)}` : ''}
                                {slot.number === current && <span className="font-sans text-muted"> · esta</span>}
                            </span>
                            <span className="truncate text-right font-mono tabular-nums">
                                {slot.item ? (
                                    <><span className="text-person1">{money(slot.payer1)}</span> <span className="text-muted">·</span> <span className="text-person2">{money(slot.payer2)}</span></>
                                ) : (
                                    <span className="font-sans">ainda não chegou do banco — segue a mesma divisão</span>
                                )}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            <p className="text-[12px] text-muted">
                {plan
                    ? `Vale para as ${row.purchase.count} parcelas desta compra.`
                    : 'Vale só para este lançamento.'}
            </p>
        </div>
    );
}
