/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./docs/**/*.{html,js}', './src/js/**/*.js'],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: '#F7F3EC',
          2: '#EFE8DC',
          soft: '#FCFAF6',
        },
        ink: {
          DEFAULT: '#2F2A26',
          soft: '#4A443E',
          muted: '#7A7268',
        },
        rule: {
          DEFAULT: '#D8D0C4',
          dark: '#3A342F',
        },
        teal: {
          DEFAULT: '#0B8A8F',
          deep: '#087075',
          soft: '#D7EEEE',
          on: '#FAF7F1',
        },
                amber: {
          50: '#F7F0E4',
          100: '#F0E4D0',
          400: '#B89255',
          500: '#9A7340',
          600: '#7C5A32',
        },
      },
      fontFamily: {
        sans: [
          '"DM Sans"',
          '"Helvetica Neue"',
          'Helvetica',
          'Arial',
          'system-ui',
          'sans-serif',
        ],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        paper: '0 12px 36px rgba(28, 25, 22, 0.07)',
        'paper-sm': '0 3px 12px rgba(28, 25, 22, 0.05)',
        teal: '0 6px 16px rgba(11, 138, 143, 0.2)',
      },
      borderRadius: {
        paper: '0.75rem',
      },
    },
  },
  plugins: [],
};
