import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import fs from 'fs'

// Custom plugin to inject CSS into the widget
const injectCSSPlugin = () => {
  return {
    name: 'inject-css',
    generateBundle(_: any, bundle: Record<string, any>) {
      // Find the main JS chunk
      const jsChunk = Object.values(bundle).find(
        (chunk: any) => chunk.type === 'chunk' && chunk.isEntry
      );
      
      // Find the CSS file
      const cssChunk = Object.values(bundle).find(
        (chunk: any) => chunk.type === 'asset' && chunk.fileName.endsWith('.css')
      );
      
      if (jsChunk && cssChunk && 'code' in jsChunk && 'source' in cssChunk) {
        // Escape CSS for JS string
        const cssContent = cssChunk.source.toString().replace(/`/g, '\\`').replace(/\$/g, '\\$');
        
        // Replace the getWidgetStyles function with the actual CSS content
        jsChunk.code = jsChunk.code.replace(
          /const getWidgetStyles = \(\): string => \{[\s\S]*?return widgetStyles;[\s\S]*?\};/,
          `const getWidgetStyles = (): string => {
            return \`${cssContent}\`;
          };`
        );
      }
    }
  };
};

export default defineConfig(({ mode }) => {
  const shouldDropConsole = mode === 'production' && process.env.DROP_WIDGET_CONSOLE === 'true';

  return {
    plugins: [
      react(),
      injectCSSPlugin()
    ],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src')
      }
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify('production')
    },
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      lib: {
        entry: resolve(__dirname, 'src/widget.tsx'),
        name: 'ChatWidget',
        fileName: 'chat-widget',
        formats: ['iife']
      },
      rollupOptions: {
        external: [],
        output: {
          globals: {},
          assetFileNames: 'chat-widget.[ext]',
        }
      },
      cssCodeSplit: false,
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: shouldDropConsole,
          drop_debugger: shouldDropConsole
        }
      }
    }
  }
})