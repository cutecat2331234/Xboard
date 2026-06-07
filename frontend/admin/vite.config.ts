import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  base: '/assets/admin/',
  build: {
    outDir: path.resolve(__dirname, '../../public/assets/admin'),
    emptyOutDir: true,
    manifest: true,
    rollupOptions: { input: path.resolve(__dirname, 'index.html') },
  },
  server: {
    port: 5174,
    proxy: { '/api': 'http://127.0.0.1:7001' },
  },
})
