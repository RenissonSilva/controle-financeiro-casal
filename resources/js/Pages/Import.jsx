import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { useRef, useState } from 'react';

export default function Import() {
    const { flash } = usePage().props;
    const fileInput = useRef(null);
    const [dragging, setDragging] = useState(false);
    const [fileName, setFileName] = useState(null);
    const [uploading, setUploading] = useState(false);

    const handleFile = (file) => {
        if (!file) return;
        setFileName(file.name);

        const form = new FormData();
        form.append('file', file);
        form.append('_method', 'POST');

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

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800">Importar CSV do Nubank</h2>}>
            <Head title="Importar CSV" />

            {flash?.success && (
                <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                    {flash.success}
                </div>
            )}

            <div className="max-w-2xl">
                {/* Zona de drop */}
                <div
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={onDrop}
                    onClick={() => fileInput.current?.click()}
                    className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-colors ${
                        dragging
                            ? 'border-indigo-400 bg-indigo-50'
                            : 'border-gray-300 bg-white hover:border-indigo-300 hover:bg-indigo-50'
                    }`}
                >
                    {uploading ? (
                        <div className="flex flex-col items-center gap-3">
                            <svg className="h-10 w-10 animate-spin text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                            <p className="text-sm text-indigo-600">Importando e enviando para categorização pela IA...</p>
                        </div>
                    ) : (
                        <>
                            <svg className="mb-3 h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                            </svg>
                            <p className="text-sm font-medium text-gray-700">
                                {fileName ?? 'Arraste o CSV do Nubank aqui ou clique para selecionar'}
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
                <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <h3 className="mb-3 text-sm font-semibold text-gray-700">Como exportar o CSV do Nubank</h3>
                    <ol className="space-y-1.5 text-sm text-gray-600 list-decimal list-inside">
                        <li>Abra o app do Nubank e acesse a fatura do cartão.</li>
                        <li>Toque em <strong>"Exportar"</strong> no canto superior direito.</li>
                        <li>Selecione <strong>"Exportar para Excel (.csv)"</strong>.</li>
                        <li>Envie o arquivo para o seu e-mail ou dispositivo e faça o upload acima.</li>
                    </ol>
                    <p className="mt-3 text-xs text-gray-400">
                        Pagamentos de fatura são automaticamente ignorados para evitar duplicatas.
                        Importações repetidas do mesmo arquivo não criam duplicatas.
                    </p>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
