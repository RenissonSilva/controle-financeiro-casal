import { OWNERSHIP_BADGE, ownershipOptions } from '@/lib/ownership';

// Escolha de "quem paga" (Nós · Reni · Lua) — o selecionado ganha a cor da pessoa.
export default function OwnershipToggle({ value, onChange, couple, size = 'sm', disabled = false }) {
    const sm = size === 'sm';

    return (
        <div className={`inline-flex gap-0.5 border border-line bg-bg p-[2px] ${sm ? 'rounded-full' : 'w-full rounded-[10px] p-[3px]'}`}>
            {ownershipOptions(couple).map((option) => (
                <button
                    key={option.value}
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange(option.value)}
                    aria-pressed={value === option.value}
                    className={`font-medium transition-colors ${sm ? 'rounded-full px-2.5 py-[3px] text-[12px]' : 'h-9 flex-1 rounded-[8px] px-3 text-[13px]'} ${
                        value === option.value ? OWNERSHIP_BADGE[option.value] : 'text-muted hover:text-text'
                    }`}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}
