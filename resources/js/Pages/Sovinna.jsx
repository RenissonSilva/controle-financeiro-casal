import { useEffect, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import ThemeStyles from '@/Components/ThemeStyles';
import { mareTheme, cardStyle, cardHeaderStyle, mutedStyle } from '@/theme/mare';

const NOME = 'Reni';
const SCORE = 62;
const GAUGE_OFFSET = 283 - 283 * (Math.max(0, Math.min(100, SCORE)) / 100);

const PROXIMAS = [
    { nome: 'Aluguel', cat: 'Moradia', venc: '10/08', valor: 'R$ 2.150,00', tipo: 'despesa' },
    { nome: 'Depósito Salário', cat: 'Renda', venc: '11/08', valor: 'R$ 4.850,00', tipo: 'receita' },
    { nome: 'Cartão Nubank', cat: 'Cartão de Crédito', venc: '12/08', valor: 'R$ 1.284,30', tipo: 'despesa' },
    { nome: 'Energia · Enel', cat: 'Utilidades', venc: '15/08', valor: 'R$ 187,40', tipo: 'despesa' },
    { nome: 'Rendimento Inv.', cat: 'Investimentos', venc: '16/08', valor: 'R$ 320,00', tipo: 'receita' },
    { nome: 'Internet · Vivo', cat: 'Serviços', venc: '18/08', valor: 'R$ 119,90', tipo: 'despesa' },
];

const HISTORICO = [
    { nome: 'Mercado Central', cat: 'Alimentação', data: '02/08', valor: 'R$ 412,80', tipo: 'despesa' },
    { nome: 'Projeto Freelance', cat: 'Renda Extra', data: '02/08', valor: 'R$ 1.500,00', tipo: 'receita' },
    { nome: 'Posto Shell', cat: 'Transporte', data: '01/08', valor: 'R$ 260,00', tipo: 'despesa' },
    { nome: 'Farmácia São João', cat: 'Saúde', data: '31/07', valor: 'R$ 96,50', tipo: 'despesa' },
    { nome: 'Academia Pulse', cat: 'Lazer', data: '30/07', valor: 'R$ 149,00', tipo: 'despesa' },
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
    lilas: {
        label: 'Lilás',
        bg: '#1A1330',
        surface: '#332759',
        text: '#F3E7F0',
        textRgb: '243,231,240',
        accent: '#BC9AC8',
        accentRgb: '188,154,200',
        avatarBg: '#5C5591',
        softText: '#F0D9E8',
        strongAccent: '#E4B7D0',
        strongAccentGlowRgb: '228,183,208',
        chartLight: '#E4B7D0',
        chartMid: '#9789C3',
        chartDeep: '#5C5591',
        gaugeStart: '#5C5591',
        healthCardGradStart: '#1A1330',
        progressGradStart: '#5C5591',
        progressGradEnd: '#E4B7D0',
        progressText: '#FBF2F8',
        valueColor: '#9789C3',
        ambientGlow: '#2E2350',
    },
    tropical: {
        label: 'Tropical',
        bg: '#16232E',
        surface: '#28425A',
        text: '#F4EFE0',
        textRgb: '244,239,224',
        accent: '#F98545',
        accentRgb: '249,133,69',
        avatarBg: '#5E9F8E',
        softText: '#FDECB8',
        strongAccent: '#FBCC5F',
        strongAccentGlowRgb: '251,204,95',
        chartLight: '#A2C280',
        chartMid: '#5E9F8E',
        chartDeep: '#28425A',
        gaugeStart: '#5E9F8E',
        healthCardGradStart: '#16232E',
        progressGradStart: '#5E9F8E',
        progressGradEnd: '#FBCC5F',
        progressText: '#FCF8EC',
        valueColor: '#F98545',
        ambientGlow: '#1F3B45',
    },
    abissal: {
        label: 'Abissal',
        bg: '#061418',
        surface: '#16424F',
        text: '#EEF3E0',
        textRgb: '238,243,224',
        accent: '#5A8599',
        accentRgb: '90,133,153',
        avatarBg: '#16424F',
        softText: '#B1C5AE',
        strongAccent: '#7FAABE',
        strongAccentGlowRgb: '127,170,190',
        chartLight: '#EEF3E0',
        chartMid: '#B1C5AE',
        chartDeep: '#5A8599',
        gaugeStart: '#5A8599',
        healthCardGradStart: '#061418',
        progressGradStart: '#16424F',
        progressGradEnd: '#B1C5AE',
        progressText: '#F5F9EC',
        valueColor: '#B1C5AE',
        ambientGlow: '#123640',
    },
    pomar: {
        label: 'Pomar',
        bg: '#182620',
        surface: '#2C4A40',
        text: '#F8F0C4',
        textRgb: '248,240,196',
        accent: '#8BB56A',
        accentRgb: '139,181,106',
        avatarBg: '#55907F',
        softText: '#F1E68B',
        strongAccent: '#C24959',
        strongAccentGlowRgb: '194,73,89',
        chartLight: '#F1E68B',
        chartMid: '#EFA363',
        chartDeep: '#C24959',
        gaugeStart: '#55907F',
        healthCardGradStart: '#182620',
        progressGradStart: '#55907F',
        progressGradEnd: '#8BB56A',
        progressText: '#F5F9E8',
        valueColor: '#C24959',
        ambientGlow: '#213A32',
    },
    mare: mareTheme,
    floresta: mareTheme,
};

const DEFAULT_THEME = 'mare';
const THEME_STORAGE_KEY = 'sovinna-theme';

export default function Sovinna() {
    const [themeKey] = useState(() => {
        if (typeof window === 'undefined') return DEFAULT_THEME;
        return localStorage.getItem(THEME_STORAGE_KEY) || DEFAULT_THEME;
    });
    const theme = THEMES[themeKey] ?? THEMES[DEFAULT_THEME];

    useEffect(() => {
        localStorage.setItem(THEME_STORAGE_KEY, themeKey);
    }, [themeKey]);

    const card = cardStyle(theme);
    const cardHeader = cardHeaderStyle();
    const muted = mutedStyle(theme);

    const heroCardGradStart = theme.heroCardGradStart || theme.healthCardGradStart;
    const income = theme.income || theme.chartLight;
    const expense = theme.expense || '#fa8c8c';
    const expenseRgb = theme.expenseRgb || '203,213,225';



    return (
        <>
            <Head title="Sovinna">
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link href="https://fonts.bunny.net/css?family=poppins:400,500,600,700&display=swap" rel="stylesheet" />
            </Head>

            <ThemeStyles theme={theme} />

            <div
                className="orb"
                style={{
                    minHeight: '100vh',
                    background:
                        `radial-gradient(1100px 520px at 78% -8%, ${theme.ambientGlow} 0%, transparent 60%), var(--color-bg)`,
                    fontFamily: 'var(--font-body)',
                    padding: '20px clamp(280px,3vw,40px) 48px',
                    transition: 'background .2s',
                    position: 'relative',
                    isolation: 'isolate',
                }}
            >
                {theme.bgImage && (
                    <div
                        aria-hidden="true"
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: -1,
                            pointerEvents: 'none',
                            overflow: 'hidden',
                        }}
                    >
                        <img
                            src={theme.bgImage}
                            alt=""
                            style={{
                                position: 'absolute',
                                inset: 0,
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                objectPosition: theme.bgImagePosition || 'center',
                                opacity: 0.7,
                                filter: 'brightness(.9)',
                            }}
                        />
                        <div style={{ position: 'absolute', inset: 0, background: theme.accent, mixBlendMode: 'color', opacity: 0.6 }} />
                        <div
                            style={{
                                position: 'absolute',
                                inset: 0,
                                background: 'linear-gradient(180deg,rgba(0,0,0,.5) 0%,rgba(0,0,0,.28) 24%,var(--color-bg) 76%)',
                            }}
                        />
                    </div>
                )}

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
                        {/* <img src={logo} alt="Sovinna" width={64} height={64} style={{ borderRadius: 7, objectFit: 'cover' }} /> */}
                        <span style={{ fontFamily: '"Avalon Alt", var(--font-heading)', fontWeight: 500, fontSize: 50, letterSpacing: '-.01em' }}>
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(20px,2.4vw,32px)' }}>
                    {/* Hero Section */}
                    <section style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ fontSize: 12, letterSpacing: '.12em', textTransform: 'uppercase', color: `rgba(${theme.textRgb},.45)`, marginBottom: 8 }}>
                                Agosto de 2026
                            </div>
                            <h1 style={{ margin: '0 0 10px', fontSize: 'clamp(34px,4.5vw,52px)', fontWeight: 500, letterSpacing: '-.03em', lineHeight: 1.02 }}>
                                Bem-vindo, <span style={{ color: theme.strongAccent }}>{NOME}</span>
                            </h1>
                            <div
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: '5px 14px 5px 10px',
                                    borderRadius: 999,
                                    background: `rgba(${theme.accentRgb},.12)`,
                                    boxShadow: `inset 0 0 0 1px rgba(${theme.accentRgb},.35)`,
                                    backdropFilter: 'blur(8px)',
                                }}
                            >
                                <span style={{ width: 7, height: 7, borderRadius: '50%', background: theme.strongAccent, boxShadow: `0 0 10px 2px rgba(${theme.strongAccentGlowRgb},.7)` }} />
                                <span style={{ fontSize: 13, color: theme.softText }}>Suas finanças estão saudáveis</span>
                            </div>
                        </div>

                        {/* Saúde financeira (Glass Badge Pill) */}
                        <div
                            className="card-hover"
                            style={{
                                padding: '12px 22px',
                                borderRadius: 20,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 18,
                                background: `linear-gradient(135deg, ${theme.healthCardGradStart} 0%, rgba(${theme.textRgb},.03) 100%)`,
                                boxShadow: `inset 0 0 0 1px rgba(${theme.accentRgb},.25), 0 12px 32px -8px rgba(0,0,0,.25)`,
                                backdropFilter: 'blur(12px)',
                            }}
                        >
                            <div style={{ position: 'relative', width: 84, height: 50 }}>
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
                                    <span style={{ fontFamily: 'var(--font-heading)', fontSize: 15, fontWeight: 600 }}>{SCORE}%</span>
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: '-.01em' }}>Saúde financeira</div>
                                <div style={{ fontSize: 12, color: theme.expense, marginTop: 1 }}>Excelente · 30 dias</div>
                            </div>
                        </div>
                    </section>

                    {/* Top Row: Saldo Total (Hero), Fluxo de Caixa (Unificado), Meta Investimentos */}
                    <section style={{ marginTop: 'clamp(14px,2vw,24px)', display: 'flex', flexWrap: 'wrap', gap: 'clamp(14px,1.6vw,20px)', alignItems: 'stretch' }}>
                        {/* Saldo Total - Hero Card */}
                        <div
                            className="card-hover"
                            style={{
                                flex: '1 1 240px',
                                padding: 22,
                                borderRadius: 18,
                                background: `linear-gradient(135deg, rgba(${theme.accentRgb},.32) 0%, ${heroCardGradStart} 50%, ${theme.surface} 100%)`,
                                boxShadow: `inset 0 0 0 1px rgba(${theme.textRgb},.08), 0 8px 24px -6px rgba(0,0,0,.2)`,
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                position: 'relative',
                                overflow: 'hidden',
                            }}
                        >
                            <div style={{ position: 'relative', zIndex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 600, color: theme.text }}>
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={theme.strongAccent} strokeWidth={2}>
                                            <rect x="2.5" y="5.5" width="19" height="13" rx="2.5" />
                                            <path d="M2.5 10h19" />
                                        </svg>
                                        Saldo Total
                                    </div>
                                    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, background: `linear-gradient(90deg, ${theme.strongAccent}, ${theme.accent})`, color: theme.bg, fontWeight: 700, boxShadow: `0 2px 8px rgba(0,0,0,.25)` }}>
                                        Principal
                                    </span>
                                </div>
                                <div style={{ marginTop: 14, fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 'clamp(28px,2.8vw,38px)', letterSpacing: '-.03em', lineHeight: 1, color: theme.text, textShadow: `0 2px 12px rgba(0,0,0,.3)` }}>
                                    R$ 18.420<span style={{ fontSize: '.55em', opacity: 0.8 }}>,90</span>
                                </div>
                                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: income }}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 6, background: `rgba(0,0,0,.4)`, boxShadow: `inset 0 0 0 1px ${income}`, fontWeight: 600 }}>
                                        ▲ 4,8%
                                    </span>
                                    <span style={{ color: `rgba(${theme.textRgb},.65)`, fontWeight: 500 }}>vs. julho</span>
                                </div>
                            </div>
                            <svg viewBox="0 0 220 44" preserveAspectRatio="none" style={{ width: '100%', height: 38, marginTop: 16, overflow: 'visible', position: 'relative', zIndex: 1 }}>
                                <defs>
                                    <linearGradient id="sovinna-spark" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0" stopColor={theme.strongAccent} stopOpacity=".65" />
                                        <stop offset="1" stopColor={theme.strongAccent} stopOpacity="0" />
                                    </linearGradient>
                                </defs>
                                <path d="M0 34 L24 30 L48 33 L72 22 L96 26 L120 15 L144 19 L168 12 L192 16 L220 6 L220 44 L0 44Z" fill="url(#sovinna-spark)" />
                                <path d="M0 34 L24 30 L48 33 L72 22 L96 26 L120 15 L144 19 L168 12 L192 16 L220 6" fill="none" stroke={theme.strongAccent} strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" />
                                <circle cx="220" cy="6" r="3.8" fill={theme.strongAccent} />
                            </svg>
                        </div>

                        {/* Fluxo do Mês (Painel Unificado para Receitas & Despesas) */}
                        <div
                            className="card-hover"
                            style={{
                                flex: '2 1 440px',
                                padding: 20,
                                borderRadius: 18,
                                background: theme.surface,
                                boxShadow: `inset 0 0 0 1px rgba(${theme.textRgb},.08), 0 8px 24px -6px rgba(0,0,0,.2)`,
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-.01em', color: theme.text }}>
                                    Fluxo de Caixa
                                </div>
                                <div style={{ fontSize: 11.5, color: `rgba(${theme.textRgb},.5)` }}>
                                    Balanço estimado: <strong style={{ color: income, fontWeight: 600 }}>+R$ 3.537,60</strong>
                                </div>
                            </div>

                            {/* Dual Metrics Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 16, alignItems: 'center' }}>
                                {/* Receitas */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <span style={{ width: 26, height: 26, borderRadius: '50%', background: `rgba(${theme.accentRgb},.16)`, display: 'grid', placeItems: 'center', flex: 'none' }}>
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={income} strokeWidth={2.5}>
                                            <path d="M12 19V5M12 5l-6 6M12 5l6 6" />
                                        </svg>
                                    </span>
                                    <div>
                                        <div style={{ fontSize: 11.5, color: `rgba(${theme.textRgb},.55)` }}>Receitas</div>
                                        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 19, letterSpacing: '-.02em', color: income }}>
                                            R$ 9.850,00
                                        </div>
                                    </div>
                                </div>

                                {/* Central Divider */}
                                <div style={{ width: 1, alignSelf: 'stretch', background: `rgba(${theme.textRgb},.1)` }} />

                                {/* Despesas */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, textAlign: 'right' }}>
                                    <div>
                                        <div style={{ fontSize: 11.5, color: `rgba(${theme.textRgb},.55)` }}>Despesas</div>
                                        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 19, letterSpacing: '-.02em', color: expense }}>
                                            R$ 6.312,40
                                        </div>
                                    </div>
                                    <span style={{ width: 26, height: 26, borderRadius: '50%', background: `rgba(${expenseRgb},.16)`, display: 'grid', placeItems: 'center', flex: 'none' }}>
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={expense} strokeWidth={2.5}>
                                            <path d="M12 5v14M12 19l6-6M12 19l-6-6" />
                                        </svg>
                                    </span>
                                </div>
                            </div>

                            {/* Ratio Progress Indicator Bar */}
                            <div style={{ marginTop: 16 }}>
                                <div style={{ height: 6, borderRadius: 999, background: `rgba(${theme.textRgb},.08)`, overflow: 'hidden', display: 'flex' }}>
                                    <div style={{ height: '100%', width: '36%', borderRadius: '999px 0 0 999px', background: income, transition: 'width 1s ease' }} />
                                    <div style={{ height: '100%', width: '64%', borderRadius: '0 999px 999px 0', background: expense, opacity: 0.85 }} />
                                </div>
                            </div>
                        </div>

                        {/* Meta · Investimentos */}
                        <div
                            className="card-hover"
                            style={{
                                flex: '1.2 1 300px',
                                padding: 20,
                                borderRadius: 18,
                                background: theme.surface,
                                boxShadow: `inset 0 0 0 1px rgba(${theme.textRgb},.08), 0 8px 24px -6px rgba(0,0,0,.2)`,
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                            }}
                        >
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: `rgba(${theme.textRgb},.6)` }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 500 }}>
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={theme.strongAccent} strokeWidth={1.8}>
                                            <circle cx="12" cy="12" r="9" />
                                            <circle cx="12" cy="12" r="4" />
                                        </svg>
                                        Meta · Investimentos
                                    </div>
                                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: `rgba(${theme.textRgb},.06)`, color: `rgba(${theme.textRgb},.5)` }}>
                                        até dez/26
                                    </span>
                                </div>
                                <div style={{ marginTop: 12, display: 'flex', alignItems: 'baseline', gap: 8 }}>
                                    <span style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(22px,2.2vw,26px)', fontWeight: 500, letterSpacing: '-.02em' }}>R$ 21.000</span>
                                    <span style={{ fontSize: 12, color: `rgba(${theme.textRgb},.45)` }}>de R$ 30k</span>
                                </div>
                                <div style={{ marginTop: 6, fontSize: 12, color: `rgba(${theme.textRgb},.5)` }}>
                                    Faltam R$ 9.000 · R$ 1.800/mês
                                </div>
                            </div>
                            <div style={{ marginTop: 14, position: 'relative', height: 22, borderRadius: 8, background: `rgba(${theme.textRgb},.07)`, overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', inset: '0 30% 0 0', borderRadius: 8, background: `linear-gradient(90deg, ${theme.progressGradStart}, ${theme.progressGradEnd})`, transformOrigin: 'left', animation: 'riseBar 1s cubic-bezier(.2,.8,.2,1)' }} />
                                <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', paddingLeft: 12, fontSize: 11.5, fontWeight: 600, color: theme.progressText }}>
                                    70% concluído
                                </span>
                            </div>
                        </div>
                    </section>

                    {/* Bottom Row: Próximas Despesas (Checklist), Despesas Por Categoria (Graphic Spotlight), Histórico (Timeline Feed) */}
                    <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 'clamp(14px,1.6vw,20px)', alignItems: 'stretch' }}>
                        {/* Próximas despesas / Atividades (Visual Activity Feed Style) */}
                        <div
                            className="card-hover"
                            style={{
                                padding: 20,
                                borderRadius: 18,
                                background: theme.surface,
                                boxShadow: `inset 0 0 0 1px rgba(${theme.textRgb},.08), 0 8px 24px -6px rgba(0,0,0,.2)`,
                                display: 'flex',
                                flexDirection: 'column',
                            }}
                        >
                            <div style={{ ...cardHeader, marginBottom: 12 }}>
                                <div>
                                    <h2 style={{ fontSize: 15, fontWeight: 600 }}>Próximas despesas</h2>
                                    <span style={{ fontSize: 11.5, color: `rgba(${theme.textRgb},.45)` }}>Próximos 7 dias</span>
                                </div>
                                <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 999, background: `rgba(${theme.accentRgb},.12)`, color: theme.strongAccent, fontWeight: 500 }}>
                                    {PROXIMAS.length} gastos
                                </span>
                            </div>
                            <div className="scroll-thin" style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 220, overflowY: 'auto', paddingRight: 4 }}>
                                {PROXIMAS.map((d, index) => {
                                    const isReceita = d.tipo === 'receita';
                                    return (
                                        <div
                                            key={d.nome + index}
                                            className="row-hover"
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 12,
                                                padding: '8px 10px',
                                                borderRadius: 10,
                                            }}
                                        >
                                            {/* Data à esquerda da cobrança */}
                                            <span style={{ fontSize: 12, fontWeight: 500, color: `rgba(${theme.textRgb},.5)`, minWidth: 42, flexShrink: 0 }}>
                                                {d.venc}
                                            </span>

                                            {/* Seta indicadora (cima = receita/verde, baixo = cobrança/prateado) */}
                                            <div
                                                style={{
                                                    width: 28,
                                                    height: 28,
                                                    borderRadius: '50%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0,
                                                    background: isReceita ? 'rgba(34, 197, 94, 0.15)' : 'rgba(185, 190, 190, 0.15)',
                                                    color: isReceita ? '#8ED79B' : '#b9bfbf',
                                                }}
                                            >
                                                {isReceita ? (
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                        <line x1="12" y1="19" x2="12" y2="5" />
                                                        <polyline points="5 12 12 5 19 12" />
                                                    </svg>
                                                ) : (
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                        <line x1="12" y1="5" x2="12" y2="19" />
                                                        <polyline points="19 12 12 19 5 12" />
                                                    </svg>
                                                )}
                                            </div>

                                            {/* Cobrança / Nome & Categoria */}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <span style={{ display: 'block', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {d.nome}
                                                </span>
                                                {d.cat && (
                                                    <span style={{ display: 'block', fontSize: 11, color: `rgba(${theme.textRgb},.45)`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {d.cat}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Valor à direita (Verde para receita, Prateado para cobrança) */}
                                            <span
                                                style={{
                                                    fontSize: 13,
                                                    fontWeight: 600,
                                                    fontVariantNumeric: 'tabular-nums',
                                                    color: isReceita ? '#8ED79B' : '#b9bfbf',
                                                    flexShrink: 0,
                                                }}
                                            >
                                                {isReceita ? `+${d.valor}` : `-${d.valor}`}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                            <button className="btn btn-ghost" style={{ alignSelf: 'center', marginTop: 'auto', paddingTop: 10, fontSize: 12, fontWeight: 500 }}>
                                Ver todas ⌄
                            </button>
                        </div>

                        {/* Despesas por categoria (Graphic Spotlight) */}
                        <div
                            className="card-hover"
                            style={{
                                padding: 20,
                                borderRadius: 18,
                                background: theme.surface,
                                boxShadow: `inset 0 0 0 1px rgba(${theme.textRgb},.08), 0 8px 24px -6px rgba(0,0,0,.2)`,
                                display: 'flex',
                                flexDirection: 'column',
                            }}
                        >
                            <div style={{ ...cardHeader, marginBottom: 10 }}>
                                <h2 style={{ fontSize: 15, fontWeight: 600 }}>Despesas por categoria</h2>
                                <span style={muted}>agosto</span>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 18, marginTop: 6, marginBottom: 'auto' }}>
                                <div style={{ position: 'relative', flex: '0 0 auto', width: 125, height: 125 }}>
                                    <div style={{ position: 'absolute', inset: -10, borderRadius: '50%', background: `radial-gradient(circle, rgba(${theme.accentRgb},.15) 0%, transparent 70%)`, pointerEvents: 'none' }} />
                                    <svg viewBox="0 0 160 160" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)', position: 'relative', zIndex: 1 }}>
                                        <circle cx="80" cy="80" r="70" fill="none" stroke={`rgba(${theme.textRgb},.06)`} strokeWidth={16} />
                                        <circle cx="80" cy="80" r="70" fill="none" stroke={theme.chartLight} strokeWidth={16} strokeDasharray="151 289" strokeDashoffset="0" style={{ animation: 'drawRing 1s cubic-bezier(.2,.8,.2,1)' }} />
                                        <circle cx="80" cy="80" r="70" fill="none" stroke={theme.chartMid} strokeWidth={16} strokeDasharray="130 310" strokeDashoffset="-157" />
                                        <circle cx="80" cy="80" r="70" fill="none" stroke={theme.chartDeep} strokeWidth={16} strokeDasharray="145 295" strokeDashoffset="-293" />
                                    </svg>
                                    <div style={{ position: 'absolute', inset: 0, display: 'grid', placeContent: 'center', textAlign: 'center', zIndex: 2 }}>
                                        <div style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: `rgba(${theme.textRgb},.45)` }}>Total</div>
                                        <div style={{ fontFamily: 'var(--font-heading)', fontSize: 17, fontWeight: 600, letterSpacing: '-.02em' }}>R$ 6.312</div>
                                    </div>
                                </div>
                                <div style={{ flex: '1 1 120px', display: 'flex', flexDirection: 'column', gap: 9, minWidth: 120 }}>
                                    {[
                                        { cor: theme.chartLight, nome: 'Moradia', pct: '35%' },
                                        { cor: theme.chartMid, nome: 'Alimentação', pct: '30%' },
                                        { cor: theme.chartDeep, nome: 'Transporte', pct: '35%' },
                                    ].map((c) => (
                                        <div key={c.nome} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 6px', borderRadius: 6, background: `rgba(${theme.textRgb},.03)` }}>
                                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.cor, flex: 'none', boxShadow: `0 0 6px ${c.cor}` }} />
                                            <span style={{ flex: 1, fontSize: 12.5, fontWeight: 500 }}>{c.nome}</span>
                                            <span style={{ fontSize: 12.5, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: `rgba(${theme.textRgb},.8)` }}>{c.pct}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div style={{ paddingTop: 10, marginTop: 12, fontSize: 11.5, color: `rgba(${theme.textRgb},.5)`, borderTop: `1px dashed rgba(${theme.textRgb},.12)` }}>
                                💡 Moradia subiu <strong style={{ color: theme.text }}>R$ 240</strong> em relação a julho.
                            </div>
                        </div>

                        {/* Histórico de gastos (Timeline Feed Style) */}
                        <div
                            className="card-hover"
                            style={{
                                padding: 20,
                                borderRadius: 18,
                                background: theme.surface,
                                boxShadow: `inset 0 0 0 1px rgba(${theme.textRgb},.08), 0 8px 24px -6px rgba(0,0,0,.2)`,
                                display: 'flex',
                                flexDirection: 'column',
                            }}
                        >
                            <div style={{ ...cardHeader, marginBottom: 12 }}>
                                <h2 style={{ fontSize: 15, fontWeight: 600 }}>Histórico de movimentações</h2>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {HISTORICO.map((h, index) => {
                                    const isReceita = h.tipo === 'receita';
                                    return (
                                        <div key={h.nome + index} className="row-hover" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', borderRadius: 10 }}>
                                            {/* Data à esquerda */}
                                            <span style={{ fontSize: 12, fontWeight: 500, color: `rgba(${theme.textRgb},.5)`, minWidth: 42, flexShrink: 0 }}>
                                                {h.data}
                                            </span>

                                            {/* Seta (verde pra cima se receita, prateado pra baixo se cobrança) */}
                                            <div
                                                style={{
                                                    width: 28,
                                                    height: 28,
                                                    borderRadius: '50%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0,
                                                    background: isReceita ? 'rgba(34, 197, 94, 0.15)' : 'rgba(185, 190, 190, 0.15)',
                                                    color: isReceita ? '#8ED79B' : '#b9bfbf',
                                                }}
                                            >
                                                {isReceita ? (
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                        <line x1="12" y1="19" x2="12" y2="5" />
                                                        <polyline points="5 12 12 5 19 12" />
                                                    </svg>
                                                ) : (
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                        <line x1="12" y1="5" x2="12" y2="19" />
                                                        <polyline points="19 12 12 19 5 12" />
                                                    </svg>
                                                )}
                                            </div>

                                            {/* Nome e Categoria */}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <span style={{ display: 'block', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.nome}</span>
                                                <span style={{ display: 'block', fontSize: 11, color: `rgba(${theme.textRgb},.45)` }}>{h.cat}</span>
                                            </div>

                                            {/* Valor à direita */}
                                            <span style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: isReceita ? '#8ED79B' : '#b9bfbf', flexShrink: 0 }}>
                                                {isReceita ? `+${h.valor}` : `-${h.valor}`}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </>
    );
}
