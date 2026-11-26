import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Content scripts must be a single classic script (no ES module imports),
 * so this is built separately as an IIFE into dist/content.js.
 */
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    cssCodeSplit: false,
    lib: {
      entry: 'src/content/index.tsx',
      formats: ['iife'],
      name: 'BlogIt',
      fileName: () => 'content.js',
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
})
