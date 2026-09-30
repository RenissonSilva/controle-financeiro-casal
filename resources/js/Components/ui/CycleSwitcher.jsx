import { Link } from '@inertiajs/react';
import { CalendarCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { dayMonthShort } from '@/lib/format';

// ‹ Setembro de 2026 › com o intervalo do ciclo do cartão embaixo.
// Fora do ciclo atual aparece o atalho "Mês atual" (rota sem `month` = ciclo atual).
// cycle: { month, label, start, end, previous, next, is_current }
export default function CycleSwitcher({ cycle, routeName, params = {} }) {
    const arrow = 'grid h-[34px] w-[34px] flex-none place-items-center rounded-[9px] bg-text/[0.07] text-text/85 transition-colors hover:bg-accent/25 hover:text-text';

    return (
        <div className="inline-flex items-center gap-2">
            {!cycle.is_current && (
                <Link
                    href={route(routeName, params)}
                    preserveScroll
                    className="inline-flex h-[44px] items-center gap-1.5 rounded-[12px] bg-surface bg-[linear-gradient(rgb(var(--color-accent-rgb)/0.14),rgb(var(--color-accent-rgb)/0.14))] px-3 text-[13px] font-medium text-strong-accent shadow-[inset_0_0_0_1px_rgb(var(--color-accent-rgb)/0.45),0_4px_14px_-6px_rgb(0_0_0/0.5)] transition-colors hover:bg-[linear-gradient(rgb(var(--color-accent-rgb)/0.28),rgb(var(--color-accent-rgb)/0.28))]"
                    title="Voltar para o mês atual"
                >
                    <CalendarCheck size={15} strokeWidth={2.2} />
                    <span className="max-sm:hidden">Mês atual</span>
                </Link>
            )}
            <div className="inline-flex items-center gap-1 rounded-[12px] bg-surface p-[5px] shadow-[inset_0_0_0_1px_rgb(var(--color-accent-rgb)/0.35),0_4px_14px_-6px_rgb(0_0_0/0.5)]">
                <Link href={route(routeName, { ...params, month: cycle.previous })} preserveScroll className={arrow} aria-label="Mês anterior">
                    <ChevronLeft size={17} strokeWidth={2.2} />
                </Link>
                <div className="min-w-[150px] px-1 text-center">
                    <div className="font-heading text-[15px] font-medium leading-tight tracking-[-.01em]">{cycle.label}</div>
                    <div className="text-[11px] tabular-nums text-text/55">
                        {dayMonthShort(cycle.start)} – {dayMonthShort(cycle.end)}
                        {cycle.is_current && <span className="ml-1.5 text-strong-accent">· atual</span>}
                    </div>
                </div>
                <Link href={route(routeName, { ...params, month: cycle.next })} preserveScroll className={arrow} aria-label="Próximo mês">
                    <ChevronRight size={17} strokeWidth={2.2} />
                </Link>
            </div>
        </div>
    );
}
