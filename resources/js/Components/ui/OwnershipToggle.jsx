import { OWNERSHIP_BADGE, ownershipOptions } from '@/lib/ownership';

// Escolha de "quem paga" (Nós · Reni · Lua) — o selecionado ganha a cor da pessoa.
export default function OwnershipToggle({ value, onChange, couple, size = 'sm', disabled = false }) {
    const item = size === 'sm' ? 'px-2 py-[3px] text-[11px]' : 'flex-1 px-3 py-2 text-[12.5px]';

    return (
        <div className={`inline-flex gap-0.5 rounded-full bg-text/[0.04] p-[2px] ${size === 'sm' ? '' : 'w-full rounded-[10px]'}`}>
            {ownershipOptions(couple).map((option) => (
                <button
                    key={option.value}
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange(option.value)}
                    className={`rounded-full font-medium transition-colors ${item} ${size === 'sm' ? '' : 'rounded-[8px]'} ${
                        value === option.value ? OWNERSHIP_BADGE[option.value] : 'text-text/45 hover:bg-text/8 hover:text-text/80'
                    }`}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}
