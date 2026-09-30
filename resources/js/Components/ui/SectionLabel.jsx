// Rótulo de seção (eyebrow + linha esmaecida), como nas Configurações.
export default function SectionLabel({ title, action, id }) {
    return (
        <div id={id} className="flex scroll-mt-6 items-baseline gap-3">
            <h2 className="font-heading text-[13px] font-medium uppercase tracking-[.1em] text-text/55">{title}</h2>
            <div className="h-px min-w-[40px] flex-1 bg-[linear-gradient(90deg,rgb(var(--color-text-rgb)/0.16),transparent_90%)]" />
            {action}
        </div>
    );
}
