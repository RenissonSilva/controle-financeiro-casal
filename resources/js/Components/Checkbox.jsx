export default function Checkbox({ className = '', ...props }) {
    return (
        <input
            {...props}
            type="checkbox"
            className={`h-4 w-4 rounded border-line-strong bg-transparent text-accent focus:ring-accent/40 focus:ring-offset-0 ${className}`}
        />
    );
}
