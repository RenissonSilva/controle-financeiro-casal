import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

// Cor com suporte a modificador de opacidade (ex: bg-accent/20), lendo o
// triplet R G B da CSS var equivalente — ver resources/css/app.css.
const themeColor = (cssVar) => `rgb(var(${cssVar}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.jsx',
        // lib/*.js também guarda classes (ex: cores de "quem paga" em lib/ownership.js).
        './resources/js/**/*.js',
    ],

    theme: {
        extend: {
            fontFamily: {
                sans: ['Geist', ...defaultTheme.fontFamily.sans],
                heading: ['Geist', ...defaultTheme.fontFamily.sans],
                mono: ['"Geist Mono"', ...defaultTheme.fontFamily.mono],
            },
            // Ponto em que a sidebar vira barra no topo (tema Noite: 860px).
            screens: {
                desk: '861px',
            },
            // A escala padrão de opacidade do Tailwind só cobre alguns valores
            // (5,10,20,25,30,40,50,60,70,75,80,90,95,100) — sem isso, um
            // modificador "solto" como bg-accent/16 não gera classe nenhuma
            // (falha silenciosa, sem erro de build).
            opacity: {
                6: '.06',
                7: '.07',
                8: '.08',
                12: '.12',
                14: '.14',
                16: '.16',
                18: '.18',
                35: '.35',
                45: '.45',
                55: '.55',
                65: '.65',
                85: '.85',
            },
            colors: {
                // Superfícies e linhas
                bg: themeColor('--color-bg-rgb'),
                surface: themeColor('--color-surface-rgb'),
                raised: themeColor('--color-raised-rgb'),
                inset: themeColor('--color-inset-rgb'),
                line: themeColor('--color-line-rgb'),
                'line-soft': themeColor('--color-line-soft-rgb'),
                'line-row': themeColor('--color-line-row-rgb'),
                'line-strong': themeColor('--color-line-strong-rgb'),
                track: themeColor('--color-track-rgb'),

                // Texto
                text: themeColor('--color-text-rgb'),
                secondary: themeColor('--color-text-2-rgb'),
                muted: themeColor('--color-muted-rgb'),

                // Destaque e semântica
                accent: themeColor('--color-accent-rgb'),
                'on-accent': themeColor('--color-on-accent-rgb'),
                'on-accent-2': themeColor('--color-on-accent-2-rgb'),
                warning: themeColor('--color-warning-rgb'),
                green: themeColor('--color-income-rgb'),
                red: themeColor('--color-expense-rgb'),

                // Pessoas (payer1 / payer2)
                person1: themeColor('--color-person1-rgb'),
                person2: themeColor('--color-person2-rgb'),

                // Nomes antigos do tema Maré, mantidos como apelidos da paleta Noite.
                teal: themeColor('--color-accent-rgb'),
                'strong-accent': themeColor('--color-accent-rgb'),
                lime: themeColor('--color-warning-rgb'),
                blue: themeColor('--color-person1-rgb'),
            },
        },
    },

    plugins: [forms],
};
