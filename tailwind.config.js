/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./docs/**/*.{html,js}', './src/js/**/*.js'],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: '#F5F0E8',
          2: '#EAE3D8',
          soft: '#FAF7F1',
        },
        ink: {
          DEFAULT: '#1C1916',
          soft: '#3F3A35',
          muted: '#6A635B',
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
        espresso: '#241E1B',
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
