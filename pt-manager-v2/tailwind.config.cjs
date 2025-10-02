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
    },
  },
  plugins: [],
}

