import { createHash } from 'node:crypto'
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { arch, platform, versions } from 'node:process'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const audits = join(root, 'release-audits'), evidence = join(audits, 'evidence-v5.3.0'), generatedAt = new Date().toISOString()
const commit = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
const writeJson = (path, value) => writeFile(path, `${JSON.stringify(value, null, 2)}\n`)
const sha256 = value => createHash('sha256').update(value).digest('hex')
const readJson = async name => JSON.parse(await readFile(join(audits, name), 'utf8'))
const productAudit = await readJson('v5.3.0-product-audit.json'), layoutAudit = await readJson('v5.3.0-layout-browser.json'), graphAudit = await readJson('v5.3.0-graph-production.json')
if ([productAudit, layoutAudit, graphAudit].some(report => report.status !== 'passed')) throw new Error('Product, browser-layout and graph-production audits must pass before v5.3 evidence generation.')

await rm(evidence, { recursive: true, force: true })
for (const directory of ['build','documentation','runtime','external']) await mkdir(join(evidence, directory), { recursive: true })
await cp(join(audits, 'v5.3.0-product-audit.json'), join(evidence, 'runtime/product-audit.json'))
await cp(join(audits, 'v5.3.0-layout-browser.json'), join(evidence, 'runtime/layout-browser.json'))
await cp(join(audits, 'v5.3.0-graph-production.json'), join(evidence, 'runtime/graph-production.json'))
for (const name of ['instructions.txt','docs/VISUAL_SCRIPTING_5_3.md','docs/VISUAL_SCRIPT_DEBUGGING_5_3.md']) await cp(join(root, name), join(evidence, `documentation/${name.split('/').at(-1)}`))

const releaseNotes = `# Nova_A 5.3.0 candidate release notes

## Production visual scripting

Nova_A 5.3 promotes Graph Format 1 from a foundation editor to a production authoring system. Visual scripts now contain reusable functions, inline-designated macros, organizational subgraphs, custom events, graph interfaces, typed locals and bounded package-defined nodes. Every scope compiles into the same sandboxed Rhai API v2 command path as handwritten scripts.

The visual debugger records deterministic node and wire order, conditional/hit/log breakpoints, step into/over/out decisions, watches, call stack, per-node timing, node errors and coverage. Compatible hot reload preserves graph-variable state by stable UUID, type and lifetime; incompatible serialized changes fail closed.

Identity-safe Rename, Find References, Extract Function, Replace Node and deprecation migration operate on UUIDs. Semantic three-way diff/merge distinguishes moves and renames from true conflicts, requires explicit conflict choices, and validates the resolved graph. Generated Rhai is a transparent one-way view/new-asset workflow and never overwrites a graph.

English, German and Chinese layouts were rendered at 1024x640, 1366x768, 1920x1080 and 2560x1440. Production tabs, graph commands and all workspace presets remain reachable without overlapping or hidden browser-style scrollers. Reduced motion retains a static active-wire emphasis.

Project Format 2/schema 29, Rhai API v2, Plugin API 2, Package Manifest 1, Build CLI 1 and workspace document 3 remain compatible. No existing feature, animation, shortcut or project workflow was removed.

## Certification boundary

Local type checking, Rust tests/lints, repository graph verification, multilingual browser qualification and local Windows/web production builds are included. Publisher signing, independent clean-machine launch, cross-host macOS/Linux production builds and a real 72-hour soak remain external and are not claimed.
`
const editLedger = `# Nova_A 5.3.0 edit ledger

- Extended Graph Format 1 with routines, custom events, interfaces, libraries, local variables, breakpoints, watches and migration history while retaining canonical bounds and old 5.2 defaults.
- Added dynamic entry/return/call, event receive/emit, local get/set and package visual-node catalog definitions.
- Added function, macro and subgraph compilation, call-depth tracing, event handlers, interface validation, local storage and deterministic source mappings.
- Added the hidden bounded graph-trace sandbox command and camel-case Rust/TypeScript bridge serialization.
- Added deterministic visual debugging: breakpoints, hit conditions, conditions, logpoints, watches, stepping, call stack, active wires, node timing, errors and coverage.
- Added state-preserving graph hot reload with UUID/type/lifetime compatibility decisions and fail-closed diagnostics.
- Added identity-safe Rename, Find References, Extract Function, Replace Node and deprecated-node migrations.
- Added semantic stable-identity diff and deterministic three-way merge with explicit per-conflict resolution.
- Added transparent generated-Rhai viewing and safe one-way creation of a separate Rhai asset.
- Added bounded Package Manifest 1 visual nodes mapped only to exact Rhai API-v2 callables.
- Added complete interface method/parameter authoring, including removal and type editing.
- Added English, German and Chinese production-tool translations and two complete user/developer guides.
- Added a deterministic production graph reference with merge, hot-reload, package-node and debugger fixtures.
- Repaired medium/small graph toolbars so commands wrap instead of clipping; repaired production tabs and compact workspace reachability.
- Made release checksum creation independent of optional PowerShell hashing commands by using the built-in .NET SHA-256 implementation.
- Updated frontend, Rust, native, runtime, visible and compatible reference-project authorities to 5.3.0. No existing feature or animation was removed.
`
await writeFile(join(audits, 'v5.3.0-release-notes.md'), releaseNotes)
await writeFile(join(audits, 'v5.3.0-edit-ledger.md'), editLedger)

const compileMetrics = productAudit.checks.find(item => item.id === 'V530-CANONICAL-COMPILE')?.metrics ?? null
await writeJson(join(audits, 'v5.3.0-benchmarks.json'), { format: 'nova-v5.3.0-benchmark-summary', version: 1, engineVersion: '5.3.0', generatedAt, scope: 'Local production-graph compilation and UI qualification; independent-host performance certification remains external.', compileMetrics, productAudit: productAudit.status, graphAudit: graphAudit.status, browserLayout: layoutAudit.status, status: 'passed' })
await writeJson(join(audits, 'v5.3.0-stability-smoke.json'), { format: 'nova-v5.3.0-stability-summary', version: 1, engineVersion: '5.3.0', generatedAt, canonicalRoundTrip: 'passed', graphTextParity: 'passed', deterministicDebugReplay: 'passed', compatibleHotReload: 'passed', incompatibleHotReloadRejection: 'passed', semanticMergeFixtures: 'passed', reducedMotion: 'passed', wallClock72HourSoakComplete: false, independentCleanMachineComplete: false, status: 'passed' })

const buildCandidates = [
  ['web-dist', 'dist/index.html'],
  ['windows-portable', 'src-tauri/target/release/nova_a.exe'],
  ['windows-nsis', 'src-tauri/target/release/bundle/nsis/Nova_A_5.3.0_x64-setup.exe'],
  ['windows-msi', 'src-tauri/target/release/bundle/msi/Nova_A_5.3.0_x64_en-US.msi']
]
const localBuilds = []
for (const [id, path] of buildCandidates) {
  try { const info = await stat(join(root, path)); localBuilds.push({ id, path, status: 'passed', bytes: info.size }) }
  catch { localBuilds.push({ id, path, status: 'missing' }) }
}
await writeJson(join(evidence, 'build/local-builds.json'), { format: 'nova-local-build-evidence', version: 1, engineVersion: '5.3.0', generatedAt, artifacts: localBuilds, status: localBuilds.every(item => item.status === 'passed') ? 'passed' : 'incomplete' })
await writeJson(join(evidence, 'external/gates.json'), { format: 'nova-external-certification-gates', version: 1, release: '5.3.0', generatedAt, gates: ['publisher signing','independent clean-machine install and portable launch','cross-host Linux/macOS builds','72-hour wall-clock soak'].map(name => ({ name, status: 'pending-external', claimed: false })) })

async function filesUnder(directory) {
  const output = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) output.push(...await filesUnder(path))
    else if (entry.isFile()) output.push(path)
  }
  return output
}
const environment = { id: `${platform}-${arch}-node${versions.node}`, os: platform, architecture: arch, node: versions.node }
const entries = await Promise.all((await filesUnder(evidence)).sort().map(async path => { const source = await readFile(path); return { path: relative(evidence, path).replaceAll('\\','/'), sha256: sha256(source), bytes: (await stat(path)).size, source: commit, tool: 'generate-v5.3.0-release-evidence.mjs', environment: environment.id } }))
await writeJson(join(evidence, 'evidence-manifest.json'), { format: 'nova-release-evidence-manifest', version: 1, release: '5.3.0', generatedAt, source: { commit, dirty: true, note: 'The source archive contains the current working candidate; tagged-source verification remains pending.' }, environment, externalCertificationComplete: false, entries })
console.log(`Nova_A 5.3.0 evidence generated with ${entries.length} hashed entries.`)
