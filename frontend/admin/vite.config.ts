import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')
  const apiProxy = env.VITE_API_PROXY || 'http://127.0.0.1:7001'

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@shared': path.resolve(__dirname, '../shared'),
      },
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
      proxy: { '/api': apiProxy },
    },
  }
})
