/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      colors: {
        tier: {
          accent: 'var(--tier-accent)',
          accent2: 'var(--tier-accent-2)',
          text: 'var(--tier-text)',
          muted: 'var(--tier-muted)',
          surface: 'var(--tier-surface)',
          line: 'var(--tier-line)',
        },
      },
      boxShadow: {
        relic: 'var(--tier-glow)',
        panel: '0 18px 60px -20px rgba(0,0,0,0.85)',
      },
      animation: {
        'pulse-glow': 'pulseGlow 2.6s ease-in-out infinite',
        'spin-slow': 'spin 26s linear infinite',
        'spin-slower': 'spin 54s linear infinite',
        'spin-reverse': 'spin 40s linear infinite reverse',
        float: 'float 7s ease-in-out infinite',
        shimmer: 'shimmer 6s linear infinite',
        'pop-in': 'popIn 260ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        'fade-in': 'fadeIn 240ms ease-out',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '0.75', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.04)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        },
        popIn: {
          '0%': { opacity: '0', transform: 'scale(0.94)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
