import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')
  const apiProxy = env.VITE_API_PROXY || 'http://127.0.0.1:7001'

  return {
    plugins: [vue()],
    resolve: {
      alias: { '@': path.resolve(__dirname, 'src') },
    },
    base: '/theme/Xboard/assets/',
    build: {
      outDir: path.resolve(__dirname, '../../theme/Xboard/assets'),
      emptyOutDir: true,
      cssCodeSplit: false,
      rollupOptions: {
        input: path.resolve(__dirname, 'src/main.ts'),
        output: {
          entryFileNames: 'umi.js',
          codeSplitting: false,
          assetFileNames: (info) =>
            info.name?.endsWith('.css') ? 'umi.css' : 'assets/[name]-[hash][extname]',
        },
      },
    },
    server: {
      port: 5173,
      proxy: { '/api': apiProxy },
    },
  }
})
