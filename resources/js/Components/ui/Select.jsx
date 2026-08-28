import { INPUT_CLASSES } from '@/Components/ui/Field';

// label + select + mensagem de erro, mesmo padrão visual do Field (ver Components/ui/README.md).
export default function Select({ label, error, options = [], className = '', selectClassName = '', ...props }) {
    return (
        <div className={className}>
            {label && <label className="mb-1.5 block text-[12.5px] font-medium text-text/70">{label}</label>}
            <select className={`${INPUT_CLASSES} ${selectClassName}`} {...props}>
                {options.map((option) => (
                    <option key={option.value} value={option.value} className="bg-surface text-text">
                        {option.label}
                    </option>
                ))}
            </select>
            {error && <p className="mt-1 text-[11.5px] text-red-400/90">{error}</p>}
        </div>
    );
}
