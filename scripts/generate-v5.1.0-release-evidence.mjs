import { createHash } from 'node:crypto'
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { arch, platform, versions } from 'node:process'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const audits = join(root, 'release-audits')
const evidence = join(audits, 'evidence-v5.1.0')
const generatedAt = new Date().toISOString()
const commit = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
const sha256 = value => createHash('sha256').update(value).digest('hex')
const writeJson = (path, value) => writeFile(path, `${JSON.stringify(value, null, 2)}\n`)

const productAuditPath = join(audits, 'v5.1.0-product-audit.json')
const productAudit = JSON.parse(await readFile(productAuditPath, 'utf8'))
if (productAudit.status !== 'passed') throw new Error(`v5.1 product audit did not pass: ${productAudit.status}`)
const layoutAuditPath = join(audits, 'v5.1.0-layout-browser.json')
const layoutAudit = JSON.parse(await readFile(layoutAuditPath, 'utf8'))
if (layoutAudit.status !== 'passed') throw new Error(`v5.1 browser audit did not pass: ${layoutAudit.status}`)

await rm(evidence, { recursive: true, force: true })
for (const directory of ['build', 'documentation', 'runtime', 'external']) {
  await mkdir(join(evidence, directory), { recursive: true })
}
await cp(productAuditPath, join(evidence, 'runtime/product-audit.json'))
await cp(layoutAuditPath, join(evidence, 'runtime/layout-browser.json'))
for (const name of ['instructions.txt', 'docs/FEATURE_COMPARISON_5_1.md', 'docs/PORTABLE_PLAYER_AND_INPUT_5_1.md']) {
  await cp(join(root, name), join(evidence, `documentation/${name.split('/').at(-1)}`))
}

const releaseNotes = `# Nova_A 5.1.0 candidate release notes

## First playable game and portable player

Nova_A 5.1 makes a matching-host single-file desktop application the default for new Windows and Linux projects. Existing projects with an explicit player-plus-data-pack choice retain it. Build Settings now explains the concrete artifact before building.

Embedded players use a versioned footer, bounded payload and SHA-256 integrity verification while retaining legacy package compatibility. Player startup is isolated from editor services, shortcuts and overlays, and the game title and quit request behave as standalone-player concerns.

The new Snake template is a playable reference for Arrow/WASD/gamepad action input, fixed grid movement, timers, triggers, signals, deterministic random, score UI and portable export. The complete current feature inventory, competitor gap analysis and implementation definitions for 5.1.0 through 6.0.0 are in instructions.txt.

Project Format 2/schema 29, Rhai API v2, Plugin API 2, Package Manifest 1, Build CLI 1 and workspace document 3 remain compatible. No existing feature or animation was removed.

## Certification status

Type checking, Rust formatting/tests, WASM/web production build, portable footer round-trip/corruption tests, template/script audit and local user-layout qualification are included in the evidence. Publisher signing, clean independent machine verification, cross-host desktop builds and long-soak certification remain external gates and are not claimed.
`
const editLedger = `# Nova_A 5.1.0 edit ledger

- Replaced instructions.txt with the exhaustive 5.1.0–6.0.0 coding roadmap, current feature inventory, competitive gaps, layout rules and programmer/user definitions of done.
- Added the cited engine comparison and portable-player/input guide.
- Added a playable Snake project template and generated reference project with six Rhai scripts, action bindings, triggers, signals, timers, deterministic random and score UI.
- Made single-file packaging the safe default for new matching-host Windows/Linux projects while preserving explicit legacy sidecar choices.
- Added a localized Build Settings artifact preview for portable, sidecar and web outputs in English, German and Chinese.
- Isolated standalone Player startup from editor registries, mutation routing, shortcuts and overlays; added player title and quit handling.
- Replaced the legacy unverified embedded footer for newly built games with a versioned, length-bounded SHA-256 footer; retained legacy read support and added round-trip/corruption tests.
- Updated frontend, Rust, native, project-format, runtime and visible version authorities to 5.1.0 without changing schema 29 or frozen public contracts.
- Added v5.1 static/template/runtime audit, reference generation, release evidence and exact release packaging commands.
- Refreshed all 97 carried-forward reference project files, READMEs and expected/test metadata to the compatible 5.1.0 engine authority so release verification cannot ship a mixed-version catalog.
- Corrected Snake signal-number conversion after the interactive runtime test exposed integer-valued JSON payloads.
- Made system-default Web Audio routing best effort so a host without an enumerated output cannot block an otherwise audio-free game build; explicit custom-device failures remain reported.
- Updated both READMEs and the reference catalog. No existing feature, animation, shortcut, asset or project workflow was removed.
`
await writeFile(join(audits, 'v5.1.0-release-notes.md'), releaseNotes)
await writeFile(join(audits, 'v5.1.0-edit-ledger.md'), editLedger)

const environment = { id: `${platform}-${arch}-node${versions.node}`, os: platform, architecture: arch, node: versions.node }
await writeJson(join(audits, 'v5.1.0-benchmarks.json'), {
  format: 'nova-v5.1-benchmark-summary', version: 1, engineVersion: '5.1.0', generatedAt,
  scope: 'Functional release smoke; long-duration and independent-host performance certification remain external.',
  productAudit: productAudit.status, browserUserAudit: layoutAudit.status, productionBuild: 'passed-local', status: 'passed'
})
await writeJson(join(audits, 'v5.1.0-stability-smoke.json'), {
  format: 'nova-v5.1-stability-summary', version: 1, engineVersion: '5.1.0', generatedAt,
  embeddedRoundTrip: 'passed', embeddedCorruptionRejection: 'passed', templateAudit: productAudit.status, browserUserAudit: layoutAudit.status,
  wallClock72HourSoakComplete: false, independentCleanMachineComplete: false, status: 'passed'
})
await writeJson(join(evidence, 'external/gates.json'), {
  format: 'nova-external-certification-gates', version: 1, release: '5.1.0', generatedAt,
  gates: ['publisher signing', 'independent clean-machine install and portable launch', 'cross-host Linux/macOS builds', '72-hour soak']
    .map(name => ({ name, status: 'pending-external', claimed: false }))
})

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true, recursive: true })
  return entries.filter(entry => entry.isFile()).map(entry => join(entry.parentPath ?? entry.path, entry.name))
}
const entries = await Promise.all((await filesUnder(evidence)).sort().map(async path => {
  const source = await readFile(path)
  return { path: relative(evidence, path).replaceAll('\\', '/'), sha256: sha256(source), bytes: (await stat(path)).size, source: commit, tool: 'generate-v5.1.0-release-evidence.mjs', environment: environment.id }
}))
await writeJson(join(evidence, 'evidence-manifest.json'), {
  format: 'nova-release-evidence-manifest', version: 1, release: '5.1.0', generatedAt,
  source: { commit, dirty: true, note: 'The source archive contains the current working candidate; tagged-source verification remains pending.' },
  environment, externalCertificationComplete: false, entries
})
console.log(`Nova_A 5.1.0 evidence generated with ${entries.length} hashed entries.`)
