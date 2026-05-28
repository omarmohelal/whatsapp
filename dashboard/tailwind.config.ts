import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        nexus: {
          bg: '#090b10',
          panel: '#111621',
          line: '#263041',
          accent: '#22c55e'
        }
      }
    }
  },
  plugins: []
};

export default config;
