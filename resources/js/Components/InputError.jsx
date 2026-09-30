export default function InputError({ message, className = '', ...props }) {
    return message ? (
        <p
            {...props}
            className={`text-[12px] text-red ${className}`}
        >
            {message}
        </p>
    ) : null;
}
