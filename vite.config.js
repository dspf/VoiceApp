import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/voicetranslate-website/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})