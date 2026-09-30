import { AlertCircle, Check } from 'lucide-react';

// Aviso flutuante no rodapé. tone: 'success' | 'error'
export default function Toast({ message, tone = 'success' }) {
    if (!message) return null;

    const isError = tone === 'error';

    return (
        <div
            role="status"
            className={`fixed bottom-[26px] left-1/2 z-50 flex max-w-[calc(100vw-32px)] -translate-x-1/2 items-center gap-2.5 rounded-full border bg-raised px-[18px] py-[11px] text-[14px] text-text desk:ml-[124px] ${
                isError ? 'border-red/45' : 'border-line-strong'
            }`}
        >
            {isError
                ? <AlertCircle size={15} strokeWidth={2} className="flex-none text-red" />
                : <Check size={15} strokeWidth={2.2} className="flex-none text-accent" />}
            <span className="truncate">{message}</span>
        </div>
    );
}
