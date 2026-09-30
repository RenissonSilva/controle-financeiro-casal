// Logo da empresa do lançamento (ver App\Support\MerchantLogo), no mesmo círculo de 28px
// dos ícones de tipo. O anel sutil evita que logos escuros sumam no fundo.
export default function MerchantLogo({ merchant }) {
    return (
        <img
            src={merchant.logo}
            alt={merchant.name}
            title={merchant.name}
            loading="lazy"
            className="h-7 w-7 flex-none rounded-full object-cover ring-1 ring-text/10"
        />
    );
}
