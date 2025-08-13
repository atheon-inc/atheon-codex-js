import esbuild from 'esbuild';
import { exec } from 'child_process';

// Shared config for both builds
const config = {
    entryPoints: ['src/index.ts'],
    bundle: true,
    sourcemap: true,
    minify: true,
    platform: 'node',
    target: 'es2020',
};

// Build ES Module (for import)
await esbuild.build({
    ...config,
    format: 'esm',
    outfile: 'dist/index.mjs',
});

// Build CommonJS (for require)
await esbuild.build({
    ...config,
    format: 'cjs',
    outfile: 'dist/index.cjs',
});

// Generate TypeScript declaration files (.d.ts)
exec('tsc --emitDeclarationOnly --outDir dist', (err, stdout, stderr) => {
    if (err) {
        console.error('Error generating type definitions:', stderr);
        process.exit(1);
    }
    console.log('✅ Type definitions generated successfully!');
});

console.log('✅ Build complete!');