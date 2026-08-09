import { useEffect, useState } from 'react';
import { Head, Link } from '@inertiajs/react';

const NOME = 'Reni';
const SCORE = 62;
const GAUGE_OFFSET = 283 - 283 * (Math.max(0, Math.min(100, SCORE)) / 100);

const PROXIMAS = [
    { nome: 'Aluguel', venc: '10/08', valor: 'R$ 2.150,00' },
    { nome: 'Cartão Nubank', venc: '12/08', valor: 'R$ 1.284,30' },
    { nome: 'Energia · Enel', venc: '15/08', valor: 'R$ 187,40' },
    { nome: 'Internet · Vivo', venc: '18/08', valor: 'R$ 119,90' },
];

const HISTORICO = [
    { ini: 'MC', nome: 'Mercado Central', cat: 'Alimentação', data: '02/08', valor: 'R$ 412,80' },
    { ini: 'PS', nome: 'Posto Shell', cat: 'Transporte', data: '01/08', valor: 'R$ 260,00' },
    { ini: 'FA', nome: 'Farmácia São João', cat: 'Saúde', data: '31/07', valor: 'R$ 96,50' },
    { ini: 'AC', nome: 'Academia Pulse', cat: 'Lazer', data: '30/07', valor: 'R$ 149,00' },
];

// Sistema de temas: cada entrada define todos os tokens de cor usados na tela.
// Para propor um novo tema, basta adicionar uma nova chave aqui — o seletor
// no cabeçalho já lista automaticamente qualquer tema presente neste objeto.
const THEMES = {
    nebulosa: {
        label: 'Nebulosa',
        bg: '#161826',
        surface: '#232532',
        text: '#e9e9ed',
        textRgb: '233,233,237',
        accent: '#9184d9',
        accentRgb: '145,132,217',
        avatarBg: '#423a6a',
        softText: '#d2cefd',
        strongAccent: '#b5abfc',
        strongAccentGlowRgb: '181,171,252',
        chartLight: '#b5abfc',
        chartMid: '#796cbf',
        chartDeep: '#5c5783',
        gaugeStart: '#5d5294',
        healthCardGradStart: '#262a60',
        progressGradStart: '#5d5294',
        progressGradEnd: '#9184d9',
        progressText: '#f3f5fe',
        valueColor: '#cfd3e5',
        ambientGlow: '#222440',
    },
    azulejo: {
        label: 'Azulejo',
        bg: '#0B2136',
        surface: '#123048',
        text: '#F5ECD8',
        textRgb: '245,236,216',
        accent: '#E0405C',
        accentRgb: '224,64,92',
        avatarBg: '#6E0212',
        softText: '#F8D6DA',
        strongAccent: '#F0A0A8',
        strongAccentGlowRgb: '240,160,168',
        chartLight: '#8FC0D6',
        chartMid: '#4C7E97',
        chartDeep: '#1E4A63',
        gaugeStart: '#6E0212',
        healthCardGradStart: '#3D0F1B',
        progressGradStart: '#1E4A63',
        progressGradEnd: '#8FC0D6',
        progressText: '#FBF6E9',
        valueColor: '#E4D9C2',
        ambientGlow: '#163A56',
    },
    equilibrada: {
        label: 'Equilibrada e Funcional',
        bg: '#18181B',
        surface: '#27272A',
        text: '#F4F4F5',
        textRgb: '244,244,245',
        accent: '#10B981',
        accentRgb: '16,185,129',
        avatarBg: '#123B2C',
        softText: '#86EFC9',
        strongAccent: '#34D399',
        strongAccentGlowRgb: '52,211,153',
        chartLight: '#FCD34D',
        chartMid: '#FBBF24',
        chartDeep: '#B45309',
        gaugeStart: '#FBBF24',
        healthCardGradStart: '#10261D',
        progressGradStart: '#0D7A5C',
        progressGradEnd: '#10B981',
        progressText: '#ECFDF5',
        valueColor: '#F87171',
        ambientGlow: '#152420',
    },
    entardecer: {
        label: 'Entardecer',
        bg: '#16262C',
        surface: '#1F3840',
        text: '#F3ECD9',
        textRgb: '243,236,217',
        accent: '#E76F51',
        accentRgb: '231,111,81',
        avatarBg: '#1F6F63',
        softText: '#FBE0D4',
        strongAccent: '#F4A261',
        strongAccentGlowRgb: '244,162,97',
        chartLight: '#E9C46A',
        chartMid: '#F4A261',
        chartDeep: '#E76F51',
        gaugeStart: '#2A9D8F',
        healthCardGradStart: '#1B3038',
        progressGradStart: '#2A9D8F',
        progressGradEnd: '#E9C46A',
        progressText: '#FCF8EC',
        valueColor: '#E76F51',
        ambientGlow: '#234A4A',
    },
    nordico: {
        label: 'Nórdico',
        bg: '#1B2130',
        surface: '#262F44',
        text: '#F0F1F8',
        textRgb: '240,241,248',
        accent: '#FA6259',
        accentRgb: '250,98,89',
        avatarBg: '#3D5470',
        softText: '#FFD9D5',
        strongAccent: '#FF8179',
        strongAccentGlowRgb: '255,129,121',
        chartLight: '#BFDCEE',
        chartMid: '#5B7A9C',
        chartDeep: '#47536B',
        gaugeStart: '#5B7A9C',
        healthCardGradStart: '#20283A',
        progressGradStart: '#47536B',
        progressGradEnd: '#BFDCEE',
        progressText: '#F5F4FC',
        valueColor: '#FA6259',
        ambientGlow: '#2A3B52',
    },
    oliva: {
        label: 'Oliva',
        bg: '#231C15',
        surface: '#332A1F',
        text: '#F5EFDD',
        textRgb: '245,239,221',
        accent: '#A3C17E',
        accentRgb: '163,193,126',
        avatarBg: '#8A6650',
        softText: '#DEE4B3',
        strongAccent: '#BFE0A0',
        strongAccentGlowRgb: '191,224,160',
        chartLight: '#F0E7D2',
        chartMid: '#A3C17E',
        chartDeep: '#6B5749',
        gaugeStart: '#AB8367',
        healthCardGradStart: '#1C160F',
        progressGradStart: '#AB8367',
        progressGradEnd: '#A3C17E',
        progressText: '#FBF6EA',
        valueColor: '#C9A07E',
        ambientGlow: '#39402A',
    },
    vinho: {
        label: 'Vinho',
        bg: '#20141A',
        surface: '#33212A',
        text: '#FBE7C0',
        textRgb: '251,231,192',
        accent: '#E16C59',
        accentRgb: '225,108,89',
        avatarBg: '#703C4B',
        softText: '#FCE1AB',
        strongAccent: '#F0917A',
        strongAccentGlowRgb: '240,145,122',
        chartLight: '#C7CE9F',
        chartMid: '#E16C59',
        chartDeep: '#703C4B',
        gaugeStart: '#703C4B',
        healthCardGradStart: '#2A1920',
        progressGradStart: '#703C4B',
        progressGradEnd: '#E16C59',
        progressText: '#FDF2DE',
        valueColor: '#C7CE9F',
        ambientGlow: '#3A2029',
    },
};

const DEFAULT_THEME = 'nebulosa';
const THEME_STORAGE_KEY = 'sovinna-theme';

function ThemeSwitcher({ themeKey, onChange, theme }) {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '4px 10px 4px 4px',
                borderRadius: 999,
                background: `rgba(${theme.textRgb},.05)`,
                boxShadow: `inset 0 0 0 1px rgba(${theme.textRgb},.09)`,
            }}
        >
            <div style={{ display: 'flex', gap: 5 }}>
                {Object.entries(THEMES).map(([key, t]) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => onChange(key)}
                        title={t.label}
                        aria-label={`Tema ${t.label}`}
                        aria-pressed={key === themeKey}
                        style={{
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            border: 'none',
                            padding: 0,
                            cursor: 'pointer',
                            background: `linear-gradient(135deg, ${t.bg} 42%, ${t.accent} 100%)`,
                            boxShadow:
                                key === themeKey
                                    ? `0 0 0 2px ${theme.surface}, 0 0 0 3.5px ${theme.text}`
                                    : `0 0 0 1px rgba(${theme.textRgb},.3)`,
                            transition: 'box-shadow .15s',
                        }}
                    />
                ))}
            </div>
            <span style={{ fontSize: 11, letterSpacing: '.04em', color: `rgba(${theme.textRgb},.5)` }}>
                {theme.label}
            </span>
        </div>
    );
}

export default function Sovinna() {
    const [themeKey, setThemeKey] = useState(() => {
        if (typeof window === 'undefined') return DEFAULT_THEME;
        return localStorage.getItem(THEME_STORAGE_KEY) || DEFAULT_THEME;
    });
    const theme = THEMES[themeKey] ?? THEMES[DEFAULT_THEME];

    useEffect(() => {
        localStorage.setItem(THEME_STORAGE_KEY, themeKey);
    }, [themeKey]);

    const card = {
        padding: 20,
        borderRadius: 14,
        background: 'var(--color-surface)',
        boxShadow: `inset 0 0 0 1px rgba(${theme.textRgb},.08)`,
    };

    const cardHeader = {
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 12,
    };

    const muted = { fontSize: 11.5, color: `rgba(${theme.textRgb},.45)` };

    return (
        <>
            <Head title="Sovinna">
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link href="https://fonts.bunny.net/css?family=inter:400,500,600,700&display=swap" rel="stylesheet" />
            </Head>

            <style>{`
                :root {
                    --color-bg: ${theme.bg};
                    --color-surface: ${theme.surface};
                    --color-text: ${theme.text};
                    --color-text-rgb: ${theme.textRgb};
                    --color-accent: ${theme.accent};
                    --color-accent-rgb: ${theme.accentRgb};
                    --font-heading: "Inter", system-ui, sans-serif;
                    --font-body: "Inter", system-ui, sans-serif;
                }
                @keyframes drawArc { from { stroke-dashoffset: 283; } }
                @keyframes drawRing { from { stroke-dasharray: 0 440; } }
                @keyframes riseBar { from { transform: scaleX(0); } }
                .orb { background: var(--color-bg); color: var(--color-text); }
                .orb h1, .orb h2 { font-family: var(--font-heading); font-weight: 500; margin: 0; }
                .orb .btn {
                    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
                    cursor: pointer; text-decoration: none;
                    font-family: var(--font-heading); font-weight: 500;
                    font-size: 14px; line-height: 1.2; color: var(--color-text);
                    background: transparent; border: 1px solid transparent;
                }
                .orb .btn-secondary { border-color: rgba(var(--color-text-rgb),.16); }
                .orb .btn-secondary:hover { background: rgba(var(--color-text-rgb),.07); }
                .orb .btn-ghost { color: var(--color-accent); }
                .orb .btn-ghost:hover { background: rgba(var(--color-accent-rgb),.1); }
                .orb .nav-link { transition: background .12s, color .12s; }
                .orb .nav-link:hover { color: var(--color-text); background: rgba(var(--color-text-rgb),.06); }
                .orb .row-hover:hover { background: rgba(var(--color-text-rgb),.045); }
                .orb a { color: var(--color-accent); text-decoration: none; }
            `}</style>

            <div
                className="orb"
                style={{
                    minHeight: '100vh',
                    background:
                        `radial-gradient(1100px 520px at 78% -8%, ${theme.ambientGlow} 0%, transparent 60%), var(--color-bg)`,
                    fontFamily: 'var(--font-body)',
                    padding: '20px clamp(280px,3vw,40px) 48px',
                    transition: 'background .2s',
                }}
            >
                {/* Header */}
                <header
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 16,
                        flexWrap: 'wrap',
                        marginBottom: 'clamp(24px,4vw,44px)',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginRight: 'auto' }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={theme.accent} strokeWidth={1.6}>
                            <circle cx="12" cy="12" r="9" />
                            <path d="M12 6.5v11M9.2 9.4h4.3a1.9 1.9 0 0 1 0 3.8h-3.4a1.9 1.9 0 0 0 0 3.8h4.7" />
                        </svg>
                        <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 17, letterSpacing: '-.01em' }}>
                            Sovinna
                        </span>
                    </div>

                    <nav
                        style={{
                            display: 'flex',
                            gap: 2,
                            padding: 4,
                            borderRadius: 999,
                            background: `rgba(${theme.textRgb},.05)`,
                            boxShadow: `inset 0 0 0 1px rgba(${theme.textRgb},.09)`,
                        }}
                    >
                        <Link
                            href={route('dashboard')}
                            className="nav-link"
                            style={{
                                padding: '7px 18px',
                                borderRadius: 999,
                                fontSize: 13.5,
                                color: theme.text,
                                background: `rgba(${theme.accentRgb},.18)`,
                                boxShadow: `inset 0 0 0 1px rgba(${theme.accentRgb},.55)`,
                            }}
                        >
                            Dashboard
                        </Link>
                        <a href="#" className="nav-link" style={{ padding: '7px 18px', borderRadius: 999, fontSize: 13.5, color: `rgba(${theme.textRgb},.6)` }}>
                            Metas
                        </a>
                        <Link
                            href={route('settings.show')}
                            className="nav-link"
                            style={{ padding: '7px 18px', borderRadius: 999, fontSize: 13.5, color: `rgba(${theme.textRgb},.6)` }}
                        >
                            Configurações
                        </Link>
                    </nav>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
                        <ThemeSwitcher themeKey={themeKey} onChange={setThemeKey} theme={theme} />
                        <button className="btn btn-secondary" style={{ borderRadius: 999, fontSize: 13, padding: '7px 14px' }}>
                            + Lançamento
                        </button>
                        <div
                            style={{
                                width: 34,
                                height: 34,
                                borderRadius: '50%',
                                display: 'grid',
                                placeItems: 'center',
                                fontSize: 12.5,
                                fontWeight: 600,
                                color: theme.softText,
                                background: theme.avatarBg,
                                boxShadow: `0 0 0 1px rgba(${theme.accentRgb},.45)`,
                            }}
                        >
                            R
                        </div>
                    </div>
                </header>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(16px,2vw,24px)', alignItems: 'stretch' }}>
                    {/* Main column */}
                    <main
                        style={{
                            flex: '1 1 560px',
                            minWidth: 'min(100%,320px)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 'clamp(16px,2vw,24px)',
                        }}
                    >
                        {/* Hero */}
                        <section style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-end', justifyContent: 'space-between' }}>
                            <div>
                                <div style={{ fontSize: 12, letterSpacing: '.12em', textTransform: 'uppercase', color: `rgba(${theme.textRgb},.45)`, marginBottom: 10 }}>
                                    Agosto de 2026
                                </div>
                                <h1 style={{ margin: '0 0 12px', fontSize: 'clamp(34px,5vw,54px)', fontWeight: 500, letterSpacing: '-.03em', lineHeight: 1.02 }}>
                                    Bem-vindo, <span style={{ color: theme.strongAccent }}>{NOME}</span>
                                </h1>
                                <div
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        padding: '5px 14px 5px 10px',
                                        borderRadius: 999,
                                        background: `rgba(${theme.accentRgb},.13)`,
                                        boxShadow: `inset 0 0 0 1px rgba(${theme.accentRgb},.4)`,
                                    }}
                                >
                                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: theme.strongAccent, boxShadow: `0 0 10px 2px rgba(${theme.strongAccentGlowRgb},.7)` }} />
                                    <span style={{ fontSize: 13, color: theme.softText }}>Suas finanças estão saudáveis</span>
                                </div>
                            </div>
                        </section>

                        {/* Stat cards */}


                        {/* Próximas despesas + categorias */}
                        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 'clamp(12px,1.4vw,18px)', alignItems: 'stretch', marginTop: 'auto' }}>
                            <div style={{ ...card, display: 'flex', flexDirection: 'column' }}>
                                <div style={{ ...cardHeader, marginBottom: 16 }}>
                                    <h2 style={{ fontSize: 16 }}>Próximas despesas</h2>
                                    <span style={muted}>7 dias</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    {PROXIMAS.map((d) => (
                                        <label key={d.nome} className="row-hover" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 8px', borderRadius: 9, cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                style={{ appearance: 'none', width: 17, height: 17, flex: 'none', borderRadius: 5, background: 'transparent', boxShadow: `inset 0 0 0 1.5px rgba(${theme.textRgb},.28)`, cursor: 'pointer' }}
                                            />
                                            <span style={{ flex: 1, minWidth: 0 }}>
                                                <span style={{ display: 'block', fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.nome}</span>
                                                <span style={{ display: 'block', fontSize: 11.5, color: `rgba(${theme.textRgb},.45)` }}>vence {d.venc}</span>
                                            </span>
                                            <span style={{ fontSize: 13.5, fontVariantNumeric: 'tabular-nums', color: theme.valueColor }}>{d.valor}</span>
                                        </label>
                                    ))}
                                </div>
                                <button className="btn btn-ghost" style={{ alignSelf: 'center', marginTop: 'auto', paddingTop: 10, fontSize: 12.5 }}>
                                    Ver todas ⌄
                                </button>
                            </div>

                            <div style={{ ...card, display: 'flex', flexDirection: 'column' }}>
                                <div style={cardHeader}>
                                    <h2 style={{ fontSize: 16 }}>Despesas por categoria</h2>
                                    <span style={muted}>agosto</span>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 20, marginTop: 8, marginBottom: 'auto' }}>
                                    <div style={{ position: 'relative', flex: '0 0 auto', width: 176, height: 176 }}>
                                        <svg viewBox="0 0 160 160" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                                            <circle cx="80" cy="80" r="70" fill="none" stroke={`rgba(${theme.textRgb},.06)`} strokeWidth={16} />
                                            <circle cx="80" cy="80" r="70" fill="none" stroke={theme.chartLight} strokeWidth={16} strokeDasharray="151 289" strokeDashoffset="0" style={{ animation: 'drawRing 1s cubic-bezier(.2,.8,.2,1)' }} />
                                            <circle cx="80" cy="80" r="70" fill="none" stroke={theme.chartMid} strokeWidth={16} strokeDasharray="130 310" strokeDashoffset="-157" />
                                            <circle cx="80" cy="80" r="70" fill="none" stroke={theme.chartDeep} strokeWidth={16} strokeDasharray="145 295" strokeDashoffset="-293" />
                                        </svg>
                                        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeContent: 'center', textAlign: 'center' }}>
                                            <div style={{ fontSize: 10.5, letterSpacing: '.1em', textTransform: 'uppercase', color: `rgba(${theme.textRgb},.45)` }}>Total</div>
                                            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 21, letterSpacing: '-.02em' }}>R$ 6.312</div>
                                        </div>
                                    </div>
                                    <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: 12, minWidth: 150 }}>
                                        {[
                                            { cor: theme.chartLight, nome: 'Moradia', pct: '35%' },
                                            { cor: theme.chartMid, nome: 'Alimentação', pct: '30%' },
                                            { cor: theme.chartDeep, nome: 'Transporte', pct: '35%' },
                                        ].map((c) => (
                                            <div key={c.nome} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <span style={{ width: 9, height: 9, borderRadius: 3, background: c.cor, flex: 'none' }} />
                                                <span style={{ flex: 1, fontSize: 13.5 }}>{c.nome}</span>
                                                <span style={{ fontSize: 13.5, fontVariantNumeric: 'tabular-nums', color: `rgba(${theme.textRgb},.7)` }}>{c.pct}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div style={{ paddingTop: 12, fontSize: 12, color: `rgba(${theme.textRgb},.45)`, background: `linear-gradient(to right,rgba(${theme.textRgb},.12),transparent) no-repeat top/100% 1px` }}>
                                    Moradia subiu R$ 240 em relação a julho.
                                </div>
                            </div>
                        </section>
                    </main>

                    {/* Sidebar */}
                    <aside style={{ flex: '1 1 300px', maxWidth: '100%', display: 'flex', flexDirection: 'column', gap: 'clamp(12px,1.4vw,18px)' }}>
                        <div style={{ padding: 20, borderRadius: 14, background: `linear-gradient(160deg,${theme.healthCardGradStart} 0%,${theme.surface} 70%)`, boxShadow: `inset 0 0 0 1px rgba(${theme.accentRgb},.25)` }}>
                            <div style={cardHeader}>
                                <h2 style={{ fontSize: 16 }}>Saúde financeira</h2>
                                <span style={{ fontSize: 11.5, color: `rgba(${theme.textRgb},.5)` }}>30 dias</span>
                            </div>
                            <div style={{ position: 'relative', margin: '6px auto 0', width: 'min(260px,100%)' }}>
                                <svg viewBox="0 0 220 124" style={{ width: '100%', display: 'block', overflow: 'visible' }}>
                                    <defs>
                                        <linearGradient id="gauge" x1="0" y1="0" x2="1" y2="0">
                                            <stop offset="0" stopColor={theme.gaugeStart} />
                                            <stop offset="1" stopColor={theme.strongAccent} />
                                        </linearGradient>
                                        <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
                                            <feGaussianBlur stdDeviation="6" result="b" />
                                            <feMerge>
                                                <feMergeNode in="b" />
                                                <feMergeNode in="SourceGraphic" />
                                            </feMerge>
                                        </filter>
                                    </defs>
                                    <path d="M20 110 A 90 90 0 0 1 200 110" fill="none" stroke={`rgba(${theme.textRgb},.09)`} strokeWidth={17} strokeLinecap="round" />
                                    <path
                                        d="M20 110 A 90 90 0 0 1 200 110"
                                        fill="none"
                                        stroke="url(#gauge)"
                                        strokeWidth={17}
                                        strokeLinecap="round"
                                        filter="url(#glow)"
                                        strokeDasharray="283"
                                        strokeDashoffset={GAUGE_OFFSET}
                                        style={{ animation: 'drawArc 1.1s cubic-bezier(.2,.8,.2,1)' }}
                                    />
                                </svg>
                                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 2, textAlign: 'center' }}>
                                    <div style={{ fontFamily: 'var(--font-heading)', fontSize: 40, fontWeight: 500, letterSpacing: '-.03em', lineHeight: 1 }}>
                                        {SCORE}
                                        <span style={{ fontSize: '.45em', color: `rgba(${theme.textRgb},.55)` }}>%</span>
                                    </div>
                                    <div style={{ fontSize: 12, color: theme.softText, marginTop: 2 }}>Bom</div>
                                </div>
                            </div>
                            <div style={{ marginTop: 14, fontSize: 12.5, lineHeight: 1.5, color: `rgba(${theme.textRgb},.6)` }}>
                                Cálculo sobre reserva, endividamento e regularidade dos aportes.
                            </div>
                        </div>

                        <div style={card}>
                            <div style={{ ...cardHeader, marginBottom: 14 }}>
                                <h2 style={{ fontSize: 16 }}>Meta · Investimentos</h2>
                                <span style={muted}>até dez/26</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
                                <span style={{ fontFamily: 'var(--font-heading)', fontSize: 26, letterSpacing: '-.02em' }}>R$ 21.000</span>
                                <span style={{ fontSize: 12.5, color: `rgba(${theme.textRgb},.45)` }}>de R$ 30.000</span>
                            </div>
                            <div style={{ position: 'relative', height: 26, borderRadius: 8, background: `rgba(${theme.textRgb},.07)`, overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', inset: '0 30% 0 0', borderRadius: 8, background: `linear-gradient(90deg,${theme.progressGradStart},${theme.progressGradEnd})`, transformOrigin: 'left', animation: 'riseBar 1s cubic-bezier(.2,.8,.2,1)' }} />
                                <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', paddingLeft: 12, fontSize: 12.5, fontWeight: 600, color: theme.progressText }}>70%</span>
                            </div>
                            <div style={{ marginTop: 10, fontSize: 12, color: `rgba(${theme.textRgb},.5)` }}>
                                Faltam R$ 9.000 · R$ 1.800/mês para chegar no prazo.
                            </div>
                        </div>

                        <div style={card}>
                            <div style={{ ...cardHeader, marginBottom: 8 }}>
                                <h2 style={{ fontSize: 16 }}>Histórico de gastos</h2>
                                <a href="#" style={{ fontSize: 12 }}>Ver tudo</a>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                {HISTORICO.map((h) => (
                                    <div key={h.nome} className="row-hover" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 8px', borderRadius: 9 }}>
                                        <span
                                            style={{
                                                width: 32,
                                                height: 32,
                                                flex: 'none',
                                                borderRadius: 9,
                                                display: 'grid',
                                                placeItems: 'center',
                                                fontSize: 13,
                                                background: `rgba(${theme.accentRgb},.14)`,
                                                boxShadow: `inset 0 0 0 1px rgba(${theme.accentRgb},.28)`,
                                                color: theme.softText,
                                            }}
                                        >
                                            {h.ini}
                                        </span>
                                        <span style={{ flex: 1, minWidth: 0 }}>
                                            <span style={{ display: 'block', fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.nome}</span>
                                            <span style={{ display: 'block', fontSize: 11.5, color: `rgba(${theme.textRgb},.45)` }}>{h.cat} · {h.data}</span>
                                        </span>
                                        <span style={{ fontSize: 13.5, fontVariantNumeric: 'tabular-nums', color: theme.valueColor }}>{h.valor}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </>
    );
}
