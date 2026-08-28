const INPUT_CLASSES =
    'w-full rounded-[10px] border border-text/16 bg-[#213d51] px-3 py-2 text-[13.5px] text-text placeholder:text-text/40 transition-colors focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal/50';

// label + input + mensagem de erro, para formulários das telas migradas (ver Components/ui/README.md).
export default function Field({ label, error, className = '', inputClassName = '', ...props }) {
    return (
        <div className={className}>
            {label && <label className="mb-1.5 block text-[12.5px] font-medium text-text/70">{label}</label>}
            <input className={`${INPUT_CLASSES} ${inputClassName}`} {...props} />
            {error && <p className="mt-1 text-[11.5px] text-red-400/90">{error}</p>}
        </div>
    );
}

export { INPUT_CLASSES };
