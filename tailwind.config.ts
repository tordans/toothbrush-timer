import type { Config } from 'tailwindcss'

// Tailwind 3 on purpose: Tailwind 4 needs Chrome 111+, the family's old Android phone has less.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Nunito Variable"', 'ui-rounded', 'system-ui', 'sans-serif'],
      },
      colors: {
        moss: {
          50: '#f3f7ec',
          100: '#e3edd2',
          200: '#c7dba7',
          300: '#a5c477',
          400: '#86ab52',
          500: '#6a8f3b',
          600: '#52722c',
          700: '#405825',
          800: '#354722',
          900: '#2d3c1f',
          950: '#16200d',
        },
        bark: {
          100: '#f3ebe0',
          200: '#e6d5bf',
          300: '#d2b593',
          400: '#bd9168',
          500: '#a8764d',
          600: '#8c5f3f',
          700: '#704a35',
          800: '#5c3e2f',
          900: '#4e352a',
        },
        cream: '#fbf6ea',
        sun: '#f6c94c',
        dusk: '#3b3f74',
        night: '#1f2347',
      },
      keyframes: {
        bob: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        brush: {
          '0%, 100%': { transform: 'rotate(-8deg)' },
          '50%': { transform: 'rotate(8deg)' },
        },
        glow: {
          '0%, 100%': { opacity: '0.55' },
          '50%': { opacity: '1' },
        },
        hop: {
          '0%, 100%': { transform: 'translateY(0)' },
          '40%': { transform: 'translateY(-24px)' },
          '60%': { transform: 'translateY(-24px)' },
        },
        fadein: {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        bob: 'bob 3s ease-in-out infinite',
        brush: 'brush 0.5s ease-in-out infinite',
        glow: 'glow 3s ease-in-out infinite',
        hop: 'hop 0.9s ease-in-out 2',
        fadein: 'fadein 0.4s ease-out both',
      },
    },
  },
  plugins: [],
} satisfies Config
