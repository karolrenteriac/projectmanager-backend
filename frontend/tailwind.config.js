/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0f172a',
        foreground: '#f8fafc',
        card: '#1e293b',
        'card-foreground': '#f8fafc',
        primary: '#3b82f6',
        'primary-foreground': '#ffffff',
        secondary: '#334155',
        'secondary-foreground': '#f8fafc',
        muted: '#334155',
        'muted-foreground': '#94a3b8',
        accent: '#3b82f6',
        'accent-foreground': '#ffffff',
        destructive: '#ef4444',
        'destructive-foreground': '#ffffff',
        border: '#334155',
        input: '#334155',
        ring: '#3b82f6',
        success: '#22c55e',
        warning: '#f59e0b',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'lg': '0.75rem',
        'md': '0.5rem',
        'sm': '0.25rem',
      },
    },
  },
  plugins: [],
}
