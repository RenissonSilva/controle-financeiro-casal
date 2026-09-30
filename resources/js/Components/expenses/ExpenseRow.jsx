import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, CreditCard, EyeOff, Eye, MoreHorizontal, PenLine, Pencil, Trash2 } from 'lucide-react';
import MerchantLogo from '@/Components/ui/MerchantLogo';
import OwnershipToggle from '@/Components/ui/OwnershipToggle';
import { dayMonth, firstName, money } from '@/lib/format';

// Logo da empresa, quando reconhecida; senão o ícone da origem: cartão, Pix/conta, receita, acerto, manual.
function TypeIcon({ row }) {
    const base = 'grid h-8 w-8 flex-none place-items-center rounded-lg';

    if (row.kind === 'settlement') {
        return <span className={`${base} bg-accent/12 text-accent`}><ArrowLeftRight size={13} strokeWidth={2.3} /></span>;
    }
    if (row.merchant) {
        return <MerchantLogo merchant={row.merchant} />;
    }
    if (row.kind === 'income' || (row.direction === 'in' && row.kind !== 'ignored')) {
        return <span className={`${base} bg-accent/12 text-accent`}><ArrowDownLeft size={14} strokeWidth={2.3} /></span>;
    }
    if (row.origin === 'manual') {
        return <span className={`${base} bg-inset text-secondary`}><PenLine size={13} strokeWidth={2.2} /></span>;
    }
    if (row.account_type === 'CREDIT') {
        return <span className={`${base} bg-inset text-secondary`}><CreditCard size={13} strokeWidth={2.2} /></span>;
    }

    return <span className={`${base} bg-inset text-secondary`}><ArrowUpRight size={14} strokeWidth={2.2} /></span>;
}

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
    if (row.kind_label && (row.kind !== 'expense' || row.kind_reason === 'refund')) bits.push(row.kind_label);
    if (row.installment && !row.bank_name.includes(row.installment)) bits.push(`parcela ${row.installment}`);
    if (row.currency_code) bits.push(`${row.currency_code} ${Number(row.original_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    if (row.bank_status === 'PENDING') {
        bits.push(row.is_future ? 'parcela futura' : row.account_type === 'CREDIT' ? 'fatura em aberto' : 'pendente no banco');
    }
    if (row.fixed_expense) bits.push(`conta fixa: ${row.fixed_expense}`);
    if (row.origin === 'manual') bits.push(`manual · pago por ${firstName(row.source === 'payer2' ? couple?.payer2_name : couple?.payer1_name)}`);
    else if (row.source === 'payer2') bits.push(`pago por ${firstName(couple?.payer2_name)}`);

    return <div className="truncate text-[12px] text-muted">{bits.join(' · ') || ' '}</div>;
}

export default function ExpenseRow({ row, couple, categories, showDate, selected, onToggleSelect, onChange, onEdit, onToggleIgnore, onDelete }) {
    const editable = row.kind === 'expense';
    const category = categories.find((c) => c.id === row.category_id);

    return (
        <div
            className={`group flex items-center gap-3 rounded-[10px] px-2 py-2 transition-colors ${
                selected ? 'bg-accent/8' : 'hover:bg-raised'
            } ${row.kind === 'ignored' ? 'opacity-60' : ''}`}
        >
            <input
                type="checkbox"
                checked={selected}
                onChange={onToggleSelect}
                aria-label={`Selecionar ${row.name}`}
                className="h-4 w-4 flex-none rounded border-line-strong bg-transparent text-accent focus:ring-accent/40 focus:ring-offset-0"
            />

            {showDate && <span className="w-[44px] flex-none font-mono text-[12px] text-secondary">{dayMonth(row.date)}</span>}

            <TypeIcon row={row} />

            <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
                <div className="truncate text-[14px] font-medium">
                    {row.name}
                    {row.notes && <span className="font-normal text-muted"> · {row.notes}</span>}
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
                    </div>
                    <div className="hidden flex-none md:block">
                        <OwnershipToggle value={row.ownership} onChange={(ownership) => onChange({ ownership })} couple={couple} />
                    </div>
                </>
            ) : (
                <div className="hidden w-[168px] flex-none lg:block" />
            )}
            {!editable && <div className="hidden w-[141px] flex-none md:block" />}

            <Amount row={row} />

            <Menu as="div" className="relative flex-none">
                <MenuButton aria-label="Ações" className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-inset hover:text-text">
                    <MoreHorizontal size={15} strokeWidth={2.2} />
                </MenuButton>
                <MenuItems
                    anchor="bottom end"
                    className="z-50 mt-1 w-56 rounded-[14px] bg-surface p-1.5 text-[14px] text-text border border-line focus:outline-none"
                >
                    <MenuItem>
                        <button type="button" onClick={onEdit} className="flex w-full items-center gap-2 rounded-[8px] px-3 py-2.5 text-left data-[focus]:bg-raised">
                            <Pencil size={14} strokeWidth={1.75} className="text-muted" /> Editar
                        </button>
                    </MenuItem>
                    <MenuItem>
                        <button type="button" onClick={onToggleIgnore} className="flex w-full items-center gap-2 rounded-[8px] px-3 py-2.5 text-left data-[focus]:bg-raised">
                            {row.kind === 'ignored' ? (
                                <><Eye size={14} strokeWidth={1.75} className="text-muted" /> Voltar a contar</>
                            ) : (
                                <><EyeOff size={14} strokeWidth={1.75} className="text-muted" /> Ignorar nos cálculos</>
                            )}
                        </button>
                    </MenuItem>
                    {row.origin === 'manual' && (
                        <MenuItem>
                            <button type="button" onClick={onDelete} className="flex w-full items-center gap-2 rounded-[8px] px-3 py-2.5 text-left text-red data-[focus]:bg-raised">
                                <Trash2 size={13} /> Excluir
                            </button>
                        </MenuItem>
                    )}
                </MenuItems>
            </Menu>
        </div>
    );
}
