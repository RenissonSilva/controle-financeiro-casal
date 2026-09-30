import MoneyInput from './MoneyInput';

const INPUT_CLASSES =
    'w-full rounded-[10px] border border-text/16 bg-[#213d51] px-3 py-2 text-[13.5px] text-text placeholder:text-text/40 transition-colors focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal/50';

// label + input + mensagem de erro, para formulários das telas migradas (ver Components/ui/README.md).
// `money` troca o input por MoneyInput (máscara de real).
export default function Field({ label, error, money = false, className = '', inputClassName = '', ...props }) {
    const Input = money ? MoneyInput : 'input';
    return (
        <div className={className}>
            {label && <label className="mb-1.5 block text-[12.5px] font-medium text-text/70">{label}</label>}
            <Input className={`${INPUT_CLASSES} ${inputClassName}`} {...props} />
            {error && <p className="mt-1 text-[11.5px] text-red">{error}</p>}
        </div>
    );
}

export { INPUT_CLASSES };
