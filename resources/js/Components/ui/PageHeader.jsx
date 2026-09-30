// Cabeçalho das telas: título + descrição curta, ações à direita.
// `eyebrow` (opcional) fica acima do título — usado para o "‹ voltar".
export default function PageHeader({ eyebrow, title, description, actions }) {
    return (
        <header className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
                {eyebrow && <div className="mb-1.5 text-[13px] text-muted">{eyebrow}</div>}
                <h1 className="text-[26px] font-semibold tracking-[-0.02em] [text-wrap:balance]">{title}</h1>
                {description && <p className="mt-1 max-w-[64ch] text-[14px] text-muted">{description}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-3 max-[560px]:w-full">{actions}</div>}
        </header>
    );
}
