import { defineConfig } from 'tsup';

export default defineConfig({
    entry: {
        core: 'src/core/index.ts',
        devTools: 'src/devtools/index.tsx',
        middlewares: 'src/middlewares/index.ts',
        persist: 'src/persist/index.ts',
        transformers: 'src/transformers/index.ts',
        react: 'src/react/index.ts',
    },
    format: ['esm'],
    target: 'es2020',
    sourcemap: true,
    dts: true,
    minify: true,
    clean: true,
    external: ['react', 'react-dom'],
    outExtension: () => ({ js: '.mjs' }),
    splitting: true, // do not disable splitting. it will leak the global config exports.
    skipNodeModulesBundle: true,
    outDir: 'lib',
});
