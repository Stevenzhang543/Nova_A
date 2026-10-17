/** Verify the independently bundled graphics core's real production dependency graph. */
import { build } from 'vite'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'

const reportDir = resolve(process.argv.find(value => value.startsWith('--report-dir='))?.slice(13) ?? 'release-audits/engine-renderer-core')
await mkdir(reportDir, { recursive: true })
const moduleIds = new Set()
const result = await build({ configFile: false, root: process.cwd(), logLevel: 'warn', plugins: [{ name: 'nova-renderer-production-dependencies', moduleParsed(module) { moduleIds.add(module.id) } }], build: { write: false, target: 'es2022', minify: 'esbuild', lib: { entry: resolve('src/renderer/core.ts'), formats: ['es'], fileName: 'core' } } })
const inputs = [...moduleIds].filter(path => !path.startsWith('\0')).map(path => relative(process.cwd(), path).replaceAll('\\', '/')).sort()
const forbidden = inputs.filter(path => /(?:^|\/)(?:editor|store|components)(?:\/|$)|(?:^|\/)assets\/AssetDatabase\.|node_modules\/.*(?:vue|pinia|tauri)|renderer\/(?:capabilities|renderSettings|sceneRenderer|renderGraph)\.ts$/.test(path))
const sourceHashes = Object.fromEntries(await Promise.all(inputs.map(async path => [path, createHash('sha256').update(await readFile(path)).digest('hex')])))
const checks = [{ name: 'Bundled standalone graphics core has no Editor, Vue, Pinia, Tauri, authoring scene or mutable asset database dependency', status: forbidden.length ? 'failed' : 'passed', forbidden }]
const chunks = (Array.isArray(result) ? result.flatMap(value => value.output) : result.output).filter(value => value.type === 'chunk')
if (chunks.length !== 1) throw new Error('Expected one standalone renderer chunk, got ' + chunks.length)
const output = chunks[0].code
const bytes = Buffer.byteLength(output)
const report = { format: 'nova-engine-renderer-core-boundary', version: 1, generatedAt: new Date().toISOString(), status: forbidden.length ? 'failed' : 'passed', entry: 'src/renderer/core.ts', scope: 'Actual Vite/Rollup browser production dependency graph for this graphics-core entry. Does not certify the legacy scene frontend, whole Runtime/Player separation or M1.', checks, inputs, sourceHashes, bytes, sha256: createHash('sha256').update(output).digest('hex') }
await writeFile(join(reportDir, 'core.js'), output, { flag: 'wx' })
await writeFile(join(reportDir, 'report.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' })
console.log(report.status.toUpperCase() + ' standalone renderer core: ' + inputs.length + ' production modules; ' + bytes + ' bytes')
if (forbidden.length) { console.error(forbidden.join('\n')); process.exitCode = 1 }
