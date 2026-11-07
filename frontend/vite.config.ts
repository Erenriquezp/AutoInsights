import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      usePolling: true, // file events do not cross Docker bind mounts on Windows
    },
    host: true, // listen on all interfaces so the container port is reachable
    strictPort: true,
    port: 5173,
  },
})
