import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { useRef, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';

export default function Import({ payer1Name, payer2Name }) {
    const { flash } = usePage().props;

    const fileInput = useRef(null);
    const [source, setSource] = useState('payer1');
    const [dragging, setDragging] = useState(false);
    const [fileName, setFileName] = useState(null);
    const [uploading, setUploading] = useState(false);

    const handleFile = (file) => {
        if (!file) return;
        setFileName(file.name);

        const form = new FormData();
        form.append('file', file);
        form.append('source', source);

        setUploading(true);
        router.post(route('import.store'), form, {
            forceFormData: true,
            onFinish: () => setUploading(false),
        });
    };

    const onDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        handleFile(e.dataTransfer.files[0]);
    };

    const activePayer = source === 'payer1' ? payer1Name : payer2Name;

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold text-gray-800">Importar CSV do Nubank</h2>}
            breadcrumbs={[{ label: 'Importar CSV' }]}
        >
            <Head title="Importar CSV" />

            {flash?.success && (
                <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                    {flash.success}
                </div>
            )}

            <div className="max-w-2xl space-y-5">
                {/* Seletor de para quem é o CSV */}
                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <p className="mb-3 text-sm font-semibold text-gray-700">Para quem é este extrato?</p>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => { setSource('payer1'); setFileName(null); }}
                            className={`flex flex-1 items-center justify-center gap-2 rounded-lg border py-3 text-sm font-medium transition-colors ${
                                source === 'payer1'
                                    ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                                    : 'border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                        >
                            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${source === 'payer1' ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                                R
                            </span>
                            {payer1Name}
                        </button>
                        <button
                            type="button"
                            onClick={() => { setSource('payer2'); setFileName(null); }}
                            className={`flex flex-1 items-center justify-center gap-2 rounded-lg border py-3 text-sm font-medium transition-colors ${
                                source === 'payer2'
                                    ? 'border-rose-400 bg-rose-50 text-rose-700'
                                    : 'border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                        >
                            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${source === 'payer2' ? 'bg-rose-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                                L
                            </span>
                            {payer2Name}
                        </button>
                    </div>
                </div>

                {/* Zona de drop */}
                <div
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={onDrop}
                    onClick={() => !uploading && fileInput.current?.click()}
                    className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-colors ${
                        dragging
                            ? 'border-indigo-400 bg-indigo-50'
                            : 'border-gray-300 bg-white hover:border-indigo-300 hover:bg-indigo-50'
                    }`}
                >
                    {uploading ? (
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
                            <p className="text-sm text-indigo-600">
                                Importando extrato de <strong>{activePayer}</strong> e enviando para categorização pela IA...
                            </p>
                        </div>
                    ) : (
                        <>
                            <Upload className="mb-3 h-12 w-12 text-gray-400" strokeWidth={1.5} />
                            <p className="text-sm font-medium text-gray-700">
                                {fileName
                                    ? `${fileName} → ${activePayer}`
                                    : `Arraste o CSV de ${activePayer} aqui ou clique para selecionar`}
                            </p>
                            <p className="mt-1 text-xs text-gray-400">Apenas arquivos .csv até 5 MB</p>
                        </>
                    )}
                </div>

                <input
                    ref={fileInput}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files[0])}
                />

                {/* Instruções */}
                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <h3 className="mb-3 text-sm font-semibold text-gray-700">Como exportar o CSV do Nubank</h3>
                    <ol className="list-decimal list-inside space-y-1.5 text-sm text-gray-600">
                        <li>Abra o app do Nubank e acesse a fatura do cartão.</li>
                        <li>Toque em <strong>"Exportar"</strong> no canto superior direito.</li>
                        <li>Selecione <strong>"Exportar para Excel (.csv)"</strong>.</li>
                        <li>Envie o arquivo para o seu e-mail ou dispositivo e faça o upload acima.</li>
                    </ol>
                    <p className="mt-3 text-xs text-gray-400">
                        Pagamentos de fatura são automaticamente ignorados.
                        Reimportar o mesmo arquivo não cria duplicatas.
                    </p>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
