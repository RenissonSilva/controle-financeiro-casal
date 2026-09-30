// Logo da empresa do lançamento (ver App\Support\MerchantLogo), no mesmo quadrado de 32px
// dos monogramas. O anel sutil evita que logos escuros sumam no fundo.
export default function MerchantLogo({ merchant, size = 'h-8 w-8' }) {
    return (
        <img
            src={merchant.logo}
            alt={merchant.name}
            title={merchant.name}
            loading="lazy"
            className={`${size} flex-none rounded-lg object-cover ring-1 ring-line-strong`}
        />
    );
}
