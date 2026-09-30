// Card do tema Noite: superfície + borda de 1px, sem sombra (profundidade só por
// superfície e borda). `hover` e `bg` ficam por compatibilidade: bg=false deixa o
// caller definir o fundo via className (ex: card de destaque em limão).
// eslint-disable-next-line no-unused-vars
export default function Card({ hover = false, bg = true, className = '', children, ...props }) {
    const classes = [
        'min-w-0 rounded-2xl p-6',
        bg && 'border border-line bg-surface',
        className,
    ].filter(Boolean).join(' ');

    return (
        <div className={classes} {...props}>
            {children}
        </div>
    );
}
