const { writeToPackageDotJson, getFromPackageDotJson } = require('./utils');
const fs = require('fs');
const zlib = require('zlib');

([
    // Packages:
    'alpinejs',
    'csp',
    // 'history', - removed because this plugin has been moved to livewire/livewire until it's stable...
    // 'navigate', - remove because this plugin has been moved to livewire/livewire until it's stable...
    'intersect',
    'collapse',
    'persist',
    'resize',
    'anchor',
    'morph',
    'focus',
    'sort',
    'mask',
    'ui',
]).forEach(packageName => {
    if (! fs.existsSync(`./packages/${packageName}/dist`)) {
        fs.mkdirSync(`./packages/${packageName}/dist`, 0o744);
    }

    // Go through each file in the package's "build" directory
    // and use the appropriate bundling strategy based on its name.
    fs.readdirSync(`./packages/${packageName}/builds`).forEach(file => {
        bundleFile(packageName, file)
    });
})

function bundleFile(packageName: any, file: any) {
    // Based on the filename, give esbuild a specific configuration to build.
    ({
        // This output file is meant to be loaded in a browser's <script> tag.
        'cdn.js': () => {
            build({
                entryPoints: [`packages/${packageName}/builds/${file}`],
                outfile: `packages/${packageName}/dist/${file}`,
                bundle: true,
                platform: 'browser',
                define: { CDN: 'true' },
            })

            // Build a minified version.
            build({
                entryPoints: [`packages/${packageName}/builds/${file}`],
                outfile: `packages/${packageName}/dist/${file.replace('.js', '.min.js')}`,
                bundle: true,
                minify: true,
                platform: 'browser',
                define: { CDN: 'true' },
            }).then(() => {
                outputSize(packageName, `packages/${packageName}/dist/${file.replace('.js', '.min.js')}`)
            })

        },
        // This file outputs two files: an esm module and a cjs module.
        // The ESM one is meant for "import" statements (bundlers and new browsers)
        // and the cjs one is meant for "require" statements (node).
        'module.js': () => {
            build({
                entryPoints: [`packages/${packageName}/builds/${file}`],
                outfile: `packages/${packageName}/dist/${file.replace('.js', '.esm.js')}`,
                bundle: true,
                platform: 'neutral',
                mainFields: ['module', 'main'],
            })

            build({
                entryPoints: [`packages/${packageName}/builds/${file}`],
                outfile: `packages/${packageName}/dist/${file.replace('.js', '.cjs.js')}`,
                bundle: true,
                target: ['node10.4'],
                platform: 'node',
            }).then(() => {
                writeToPackageDotJson(packageName, 'main', `dist/${file.replace('.js', '.cjs.js')}`)
                writeToPackageDotJson(packageName, 'module', `dist/${file.replace('.js', '.esm.js')}`)
            })
        },
    })[file]()
}

function build(options: any) {
    options.define || (options.define = {})

    options.define['ALPINE_VERSION'] = `'${getFromPackageDotJson('alpinejs', 'version')}'`
    options.define['process.env.NODE_ENV'] = process.argv.includes('--watch') ? `'production'` : `'development'`

    return require('esbuild').build({
        logLevel: process.argv.includes('--watch') ? 'info' : 'warning',
        watch: process.argv.includes('--watch'),
        // external: ['alpinejs'],
        ...options,
    }).catch(() => process.exit(1))
}

function outputSize(packageName: any, file: any) {
    let size = bytesToSize(zlib.brotliCompressSync(fs.readFileSync(file)).length)

    console.log("\x1b[32m", `${packageName}: ${size}`)
}

function bytesToSize(bytes: any) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    if (bytes === 0) return 'n/a'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    if (i === 0) return `${bytes} ${sizes[i]}`
    return `${(bytes / (1024 ** i)).toFixed(1)} ${sizes[i]}`
}

export {}
