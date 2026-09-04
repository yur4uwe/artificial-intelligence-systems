import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, './src'),
      '@common': resolve(import.meta.dirname, './src/common'),
      '@labs': resolve(import.meta.dirname, './src/labs'),
    },
  },
  server: {
    port: 3000,
    open: false,
  },
});
