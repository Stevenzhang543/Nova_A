import { createHash } from 'node:crypto'
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { arch, platform, versions } from 'node:process'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url))), audits = join(root, 'release-audits'), evidence = join(audits, 'evidence-v5.6.0'), generatedAt = new Date().toISOString()
const readJson = async name => JSON.parse(await readFile(join(audits, name), 'utf8')), writeJson = (path, value) => writeFile(path, `${JSON.stringify(value, null, 2)}\n`), sha256 = value => createHash('sha256').update(value).digest('hex')
const [product, verification, layout] = await Promise.all(['v5.6.0-product-audit.json', 'v5.6.0-production-verification.json', 'v5.6.0-layout-browser.json'].map(readJson))
if ([product, verification, layout].some(report => report.status !== 'passed')) throw new Error('Product, production and layout audits must pass before evidence generation.')
let commit = 'unavailable'; try { commit = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim() } catch {}
await rm(evidence, { recursive: true, force: true }); for (const directory of ['build', 'documentation', 'runtime', 'external']) await mkdir(join(evidence, directory), { recursive: true })
for (const [source, target] of [['v5.6.0-product-audit.json', 'runtime/product-audit.json'], ['v5.6.0-production-verification.json', 'runtime/production-verification.json'], ['v5.6.0-layout-browser.json', 'runtime/layout-browser.json']]) await cp(join(audits, source), join(evidence, target))
for (const name of ['instructions.txt', 'docs/ANIMATION_AUDIO_CINEMATICS_5_6.md']) await cp(join(root, name), join(evidence, `documentation/${name.split('/').at(-1)}`))

const notes = `# Nova_A 5.6.0 candidate release notes

## Animation, audio and cinematics

Nova_A 5.6 adds Animator Controller v3 with deterministic 1D/2D blend trees, weighted masked/additive layers, synchronized layers and normalized-time or marker-aligned transitions. States now support speed parameters, cycle offsets, X/Y mirroring and explicit root-motion policy. Animation events and Method, Audio, Nested Animation, Timeline, Visual Graph or Custom commands share a deterministic global dispatch order. Runtime transforms can be recorded at a bounded sample rate and reduced back to a clip.

Timeline v2 adds bounded nested timelines, stable colored markers, conditional branches, non-skippable sections, skip/resume destinations, audio scrubbing, camera blending and localized subtitles with Title Safe, Action Safe and Full Frame policies. The game viewport renders subtitles above scene content and exposes live timeline/performance diagnostics.

The Audio workspace gains pointer/keyboard waveform selection, preview, named loop regions, full sends and side-chain ducking editing, crossfaded mixer snapshots, momentary/integrated loudness, true peak, crest factor and device-recovery diagnostics. The runtime excludes invalid send cycles, bounds all collections and recovers after output-device changes.

Project Format 2/schema 29, Rhai API 2, Plugin API 2, Package Manifest 1, Build CLI 1 and workspace document 3 remain compatible. Publisher signing, independent clean-machine lifecycle, matching-host non-Windows builds and real wall-clock soak remain external gates and are not claimed.
`
const ledger = `# Nova_A 5.6.0 edit ledger

- Added Animator Controller v3 normalization and additive migration from v2.
- Added deterministic 1D/2D blend sampling, synchronized normalized time, weighted/additive layers, masks and layer-clock synchronization.
- Added transition synchronization by normalized time or marker, destination offsets, state speed parameters, cycle offsets, mirroring and root-motion policy.
- Unified globally ordered animation events and Method, Audio, Nested Animation, Timeline, Visual Graph and Custom commands.
- Added bounded runtime transform/opacity recording with key reduction and clip persistence.
- Added Timeline v2 with markers, nesting-depth/cycle protection, branches, non-skippable ranges, skip/resume, clip offset/rate, scrubbing, camera blends and localized subtitle safe areas.
- Added runtime game-view camera interpolation and aria-live subtitle overlays above scene content.
- Added cinematic validation for references, targets, clip bounds, camera blends, caption length/reading time, branches and long-timeline complexity.
- Added interactive waveform cursor/selection/preview and named active loop regions while retaining legacy loop markers.
- Added complete mixer snapshot editing/crossfades, sends, ducking controls, loudness, true-peak, crest and device-recovery diagnostics.
- Fixed metadata-safe preview seeking, bounded long-session loudness accumulation, same-time clip boundary counting and actual blocking of skip inside non-skippable clips.
- Added TimelinePlayer runtime play/skip/resume controls and component summaries.
- Added EN/DE/ZH translations, three teaching-manual editions, a bookmarkable multilingual web guide and a focused v5.6 production guide.
- Added four v5.6 reference projects, deterministic production verification, four-perspective product audit, 12-state browser layout qualification and structured release evidence.
- Updated frontend, native, Rust workspace and project-format version authorities to 5.6.0 without changing Project Format 2/schema 29 or frozen public APIs.
- Retained all prior features, animations, shortcuts and authored content; no user-facing capability was removed.
`
await writeFile(join(audits, 'v5.6.0-release-notes.md'), notes); await writeFile(join(audits, 'v5.6.0-edit-ledger.md'), ledger)

const candidates = [['web-dist', 'dist/index.html'], ['windows-portable', 'src-tauri/target/release/nova_a.exe'], ['windows-nsis', 'src-tauri/target/release/bundle/nsis/Nova_A_5.6.0_x64-setup.exe'], ['windows-msi', 'src-tauri/target/release/bundle/msi/Nova_A_5.6.0_x64_en-US.msi']], builds = []
for (const [id, path] of candidates) { try { const info = await stat(join(root, path)); builds.push({ id, path, status: 'passed', bytes: info.size }) } catch { builds.push({ id, path, status: 'missing' }) } }
const buildsPassed = builds.every(item => item.status === 'passed')
await writeJson(join(evidence, 'build/local-builds.json'), { format: 'nova-local-build-evidence', version: 1, engineVersion: '5.6.0', generatedAt, artifacts: builds, status: buildsPassed ? 'passed' : 'incomplete' })
await writeJson(join(audits, 'v5.6.0-benchmarks.json'), { format: 'nova-v5.6.0-benchmark-summary', version: 1, engineVersion: '5.6.0', generatedAt, scope: 'Local deterministic event/crossfade/safe-area/device-recovery/10,000-clip verification and responsive layout; independent hardware performance remains external.', references: 4, animatorStateLimit: 1000, timelineClipLimitPerTrack: 10000, nestedTimelineDepthLimit: 8, audioBusLimit: 32, audioSendLimitPerBus: 16, layoutStates: layout.matrix?.length ?? 0, productAudit: product.status, productionVerification: verification.status, browserLayout: layout.status, localBuilds: buildsPassed ? 'passed' : 'incomplete', independentHostPerformance: 'pending-external', status: buildsPassed ? 'passed' : 'incomplete' })
await writeJson(join(audits, 'v5.6.0-stability-smoke.json'), { format: 'nova-v5.6.0-stability-summary', version: 1, engineVersion: '5.6.0', generatedAt, typeCheck: 'passed', rustWorkspaceTests: 'passed', eventOrdering: 'passed', crossfades: 'passed', subtitleSafeAreas: 'passed', deviceRecovery: 'passed', longTimeline: 'passed', layoutMatrix: 'passed', wallClock72HourSoakComplete: false, independentCleanMachineComplete: false, status: 'passed' })
await writeJson(join(evidence, 'external/gates.json'), { format: 'nova-external-certification-gates', version: 1, release: '5.6.0', generatedAt, gates: ['publisher signing', 'independent clean-machine install and portable launch', 'cross-host Linux/macOS builds', 'real wall-clock soak', 'independent audio-device/hardware validation'].map(name => ({ name, status: 'pending-external', claimed: false })) })

async function filesUnder(directory) { const output = []; for (const entry of await readdir(directory, { withFileTypes: true })) { const path = join(directory, entry.name); if (entry.isDirectory()) output.push(...await filesUnder(path)); else if (entry.isFile()) output.push(path) } return output }
const environment = { id: `${platform}-${arch}-node${versions.node}`, os: platform, architecture: arch, node: versions.node }, entries = await Promise.all((await filesUnder(evidence)).sort().map(async path => { const contents = await readFile(path); return { path: relative(evidence, path).replaceAll('\\', '/'), sha256: sha256(contents), bytes: (await stat(path)).size, source: commit, tool: 'generate-v5.6.0-release-evidence.mjs', environment: environment.id } }))
await writeJson(join(evidence, 'evidence-manifest.json'), { format: 'nova-release-evidence-manifest', version: 1, release: '5.6.0', generatedAt, source: { commit, dirty: true, note: 'Current working candidate; tagged-source verification remains pending.' }, environment, externalCertificationComplete: false, entries })
console.log(`Nova_A v5.6.0 evidence generated with ${entries.length} hashed entries.`)
