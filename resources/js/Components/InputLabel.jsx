export default function InputLabel({
    value,
    className = '',
    children,
    ...props
}) {
    return (
        <label
            {...props}
            className={`mb-1.5 block text-[12.5px] font-medium text-text/70 ${className}`}
        >
            {value ? value : children}
        </label>
    );
}
