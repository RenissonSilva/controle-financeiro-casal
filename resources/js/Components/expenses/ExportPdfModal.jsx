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
        `h-10 rounded-[10px] border px-3 text-[13px] font-medium transition-colors ${
            active ? 'border-accent/60 bg-accent/12 text-accent' : 'border-line-strong text-muted hover:bg-raised hover:text-text'
        }`;

    return (
        <Modal show={show} onClose={onClose} title="Exportar PDF">
            <form onSubmit={submit} className="flex flex-col gap-4">
                <div>
                    <span className="block text-[13px] font-medium text-secondary">Meses</span>
                    <p className="mb-2 text-[12px] text-muted">Cada mês sai em uma página, com a divisão entre vocês no rodapé.</p>
                    <div className="scroll-thin flex max-h-48 flex-col gap-0.5 overflow-y-auto rounded-[12px] border border-line bg-bg/40 p-1.5">
                        {availableMonths.map((month) => (
                            <label key={month} className="flex cursor-pointer items-center gap-2.5 rounded-[8px] px-2 py-2 text-[14px] hover:bg-raised">
                                <input
                                    type="checkbox"
                                    checked={months.includes(month)}
                                    onChange={() => toggle(months, setMonths, month)}
                                    className="h-4 w-4 rounded border-line-strong bg-transparent text-accent focus:ring-accent/40 focus:ring-offset-0"
                                />
                                {monthLabel(month)}
                            </label>
                        ))}
                    </div>
                </div>

                <div>
                    <span className="mb-2 block text-[13px] font-medium text-secondary">O que exportar</span>
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
                    <Button type="submit" variant="primary" disabled={exporting}>{exporting ? 'Gerando...' : 'Exportar'}</Button>
                </div>
            </form>
        </Modal>
    );
}
