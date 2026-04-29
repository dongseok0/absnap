import * as esbuild from 'esbuild'
import { gzipSync } from 'node:zlib'
import { readFileSync } from 'node:fs'

const watch = process.argv.includes('--watch')
const apiBase = process.env.ABSNAP_API_BASE ?? 'https://api.absnap.com'
const cdnBase = process.env.ABSNAP_CDN_BASE ?? 'https://cdn.absnap.com'

const ctx = await esbuild.context({
  entryPoints: ['src/index.ts'],
  bundle: true,
  minify: true,
  format: 'iife',
  globalName: '__abs',
  target: ['es2015', 'chrome58', 'firefox57', 'safari11'],
  outfile: 'dist/ab.js',
  define: {
    'process.env.NODE_ENV': '"production"',
    '__DEV__': 'false',
    '__ABSNAP_API_BASE__': JSON.stringify(apiBase),
    '__ABSNAP_CDN_BASE__': JSON.stringify(cdnBase)
  }
})

if (watch) {
  await ctx.watch()
  console.log('Watching...')
} else {
  await ctx.rebuild()
  await ctx.dispose()

  const built = readFileSync('dist/ab.js')
  const gzipped = gzipSync(built)
  const kb = (gzipped.length / 1024).toFixed(2)
  console.log(`✓ dist/ab.js: ${built.length}B raw, ${gzipped.length}B gzip (${kb}KB)`)
  if (gzipped.length > 5120) {
    console.warn(`⚠ Size budget exceeded! Target: ≤5KB gzip, actual: ${kb}KB`)
    process.exit(1)
  }
}
