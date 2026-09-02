import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { arch, platform, versions } from 'node:process'
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const release = '26.02'
const machineVersion = '26.2.0'
const root = dirname(dirname(fileURLToPath(import.meta.url)))
const audits = join(root, 'release-audits')
const evidence = join(audits, `evidence-v${release}`)
const generatedAt = new Date().toISOString()
const sha256 = value => createHash('sha256').update(value).digest('hex')
const readJson = async name => JSON.parse(await readFile(join(audits, name), 'utf8'))
const writeJson = (path, value) => writeFile(path, `${JSON.stringify(value, null, 2)}\n`)

await rm(evidence, { recursive: true, force: true })
for (const folder of ['runtime', 'layout', 'build', 'manual', 'documentation', 'performance', 'external']) {
  await mkdir(join(evidence, folder), { recursive: true })
}

const reports = {
  product: await readJson('v26.02-product-audit.json'),
  verification: await readJson('v26.02-verification.json'),
  interactions: await readJson('v26.02-user-interactions.json'),
  layout: await readJson('v26.02-layout-browser.json'),
  templates: await readJson('template-catalog-verification.json'),
  performance: await readJson('v26.02-benchmarks.json'),
  stability: await readJson('v26.02-stability-smoke.json')
}

for (const [source, target] of [
  ['v26.02-product-audit.json', 'runtime/product-audit.json'],
  ['v26.02-verification.json', 'runtime/verification.json'],
  ['v26.02-user-interactions.json', 'runtime/user-interactions.json'],
  ['template-catalog-verification.json', 'runtime/template-catalog.json'],
  ['v26.02-layout-browser.json', 'layout/layout-browser.json'],
  ['v26.02-benchmarks.json', 'performance/benchmarks.json'],
  ['v26.02-stability-smoke.json', 'performance/stability-local.json']
]) await cp(join(audits, source), join(evidence, target))

for (const name of ['MANUAL.en.md', 'MANUAL.de.md', 'MANUAL.zh-CN.md', 'index.html']) {
  await cp(join(root, 'manual', name), join(evidence, 'manual', name))
}
for (const name of [
  'VERSIONING_2026.md', 'FEATURE_INVENTORY_26_01.md', 'FEATURE_INVENTORY_26_02.md',
  'COMPETITIVE_REVIEW_26_01.md', 'ROADMAP_26_01_TO_26_10.md', 'TEMPLATE_LIBRARY_26_01.md',
  'VISUAL_SCRIPTING_26_01.md', 'OBJECT_EVENT_AUTHORING_26_02.md',
  'VISUAL_GRAPH_PERFORMANCE_26_02.md', 'UI_LAYOUT_AUDIT_26_01.md', 'UI_LAYOUT_AUDIT_26_02.md',
  'RELEASE_NOTES_26_02.md', 'COMPATIBILITY.md', 'STABLE_CONTRACTS.md', 'KNOWN_LIMITATIONS.md'
]) await cp(join(root, 'docs', name), join(evidence, 'documentation', name))

const artifactInputs = [
  ['web-editor', 'dist/index.html'],
  ['web-player', 'dist/player.html'],
  ['windows-editor', 'src-tauri/target/release/nova_a.exe'],
  ['windows-nsis', `src-tauri/target/release/bundle/nsis/Nova_A_${machineVersion}_x64-setup.exe`],
  ['windows-msi', `src-tauri/target/release/bundle/msi/Nova_A_${machineVersion}_x64_en-US.msi`]
]
const artifacts = await Promise.all(artifactInputs.map(async ([name, path]) => {
  try {
    const bytes = await readFile(join(root, path))
    return { name, path, bytes: bytes.length, sha256: sha256(bytes), status: 'passed' }
  } catch {
    return { name, path, status: 'missing' }
  }
}))
const buildsPassed = artifacts.every(item => item.status === 'passed')
await writeJson(join(evidence, 'build/local-builds.json'), {
  format: 'nova-local-build-evidence', version: 1, release, engineVersion: machineVersion,
  generatedAt, artifacts, status: buildsPassed ? 'passed' : 'incomplete'
})

const externalGates = [
  'publisher identity and release signing',
  'disposable clean-machine install, launch, upgrade, repair and uninstall',
  'second-machine byte reproduction',
  'matching-host Linux and macOS builds',
  'Android and iOS hardware/store lifecycle',
  'independent beginner and expert usability observation',
  'independent accessibility and security review',
  'real 72-hour editor and player soak'
]
await writeJson(join(evidence, 'external/gates.json'), {
  format: 'nova-external-certification-gates', version: 1, release, generatedAt,
  gates: externalGates.map(name => ({ name, status: 'pending-external', claimed: false }))
})

const commit = safeExec('git', ['rev-parse', 'HEAD'])
const environment = {
  id: `${platform}-${arch}-${versions.node}`,
  platform, architecture: arch, node: versions.node,
  rust: safeExec('rustc', ['--version']), cargo: safeExec('cargo', ['--version'])
}
const passed = report => report.status === 'passed'
const localQualificationComplete = Object.values(reports).every(passed) && buildsPassed
const entries = await Promise.all((await filesUnder(evidence)).sort()
  .filter(path => !path.endsWith('evidence-manifest.json'))
  .map(async path => {
    const contents = await readFile(path)
    return {
      path: relative(evidence, path).replaceAll('\\', '/'), sha256: sha256(contents), bytes: contents.length,
      source: commit, tool: 'generate-v26.02-release-evidence.mjs', environment: environment.id
    }
  }))
await writeJson(join(evidence, 'evidence-manifest.json'), {
  format: 'nova-release-evidence-manifest', version: 1, release, engineVersion: machineVersion, generatedAt,
  source: { commit, dirty: true, note: 'Current working candidate; exact signed tag remains an external gate.' },
  environment, localQualificationComplete, externalCertificationComplete: false, entries
})
if (!localQualificationComplete) throw new Error('The Nova_A 26.02 local evidence tree is incomplete; release packaging is blocked.')
console.log(`Nova_A ${release} evidence generated with ${entries.length} hashed entries; external certification remains pending.`)

function safeExec(command, args) {
  try { return execFileSync(command, args, { cwd: root, encoding: 'utf8', windowsHide: true }).trim() }
  catch { return 'unavailable' }
}
async function filesUnder(directory) {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    entry.isDirectory() ? files.push(...await filesUnder(path)) : files.push(path)
  }
  return files
}
