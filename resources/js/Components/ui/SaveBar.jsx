import Button from '@/Components/ui/Button';

// Barra flutuante de "alterações não salvas" (mesma das Configurações).
export default function SaveBar({ count, saving, onSave, onDiscard, saveLabel = 'Salvar alterações' }) {
    if (!count) return null;

    return (
        <>
            <div className="h-20" />
            <div className="fixed inset-x-0 bottom-0 z-40 bg-[linear-gradient(180deg,transparent,var(--color-bg)_45%)] px-[clamp(16px,3vw,40px)] pb-[18px] pt-3.5">
                <div className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-3.5 rounded-[14px] bg-surface px-4 py-3 shadow-[inset_0_0_0_1px_rgb(var(--color-accent-rgb)/0.4),0_12px_34px_rgba(0,0,0,0.45)]">
                    <span className="min-w-[180px] flex-1 text-[13.5px] text-text/80">
                        {count === 1 ? '1 alteração não salva' : `${count} alterações não salvas`}
                    </span>
                    <Button type="button" variant="secondary" onClick={onDiscard} disabled={saving}>Descartar</Button>
                    <button
                        type="button"
                        onClick={onSave}
                        disabled={saving}
                        className="rounded-[9px] bg-teal/80 px-[18px] py-2.5 font-heading text-[13px] font-medium text-text transition-colors hover:bg-teal/70 disabled:pointer-events-none disabled:opacity-60"
                    >
                        {saving ? 'Salvando...' : saveLabel}
                    </button>
                </div>
            </div>
        </>
    );
}
