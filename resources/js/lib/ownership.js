import { firstName } from '@/lib/format';

// Cores de "quem paga" — as mesmas das Configurações (Reni verde, Lua coral, Nós teal).
export const OWNERSHIP_BADGE = {
    payer1: 'bg-green/16 text-green',
    payer2: 'bg-red/16 text-red',
    both: 'bg-teal/16 text-strong-accent',
};

export const OWNERSHIP_DOT = {
    payer1: 'bg-green',
    payer2: 'bg-red',
    both: 'bg-strong-accent',
};

export const OWNERSHIP_CYCLE = ['both', 'payer1', 'payer2'];
export const nextOwnership = (current) => OWNERSHIP_CYCLE[(OWNERSHIP_CYCLE.indexOf(current) + 1) % OWNERSHIP_CYCLE.length];

// couple: props compartilhadas pelo HandleInertiaRequests ({ payer1_name, payer2_name, ... })
export function ownershipOptions(couple, { short = true } = {}) {
    const name = (value) => (short ? firstName(value) : value);

    return [
        { value: 'both', label: 'Nós' },
        { value: 'payer1', label: name(couple?.payer1_name || 'Pagador 1') },
        { value: 'payer2', label: name(couple?.payer2_name || 'Pagador 2') },
    ];
}

export const ownershipLabel = (couple, value) => ownershipOptions(couple).find((o) => o.value === value)?.label ?? value;

export const payerName = (couple, payer) => firstName(payer === 'payer2' ? couple?.payer2_name : couple?.payer1_name);
