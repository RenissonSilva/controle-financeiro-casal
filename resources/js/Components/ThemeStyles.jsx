export default function ThemeStyles({ theme }) {
    return (
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
    );
}
