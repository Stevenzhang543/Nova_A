/** Separate real production graph gate for the shared scene frontend, plus actual-owner regressions. */
import { build } from 'vite'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'

const reportDir = resolve(process.argv.find(value => value.startsWith('--report-dir='))?.slice(13) ?? 'release-audits/engine-renderer-frontend')
await mkdir(reportDir, { recursive: true })
const moduleIds = new Set(), edges = []
const result = await build({ configFile: false, root: process.cwd(), logLevel: 'warn', plugins: [{ name: 'nova-scene-production-dependencies', moduleParsed(module) { moduleIds.add(module.id); edges.push({ id: module.id, imports: module.importedIds }) } }], build: { write: false, target: 'es2022', minify: 'esbuild', lib: { entry: resolve('src/renderer/sceneRenderer.ts'), formats: ['es'], fileName: 'frontend' } } })
const inputs = [...moduleIds].filter(path => !path.startsWith('\0')).map(path => relative(process.cwd(), path).replaceAll('\\', '/')).sort()
const forbidden = inputs.filter(path => /(?:^|\/)(?:editor|store|components)(?:\/|$)|(?:^|\/)assets\/AssetDatabase\.|node_modules\/.*(?:vue|pinia|tauri)|renderer\/(?:capabilities|renderSettings|renderGraph)\.ts$|runtime\/(?:tilemap|particles|rigging)\.ts$/.test(path))
const sourceHashes = Object.fromEntries(await Promise.all(inputs.map(async path => [path, createHash('sha256').update(await readFile(path)).digest('hex')])))
const chunks = (Array.isArray(result) ? result.flatMap(value => value.output) : result.output).filter(value => value.type === 'chunk')
if (chunks.length !== 1) throw new Error('Expected one standalone frontend chunk')
const output = chunks[0].code
const standalone = await import('data:text/javascript;base64,' + Buffer.from(output).toString('base64'))
const checks = [{ name: 'Actual browser production scene frontend graph excludes Editor, framework, AssetDatabase and concrete tile/particle/rig service owners', status: forbidden.length ? 'failed' : 'passed', forbidden }]
let calls = 0, failure = ''
try { standalone.renderWorld({ beginFrame() { calls++ } }, [], {}) } catch (error) { failure = String(error) }
checks.push({ name: 'Unconfigured standalone frontend rejects absent services before any drawing call', status: failure.includes('SCENE_ENVIRONMENT_REQUIRED') && calls === 0 ? 'passed' : 'failed', failure, calls })
const report = { format: 'nova-engine-renderer-frontend-boundary', version: 1, generatedAt: new Date().toISOString(), status: checks.every(check => check.status === 'passed') ? 'passed' : 'failed', entry: 'src/renderer/sceneRenderer.ts', scope: 'Actual Vite/Rollup production import graph for the single shared frontend. Service implementations and whole Runtime/Player M1 remain separately gated; no worker/platform or formal performance certification.', checks, inputs, edges, sourceHashes, bytes: Buffer.byteLength(output), sha256: createHash('sha256').update(output).digest('hex') }
await writeFile(join(reportDir, 'frontend.js'), output, { flag: 'wx' })
await writeFile(join(reportDir, 'graph.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' })
console.log(report.status.toUpperCase() + ' standalone scene frontend: ' + inputs.length + ' modules; ' + report.bytes + ' bytes')
if (report.status !== 'passed') { process.exitCode = 1; console.error(forbidden.join('\n')) }
else if (!process.argv.includes('--graph-only')) { process.argv.push('--frontend-checks'); await import('./verify-engine-renderer-slice.mjs') }
