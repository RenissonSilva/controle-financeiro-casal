export default function InputLabel({
    value,
    className = '',
    children,
    ...props
}) {
    return (
        <label
            {...props}
            className={`mb-1.5 block text-[13px] font-medium text-secondary ${className}`}
        >
            {value ? value : children}
        </label>
    );
}
