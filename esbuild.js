const esbuild = require('esbuild');

const watch = process.argv.includes('--watch');

async function build() {
    const context = await esbuild.context({
        entryPoints: ['./src/extension.ts'],
        bundle: true,
        external: ['vscode'],
        format: 'cjs',
        platform: 'node',
        outfile: './dist/extension.js',
        logLevel: 'info',
    });

    if (watch) {
        await context.watch();
    } else {
        await context.rebuild();
        await context.dispose();
    }
}

build().catch(() => process.exit(1));
