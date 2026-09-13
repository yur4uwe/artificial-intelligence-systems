import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
    plugins: [tailwindcss()],
    resolve: {
        alias: {
            '@': resolve(import.meta.dirname, './src'),
            '@common': resolve(import.meta.dirname, './src/common'),
            '@wrkspc': resolve(import.meta.dirname, './src/workspaces'),
            '@algs': resolve(import.meta.dirname, './src/algorithms'),
        },
    },
    server: {
        port: 3000,
        open: false,
    },
})
