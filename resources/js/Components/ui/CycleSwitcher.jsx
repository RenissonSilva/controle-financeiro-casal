import { Link } from '@inertiajs/react';
import { Calendar, CalendarCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { dayMonthShort, monthCompact } from '@/lib/format';

// ‹ Set 2026 › — mês financeiro (ciclo do cartão). O intervalo do ciclo aparece no
// rótulo ao passar o mouse. Fora do ciclo atual aparece o atalho "Mês atual"
// (rota sem `month` = ciclo atual).
// cycle: { month, label, start, end, previous, next, is_current }
export default function CycleSwitcher({ cycle, routeName, params = {} }) {
    const arrow = 'grid h-[42px] w-[42px] flex-none place-items-center rounded-[10px] text-secondary transition-colors hover:text-text';
    const range = `${cycle.label}: ${dayMonthShort(cycle.start)} – ${dayMonthShort(cycle.end)}${cycle.is_current ? ' (mês atual)' : ''}`;

    return (
        <div className="inline-flex items-center gap-2">
            {!cycle.is_current && (
                <Link
                    href={route(routeName, params)}
                    preserveScroll
                    className="inline-flex h-11 items-center gap-2 rounded-[10px] border border-line-strong px-3 text-[14px] font-medium text-text no-underline transition-colors hover:bg-raised"
                    title="Voltar para o mês atual"
                >
                    <CalendarCheck size={15} strokeWidth={1.75} className="text-accent" />
                    <span className="max-sm:hidden">Mês atual</span>
                </Link>
            )}
            <div className="inline-flex h-11 items-center rounded-[10px] border border-line bg-surface">
                <Link href={route(routeName, { ...params, month: cycle.previous })} preserveScroll className={arrow} aria-label="Mês anterior">
                    <ChevronLeft size={14} strokeWidth={2} />
                </Link>
                <span className="flex items-center gap-2 px-1.5 text-[14px] font-medium" title={range}>
                    <Calendar size={15} strokeWidth={1.75} className="text-muted" />
                    <span className="whitespace-nowrap">{monthCompact(cycle.month)}</span>
                </span>
                <Link href={route(routeName, { ...params, month: cycle.next })} preserveScroll className={arrow} aria-label="Próximo mês">
                    <ChevronRight size={14} strokeWidth={2} />
                </Link>
            </div>
        </div>
    );
}
