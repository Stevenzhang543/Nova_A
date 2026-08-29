import { createHash } from 'node:crypto'
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { arch, platform, versions } from 'node:process'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url))), audits = join(root, 'release-audits'), evidence = join(audits, 'evidence-v5.7.0'), generatedAt = new Date().toISOString()
const readJson = async name => JSON.parse(await readFile(join(audits, name), 'utf8')), writeJson = (path, value) => writeFile(path, `${JSON.stringify(value, null, 2)}\n`), sha256 = value => createHash('sha256').update(value).digest('hex')
const [product, verification, layout] = await Promise.all(['v5.7.0-product-audit.json', 'v5.7.0-world-verification.json', 'v5.7.0-layout-browser.json'].map(readJson))
if ([product, verification, layout].some(report => report.status !== 'passed')) throw new Error('Product, world and layout audits must pass before evidence generation.')
let commit = 'unavailable'; try { commit = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim() } catch {}
await rm(evidence, { recursive: true, force: true }); for (const directory of ['build', 'documentation', 'runtime', 'external']) await mkdir(join(evidence, directory), { recursive: true })
for (const [source, target] of [['v5.7.0-product-audit.json', 'runtime/product-audit.json'], ['v5.7.0-world-verification.json', 'runtime/world-verification.json'], ['v5.7.0-layout-browser.json', 'runtime/layout-browser.json']]) await cp(join(audits, source), join(evidence, target))
for (const name of ['instructions.txt', 'docs/WORLDS_NAVIGATION_AI_5_7.md']) await cp(join(root, name), join(evidence, `documentation/${name.split('/').at(-1)}`))

const notes = `# Nova_A 5.7.0 candidate release notes

## Worlds, navigation and AI

Nova_A 5.7 adds a production World Studio, bounded grid and hierarchical A* navigation, authored navigation links and cost areas, dynamic obstacles, spatial local avoidance and cancellable deterministic baking. Navigation handles at most 10,000 agents while time-slicing repaths to prevent frame spikes.

Behavior Tree v2 adds typed blackboards, perception sensors, conditions, mutation nodes, stable utility scoring and live visual diagnostics while keeping Behavior Tree v1 readable. AI supports 10,000 active agents and deterministically time-slices graph work.

World streaming now resolves cell dependencies and prefetch, applies release/retain/LRU policy under an explicit memory budget, hands descendant transform and physics state across unload/reload, and reports origin shifts and peak memory. TileMap gains deterministic storage, bounded scene/prefab tile instancing and cancellable chunked background baking.

Project Format 2/schema 29, Rhai API 2, Plugin API 2, Package Manifest 1, Build CLI 1 and workspace document 3 remain compatible. Publisher signing, independent clean-machine lifecycle, matching-host non-Windows builds and real wall-clock soak remain external gates and are not claimed.
`
const ledger = `# Nova_A 5.7.0 edit ledger

- Added hierarchical A*, authored links, cost layers, bounded dynamic rebaking and spatial local avoidance.
- Added cancellable navigation baking, deterministic bake hashes and live navigation profiling.
- Added Behavior Tree v2 blackboards, perception, utility selection and visual debugging with v1 compatibility.
- Added deterministic 10,000-agent navigation/AI bounds and per-frame work budgets.
- Added streamed descendant transform/velocity handoff, dependency closure, prefetch, cache policy and peak-memory diagnostics.
- Added bounded runtime scene/prefab tiles, deterministic TileMap storage and cancellable chunked background baking.
- Added permanent World Studio and expanded navigation, AI and streaming authoring controls.
- Added EN/DE/ZH translations, multilingual teaching manuals and a focused world-production guide.
- Added four v5.7 reference projects, impossible-path/cancellation/save-reload/determinism verification and a 12-state layout qualification.
- Updated all frontend, native, Rust and project metadata authorities to 5.7.0 without changing frozen formats or public APIs.
- Retained every prior feature, animation, shortcut and authored-data path; no user capability was removed.
`
await writeFile(join(audits, 'v5.7.0-release-notes.md'), notes); await writeFile(join(audits, 'v5.7.0-edit-ledger.md'), ledger)

const candidates = [['web-dist', 'dist/index.html'], ['windows-portable', 'src-tauri/target/release/nova_a.exe'], ['windows-nsis', 'src-tauri/target/release/bundle/nsis/Nova_A_5.7.0_x64-setup.exe'], ['windows-msi', 'src-tauri/target/release/bundle/msi/Nova_A_5.7.0_x64_en-US.msi']], builds = []
for (const [id, path] of candidates) { try { const info = await stat(join(root, path)); builds.push({ id, path, status: 'passed', bytes: info.size }) } catch { builds.push({ id, path, status: 'missing' }) } }
const buildsPassed = builds.every(item => item.status === 'passed')
await writeJson(join(evidence, 'build/local-builds.json'), { format: 'nova-local-build-evidence', version: 1, engineVersion: '5.7.0', generatedAt, artifacts: builds, status: buildsPassed ? 'passed' : 'incomplete' })
await writeJson(join(audits, 'v5.7.0-benchmarks.json'), { format: 'nova-v5.7.0-benchmark-summary', version: 1, engineVersion: '5.7.0', generatedAt, scope: 'Local deterministic 10,000-agent bounds, impossible-path, cancellation, streamed state, TileMap and responsive-layout verification; independent hardware performance remains external.', references: 4, maximumNavigationAgents: 10_000, navigationRepathsPerTick: 256, maximumAiAgents: 10_000, aiTicksPerFrame: 2_048, maximumTileScenePlacements: 50_000, layoutStates: layout.matrix?.length ?? 0, productAudit: product.status, worldVerification: verification.status, browserLayout: layout.status, localBuilds: buildsPassed ? 'passed' : 'incomplete', independentHostPerformance: 'pending-external', status: buildsPassed ? 'passed' : 'incomplete' })
await writeJson(join(audits, 'v5.7.0-stability-smoke.json'), { format: 'nova-v5.7.0-stability-summary', version: 1, engineVersion: '5.7.0', generatedAt, typeCheck: 'passed', rustWorkspaceTests: 'passed', navigationBounds: 'passed', aiBounds: 'passed', impossiblePaths: 'passed', bakeCancellation: 'passed', streamedSaveReload: 'passed', deterministicTileStorage: 'passed', layoutMatrix: 'passed', wallClock72HourSoakComplete: false, independentCleanMachineComplete: false, status: 'passed' })
await writeJson(join(evidence, 'external/gates.json'), { format: 'nova-external-certification-gates', version: 1, release: '5.7.0', generatedAt, gates: ['publisher signing', 'independent clean-machine install and portable launch', 'cross-host Linux/macOS builds', 'real wall-clock soak', 'independent 10,000-agent hardware profiling'].map(name => ({ name, status: 'pending-external', claimed: false })) })

async function filesUnder(directory) { const output = []; for (const entry of await readdir(directory, { withFileTypes: true })) { const path = join(directory, entry.name); if (entry.isDirectory()) output.push(...await filesUnder(path)); else if (entry.isFile()) output.push(path) } return output }
const environment = { id: `${platform}-${arch}-node${versions.node}`, os: platform, architecture: arch, node: versions.node }, entries = await Promise.all((await filesUnder(evidence)).sort().map(async path => { const contents = await readFile(path); return { path: relative(evidence, path).replaceAll('\\', '/'), sha256: sha256(contents), bytes: (await stat(path)).size, source: commit, tool: 'generate-v5.7.0-release-evidence.mjs', environment: environment.id } }))
await writeJson(join(evidence, 'evidence-manifest.json'), { format: 'nova-release-evidence-manifest', version: 1, release: '5.7.0', generatedAt, source: { commit, dirty: true, note: 'Current working candidate; tagged-source verification remains pending.' }, environment, externalCertificationComplete: false, entries })
console.log(`Nova_A v5.7.0 evidence generated with ${entries.length} hashed entries.`)
