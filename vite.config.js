import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import pkg from './package.json' with { type: 'json' }

export default defineConfig({
  plugins: [vue()],
  // 「关于」里的版本号跟着 package.json 走，不再手写
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
  },
  base: './',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 8192,
    chunkSizeWarningLimit: 900
  },
  server: {
    host: true,
    port: 5180
  }
})
