import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{ts,tsx}', './popup.html'],
  theme: { extend: { width: { '88': '22rem' } } },
  plugins: []
} satisfies Config
