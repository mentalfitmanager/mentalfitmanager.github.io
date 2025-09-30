/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'background': '#09090b',
        'foreground': '#fafafa',
        'card': '#18181b',
        'primary': '#2563eb',
        'muted': '#71717a',
      },
      // --- MODIFICA: Aggiunta la nuova animazione ---
      keyframes: {
        aurora: {
          from: { backgroundPosition: '50% 50%, 50% 50%' },
          to: { backgroundPosition: '350% 50%, 350% 50%' },
        },
      },
      animation: {
        aurora: 'aurora 15s linear infinite',
      },
    },
  },
  plugins: [],
}

