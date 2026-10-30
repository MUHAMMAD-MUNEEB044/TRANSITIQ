/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0A0E1A',
        surface: {
          DEFAULT: '#111827',
          alt: '#1A2236',
        },
        accent: {
          blue: '#38BDF8',
          purple: '#818CF8',
          cyan: '#22D3EE',
        },
        status: {
          green: '#34D399',
          yellow: '#FBBF24',
          red: '#F87171',
        },
        text: {
          primary: '#E2E8F0',
          muted: '#8899AA',
        },
        border: {
          subtle: 'rgba(99, 179, 237, 0.12)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        syne: ['Syne', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-fast': 'pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        slideUp: {
          '0%': { transform: 'translateY(12px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
      },
    },
  },
  plugins: [],
};
