// Rótulo de seção entre blocos de cards (ex: "Contas conectadas" nas Configurações).
export default function SectionLabel({ title, action, id }) {
    return (
        <div id={id} className="flex scroll-mt-20 flex-wrap items-center gap-3">
            <h2 className="text-[15px] font-semibold">{title}</h2>
            <div className="h-px min-w-[40px] flex-1 bg-line" />
            {action}
        </div>
    );
}
