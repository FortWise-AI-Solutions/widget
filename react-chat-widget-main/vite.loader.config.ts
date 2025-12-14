import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    outDir: 'dist',
    lib: {
      entry: resolve(__dirname, 'src/loader.ts'),
      name: 'ChatWidgetLoader',
      fileName: 'loader',
      formats: ['iife']
    },
    rollupOptions: {
      output: {
        assetFileNames: 'loader.[ext]',
      }
    },
    minify: 'terser',
    emptyOutDir: false
  }
})
