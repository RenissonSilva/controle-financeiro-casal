// Formatação compartilhada pelas telas (moeda, datas, meses financeiros, nomes).

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export const money = (value) => BRL.format(Number(value) || 0);

// "R$ 18.420" + ",90" separados — o visual do Sovinna mostra os centavos menores.
export function moneyParts(value) {
    const formatted = money(value);
    const comma = formatted.lastIndexOf(',');
    return comma === -1 ? [formatted, ''] : [formatted.slice(0, comma), formatted.slice(comma)];
}

// Sem casas decimais: "R$ 6.312".
export const moneyShort = (value) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(Number(value) || 0);

export const percent = (value, digits = 1) => `${Number(value || 0).toFixed(digits).replace('.', ',')}%`;

// '2026-09-10' → Date local (sem o deslocamento de fuso do new Date('2026-09-10')).
export const parseDate = (value) => {
    const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d);
};

export const pad2 = (n) => String(n).padStart(2, '0');

// '2026-09-10' → '10/09'
export const dayMonth = (value) => {
    const d = parseDate(value);
    return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;
};

// '2026-09-10' → '10 set'
export const dayMonthShort = (value) => {
    const d = parseDate(value);
    return `${pad2(d.getDate())} ${MONTHS_SHORT[d.getMonth()]}`;
};

// '2026-09-10' → '10/09/2026'
export const fullDate = (value) => {
    const d = parseDate(value);
    return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
};

// '2026-09' → 'Setembro de 2026'
export const monthLabel = (month) => {
    const [y, m] = month.split('-').map(Number);
    const name = MONTHS[m - 1];
    return `${name.charAt(0).toUpperCase()}${name.slice(1)} de ${y}`;
};

// '2026-09' → 'set/26'
export const monthShort = (month) => {
    const [y, m] = month.split('-').map(Number);
    return `${MONTHS_SHORT[m - 1]}/${String(y).slice(2)}`;
};

export const monthName = (month) => MONTHS[Number(month.split('-')[1]) - 1];

// '2026-12-31' → 'dez/26'
export const deadlineLabel = (value) => {
    const d = parseDate(value);
    return `${MONTHS_SHORT[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;
};

// Tempo relativo curto: "agora", "há 5 min", "há 2 h", "há 3 dias".
export function relativeTime(iso) {
    if (!iso) return 'nunca';
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return 'agora';
    if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
    const days = Math.floor(diff / 86400);
    return days === 1 ? 'ontem' : `há ${days} dias`;
}

export const firstName = (name) => (name || '').trim().split(' ')[0] || '?';

// CPF/CNPJ só com dígitos → formatado.
export function formatDocument(digits) {
    const d = String(digits || '').replace(/\D/g, '');
    if (d.length === 11) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
    if (d.length === 14) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
    return d;
}
