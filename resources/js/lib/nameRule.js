// Espelho de App\Models\NameRule no front, para a prévia do filtro de nome personalizado.
// "%" = qualquer texto, "_" = um caractere, "\%" = o próprio "%"; sem diferenciar maiúsculas/acentos.

const normalize = (text) =>
    String(text ?? '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();

const escape = (char) => char.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

export function patternRegex(pattern) {
    const text = normalize(pattern);
    let regex = '';

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '\\' && i + 1 < text.length) regex += escape(text[++i]);
        else if (char === '%') regex += '.*';
        else if (char === '_') regex += '.';
        else regex += escape(char);
    }

    return new RegExp(`^${regex}$`, 's');
}

// Bate com a descrição inteira ou só com o nome que aparece na tela (row.bank_name).
export function patternMatches(pattern, row) {
    const regex = patternRegex(pattern);
    return regex.test(normalize(row.description)) || regex.test(normalize(row.bank_name));
}
