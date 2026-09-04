import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { arch, platform, versions } from 'node:process'
import { cp, mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const release = process.argv.find(value => value.startsWith('--release='))?.slice(10)
const machineVersion = process.argv.find(value => value.startsWith('--engine='))?.slice(9)
const supported = new Map([['26.08', '26.8.0'], ['26.09', '26.9.0'], ['26.10', '26.10.0']])
if (supported.get(release) !== machineVersion) throw new Error('Evidence requires a matching calendar release and machine version.')
const releaseChangeManifest = {
  '26.08': [
    ['src/runtime/input.ts', 'Added canonical pen channels, logical/physical keyboard identity, device identity, lifecycle release and bounded prompt behavior.'],
    ['src/runtime/deviceInput.ts', 'Bound permission-gated sensor frequency, accessible virtual controls and compatibility-event deduplication.'],
    ['src/runtime/inputModality.ts', 'Unified keyboard, pointer, pen, touch, gamepad and virtual-control modality transitions.'],
    ['src/components/DeviceInputPanel.vue', 'Exposed pen authoring, accessible names, explicit key capture and sensor sampling controls.'],
    ['src/panels/SettingsPanel.vue', 'Connected the settings input editor to the complete canonical device registry.'],
    ['src/components/PresentationPanel.vue', 'Added device-aware pen prompts without replacing existing modalities.'],
    ['src/runtime/networkInput.ts', 'Preserved canonical pen identities in recorded and replicated input snapshots.'],
    ['docs/PLATFORM_INPUT_ACCESSIBILITY_26_08.md', 'Documented implementation, fallbacks, boundaries and external hardware/accessibility gates.'],
    ['scripts/verify-v26.08-platform-input.mjs', 'Added executable input, lifecycle, calibration, prompt and accessibility verification.']
  ],
  '26.09': [
    ['src/runtime/jobScheduler.ts', 'Added generation/lease-safe workers, deterministic fallback, retirement, cancellation and timeouts.'],
    ['src/runtime/jobScheduler.worker.ts', 'Made worker replies generation- and lease-bound so stale work cannot mutate current state.'],
    ['src/runtime/largeWorldPerformance.ts', 'Added stable component caches, dirty updates and allocation-free unchanged-world fast paths.'],
    ['src/runtime/teamWorkflow.ts', 'Implemented source-complete fingerprints and bounded identity-preserving semantic three-way merge.'],
    ['src/components/EditorBottomPanel.vue', 'Virtualized the asset viewport and lazy-loaded mutually exclusive heavyweight tools.'],
    ['src/components/ManageWorkspace.vue', 'Lazy-loaded heavyweight management workspaces while preserving every workflow.'],
    ['src/layout/EditorLayout.vue', 'Made idle warmup sequential, cancellable on first input and disabled on constrained hardware.'],
    ['scripts/verify-v26.09-runtime-performance.mjs', 'Added reproducible 10k/50k/100k latency, work, allocation, mutation and checksum qualification.']
  ],
  '26.10': [
    ['src/runtime/stableCreatorPlatform.ts', 'Mapped every public operation through one exact seven-dimension readiness policy.'],
    ['src/runtime/platformGapRegister.ts', 'Classified every known platform gap and exposed open-blocking release status.'],
    ['src/runtime/controlRegistry.ts', 'Made test/accessibility identities structural, stable and locale-independent.'],
    ['src/assets/main.css', 'Applied the final cross-panel containment, focus, touch-target, locale and typography safety net.'],
    ['src/runtime/packages.ts', 'Removed duplicated version authority in package/runtime integration.'],
    ['src/runtime/profiler.ts', 'Removed duplicated version authority in profiler evidence.'],
  ['src/runtime/releaseEngineering.ts', 'Removed duplicated version authority in release diagnostics.'],
  ['scripts/verify-v26.10-readiness.mjs', 'Verified all 401 operations, seven readiness dimensions, typed gaps, manual anchors and standard release authorities.'],
    ['docs/PLATFORM_GAP_REGISTER_26_10.md', 'Published the typed final gap register.'],
    ['docs/STABLE_CREATOR_PLATFORM_26_10.md', 'Published the stable-platform contract and completion boundary.'],
    ['docs/SUPPORT_MATRIX_26_10.md', 'Separated local support from matching-host, hardware and external certification.'],
    ['docs/API_SDK_26_10.md', 'Published the current API and SDK guide.'],
    ['docs/MIGRATION_26_10.md', 'Published migration, backup and rollback guidance.'],
    ['docs/TROUBLESHOOTING_26_10.md', 'Published symptom-based recovery guidance.'],
    ['docs/REPRODUCIBILITY_26_10.md', 'Defined deterministic local packaging and honest second-machine limits.'],
    ['docs/CLEAN_MACHINE_QUALIFICATION_26_10.md', 'Defined the independent clean-machine protocol.'],
    ['docs/INDEPENDENT_USABILITY_26_10.md', 'Defined beginner/expert usability observation without fabricating results.']
  ]
}
const sharedChangeManifest = [
  ['.gitignore', 'Excluded dependencies, builds, audits, caches, logs, secrets, local staging, release output and instructions.txt.'],
  ['package.json', 'Added explicit versioned prepare, verify, audit, evidence and release commands.'],
  ['scripts/set-calendar-release.mjs', 'Made calendar authority changes preflighted, idempotent, transactional and fully validated.'],
  ['scripts/prepare-calendar-release.ps1', 'Added the reproducible clean-checkout preparation and evidence workflow.'],
  ['scripts/run-tauri.mjs', 'Reused a validated ignored repository-local Cargo cache across native builds and removed destructive per-run cache churn.'],
  ['scripts/package-release.ps1', 'Added canonical labels, exact fresh-source evidence, compatible references and deterministic archives.'],
  ['scripts/verify-release-package.ps1', 'Added independent archive, authority, evidence, source, reference and checksum validation.'],
  ['scripts/generate-calendar-release-evidence.mjs', 'Added exact report schemas, fresh source inventory, atomic evidence and a path-level edit ledger.'],
  ['scripts/generate-v6.0.0-teaching-manual.mjs', 'Made the trilingual 401-operation manual cumulative, calendar-labelled and idempotent.'],
  ['scripts/generate-v26.08-v26.10-reference-projects.mjs', 'Generated release-filtered, structurally verified runnable references.'],
  ['scripts/nova-export.mjs', 'Made explicit CLI target/architecture/runtime overrides resolve a compatible registered template while preserving unknown custom-template errors.'],
  ['scripts/verify-v6.2.0-windows.mjs', 'Made Windows smoke verification consume the sanitized executable declared and hashed by the export build report.'],
  ['scripts/audit-calendar-milestone.mjs', 'Verified the public calendar label and machine version as their separate documented manual authorities.'],
  ['manual/MANUAL.en.md', 'Regenerated the complete English task manual.'],
  ['manual/MANUAL.de.md', 'Regenerated the complete German task manual.'],
  ['manual/MANUAL.zh-CN.md', 'Regenerated the complete Chinese task manual.'],
  ['manual/index.html', 'Regenerated the searchable multilingual offline manual with stable bookmarks.'],
  ['README.md', 'Updated release identity, feature truth and the clean-checkout release workflow.'],
  ['README.zh-CN.md', 'Updated Chinese release identity, feature truth and the clean-checkout release workflow.'],
  ['docs/UI_LAYOUT_AUDIT_26_08_TO_26_10.md', 'Recorded the every-panel locale, scale, viewport, interaction and containment matrix.'],
  ['docs/VERSIONING_2026.md', 'Documented the canonical public/machine calendar-version mapping.'],
  ['docs/STABLE_CONTRACTS.md', 'Made 26.10 and the less-than-27 compatibility ceiling current while retaining history.'],
  ['docs/KNOWN_LIMITATIONS.md', 'Separated current local limits from historical 7.0 notes and external work.']
]
const audits = join(root, 'release-audits'), finalEvidence = join(audits, `evidence-v${release}`), evidence = join(audits, `.evidence-v${release}-staging`), generatedAt = new Date().toISOString()
const sha256 = value => createHash('sha256').update(value).digest('hex')
const readJson = async name => JSON.parse(await readFile(join(audits, name), 'utf8'))
const writeJson = (path, value) => writeFile(path, `${JSON.stringify(value, null, 2)}\n`)
const focusName = release === '26.08' ? 'v26.08-platform-input.json' : release === '26.09' ? 'v26.09-runtime-performance.json' : 'v26.10-readiness-verification.json'
const reports = {
  product: await readJson(`v${release}-product-audit.json`), verification: await readJson(`v${release}-verification.json`), focus: await readJson(focusName),
  interactions: await readJson(`v${release}-user-interactions.json`), history: await readJson(`v${release}-history-verification.json`), templates: await readJson('template-catalog-verification.json'),
  layout: await readJson(`v${release}-layout-browser.json`), layoutContract: await readJson(`v${release}-layout-contract.json`), windows: await readJson(`v${release}-windows-smoke.json`), headless: await readJson(`v${release}-headless-smoke.json`),
  security: await readJson(`v${release}-dependency-audit.json`), performance: await readJson(`v${release}-benchmarks.json`), stability: await readJson(`v${release}-stability-smoke.json`), hygiene: await readJson('repository-hygiene.json')
}
const reportSpecifications = {
  product: { format: `nova-v${release}-product-audit`, version: 1, release: true, engine: true },
  verification: { format: `nova-v${release}-verification`, version: 1, release: true, engine: true },
  focus: { format: release === '26.08' ? 'nova-v26.08-platform-input-verification' : release === '26.09' ? 'nova-v26.09-runtime-performance-verification' : 'nova-v26.10-readiness-verification', version: release === '26.09' ? 2 : 1, release: true, engine: true },
  interactions: { format: `nova-v${release}-user-interaction-audit`, version: 1, release: true, engine: true },
  history: { format: `nova-v${release}-history-verification`, version: 1, release: true, engine: true },
  templates: { format: 'nova-template-catalog-verification', version: 3, release: true, engine: true },
  layout: { format: `nova-v${release}-layout-qualification`, version: 1, release: true, engine: true },
  layoutContract: { format: `nova-v${release}-layout-contract`, version: 1, release: true, engine: true },
  windows: { format: `nova-v${machineVersion}-windows-game-smoke`, version: 1, engine: true },
  headless: { format: `nova-v${release}-headless-authority-verification`, version: 1, release: true, engine: true },
  security: { format: `nova-v${machineVersion}-dependency-lock-audit`, version: 1, engine: true },
  performance: { format: 'nova-benchmark-report', version: 1, engine: true },
  stability: { format: 'nova-stability-report', version: 1, engine: true },
  hygiene: { format: 'nova-repository-hygiene-audit', version: 1 }
}
const sourceInputs = await sourceInputInventory()
const latestQualificationInputAt = Math.max(...await Promise.all(sourceInputs.map(item => stat(join(root, item.path)).then(value => value.mtimeMs))))
const authorityIssues = Object.entries(reports).flatMap(([name, report]) => {
  const issues = [], specification = reportSpecifications[name]
  if (!specification || report.format !== specification.format || Number(report.version) !== specification.version) issues.push(`${name}: format/version=${String(report.format)}/${String(report.version)}`)
  if (report.status !== 'passed') issues.push(`${name}: status=${String(report.status)}`)
  if (specification?.engine && report.engineVersion !== machineVersion) issues.push(`${name}: engine=${String(report.engineVersion)}`)
  if (report.machineVersion && report.machineVersion !== machineVersion) issues.push(`${name}: machine=${String(report.machineVersion)}`)
  if (specification?.release && report.release !== release) issues.push(`${name}: release=${String(report.release)}`)
  const generated = Date.parse(report.generatedAt)
  if (!Number.isFinite(generated) || generated > Date.now() + 300_000) issues.push(`${name}: generatedAt=${String(report.generatedAt)}`)
  else if (generated + 1_000 < latestQualificationInputAt) issues.push(`${name}: report predates the final source inputs`)
  if (Number(report.severity0Open ?? 0) !== 0 || Number(report.severity1Open ?? 0) !== 0) issues.push(`${name}: open severity 0/1`)
  return issues
})
await rm(evidence, { recursive: true, force: true })
for (const folder of ['runtime', 'layout', 'build', 'manual', 'documentation', 'performance', 'references', 'security', 'external']) await mkdir(join(evidence, folder), { recursive: true })
for (const [source, target] of [
  [`v${release}-product-audit.json`, 'runtime/product-audit.json'], [`v${release}-verification.json`, 'runtime/verification.json'], [focusName, 'runtime/focused-verification.json'],
  [`v${release}-user-interactions.json`, 'runtime/user-interactions.json'], [`v${release}-history-verification.json`, 'runtime/migration-history.json'], ['template-catalog-verification.json', 'runtime/template-catalog.json'],
  [`v${release}-dependency-audit.json`, 'runtime/dependency-audit.json'], ['repository-hygiene.json', 'security/repository-hygiene.json'],
  [`v${release}-layout-browser.json`, 'layout/layout-browser.json'], [`v${release}-layout-contract.json`, 'layout/layout-contract.json'],
  [`v${release}-windows-smoke.json`, 'build/windows-smoke.json'], [`v${release}-headless-smoke.json`, 'build/headless-authority.json'],
  [`v${release}-benchmarks.json`, 'performance/benchmarks.json'], [`v${release}-stability-smoke.json`, 'performance/stability-local.json']
]) await cp(join(audits, source), join(evidence, target))
for (const name of ['MANUAL.en.md', 'MANUAL.de.md', 'MANUAL.zh-CN.md', 'index.html']) await cp(join(root, 'manual', name), join(evidence, 'manual', name))
const documentation = release === '26.10'
  ? ['ROADMAP_26_01_TO_26_10.md', 'VERSIONING_2026.md', 'PLATFORM_GAP_REGISTER_26_10.md', 'STABLE_CREATOR_PLATFORM_26_10.md', 'SUPPORT_MATRIX_26_10.md', 'REPRODUCIBILITY_26_10.md', 'CLEAN_MACHINE_QUALIFICATION_26_10.md', 'INDEPENDENT_USABILITY_26_10.md', 'MIGRATION_26_10.md', 'TROUBLESHOOTING_26_10.md', 'API_SDK_26_10.md', 'UI_LAYOUT_AUDIT_26_08_TO_26_10.md', `RELEASE_NOTES_${release.replace('.', '_')}.md`]
  : ['ROADMAP_26_01_TO_26_10.md', 'VERSIONING_2026.md', 'UI_LAYOUT_AUDIT_26_08_TO_26_10.md', `RELEASE_NOTES_${release.replace('.', '_')}.md`, release === '26.08' ? 'PLATFORM_INPUT_ACCESSIBILITY_26_08.md' : 'LARGE_WORLD_PERFORMANCE_6_8.md']
for (const name of documentation) await cp(join(root, 'docs', name), join(evidence, 'documentation', name))
const referenceIds = release === '26.08' ? ['platform-v2608-touch-pen-accessibility', 'server-v2608-headless-authority'] : release === '26.09' ? ['performance-v2609-large-world', 'collaboration-v2609-semantic-merge', 'server-v2609-headless-authority'] : ['creator-v2610-code-game', 'creator-v2610-block-game', 'creator-v2610-mixed-game', 'server-v2610-headless-authority']
for (const id of referenceIds) await cp(join(root, 'reference-projects/projects', id), join(evidence, 'references', id), { recursive: true })

const headlessName = `Nova ${release} Headless Authority.exe`
const artifactInputs = [
  ['web-editor', 'dist/index.html'], ['web-player', 'dist/player.html'], ['windows-editor', 'src-tauri/target/release/nova_a.exe'],
  ['windows-nsis', `src-tauri/target/release/bundle/nsis/Nova_A_${machineVersion}_x64-setup.exe`], ['windows-msi', `src-tauri/target/release/bundle/msi/Nova_A_${machineVersion}_x64_en-US.msi`],
  ['windows-headless-authority', `release-audits/headless-output-v${release}/${headlessName}`]
]
const artifacts = await Promise.all(artifactInputs.map(async ([name, path]) => { try { const bytes = await readFile(join(root, path)); return { name, path, bytes: bytes.length, sha256: sha256(bytes), status: 'passed' } } catch { return { name, path, status: 'missing' } } }))
const buildsPassed = artifacts.every(item => item.status === 'passed')
const byName = new Map(artifacts.map(item => [item.name, item]))
for (const [reportName, localName] of [['editor', 'windows-editor'], ['msi', 'windows-msi'], ['setup', 'windows-nsis']]) {
  const qualified = reports.windows.artifacts?.find(item => item?.name === reportName), current = byName.get(localName)
  if (!qualified || !current || current.status !== 'passed' || qualified.sha256 !== current.sha256 || Number(qualified.bytes) !== current.bytes) authorityIssues.push(`windows smoke does not match current ${localName}`)
}
const headless = byName.get('windows-headless-authority')
if (!headless || headless.status !== 'passed' || reports.headless.artifact?.sha256 !== headless.sha256 || Number(reports.headless.artifact?.bytes) !== headless.bytes) authorityIssues.push('headless smoke does not match current authority executable')
await writeJson(join(evidence, 'build/local-builds.json'), { format: 'nova-local-build-evidence', version: 1, release, engineVersion: machineVersion, generatedAt, artifacts, status: buildsPassed ? 'passed' : 'incomplete' })

const externalGates = { publisherSigning: 'pending-external', cleanMachineLifecycle: 'pending-external', secondMachineReproducibility: 'pending-external', matchingHostLinuxMacos: 'pending-external', androidHardwareStore: 'pending-external', firefoxWebkitMatrix: 'pending-external', nativeAssistiveTechnology: 'pending-external', independentBeginnerExpertObservation: 'pending-external', realLowEndHardware: 'pending-external', publicRelayHostileNetwork: 'pending-external', independentSecurityReview: 'pending-external', ecosystemProductionAdoption: 'pending-external', soak72Hours: 'pending-external' }
await writeJson(join(evidence, 'external/gates.json'), { format: 'nova-external-certification-gates', version: 1, release, generatedAt, gates: Object.entries(externalGates).map(([name, status]) => ({ name, status, claimed: false })) })
await cp(join(root, `docs/RELEASE_NOTES_${release.replace('.', '_')}.md`), join(audits, `v${release}-release-notes.md`))
await writeFile(join(audits, `v${release}-edit-ledger.md`), editLedger())

const sourceIdentity = sourceState()
const environment = { id: `${platform}-${arch}-${versions.node}`, platform, architecture: arch, node: versions.node, rust: safeExec('rustc', ['--version']), cargo: safeExec('cargo', ['--version']) }
const localQualificationComplete = authorityIssues.length === 0 && buildsPassed
const entries = await Promise.all((await filesBelow(evidence)).sort().filter(path => !path.endsWith('evidence-manifest.json')).map(async path => { const contents = await readFile(path); return { path: relative(evidence, path).split('\\').join('/'), sha256: sha256(contents), bytes: contents.length, source: sourceIdentity.commit, tool: 'generate-calendar-release-evidence.mjs', environment: environment.id } }))
const sourceInputDigest = sha256(sourceInputs.map(item => `${item.path}\0${item.sha256}\0${item.bytes}\n`).join(''))
await writeJson(join(evidence, 'evidence-manifest.json'), { format: 'nova-release-evidence-manifest', version: 1, release, machineVersion, engineVersion: machineVersion, generatedAt, source: sourceIdentity, sourceInputDigest, sourceInputs, environment, localQualificationComplete, localReportAuthorities: { status: authorityIssues.length ? 'failed' : 'passed', issues: authorityIssues }, externalCertificationComplete: false, externalGates, entries })
if (!localQualificationComplete) throw new Error(`Nova_A ${release} evidence is incomplete: ${[...authorityIssues, ...artifacts.filter(item => item.status !== 'passed').map(item => `missing ${item.path}`)].join('; ')}`)
const previousEvidence = `${finalEvidence}.previous`
await rm(previousEvidence, { recursive: true, force: true })
let previousMoved = false
try { await rename(finalEvidence, previousEvidence); previousMoved = true } catch (error) { if (error?.code !== 'ENOENT') throw error }
try { await rename(evidence, finalEvidence) } catch (error) { if (previousMoved) await rename(previousEvidence, finalEvidence); throw error }
await rm(previousEvidence, { recursive: true, force: true })
console.log(`Nova_A ${release} evidence generated: ${entries.length} hashed entries; external gates remain pending.`)

function safeExec(command, args) { try { return execFileSync(command, args, { cwd: root, encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] }).trim() } catch { return 'unavailable' } }
async function sourceInputInventory() {
  const excludedRoots = new Set(['.git', '.pnpm-store', '.VSCodeCounter', '.vite', '.cache', '.turbo', '.vscode', '.idea', 'dist', 'dist-ssr', 'node_modules', 'release-audits', 'releases', 'target', 'coverage', 'playwright-report', 'test-results', 'logs'])
  const output = []
  async function walk(directory, prefix = '') {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name, first = path.split('/')[0]
      if (path === 'instructions.txt' || first.toLowerCase().startsWith('stage') || excludedRoots.has(first) || /^src-tauri\/(?:target|gen)(?:\/|$)/i.test(path) || /^nova_core\/target(?:\/|$)/i.test(path)) continue
      if (entry.isSymbolicLink()) continue
      const absolute = join(directory, entry.name)
      if (entry.isDirectory()) { await walk(absolute, path); continue }
      if (!entry.isFile()) continue
      const name = entry.name, extension = name.includes('.') ? name.slice(name.lastIndexOf('.')).toLowerCase() : ''
      if (['.pem', '.pfx', '.key'].includes(extension) || (/^\.env(?:\..+)?$/i.test(name) && name !== '.env.example') || /^(?:\.npmrc|\.pypirc|credentials?(?:\..+)?\.json|secrets?(?:\..+)?\.json)$/i.test(name) || /^(?:\.DS_Store|Thumbs\.db|Desktop\.ini)$/i.test(name) || /^(?:npm|yarn|pnpm|lerna)-debug\.log/i.test(name) || /\.(?:log|tsbuildinfo|tmp|temp|local)$/i.test(name) || /\.sw.$/i.test(name)) continue
      const bytes = await readFile(absolute)
      output.push({ path, sha256: sha256(bytes), bytes: bytes.length })
    }
  }
  await walk(root)
  return output.sort((first, second) => first.path === second.path ? 0 : first.path < second.path ? -1 : 1)
}
function sourceState() { const commit = safeExec('git', ['-c', `safe.directory=${root.split('\\').join('/')}`, 'rev-parse', 'HEAD']); const valid = /^[a-f0-9]{40,64}$/.test(commit); if (!valid) return { commit: 'unavailable-source-snapshot', state: 'filesystem-snapshot', dirty: true, note: 'Filesystem source snapshot without an available Git commit; signed tag verification remains external.' }; const dirty = Boolean(safeExec('git', ['-c', `safe.directory=${root.split('\\').join('/')}`, 'status', '--porcelain']).trim()); return { commit, state: dirty ? 'git-working-tree' : 'git-commit', dirty, note: dirty ? 'Working-tree snapshot based on the recorded commit; signed tag verification remains external.' : 'Clean commit; publisher signing remains external.' } }
async function filesBelow(directory) { const files = []; for (const entry of await readdir(directory, { withFileTypes: true })) { const path = join(directory, entry.name); entry.isDirectory() ? files.push(...await filesBelow(path)) : files.push(path) } return files }
function editLedger() {
  const order = ['26.08', '26.09', '26.10'], through = order.indexOf(release)
  const paths = [...sharedChangeManifest, ...order.slice(0, through + 1).flatMap(item => releaseChangeManifest[item])]
    .sort(([left], [right]) => left.localeCompare(right))
  const lines = paths.map(([path, detail]) => `- \`${path}\` — ${detail}`)
  return `# Nova_A ${release} edit ledger\n\nPublic release **${release}** uses machine version **${machineVersion}**. Project Format 2/schema 29 and all seven frozen contracts are retained. No feature, animation, control, authored value, template, runtime path, or public compatibility contract was removed.\n\n## Files changed or added\n\nThis deterministic path-level manifest is cumulative through ${release}; exact bytes for the complete packaged source snapshot are recorded separately as \`sourceInputs\` in the evidence manifest.\n\n${lines.join('\n')}\n\n## Generated release evidence and artifacts\n\n- Focused behavior, templates, history, safe user interactions, every-panel browser layout, Windows editor/game/server smoke, dependency, performance, stability, repository hygiene and product gates were regenerated after the final source input.\n- Hashed local evidence and exactly eleven root artifacts are produced; SHA256SUMS covers the ten non-circular artifacts.\n\n## Removed\n\n- Nothing user-visible or contract-bearing was removed. Generated caches, local instructions, credentials, staging directories and build outputs are excluded from the source archive by policy.\n`
}
