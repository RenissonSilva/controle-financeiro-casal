import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { EyeOff, Eye, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import ExpenseIcon from '@/Components/expenses/ExpenseIcon';
import OwnershipToggle from '@/Components/ui/OwnershipToggle';
import { dayMonth, firstName, money } from '@/lib/format';

function Amount({ row }) {
    const value = money(row.amount);
    const base = 'w-[112px] flex-none whitespace-nowrap text-right font-mono text-[13px]';

    if (row.kind === 'ignored') return <span className={`${base} text-muted/70 line-through decoration-muted/50`}>{value}</span>;
    if (row.kind === 'income') return <span className={`${base} text-accent`}>+{value}</span>;
    if (row.kind === 'settlement') return <span className={`${base} text-secondary`}>{row.direction === 'in' ? '+' : '−'}{value}</span>;
    if (row.direction === 'in') return <span className={`${base} text-accent`}>+{value}</span>;

    return <span className={`${base} text-text`}>−{value}</span>;
}

// Linha de detalhes: "14:32 · Transferência enviada · parcela 3/6 · US$ 21,49 · conta fixa: Aluguel".
function Details({ row, couple }) {
    const bits = [];

    // No cartão, a compra da maquininha entra na fatura no dia seguinte: mostra o dia da compra.
    if (row.time) bits.push(row.occurred_on !== row.date ? `compra ${dayMonth(row.occurred_on)} ${row.time}` : row.time);
    if (row.prefix) bits.push(row.prefix);
    if (row.custom_name) bits.push(row.bank_name);
    // "Ignorado por você" já está na etiqueta ao lado do nome.
    if (row.kind_label && row.kind_reason !== 'user' && (row.kind !== 'expense' || row.kind_reason === 'refund')) bits.push(row.kind_label);
    if (row.installment && !row.bank_name.includes(row.installment)) bits.push(`parcela ${row.installment}`);
    if (row.currency_code) bits.push(`${row.currency_code} ${Number(row.original_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    if (row.bank_status === 'PENDING') {
        bits.push(row.is_future ? 'parcela futura' : row.account_type === 'CREDIT' ? 'fatura em aberto' : 'pendente no banco');
    }
    if (row.fixed_expense) bits.push(`conta fixa: ${row.fixed_expense}`);
    if (row.origin === 'manual') bits.push(`manual · pago por ${firstName(row.source === 'payer2' ? couple?.payer2_name : couple?.payer1_name)}`);
    else if (row.source === 'payer2') bits.push(`pago por ${firstName(couple?.payer2_name)}`);

    return <div className={`truncate text-[12px] ${row.kind === 'ignored' ? 'text-muted/70' : 'text-muted'}`}>{bits.join(' · ') || ' '}</div>;
}

function IgnoredTag() {
    return (
        <span
            title="Não entra nos totais, no rateio nem no acerto"
            className="inline-flex flex-none items-center gap-1 rounded-full bg-inset px-2 py-[1px] text-[11px] font-medium text-secondary max-[560px]:px-1.5 max-[560px]:py-[3px]"
        >
            {/* No celular fica só o ícone, para o nome não sumir. */}
            <EyeOff size={11} strokeWidth={2} /><span className="max-[560px]:sr-only">Ignorado</span>
        </span>
    );
}

// canEdit/canDelete: conta vinculada sem permissão vê a linha só para leitura (clicar abre os detalhes).
export default function ExpenseRow({ row, couple, categories, showDate, selected, onToggleSelect, onChange, onEdit, onToggleIgnore, onDelete, canEdit = true, canDelete = true }) {
    const editable = row.kind === 'expense';
    const ignored = row.kind === 'ignored';
    const category = categories.find((c) => c.id === row.category_id);
    const deletable = canDelete && row.origin === 'manual';

    // Ignorado: ícone em cinza e textos apagados; a etiqueta e as ações continuam legíveis.
    return (
        <div
            className={`group flex items-center gap-3 rounded-[10px] px-2 py-2 transition-colors ${
                selected ? 'bg-accent/8' : 'hover:bg-raised'
            }`}
        >
            {canEdit && (
                <input
                    type="checkbox"
                    checked={selected}
                    onChange={onToggleSelect}
                    aria-label={`Selecionar ${row.name}`}
                    className="h-4 w-4 flex-none rounded border-line-strong bg-transparent text-accent focus:ring-accent/40 focus:ring-offset-0"
                />
            )}

            {showDate && <span className={`w-[44px] flex-none font-mono text-[12px] ${ignored ? 'text-muted' : 'text-secondary'}`}>{dayMonth(row.date)}</span>}

            <div className={`flex-none ${ignored ? 'opacity-40 grayscale' : ''}`}>
                <ExpenseIcon row={row} />
            </div>

            <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
                <div className="flex min-w-0 items-center gap-2">
                    <span className={`truncate text-[14px] font-medium ${ignored ? 'text-muted' : ''}`}>
                        {row.name}
                        {row.notes && <span className="font-normal text-muted"> · {row.notes}</span>}
                    </span>
                    {ignored && <IgnoredTag />}
                </div>
                <Details row={row} couple={couple} />
            </button>

            {editable ? (
                <>
                    <div className="hidden w-[168px] flex-none items-center gap-2 lg:flex">
                        <span
                            className="h-2 w-2 flex-none rounded-[2px]"
                            style={{ background: category?.color || 'rgb(var(--color-line-strong-rgb))' }}
                        />
                        {canEdit ? (
                            <select
                                value={row.category_id ?? ''}
                                onChange={(e) => onChange({ category_id: e.target.value ? Number(e.target.value) : null })}
                                aria-label="Categoria"
                                className={`w-full truncate rounded-[8px] border-0 bg-transparent py-1 pl-1 pr-7 text-[13px] transition-colors hover:bg-inset focus:bg-inset focus:ring-1 focus:ring-accent/50 ${
                                    row.category_id ? 'text-secondary' : 'text-warning'
                                }`}
                            >
                                <option value="" className="bg-surface text-text">Sem categoria</option>
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id} className="bg-surface text-text">{c.name}</option>
                                ))}
                            </select>
                        ) : (
                            <span className={`truncate py-1 pl-1 text-[13px] ${row.category_id ? 'text-secondary' : 'text-warning'}`}>{category?.name ?? 'Sem categoria'}</span>
                        )}
                    </div>
                    <div className="hidden flex-none md:block">
                        <OwnershipToggle value={row.ownership} onChange={(ownership) => onChange({ ownership })} couple={couple} disabled={!canEdit} />
                    </div>
                </>
            ) : (
                <div className="hidden w-[168px] flex-none lg:block" />
            )}
            {!editable && <div className="hidden w-[141px] flex-none md:block" />}

            <Amount row={row} />

            {canEdit || deletable ? (
                <Menu as="div" className="relative flex-none">
                    <MenuButton aria-label="Ações" className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-inset hover:text-text">
                        <MoreHorizontal size={15} strokeWidth={2.2} />
                    </MenuButton>
                    <MenuItems
                        anchor="bottom end"
                        className="z-50 mt-1 w-56 rounded-[14px] bg-surface p-1.5 text-[14px] text-text border border-line focus:outline-none"
                    >
                        {canEdit && (
                            <MenuItem>
                                <button type="button" onClick={onEdit} className="flex w-full items-center gap-2 rounded-[8px] px-3 py-2.5 text-left data-[focus]:bg-raised">
                                    <Pencil size={14} strokeWidth={1.75} className="text-muted" /> Editar
                                </button>
                            </MenuItem>
                        )}
                        {canEdit && (
                            <MenuItem>
                                <button type="button" onClick={onToggleIgnore} className="flex w-full items-center gap-2 rounded-[8px] px-3 py-2.5 text-left data-[focus]:bg-raised">
                                    {row.kind === 'ignored' ? (
                                        <><Eye size={14} strokeWidth={1.75} className="text-muted" /> Voltar a contar</>
                                    ) : (
                                        <><EyeOff size={14} strokeWidth={1.75} className="text-muted" /> Ignorar nos cálculos</>
                                    )}
                                </button>
                            </MenuItem>
                        )}
                        {deletable && (
                            <MenuItem>
                                <button type="button" onClick={onDelete} className="flex w-full items-center gap-2 rounded-[8px] px-3 py-2.5 text-left text-red data-[focus]:bg-raised">
                                    <Trash2 size={13} /> Excluir
                                </button>
                            </MenuItem>
                        )}
                    </MenuItems>
                </Menu>
            ) : (
                <span className="h-8 w-8 flex-none" aria-hidden="true" />
            )}
        </div>
    );
}
