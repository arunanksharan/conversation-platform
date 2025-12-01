import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/loader-r2wc.ts'),
      name: 'KuzushiWidgetLoader',
      formats: ['iife'],
      fileName: () => 'widget-loader.js',
    },
    rollupOptions: {
      external: ['react', 'react-dom', '@kuzushi/widget'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
    sourcemap: true,
    minify: 'terser',
  },
});
