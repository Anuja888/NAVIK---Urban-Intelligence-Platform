import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  build: {
    // Suppress the 500 kB chunk warning — bundle is large due to Recharts + Leaflet + Framer
    chunkSizeWarningLimit: 1600,
  },
})
