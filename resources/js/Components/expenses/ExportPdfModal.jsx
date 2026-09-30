import axios from 'axios';
import { useEffect, useState } from 'react';
import Modal from '@/Components/ui/Modal';
import Button from '@/Components/ui/Button';
import { monthLabel } from '@/lib/format';

const ALL = ['payer1', 'payer2', 'both'];

// Exporta as despesas de um ou mais meses em PDF (uma página por mês), filtrando por quem paga.
export default function ExportPdfModal({ show, onClose, availableMonths, currentMonth, couple }) {
    const [months, setMonths] = useState([currentMonth]);
    const [ownerships, setOwnerships] = useState(ALL);
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (show) {
            setMonths([currentMonth]);
            setError(null);
        }
    }, [show, currentMonth]);

    const toggle = (list, setList, value) => setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
    const isTotal = ownerships.length === ALL.length;

    const scopes = [
        { value: 'payer1', label: couple?.payer1_name },
        { value: 'payer2', label: couple?.payer2_name },
        { value: 'both', label: 'Compartilhado' },
    ];

    const submit = async (e) => {
        e.preventDefault();
        if (!months.length) return setError('Selecione ao menos um mês.');
        if (!ownerships.length) return setError('Selecione ao menos uma opção em "O que exportar".');

        setError(null);
        setExporting(true);
        try {
            const response = await axios.post(route('expenses.exportPdf'), { months, ownerships }, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.download = 'despesas.pdf';
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            onClose();
        } catch {
            setError('Não foi possível gerar o PDF. Tente novamente.');
        } finally {
            setExporting(false);
        }
    };

    const chip = (active) =>
        `rounded-[9px] px-3 py-2 text-[12.5px] font-medium transition-colors ${
            active ? 'bg-teal/30 text-text shadow-[inset_0_0_0_1px_rgb(var(--color-accent-rgb)/0.55)]' : 'text-text/60 shadow-[inset_0_0_0_1px_rgb(var(--color-text-rgb)/0.14)] hover:bg-text/8'
        }`;

    return (
        <Modal show={show} onClose={onClose} title="Exportar PDF">
            <form onSubmit={submit} className="flex flex-col gap-4">
                <div>
                    <span className="block text-[12.5px] font-medium text-text/70">Meses</span>
                    <p className="mb-2 text-[11.5px] text-text/45">Cada mês sai em uma página, com a divisão entre vocês no rodapé.</p>
                    <div className="scroll-thin flex max-h-48 flex-col gap-0.5 overflow-y-auto rounded-[12px] bg-text/[0.03] p-1.5 shadow-[inset_0_0_0_1px_rgb(var(--color-text-rgb)/0.08)]">
                        {availableMonths.map((month) => (
                            <label key={month} className="flex cursor-pointer items-center gap-2.5 rounded-[8px] px-2 py-1.5 text-[13px] hover:bg-text/6">
                                <input
                                    type="checkbox"
                                    checked={months.includes(month)}
                                    onChange={() => toggle(months, setMonths, month)}
                                    className="h-4 w-4 rounded border-text/25 bg-transparent text-teal focus:ring-teal/40 focus:ring-offset-0"
                                />
                                {monthLabel(month)}
                            </label>
                        ))}
                    </div>
                </div>

                <div>
                    <span className="mb-2 block text-[12.5px] font-medium text-text/70">O que exportar</span>
                    <div className="grid grid-cols-3 gap-2">
                        <button type="button" onClick={() => setOwnerships(isTotal ? [] : ALL)} className={`col-span-3 ${chip(isTotal)}`}>
                            Tudo
                        </button>
                        {scopes.map((scope) => (
                            <button key={scope.value} type="button" onClick={() => toggle(ownerships, setOwnerships, scope.value)} className={chip(ownerships.includes(scope.value))}>
                                {scope.label}
                            </button>
                        ))}
                    </div>
                </div>

                {error && <p className="text-[12px] text-red">{error}</p>}

                <div className="mt-1 flex justify-end gap-2.5">
                    <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" variant="secondary" disabled={exporting}>{exporting ? 'Gerando...' : 'Exportar'}</Button>
                </div>
            </form>
        </Modal>
    );
}
