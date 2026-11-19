import { resolve } from 'node:path';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite-plus';

const root = import.meta.dirname;

/**
 * Drei Bauarten:
 *  - ohne Angabe: das Widget als eine Datei für `<script src="…/widget/v1/echto.js">` (public/widget/v1)
 *  - `--mode package`: das npm-Paket mit Web Component und Vue-Baustein (packages/widget/dist)
 *  - `--mode demo`: das Vue-Beispiel der lokalen Beispiel-Kundin (demo/kundin/public/beispiele)
 */
export default defineConfig(({ mode }) => {
    if (mode === 'package') {
        return {
            root,
            build: {
                outDir: resolve(root, 'dist'),
                emptyOutDir: true,
                lib: {
                    entry: {
                        echto: resolve(root, 'src/index.ts'),
                        vue: resolve(root, 'src/vue.ts'),
                    },
                    formats: ['es'],
                },
                rollupOptions: { external: ['vue'] },
            },
        };
    }

    if (mode === 'demo') {
        return {
            root,
            plugins: [vue()],
            define: { 'process.env.NODE_ENV': '"production"' },
            build: {
                outDir: resolve(root, '../../demo/kundin/public/beispiele'),
                emptyOutDir: true,
                lib: {
                    entry: resolve(root, 'examples/vue/main.ts'),
                    formats: ['iife'],
                    name: 'EchtoBeispiel',
                    fileName: () => 'kontakt-vue.js',
                },
            },
        };
    }

    return {
        root,
        build: {
            outDir: resolve(root, '../../public/widget/v1'),
            emptyOutDir: true,
            lib: {
                entry: resolve(root, 'src/index.ts'),
                formats: ['iife'],
                name: 'Echto',
                fileName: () => 'echto.js',
            },
        },
        test: {
            include: ['src/**/*.test.ts'],
        },
    };
});
