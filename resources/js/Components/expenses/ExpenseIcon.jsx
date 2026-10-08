import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, CreditCard, PenLine } from 'lucide-react';
import MerchantLogo from '@/Components/ui/MerchantLogo';

// Logo da empresa, quando reconhecida; senão o ícone da origem: cartão, Pix/conta, receita, acerto, manual.
export default function ExpenseIcon({ row }) {
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
