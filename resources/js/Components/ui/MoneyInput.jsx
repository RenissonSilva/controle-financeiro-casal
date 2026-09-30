import { useLayoutEffect, useRef } from 'react';

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const PLAIN = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const MAX_DIGITS = 13; // até R$ 99.999.999.999,99

// '1234.5' / 1234.5 → '123450'; '' / null → ''
const toDigits = (value) => (value === '' || value === null || value === undefined ? '' : String(Math.round(Number(value) * 100)));

// '123450' → '1234.50' (formato que o backend valida como numeric); só zeros → ''
const fromDigits = (digits) => {
    const d = digits.replace(/\D/g, '').replace(/^0+/, '').slice(0, MAX_DIGITS);
    return d ? (Number(d) / 100).toFixed(2) : '';
};

// Input de valor em real com máscara automática: os dígitos entram pela direita
// (1 → 0,01 · 12 → 0,12 · 123 → 1,23). `value` e o `e.target.value` do onChange
// são decimais com ponto ('1234.50') ou '' — o mesmo contrato do antigo type="number".
// `prefix={false}` omite o "R$" quando o layout já mostra o símbolo ao lado.
export default function MoneyInput({ value, onChange, prefix = true, ...props }) {
    const ref = useRef(null);
    const empty = value === '' || value === null || value === undefined;
    const display = empty ? '' : (prefix ? BRL : PLAIN).format(Number(value) || 0);

    const emit = (next) => onChange?.({ target: { value: next } });

    // A máscara sempre reescreve o texto; mantém o cursor no fim, onde os dígitos entram.
    const caretToEnd = () => {
        const el = ref.current;
        if (el && document.activeElement === el) el.setSelectionRange(el.value.length, el.value.length);
    };
    useLayoutEffect(caretToEnd, [display]);

    const handleKeyDown = (e) => {
        if (e.key === 'Backspace' || e.key === 'Delete') {
            e.preventDefault();
            const el = e.currentTarget;
            const allSelected = el.selectionStart === 0 && el.selectionEnd === el.value.length && el.value.length > 0;
            emit(allSelected ? '' : fromDigits(toDigits(value).slice(0, -1)));
        }
        props.onKeyDown?.(e);
    };

    return (
        <input
            {...props}
            ref={ref}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={display}
            placeholder={props.placeholder ?? (prefix ? 'R$ 0,00' : '0,00')}
            onChange={(e) => emit(fromDigits(e.target.value))}
            onKeyDown={handleKeyDown}
            onFocus={(e) => { requestAnimationFrame(caretToEnd); props.onFocus?.(e); }}
            onClick={(e) => { caretToEnd(); props.onClick?.(e); }}
        />
    );
}
