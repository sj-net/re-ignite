import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { visualizer } from 'rollup-plugin-visualizer';

export default {
    input: [
        'src/core/index.ts',
        'src/devtools/index.tsx',
        'src/middlewares/index.ts',
        'src/persist/index.ts',
        'src/transformers/index.ts',
        'src/react/index.ts',
    ],
    output: {
        dir: 'bundle-size',
        format: 'es',
        entryFileNames: '[name].mjs',
        sourcemap: true,
        preserveModules: true,
        preserveModulesRoot: 'src',
    },
    // ⬇️ This is the key fix
    external: (id) =>
        !id.startsWith('.') && !id.startsWith('/') && !id.includes('src'),
    plugins: [
        nodeResolve(),
        commonjs(),
        typescript({
            tsconfig: './tsconfig.json',
            sourceMap: true,
            emitDeclarationOnly: true,
        }),
        visualizer({
            filename: 'demo/live/dist/stats.html',
            open: true,
            gzipSize: true,
            brotliSize: true,
            title: 're-ignite Bundle Analysis',
            template: 'treemap',
            exclude: {
                file: ['**/*.ts', '**/*.tsx'], // Exclude all .ts and .tsx files
            },
        }),
    ],
};
