import { useEffect, useRef, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { pad2 } from '@/lib/format';

// '2026-09-10' → '10/09/2026'; vazio → ''
const toText = (iso) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
    return match ? `${match[3]}/${match[2]}/${match[1]}` : '';
};

// Só dígitos, com as barras entrando sozinhas: '1209' → '12/09', '12092026' → '12/09/2026'.
const mask = (text) => {
    const digits = text.replace(/\D/g, '').slice(0, 8);
    return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join('/');
};

// '10/09/2026' → '2026-09-10'; incompleta ou inexistente (31/02) → ''
const toIso = (text) => {
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
    if (!match) return '';
    const [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
    const date = new Date(year, month - 1, day);
    const valid = year >= 1900 && date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
    return valid ? `${year}-${pad2(month)}-${pad2(day)}` : '';
};

// Data sempre no padrão brasileiro (dd/mm/aaaa). O <input type="date"> segue o idioma do
// navegador — num Chrome em inglês ele mostra mm/dd/aaaa —, então o texto é digitado aqui com
// máscara e o calendário nativo só é aberto pelo botão. Mesmo contrato do type="date": `value` e
// o `e.target.value` do onChange são 'aaaa-mm-dd' (ou '' enquanto a data estiver incompleta).
export default function DateInput({ value, onChange, className = '', disabled, ...props }) {
    const [text, setText] = useState(() => toText(value));
    const emitted = useRef(value);
    const picker = useRef(null);

    // Valor trocado por fora (abrir outro lançamento, limpar o formulário).
    useEffect(() => {
        if (value !== emitted.current) {
            emitted.current = value;
            setText(toText(value));
        }
    }, [value]);

    const emit = (iso) => {
        emitted.current = iso;
        onChange?.({ target: { value: iso } });
    };

    const handleChange = (e) => {
        const next = mask(e.target.value);
        setText(next);
        const iso = toIso(next);
        if (iso !== emitted.current) emit(iso);
    };

    const openPicker = () => {
        const input = picker.current;
        if (!input) return;
        try {
            input.showPicker();
        } catch {
            input.focus();
        }
    };

    const invalid = text.length === 10 && !toIso(text);

    return (
        <div className="relative">
            <input
                {...props}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                maxLength={10}
                placeholder={props.placeholder ?? 'dd/mm/aaaa'}
                value={text}
                onChange={handleChange}
                disabled={disabled}
                aria-invalid={invalid || undefined}
                className={`${className} pr-11 font-mono tabular-nums ${invalid ? '!border-red' : ''}`}
            />
            {/* Calendário nativo, invisível: só empresta o seletor de data do navegador. */}
            <input
                ref={picker}
                type="date"
                tabIndex={-1}
                aria-hidden="true"
                value={toIso(text) || ''}
                onChange={(e) => {
                    setText(toText(e.target.value));
                    emit(e.target.value);
                }}
                disabled={disabled}
                className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
            />
            <button
                type="button"
                onClick={openPicker}
                disabled={disabled}
                aria-label="Abrir calendário"
                className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-[8px] text-muted transition-colors hover:bg-inset hover:text-text disabled:hidden"
            >
                <CalendarDays size={16} strokeWidth={1.75} />
            </button>
        </div>
    );
}
