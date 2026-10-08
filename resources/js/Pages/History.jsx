import AppLayout from '@/Layouts/AppLayout';
import Card from '@/Components/ui/Card';
import Button from '@/Components/ui/Button';
import PageHeader from '@/Components/ui/PageHeader';
import SectionLabel from '@/Components/ui/SectionLabel';
import Segmented from '@/Components/ui/Segmented';
import { Link, router } from '@inertiajs/react';
import { ArrowRight, ChevronLeft, ChevronRight, History as HistoryIcon } from 'lucide-react';
import { firstName, pad2 } from '@/lib/format';

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const AREA_BADGE = {
    expenses: 'Lançamentos',
    fixed: 'Contas fixas',
    goals: 'Metas',
    settings: 'Configurações',
    access: 'Acesso',
};

const dayKey = (iso) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

// 'Hoje', 'Ontem', 'Qua, 7 de out' (+ ano se não for o atual).
function dayLabel(iso) {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (dayKey(d) === dayKey(today)) return 'Hoje';
    if (dayKey(d) === dayKey(yesterday)) return 'Ontem';

    const weekday = WEEKDAYS[d.getDay()];
    const year = d.getFullYear() !== today.getFullYear() ? ` de ${d.getFullYear()}` : '';
    return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${d.getDate()} de ${MONTHS[d.getMonth()]}${year}`;
}

const time = (iso) => {
    const d = new Date(iso);
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

// Dias → ações (entradas seguidas da mesma requisição = uma ação de uma pessoa).
function groupEntries(entries) {
    const days = [];

    entries.forEach((entry) => {
        const key = dayKey(entry.created_at);
        let day = days[days.length - 1];
        if (!day || day.key !== key) {
            day = { key, label: dayLabel(entry.created_at), actions: [] };
            days.push(day);
        }

        const last = day.actions[day.actions.length - 1];
        if (last && last.batch === entry.batch) last.entries.push(entry);
        else day.actions.push({ batch: entry.batch, user_name: entry.user_name, is_owner: entry.is_owner, created_at: entry.created_at, entries: [entry] });
    });

    return days;
}

export default function History({ entries, pagination, filters, areas, people }) {
    const days = groupEntries(entries);

    const filter = (patch) => router.get(
        route('history.index'),
        Object.fromEntries(Object.entries({ ...filters, ...patch }).filter(([, v]) => v != null && v !== 'all')),
        { preserveState: true, preserveScroll: true, replace: true },
    );

    return (
        <AppLayout title="Histórico de mudanças">
            <PageHeader
                eyebrow={
                    <Link href={route('settings.show')} className="inline-flex items-center gap-1 text-muted no-underline hover:text-text">
                        <ChevronLeft size={14} strokeWidth={2} /> Configurações
                    </Link>
                }
                title="Histórico de mudanças"
                description="Quem criou, editou ou excluiu o quê — lançamentos, contas fixas, metas, configurações e acesso. Só a conta principal vê esta tela."
            />

            <div className="flex flex-wrap items-center gap-2">
                <Segmented
                    value={filters.area ?? 'all'}
                    onChange={(area) => filter({ area, page: null })}
                    options={[{ value: 'all', label: 'Tudo' }, ...areas]}
                />
                {people.length > 1 && (
                    <Segmented
                        value={filters.user ?? 'all'}
                        onChange={(user) => filter({ user, page: null })}
                        options={[{ value: 'all', label: 'Todos' }, ...people.map((p) => ({ value: p.id, label: firstName(p.name) }))]}
                    />
                )}
                <span className="ml-auto font-mono text-[12px] text-muted">
                    {pagination.total} {pagination.total === 1 ? 'mudança' : 'mudanças'}
                </span>
            </div>

            {days.length === 0 ? (
                <Card className="flex flex-col items-center gap-2 py-14 text-center">
                    <HistoryIcon size={20} strokeWidth={1.75} className="text-muted" />
                    <p className="max-w-[46ch] text-[13px] leading-[1.5] text-muted">
                        {filters.area || filters.user
                            ? 'Nenhuma mudança com esses filtros.'
                            : 'Nenhuma mudança registrada ainda. A partir de agora, tudo que for criado, editado ou excluído aparece aqui.'}
                    </p>
                </Card>
            ) : (
                days.map((day) => (
                    <section key={day.key} className="flex flex-col gap-3">
                        <SectionLabel title={day.label} />
                        <Card className="p-2">
                            {day.actions.map((action) => (
                                <Action key={`${action.batch}-${action.entries[0].id}`} action={action} />
                            ))}
                        </Card>
                    </section>
                ))
            )}

            {pagination.last > 1 && (
                <nav aria-label="Páginas" className="flex items-center justify-between gap-3">
                    <PageLink href={pagination.previous}>
                        <ChevronLeft size={14} strokeWidth={2} /> Mais recentes
                    </PageLink>
                    <span className="font-mono text-[12px] text-muted">Página {pagination.current} de {pagination.last}</span>
                    <PageLink href={pagination.next}>
                        Mais antigas <ChevronRight size={14} strokeWidth={2} />
                    </PageLink>
                </nav>
            )}
        </AppLayout>
    );
}

function PageLink({ href, children }) {
    return href ? (
        <Button href={href} variant="secondary" size="sm">{children}</Button>
    ) : (
        <Button type="button" variant="secondary" size="sm" disabled>{children}</Button>
    );
}

// Uma ação de uma pessoa: avatar + nome + hora, e cada coisa que ela mudou.
function Action({ action }) {
    return (
        <div className="flex gap-3 border-t border-line-row px-3 py-3.5 first:border-t-0">
            <span
                className={`grid h-8 w-8 flex-none place-items-center rounded-full text-[13px] font-semibold text-on-accent ${action.is_owner ? 'bg-person1' : 'bg-person2'}`}
                aria-hidden="true"
            >
                {firstName(action.user_name).charAt(0).toUpperCase()}
            </span>

            <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                {action.entries.map((entry, i) => (
                    <Entry key={entry.id} entry={entry} who={i === 0 ? firstName(action.user_name) : null} at={i === 0 ? time(action.created_at) : null} />
                ))}
            </div>
        </div>
    );
}

function Entry({ entry, who, at }) {
    return (
        <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                {/* Em tela estreita, selo da área e hora descem para baixo do texto. */}
                <p className="min-w-[min(100%,260px)] flex-1 text-[14px] leading-[1.45] text-secondary">
                    {who && <strong className="font-semibold text-text">{who} </strong>}
                    {entry.description}
                    {entry.subject_label && <span className="font-medium text-text"> {entry.subject_label}</span>}
                </p>
                <span className="flex flex-none items-center gap-2">
                    <span className="rounded-full bg-inset px-2 py-[1px] text-[11px] font-medium text-secondary">{AREA_BADGE[entry.area] ?? entry.area}</span>
                    {at && <span className="font-mono text-[12px] text-muted">{at}</span>}
                </span>
            </div>

            {entry.changes.length > 0 && <Changes entry={entry} />}
        </div>
    );
}

// Criado: os valores que ficaram. Excluído: os que existiam (riscados). Editado: antes → depois.
// Resumos sem "antes" (ex: repetiu o dono em outros lançamentos) mostram só o valor novo.
function changeMode(action, change) {
    if (action === 'created') return 'new';
    if (action === 'deleted') return 'old';
    if (change.old == null && action !== 'updated') return 'new';
    return 'diff';
}

function Changes({ entry }) {
    return (
        <dl className="mt-1.5 grid grid-cols-[minmax(96px,max-content)_minmax(0,1fr)] gap-x-4 gap-y-1 rounded-[10px] bg-inset/60 px-3 py-2 text-[13px]">
            {entry.changes.map((change) => {
                const mode = changeMode(entry.action, change);

                return (
                    <div key={change.field} className="contents">
                        <dt className="truncate text-muted">{change.label}</dt>
                        <dd className="min-w-0 break-words">
                            {mode === 'new' && <span className="text-text">{change.new}</span>}
                            {mode === 'old' && <span className="text-muted line-through decoration-muted/60">{change.old}</span>}
                            {mode === 'diff' && (
                                <span className="inline-flex flex-wrap items-center gap-x-1.5">
                                    <span className={change.old == null ? 'text-muted' : 'text-muted line-through decoration-muted/60'}>{change.old ?? 'vazio'}</span>
                                    <ArrowRight size={12} strokeWidth={2} className="flex-none text-muted" />
                                    <span className={change.new == null ? 'text-muted' : 'text-text'}>{change.new ?? 'vazio'}</span>
                                </span>
                            )}
                        </dd>
                    </div>
                );
            })}
        </dl>
    );
}
