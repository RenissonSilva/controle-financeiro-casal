export default function InputError({ message, className = '', ...props }) {
    return message ? (
        <p
            {...props}
            className={`text-[11.5px] text-red ${className}`}
        >
            {message}
        </p>
    ) : null;
}
