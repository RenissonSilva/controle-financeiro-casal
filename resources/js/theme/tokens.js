// Paleta oficial do produto (tema "Noite"). Fonte única de verdade para as cores —
// espelhada como CSS vars estáticas em resources/css/app.css (para as classes
// Tailwind) e importada diretamente aqui onde é preciso um valor de cor puro
// (fill/stroke de SVG, cor de categoria vinda de dado).
export const theme = {
    bg: '#0C0D0F',
    surface: '#141518',
    surfaceRaised: '#1A1C20',
    surfaceInset: '#1F2126',
    line: '#23252A',
    track: '#26292F',
    text: '#EDEEF0',
    text2: '#B9BDC4',
    muted: '#8E939C',
    accent: '#C6F36B',
    negative: '#FF8266',
    warning: '#F5B94A',

    // Cores fixas de categoria do tema (usadas quando a categoria não tem cor própria).
    catOutras: '#6B7280',
    catFallback: '#7AA2FF',
};

// '#rrggbb' → 'rgba(r, g, b, alpha)' — etiqueta de categoria (fundo translúcido na cor dela).
export function tint(hex, alpha) {
    const value = String(hex || '').replace('#', '');
    if (!/^[0-9a-f]{6}$/i.test(value)) return `rgba(142, 147, 156, ${alpha})`;
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16));
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Clareia a cor na direção do branco (0-1) — texto da etiqueta de categoria,
// legível sobre o fundo escuro mesmo com cores de categoria mais fechadas.
export function lighten(hex, amount = 0.3) {
    const value = String(hex || '').replace('#', '');
    if (!/^[0-9a-f]{6}$/i.test(value)) return theme.text2;
    const channel = (i) => Math.round(parseInt(value.slice(i, i + 2), 16) + (255 - parseInt(value.slice(i, i + 2), 16)) * amount);
    return `rgb(${channel(0)}, ${channel(2)}, ${channel(4)})`;
}
