import MoneyInput from './MoneyInput';

const INPUT_CLASSES =
    'w-full min-h-[44px] rounded-[10px] border border-line-strong bg-bg px-3 py-2 text-[14px] text-text placeholder:text-muted/70 transition-colors focus:border-accent focus:outline-none focus:ring-0';

const LABEL_CLASSES = 'mb-1.5 block text-[13px] font-medium text-secondary';

// label + input + mensagem de erro, para formulários das telas migradas (ver Components/ui/README.md).
// `money` troca o input por MoneyInput (máscara de real).
export default function Field({ label, error, money = false, className = '', inputClassName = '', ...props }) {
    const Input = money ? MoneyInput : 'input';
    return (
        <div className={className}>
            {label && <label className={LABEL_CLASSES}>{label}</label>}
            <Input className={`${INPUT_CLASSES} ${money ? 'font-mono tabular-nums' : ''} ${inputClassName}`} {...props} />
            {error && <p className="mt-1 text-[12px] text-red">{error}</p>}
        </div>
    );
}

export { INPUT_CLASSES, LABEL_CLASSES };
