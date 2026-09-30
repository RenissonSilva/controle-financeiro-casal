import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, CreditCard, EyeOff, Eye, MoreHorizontal, PenLine, Pencil, Trash2 } from 'lucide-react';
import MerchantLogo from '@/Components/ui/MerchantLogo';
import OwnershipToggle from '@/Components/ui/OwnershipToggle';
import { dayMonth, firstName, money } from '@/lib/format';

// Logo da empresa, quando reconhecida; senão o ícone da origem: cartão, Pix/conta, receita, acerto, manual.
function TypeIcon({ row }) {
    const base = 'grid h-7 w-7 flex-none place-items-center rounded-full';

    if (row.kind === 'settlement') {
        return <span className={`${base} bg-teal/16 text-strong-accent`}><ArrowLeftRight size={13} strokeWidth={2.3} /></span>;
    }
    if (row.merchant) {
        return <MerchantLogo merchant={row.merchant} />;
    }
    if (row.kind === 'income' || (row.direction === 'in' && row.kind !== 'ignored')) {
        return <span className={`${base} bg-green/16 text-green`}><ArrowDownLeft size={14} strokeWidth={2.3} /></span>;
    }
    if (row.origin === 'manual') {
        return <span className={`${base} bg-text/8 text-text/60`}><PenLine size={13} strokeWidth={2.2} /></span>;
    }
    if (row.account_type === 'CREDIT') {
        return <span className={`${base} bg-text/8 text-text/60`}><CreditCard size={13} strokeWidth={2.2} /></span>;
    }

    return <span className={`${base} bg-text/8 text-text/60`}><ArrowUpRight size={14} strokeWidth={2.2} /></span>;
}

function Amount({ row }) {
    const value = money(row.amount);
    const base = 'w-[112px] flex-none text-right text-[13px] font-semibold tabular-nums';

    if (row.kind === 'ignored') return <span className={`${base} text-text/35 line-through decoration-text/30`}>{value}</span>;
    if (row.kind === 'income') return <span className={`${base} text-green`}>+{value}</span>;
    if (row.kind === 'settlement') return <span className={`${base} text-strong-accent`}>{row.direction === 'in' ? '+' : '−'}{value}</span>;
    if (row.direction === 'in') return <span className={`${base} text-green`}>−{value}</span>;

    return <span className={`${base} text-text`}>{value}</span>;
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

    return <div className="truncate text-[11px] text-text/45">{bits.join(' · ') || ' '}</div>;
}

export default function ExpenseRow({ row, couple, categories, showDate, selected, onToggleSelect, onChange, onEdit, onToggleIgnore, onDelete }) {
    const editable = row.kind === 'expense';
    const category = categories.find((c) => c.id === row.category_id);

    return (
        <div
            className={`group flex items-center gap-3 rounded-[12px] px-2 py-[7px] transition-colors ${
                selected ? 'bg-teal/12' : 'hover:bg-text/5'
            } ${row.kind === 'ignored' ? 'opacity-60' : ''}`}
        >
            <input
                type="checkbox"
                checked={selected}
                onChange={onToggleSelect}
                aria-label={`Selecionar ${row.name}`}
                className="h-4 w-4 flex-none rounded border-text/25 bg-transparent text-teal focus:ring-teal/40 focus:ring-offset-0"
            />

            {showDate && <span className="w-[40px] flex-none text-xs font-medium tabular-nums text-text/50">{dayMonth(row.date)}</span>}

            <TypeIcon row={row} />

            <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
                <div className="truncate text-[13px] font-medium">
                    {row.name}
                    {row.notes && <span className="font-normal text-text/45"> · {row.notes}</span>}
                </div>
                <Details row={row} couple={couple} />
            </button>

            {editable ? (
                <>
                    <div className="hidden w-[168px] flex-none items-center gap-2 lg:flex">
                        <span
                            className="h-2 w-2 flex-none rounded-full"
                            style={{ background: category?.color || 'rgb(var(--color-text-rgb) / 0.25)' }}
                        />
                        <select
                            value={row.category_id ?? ''}
                            onChange={(e) => onChange({ category_id: e.target.value ? Number(e.target.value) : null })}
                            aria-label="Categoria"
                            className={`w-full truncate rounded-[8px] border-0 bg-transparent py-1 pl-1 pr-7 text-[12.5px] transition-colors hover:bg-text/8 focus:bg-text/8 focus:ring-1 focus:ring-teal/50 ${
                                row.category_id ? 'text-text/85' : 'text-lime'
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
                <MenuButton aria-label="Ações" className="grid h-7 w-7 place-items-center rounded-full text-text/45 transition-colors hover:bg-text/10 hover:text-text">
                    <MoreHorizontal size={15} strokeWidth={2.2} />
                </MenuButton>
                <MenuItems
                    anchor="bottom end"
                    className="z-50 mt-1 w-56 rounded-[12px] bg-surface p-1.5 text-[13px] text-text shadow-[inset_0_0_0_1px_rgb(var(--color-text-rgb)/0.1),0_12px_32px_rgba(0,0,0,0.45)] focus:outline-none"
                >
                    <MenuItem>
                        <button type="button" onClick={onEdit} className="flex w-full items-center gap-2 rounded-[8px] px-2.5 py-2 text-left data-[focus]:bg-text/8">
                            <Pencil size={13} className="text-text/60" /> Editar
                        </button>
                    </MenuItem>
                    <MenuItem>
                        <button type="button" onClick={onToggleIgnore} className="flex w-full items-center gap-2 rounded-[8px] px-2.5 py-2 text-left data-[focus]:bg-text/8">
                            {row.kind === 'ignored' ? (
                                <><Eye size={13} className="text-text/60" /> Voltar a contar</>
                            ) : (
                                <><EyeOff size={13} className="text-text/60" /> Ignorar nos cálculos</>
                            )}
                        </button>
                    </MenuItem>
                    {row.origin === 'manual' && (
                        <MenuItem>
                            <button type="button" onClick={onDelete} className="flex w-full items-center gap-2 rounded-[8px] px-2.5 py-2 text-left text-red data-[focus]:bg-text/8">
                                <Trash2 size={13} /> Excluir
                            </button>
                        </MenuItem>
                    )}
                </MenuItems>
            </Menu>
        </div>
    );
}
