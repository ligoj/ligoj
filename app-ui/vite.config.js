import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [vue()],
    root: 'src/main/webapp',
    base: '/',
    build: {
        outDir: './src/main/resources/static/',
        emptyOutDir: true,
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src/main/webapp/src'),
        },
    },
    server: {
        proxy: {
            '/api': {
                target: 'http://localhost:8081',
                changeOrigin: true,
            },
            '/rest': {
                target: 'http://localhost:8081',
                changeOrigin: true,
            }
        }
    }
})
