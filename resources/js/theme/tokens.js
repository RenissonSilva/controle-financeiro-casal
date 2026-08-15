import bgFloresta from '@/assets/bg-floresta.jpeg';

// Paleta oficial do produto ("Maré"). Fonte única de verdade para as cores —
// espelhada como CSS vars estáticas em resources/css/app.css (para as classes
// Tailwind) e importada diretamente aqui onde é preciso um valor de cor puro
// (fill/stroke de SVG, Cell do Recharts, gradientes de <defs>).
export const theme = {
    bg: '#0e1c28',
    surface: '#152a38',
    text: '#eef7f8',
    textRgb: '223,238,240',
    accent: '#43a9ab',
    accentRgb: '67,169,171',
    avatarBg: '#2a7daa',
    softText: '#dcee8e',
    strongAccent: '#8fd79b',
    strongAccentGlowRgb: '143,215,155',
    chartLight: '#dcee8e',
    chartMid: '#43a9ab',
    chartDeep: '#3f7fb8',
    gaugeStart: '#22517e',
    healthCardGradStart: '#14304a',
    heroCardGradStart: '#173548',
    progressGradStart: '#22517e',
    progressGradEnd: '#43a9ab',
    progressText: '#eef7f8',
    valueColor: '#c3dbe0',
    ambientGlow: '#16344a',
    income: '#b5e38a',
    incomeRgb: '181,227,138',
    expense: '#5ec1e0',
    expenseRgb: '94,193,224',
    bgImage: bgFloresta,
    bgImagePosition: 'center 22%',
};
