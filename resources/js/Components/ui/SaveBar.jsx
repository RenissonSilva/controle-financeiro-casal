import Button from '@/Components/ui/Button';

// Barra flutuante de "alterações não salvas" (Lançamentos e Configurações).
export default function SaveBar({ count, saving, onSave, onDiscard, saveLabel = 'Salvar alterações' }) {
    if (!count) return null;

    return (
        <>
            <div className="h-20" />
            <div className="fixed inset-x-0 bottom-0 z-40 bg-[linear-gradient(180deg,transparent,var(--color-bg)_45%)] px-4 pb-[18px] pt-3.5 desk:left-[248px] desk:px-10">
                <div className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-3 rounded-[14px] border border-line-strong bg-raised px-4 py-3">
                    <span className="min-w-[180px] flex-1 text-[14px] text-secondary">
                        {count === 1 ? '1 alteração não salva' : `${count} alterações não salvas`}
                    </span>
                    <Button type="button" variant="ghost" onClick={onDiscard} disabled={saving}>Descartar</Button>
                    <Button type="button" variant="primary" onClick={onSave} disabled={saving}>
                        {saving ? 'Salvando...' : saveLabel}
                    </Button>
                </div>
            </div>
        </>
    );
}
