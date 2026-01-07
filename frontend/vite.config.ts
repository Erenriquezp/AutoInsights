import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      usePolling: true, // Importante para Docker en Windows
    },
    host: true, // Necesario para exponer el contenedor
    strictPort: true,
    port: 5173,
  }
})