import { performance } from 'node:perf_hooks'
import { writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const count = 50_000
const started = performance.now()
const assets = Array.from({ length: count }, (_, index) => ({ uuid: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`, name: `Asset ${String(index).padStart(5, '0')}`, path: `Assets/Group-${index % 200}/Asset-${String(index).padStart(5, '0')}.png`, assetType: index % 7 === 0 ? 'audio' : 'image', dependencies: index > 0 ? [`${index - 1}`] : [] }))
const indexStarted = performance.now()
const byUuid = new Map(assets.map(asset => [asset.uuid, asset]))
const sorted = [...assets].sort((left, right) => left.path.localeCompare(right.path))
const indexMs = performance.now() - indexStarted
const queries = ['asset 00042', 'group-19', '49999', 'missing', '.png']
const searchTimes = queries.map(query => { const mark = performance.now(); const needle = query.toLowerCase(); const results = sorted.filter(asset => asset.name.toLowerCase().includes(needle) || asset.path.toLowerCase().includes(needle)); return { query, durationMs: performance.now() - mark, results: results.length } })
const lookupStarted = performance.now()
for (let index = 0; index < count; index++) if (!byUuid.get(assets[index].uuid)) throw new Error('Index lookup failed')
const lookupMs = performance.now() - lookupStarted
const serializeStarted = performance.now()
const canonicalBytes = Buffer.byteLength(`${JSON.stringify({ assets: sorted }, null, 2)}\n`)
const serializeMs = performance.now() - serializeStarted
const maxSearchMs = Math.max(...searchTimes.map(item => item.durationMs))
const report = { format: 'nova-large-project-benchmark', version: 1, engineVersion: '3.2.0', generatedAt: new Date().toISOString(), referenceHardware: `${process.platform}/${process.arch} Node ${process.version}`, assetCount: count, totalSetupMs: performance.now() - started, indexMs, lookup50kMs: lookupMs, searchTimes, maxSearchMs, serializeMs, canonicalBytes, thresholds: { maxIndexMs: 2500, maxSearchMs: 750, maxLookup50kMs: 1000, maxSerializeMs: 5000 }, status: indexMs < 2500 && maxSearchMs < 750 && lookupMs < 1000 && serializeMs < 5000 ? 'passed' : 'failed' }
await writeFile(join(root, 'release-audits', 'v3.2.0-large-project-benchmark.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8')
console.log(`50k benchmark ${report.status}: index ${indexMs.toFixed(1)} ms, max search ${maxSearchMs.toFixed(1)} ms.`)
if (report.status !== 'passed') process.exitCode = 1
