// Divisão definida à mão de um gasto "Nós" — espelho do backend para a prévia do formulário
// (o valor salvo é sempre o calculado pelo servidor).

const round2 = (value) => Math.round(value * 100) / 100;

// Mesmo que Money::distribute: arredonda para centavos com a soma batendo exatamente com
// `target` (método do maior resto; no empate, a ordem original).
export function distribute(values, target) {
    if (!values.length) return [];

    const floors = values.map((value) => Math.floor(value * 100));
    const remainders = values.map((value, i) => value * 100 - floors[i]);
    let missing = Math.round(target * 100) - floors.reduce((sum, cents) => sum + cents, 0);
    const step = missing >= 0 ? 1 : -1;
    const order = values.map((_, i) => i).sort((a, b) => (step > 0 ? remainders[b] - remainders[a] : remainders[a] - remainders[b]));

    for (let i = 0; missing !== 0; i++) {
        floors[order[i % order.length]] += step;
        missing -= step;
    }

    return floors.map((cents) => cents / 100);
}

// Parcelas da compra, de 1 a N; a que ainda não chegou do banco entra com o valor desta (estimativa).
export function purchaseSlots(purchase, reference) {
    return Array.from({ length: purchase.count }, (_, i) => {
        const item = purchase.items.find((it) => it.number === i + 1);
        return { number: i + 1, item, amount: Number(item?.amount ?? reference.amount) };
    });
}

// Mesmo que InstallmentPurchase::plan: a parte do pagador 1 na compra toda, repartida pelas parcelas.
export function purchasePlan(purchase, reference, payer1Total) {
    const slots = purchaseSlots(purchase, reference);
    const total = round2(slots.reduce((sum, slot) => sum + slot.amount, 0));
    const payer1 = Math.min(Math.max(Number(payer1Total) || 0, 0), total);
    const ratio = total > 0 ? payer1 / total : 0;
    const shares = distribute(slots.map((slot) => slot.amount * ratio), payer1);

    return {
        total,
        estimated: slots.some((slot) => !slot.item),
        slots: slots.map((slot, i) => ({ ...slot, payer1: shares[i], payer2: round2(slot.amount - shares[i]) })),
    };
}

// Parte do pagador 1 já salva na compra toda (ou só no lançamento), para abrir o formulário.
export function savedPayer1Total(row) {
    if (row.custom_payer1_share == null) return null;
    if (!row.purchase) return Number(row.custom_payer1_share);

    const ratio = Number(row.amount) > 0 ? Number(row.custom_payer1_share) / Number(row.amount) : 0;
    const total = purchaseSlots(row.purchase, row).reduce(
        (sum, slot) => sum + (slot.item?.payer1_share != null ? Number(slot.item.payer1_share) : round2(slot.amount * ratio)),
        0,
    );

    return round2(total);
}

export { round2 };
