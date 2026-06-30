/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/app/**/*.{js,jsx,ts,tsx}',
    './src/components/**/*.{js,jsx,ts,tsx}',
    './src/features/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // Saathi design tokens — FRONTEND_DESIGN.md §2.
      // Values are CSS variables (set in global.css for :root / .dark) so
      // `bg-canvas`, `text-ink` etc. resolve correctly in both themes without
      // sprinkling `dark:` on every usage.
      colors: {
        canvas: 'rgb(var(--color-canvas) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        'surface-sunken': 'rgb(var(--color-surface-sunken) / <alpha-value>)',
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        'ink-muted': 'rgb(var(--color-ink-muted) / <alpha-value>)',
        primary: {
          DEFAULT: 'rgb(var(--color-primary) / <alpha-value>)',
          press: 'rgb(var(--color-primary-press) / <alpha-value>)',
        },
        energy: 'rgb(var(--color-energy) / <alpha-value>)',
        cool: 'rgb(var(--color-cool) / <alpha-value>)',
        indigo: 'rgb(var(--color-indigo) / <alpha-value>)',
        warn: 'rgb(var(--color-warn) / <alpha-value>)',
        danger: 'rgb(var(--color-danger) / <alpha-value>)',
        hairline: 'rgb(var(--color-hairline) / <alpha-value>)',
      },
      borderRadius: {
        md: '12px',
        card: '20px',
        sheet: '24px',
      },
      fontFamily: {
        display: ['Sora_600SemiBold'],
        'display-bold': ['Sora_700Bold'],
        'display-medium': ['Sora_500Medium'],
        body: ['PlusJakartaSans_400Regular'],
        'body-medium': ['PlusJakartaSans_500Medium'],
        'body-semibold': ['PlusJakartaSans_600SemiBold'],
        'body-bold': ['PlusJakartaSans_700Bold'],
      },
      spacing: {
        4.5: '18px',
      },
    },
  },
  plugins: [],
};
