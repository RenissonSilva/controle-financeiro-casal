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

const card = {
    padding: 20,
    borderRadius: 14,
    background: 'var(--color-surface)',
    boxShadow: 'inset 0 0 0 1px rgba(233,233,237,.08)',
};

const cardHeader = {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
};

const muted = { fontSize: 11.5, color: 'rgba(233,233,237,.45)' };

export default function Orbita() {
    return (
        <>
            <Head title="Órbita">
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link href="https://fonts.bunny.net/css?family=inter:400,500,600,700&display=swap" rel="stylesheet" />
            </Head>

            <style>{`
                :root {
                    --color-bg: #161826;
                    --color-surface: #232532;
                    --color-text: #e9e9ed;
                    --color-accent: #9184d9;
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
                .orb .btn-secondary { border-color: rgba(233,233,237,.16); }
                .orb .btn-secondary:hover { background: rgba(233,233,237,.07); }
                .orb .btn-ghost { color: var(--color-accent); }
                .orb .btn-ghost:hover { background: rgba(145,132,217,.1); }
                .orb .nav-link { transition: background .12s, color .12s; }
                .orb .nav-link:hover { color: #e9e9ed; background: rgba(233,233,237,.06); }
                .orb .row-hover:hover { background: rgba(233,233,237,.045); }
                .orb a { color: var(--color-accent); text-decoration: none; }
            `}</style>

            <div
                className="orb"
                style={{
                    minHeight: '100vh',
                    background:
                        'radial-gradient(1100px 520px at 78% -8%, #222440 0%, transparent 60%), var(--color-bg)',
                    fontFamily: 'var(--font-body)',
                    padding: '20px clamp(280px,3vw,40px) 48px',
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
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9184d9" strokeWidth={1.6}>
                            <circle cx="12" cy="12" r="9" />
                            <path d="M12 6.5v11M9.2 9.4h4.3a1.9 1.9 0 0 1 0 3.8h-3.4a1.9 1.9 0 0 0 0 3.8h4.7" />
                        </svg>
                        <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 17, letterSpacing: '-.01em' }}>
                            Órbita
                        </span>
                    </div>

                    <nav
                        style={{
                            display: 'flex',
                            gap: 2,
                            padding: 4,
                            borderRadius: 999,
                            background: 'rgba(233,233,237,.05)',
                            boxShadow: 'inset 0 0 0 1px rgba(233,233,237,.09)',
                        }}
                    >
                        <Link
                            href={route('dashboard')}
                            className="nav-link"
                            style={{
                                padding: '7px 18px',
                                borderRadius: 999,
                                fontSize: 13.5,
                                color: '#e9e9ed',
                                background: 'rgba(145,132,217,.18)',
                                boxShadow: 'inset 0 0 0 1px rgba(145,132,217,.55)',
                            }}
                        >
                            Dashboard
                        </Link>
                        <a href="#" className="nav-link" style={{ padding: '7px 18px', borderRadius: 999, fontSize: 13.5, color: 'rgba(233,233,237,.6)' }}>
                            Metas
                        </a>
                        <Link
                            href={route('settings.show')}
                            className="nav-link"
                            style={{ padding: '7px 18px', borderRadius: 999, fontSize: 13.5, color: 'rgba(233,233,237,.6)' }}
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
                                color: '#d2cefd',
                                background: '#423a6a',
                                boxShadow: '0 0 0 1px rgba(145,132,217,.45)',
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
                                <div style={{ fontSize: 12, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(233,233,237,.45)', marginBottom: 10 }}>
                                    Agosto de 2026
                                </div>
                                <h1 style={{ margin: '0 0 12px', fontSize: 'clamp(34px,5vw,54px)', fontWeight: 500, letterSpacing: '-.03em', lineHeight: 1.02 }}>
                                    Bem-vindo, <span style={{ color: '#b5abfc' }}>{NOME}</span>
                                </h1>
                                <div
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        padding: '5px 14px 5px 10px',
                                        borderRadius: 999,
                                        background: 'rgba(145,132,217,.13)',
                                        boxShadow: 'inset 0 0 0 1px rgba(145,132,217,.4)',
                                    }}
                                >
                                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#b5abfc', boxShadow: '0 0 10px 2px rgba(181,171,252,.7)' }} />
                                    <span style={{ fontSize: 13, color: '#d2cefd' }}>Suas finanças estão saudáveis</span>
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
                                                style={{ appearance: 'none', width: 17, height: 17, flex: 'none', borderRadius: 5, background: 'transparent', boxShadow: 'inset 0 0 0 1.5px rgba(233,233,237,.28)', cursor: 'pointer' }}
                                            />
                                            <span style={{ flex: 1, minWidth: 0 }}>
                                                <span style={{ display: 'block', fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.nome}</span>
                                                <span style={{ display: 'block', fontSize: 11.5, color: 'rgba(233,233,237,.45)' }}>vence {d.venc}</span>
                                            </span>
                                            <span style={{ fontSize: 13.5, fontVariantNumeric: 'tabular-nums', color: '#cfd3e5' }}>{d.valor}</span>
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
                                            <circle cx="80" cy="80" r="70" fill="none" stroke="rgba(233,233,237,.06)" strokeWidth={16} />
                                            <circle cx="80" cy="80" r="70" fill="none" stroke="#b5abfc" strokeWidth={16} strokeDasharray="151 289" strokeDashoffset="0" style={{ animation: 'drawRing 1s cubic-bezier(.2,.8,.2,1)' }} />
                                            <circle cx="80" cy="80" r="70" fill="none" stroke="#796cbf" strokeWidth={16} strokeDasharray="130 310" strokeDashoffset="-157" />
                                            <circle cx="80" cy="80" r="70" fill="none" stroke="#5c5783" strokeWidth={16} strokeDasharray="145 295" strokeDashoffset="-293" />
                                        </svg>
                                        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeContent: 'center', textAlign: 'center' }}>
                                            <div style={{ fontSize: 10.5, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(233,233,237,.45)' }}>Total</div>
                                            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 21, letterSpacing: '-.02em' }}>R$ 6.312</div>
                                        </div>
                                    </div>
                                    <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: 12, minWidth: 150 }}>
                                        {[
                                            { cor: '#b5abfc', nome: 'Moradia', pct: '35%' },
                                            { cor: '#796cbf', nome: 'Alimentação', pct: '30%' },
                                            { cor: '#5c5783', nome: 'Transporte', pct: '35%' },
                                        ].map((c) => (
                                            <div key={c.nome} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <span style={{ width: 9, height: 9, borderRadius: 3, background: c.cor, flex: 'none' }} />
                                                <span style={{ flex: 1, fontSize: 13.5 }}>{c.nome}</span>
                                                <span style={{ fontSize: 13.5, fontVariantNumeric: 'tabular-nums', color: 'rgba(233,233,237,.7)' }}>{c.pct}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div style={{ paddingTop: 12, fontSize: 12, color: 'rgba(233,233,237,.45)', background: 'linear-gradient(to right,rgba(233,233,237,.12),transparent) no-repeat top/100% 1px' }}>
                                    Moradia subiu R$ 240 em relação a julho.
                                </div>
                            </div>
                        </section>
                    </main>

                    {/* Sidebar */}
                    <aside style={{ flex: '1 1 300px', maxWidth: '100%', display: 'flex', flexDirection: 'column', gap: 'clamp(12px,1.4vw,18px)' }}>
                        <div style={{ padding: 20, borderRadius: 14, background: 'linear-gradient(160deg,#262a60 0%,#232532 70%)', boxShadow: 'inset 0 0 0 1px rgba(145,132,217,.25)' }}>
                            <div style={cardHeader}>
                                <h2 style={{ fontSize: 16 }}>Saúde financeira</h2>
                                <span style={{ fontSize: 11.5, color: 'rgba(233,233,237,.5)' }}>30 dias</span>
                            </div>
                            <div style={{ position: 'relative', margin: '6px auto 0', width: 'min(260px,100%)' }}>
                                <svg viewBox="0 0 220 124" style={{ width: '100%', display: 'block', overflow: 'visible' }}>
                                    <defs>
                                        <linearGradient id="gauge" x1="0" y1="0" x2="1" y2="0">
                                            <stop offset="0" stopColor="#5d5294" />
                                            <stop offset="1" stopColor="#b5abfc" />
                                        </linearGradient>
                                        <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
                                            <feGaussianBlur stdDeviation="6" result="b" />
                                            <feMerge>
                                                <feMergeNode in="b" />
                                                <feMergeNode in="SourceGraphic" />
                                            </feMerge>
                                        </filter>
                                    </defs>
                                    <path d="M20 110 A 90 90 0 0 1 200 110" fill="none" stroke="rgba(233,233,237,.09)" strokeWidth={17} strokeLinecap="round" />
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
                                        <span style={{ fontSize: '.45em', color: 'rgba(233,233,237,.55)' }}>%</span>
                                    </div>
                                    <div style={{ fontSize: 12, color: '#d2cefd', marginTop: 2 }}>Bom</div>
                                </div>
                            </div>
                            <div style={{ marginTop: 14, fontSize: 12.5, lineHeight: 1.5, color: 'rgba(233,233,237,.6)' }}>
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
                                <span style={{ fontSize: 12.5, color: 'rgba(233,233,237,.45)' }}>de R$ 30.000</span>
                            </div>
                            <div style={{ position: 'relative', height: 26, borderRadius: 8, background: 'rgba(233,233,237,.07)', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', inset: '0 30% 0 0', borderRadius: 8, background: 'linear-gradient(90deg,#5d5294,#9184d9)', transformOrigin: 'left', animation: 'riseBar 1s cubic-bezier(.2,.8,.2,1)' }} />
                                <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', paddingLeft: 12, fontSize: 12.5, fontWeight: 600, color: '#f3f5fe' }}>70%</span>
                            </div>
                            <div style={{ marginTop: 10, fontSize: 12, color: 'rgba(233,233,237,.5)' }}>
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
                                                background: 'rgba(145,132,217,.14)',
                                                boxShadow: 'inset 0 0 0 1px rgba(145,132,217,.28)',
                                                color: '#d2cefd',
                                            }}
                                        >
                                            {h.ini}
                                        </span>
                                        <span style={{ flex: 1, minWidth: 0 }}>
                                            <span style={{ display: 'block', fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.nome}</span>
                                            <span style={{ display: 'block', fontSize: 11.5, color: 'rgba(233,233,237,.45)' }}>{h.cat} · {h.data}</span>
                                        </span>
                                        <span style={{ fontSize: 13.5, fontVariantNumeric: 'tabular-nums', color: '#cfd3e5' }}>{h.valor}</span>
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
