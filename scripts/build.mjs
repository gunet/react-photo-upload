import { rm, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const packageRoot = path.resolve(__dirname, '..')
const distDir = path.join(packageRoot, 'dist')
const entryPoint = path.join(packageRoot, 'src/index.js')
const inputCss = path.join(packageRoot, 'src/styles.css')
const outputCss = path.join(distDir, 'styles.css')

const baseBuildOptions = {
  entryPoints: [entryPoint],
  bundle: true,
  minify: true,
  sourcemap: true,
  platform: 'browser',
  target: 'es2020',
  jsx: 'automatic',
  external: ['react', 'react-dom', 'react/jsx-runtime', 'axios'],
}

async function run() {
  await rm(distDir, { recursive: true, force: true })
  await mkdir(distDir, { recursive: true })

  await build({
    ...baseBuildOptions,
    format: 'esm',
    outfile: path.join(distDir, 'index.mjs'),
  })

  await build({
    ...baseBuildOptions,
    format: 'cjs',
    outfile: path.join(distDir, 'index.cjs'),
  })

  await build({
    entryPoints: [inputCss],
    bundle: true,
    minify: true,
    sourcemap: false,
    outfile: outputCss,
  })
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
