// Cabeçalho das telas internas: eyebrow + título + descrição curta, ações à direita.
export default function PageHeader({ eyebrow, title, description, actions }) {
    return (
        <section className="flex flex-wrap items-end justify-between gap-4">
            <div>
                {eyebrow && <p className="mb-2 font-heading text-[12px] uppercase tracking-[.12em] text-text/60">{eyebrow}</p>}
                <h1 className="text-[clamp(28px,3vw,36px)] font-medium tracking-[-.02em]">{title}</h1>
                {description && <p className="mt-1 max-w-[56ch] text-[13px] text-text/50">{description}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </section>
    );
}
