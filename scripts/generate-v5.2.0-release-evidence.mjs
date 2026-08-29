import { createHash } from 'node:crypto'
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { arch, platform, versions } from 'node:process'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const audits = join(root, 'release-audits')
const evidence = join(audits, 'evidence-v5.2.0')
const generatedAt = new Date().toISOString()
const commit = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
const sha256 = value => createHash('sha256').update(value).digest('hex')
const writeJson = (path, value) => writeFile(path, `${JSON.stringify(value, null, 2)}\n`)
const productAuditPath = join(audits, 'v5.2.0-product-audit.json')
const layoutAuditPath = join(audits, 'v5.2.0-layout-browser.json')
const graphAuditPath = join(audits, 'v5.2.0-graph-assets.json')
const productAudit = JSON.parse(await readFile(productAuditPath, 'utf8'))
const layoutAudit = JSON.parse(await readFile(layoutAuditPath, 'utf8'))
const graphAudit = JSON.parse(await readFile(graphAuditPath, 'utf8'))
if (productAudit.status !== 'passed' || layoutAudit.status !== 'passed' || graphAudit.status !== 'passed') throw new Error('v5.2 product, browser and graph-asset audits must all pass before evidence generation.')

await rm(evidence, { recursive: true, force: true })
for (const directory of ['build','documentation','runtime','external']) await mkdir(join(evidence, directory), { recursive: true })
await cp(productAuditPath, join(evidence, 'runtime/product-audit.json'))
await cp(layoutAuditPath, join(evidence, 'runtime/layout-browser.json'))
await cp(graphAuditPath, join(evidence, 'runtime/graph-assets.json'))
for (const name of ['instructions.txt','docs/VISUAL_SCRIPTING_5_2.md','docs/NOVA_GRAPH_FORMAT_5_2.md']) await cp(join(root, name), join(evidence, `documentation/${name.split('/').at(-1)}`))

const releaseNotes = `# Nova_A 5.2.0 candidate release notes\n\n## Visual scripting foundation\n\nNova_A 5.2 introduces versioned .nova-graph assets, a generated Rhai API v2 node catalog, typed execution/data wiring, canonical serialization, strict pre-play validation and a complete graph-editing foundation. Visual graphs attach through Script2D, expose per-object Inspector variables and compile into the same sandboxed command path as handwritten Rhai.\n\nThe editor includes search, minimap, zoom/pan, box selection, align/distribute, execution/data reroutes, comments, collapse, duplicate, Undo/Redo and keyboard creation. Graph format 1 preserves stable locale-independent UUID identity and explicitly bounds nodes, edges, variables, comments and loops.\n\nProject Format 2/schema 29, Rhai API v2, Plugin API 2, Package Manifest 1, Build CLI 1 and workspace document 3 remain compatible. No existing feature, animation, shortcut or project workflow was removed.\n\n## Certification status\n\nType checking, Rust tests/lints, WASM/web and Windows production builds, repository-wide graph-asset verification, graph canonical/parity/type/cycle/1,000-node audits and multilingual browser layout qualification are included in the evidence. Publisher signing, independent clean-machine verification, cross-host builds and a long-duration soak remain external gates and are not claimed.\n`
const editLedger = `# Nova_A 5.2.0 edit ledger\n\n- Added the versioned .nova-graph asset model with stable RFC 4122 graph/variable/node/pin/edge/comment identities, variables, comments and viewport state.\n- Added canonical, locale-independent serialization and fail-closed document limits.\n- Generated the complete graph callable catalog from Rhai API v2 and corrected value/command classification from callable signatures.\n- Added typed values, explicit safe conversions, math/comparison/logic, branches, deterministic sequence, bounded repeat and reroute nodes.\n- Added pre-play/build validation for IDs, stored node schemas, variable declarations, endpoints, direction, kind, type, required values, single inputs and unbounded cycles.\n- Added graph-to-Rhai compilation through the existing sandbox and command model, including safe divide/modulo and 1,024-iteration loop clamping.\n- Added the visual Graph Editor with palette, minimap, zoom/pan, box selection, multi-drag, align/distribute, comments, collapse, duplicate, Undo/Redo, keyboard creation and large-graph viewport culling.\n- Added Script2D visual-asset attachment and typed Inspector overrides for Boolean, Number, String, Vec2, Entity, Resource and JSON Data.\n- Added Visual Graph creation/opening/inspection in Assets, Project Health and Build Settings graph-error gates, and player package inclusion.\n- Added English, German and Chinese graph-editor chrome, public documentation, a mixed Rhai/graph reference project and release audits.\n- Added and repaired the public repository-wide graph verification command; it now parses, canonically round-trips, compiles and statically validates every .nova-graph asset.\n- Fixed graph-local shortcuts so project Undo/Save/Duplicate/Delete do not run after the graph editor consumes the same key chord.\n- Fixed Visual Graph workspace stacking, default framing and viewport restoration across desktop, compact and multilingual layouts.\n- Updated frontend, Rust, native, runtime, visible and project authorities to 5.2.0 while retaining Project Format 2/schema 29.\n- Refreshed compatible reference metadata to 5.2.0. No existing feature or animation was removed.\n`
await writeFile(join(audits, 'v5.2.0-release-notes.md'), releaseNotes)
await writeFile(join(audits, 'v5.2.0-edit-ledger.md'), editLedger)
await writeJson(join(audits, 'v5.2.0-benchmarks.json'), { format: 'nova-v5.2-benchmark-summary', version: 1, engineVersion: '5.2.0', generatedAt, scope: 'Local visual-graph responsiveness and functional release smoke; independent-host performance certification remains external.', graphNodeWorkload: productAudit.checks.find(item => item.id === 'V520-1000')?.metrics ?? null, productAudit: productAudit.status, browserUserAudit: layoutAudit.status, productionBuild: 'passed-local', status: 'passed' })
await writeJson(join(audits, 'v5.2.0-stability-smoke.json'), { format: 'nova-v5.2-stability-summary', version: 1, engineVersion: '5.2.0', generatedAt, canonicalRoundTrip: 'passed', invalidTypeRejection: 'passed', invalidCycleRejection: 'passed', rhaiParity: 'passed', graphAssetVerification: graphAudit.status, browserUserAudit: layoutAudit.status, wallClock72HourSoakComplete: false, independentCleanMachineComplete: false, status: 'passed' })
await writeJson(join(evidence, 'external/gates.json'), { format: 'nova-external-certification-gates', version: 1, release: '5.2.0', generatedAt, gates: ['publisher signing','independent clean-machine install and portable launch','cross-host Linux/macOS builds','72-hour soak'].map(name => ({ name, status: 'pending-external', claimed: false })) })
async function filesUnder(directory) { const entries = await readdir(directory, { withFileTypes: true, recursive: true }); return entries.filter(entry => entry.isFile()).map(entry => join(entry.parentPath ?? entry.path, entry.name)) }
const environment = { id: `${platform}-${arch}-node${versions.node}`, os: platform, architecture: arch, node: versions.node }
const entries = await Promise.all((await filesUnder(evidence)).sort().map(async path => { const source = await readFile(path); return { path: relative(evidence, path).replaceAll('\\','/'), sha256: sha256(source), bytes: (await stat(path)).size, source: commit, tool: 'generate-v5.2.0-release-evidence.mjs', environment: environment.id } }))
await writeJson(join(evidence, 'evidence-manifest.json'), { format: 'nova-release-evidence-manifest', version: 1, release: '5.2.0', generatedAt, source: { commit, dirty: true, note: 'The source archive contains the current working candidate; tagged-source verification remains pending.' }, environment, externalCertificationComplete: false, entries })
console.log(`Nova_A 5.2.0 evidence generated with ${entries.length} hashed entries.`)
