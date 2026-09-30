export default function Checkbox({ className = '', ...props }) {
    return (
        <input
            {...props}
            type="checkbox"
            className={`h-4 w-4 rounded border-text/25 bg-transparent text-teal focus:ring-teal/40 focus:ring-offset-0 ${className}`}
        />
    );
}
