import { AlertCircle, Check } from 'lucide-react';

// Aviso flutuante no rodapé. tone: 'success' | 'error'
export default function Toast({ message, tone = 'success' }) {
    if (!message) return null;

    const isError = tone === 'error';

    return (
        <div
            role="status"
            className={`fixed bottom-[26px] left-1/2 z-50 flex max-w-[calc(100vw-32px)] -translate-x-1/2 items-center gap-2.5 rounded-full bg-surface px-[18px] py-[11px] text-[13.5px] ${
                isError
                    ? 'text-red shadow-[inset_0_0_0_1px_rgb(var(--color-expense-rgb)/0.45),0_10px_28px_rgba(0,0,0,0.4)]'
                    : 'text-green shadow-[inset_0_0_0_1px_rgb(var(--color-income-rgb)/0.4),0_10px_28px_rgba(0,0,0,0.4)]'
            }`}
        >
            {isError ? <AlertCircle size={15} strokeWidth={2.2} className="flex-none" /> : <Check size={15} strokeWidth={2.2} className="flex-none stroke-green" />}
            <span className="truncate">{message}</span>
        </div>
    );
}
