import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

// Cor com suporte a modificador de opacidade (ex: bg-accent/20), lendo o
// triplet R,G,B da CSS var equivalente — ver resources/css/app.css.
const themeColor = (cssVar) => `rgb(var(${cssVar}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.jsx',
    ],

    theme: {
        extend: {
            fontFamily: {
                sans: ['Poppins', ...defaultTheme.fontFamily.sans],
                heading: ['var(--font-heading)', ...defaultTheme.fontFamily.sans],
            },
            // A escala padrão de opacidade do Tailwind só cobre alguns valores
            // (5,10,20,25,30,40,50,60,70,75,80,90,95,100) — sem isso, um
            // modificador "solto" como bg-accent/16 não gera classe nenhuma
            // (falha silenciosa, sem erro de build). Completar com os valores
            // exatos usados no design (rgba(...,.06) a .85 no arquivo original).
            opacity: {
                6: '.06',
                7: '.07',
                8: '.08',
                12: '.12',
                16: '.16',
                18: '.18',
                45: '.45',
                55: '.55',
                65: '.65',
                85: '.85',
            },
            colors: {
                bg: 'var(--color-bg)',
                surface: 'var(--color-surface)',
                text: themeColor('--color-text-rgb'),
                teal: themeColor('--color-accent-rgb'),
                blue: themeColor('--color-avatar-bg-rgb'),
                lime: themeColor('--color-soft-text-rgb'),
                'strong-accent': themeColor('--color-strong-accent-rgb'),
                'chart-light': themeColor('--color-chart-light-rgb'),
                'chart-mid': themeColor('--color-chart-mid-rgb'),
                'chart-deep': themeColor('--color-chart-deep-rgb'),
                'gauge-start': themeColor('--color-gauge-start-rgb'),
                'health-card-grad-start': themeColor('--color-health-card-grad-start-rgb'),
                'hero-card-grad-start': themeColor('--color-hero-card-grad-start-rgb'),
                'progress-grad-start': themeColor('--color-progress-grad-start-rgb'),
                'progress-grad-end': themeColor('--color-progress-grad-end-rgb'),
                'ambient-glow': themeColor('--color-ambient-glow-rgb'),
                green: themeColor('--color-income-rgb'),
                red: themeColor('--color-expense-rgb'),
            },
        },
    },

    plugins: [forms],
};
