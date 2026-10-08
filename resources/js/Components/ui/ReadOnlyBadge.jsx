import { Eye } from 'lucide-react';

// Conta vinculada sem permissão na área: diz por que não há botões de criar/editar.
export default function ReadOnlyBadge() {
    return (
        <span
            title="A conta principal não liberou alterações nesta área"
            className="inline-flex h-9 flex-none items-center gap-1.5 rounded-full border border-line px-3 text-[13px] text-secondary"
        >
            <Eye size={14} strokeWidth={1.75} /> Só visualização
        </span>
    );
}
