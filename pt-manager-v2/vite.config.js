import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  // Questa riga è fondamentale per dire all'app dove si trova
  // MODIFICA: Usiamo il percorso relativo './' (punto-slash) per risolvere i problemi di asset loading su GitHub Pages.
  base: './', 
  plugins: [react()],
})
