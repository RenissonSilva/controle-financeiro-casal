import bgFloresta from '@/assets/bg-floresta.jpeg';

export const mareTheme = {
    label: 'Maré',
    bgImage: bgFloresta,
    bgImagePosition: 'center 22%',
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
    progressGradStart: '#22517e',
    progressGradEnd: '#43a9ab',
    progressText: '#eef7f8',
    valueColor: '#c3dbe0',
    ambientGlow: '#16344a',
};

export function cardStyle(theme) {
    return {
        padding: 20,
        borderRadius: 14,
        background: 'var(--color-surface)',
        boxShadow: `inset 0 0 0 1px rgba(${theme.textRgb},.08)`,
    };
}

export function cardHeaderStyle() {
    return {
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 12,
    };
}

export function mutedStyle(theme) {
    return { fontSize: 11.5, color: `rgba(${theme.textRgb},.45)` };
}
