import react_plugin from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import commonjs from 'vite-plugin-commonjs';
import { exec } from 'child_process';
export default defineConfig(({ mode }) => ({
    define: {},
    plugins: [react_plugin(), commonjs()],

    build: {
        outDir: 'live/dist',
    },
    server: {
        port: 7733,
    },
}));
