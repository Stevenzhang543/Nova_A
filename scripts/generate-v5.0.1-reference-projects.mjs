import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const projects = join(root, 'reference-projects', 'projects')
const json = value => `${JSON.stringify(value, null, 2)}\n`
const OFFICIAL_SECURITY = {
  'top.whitelists.novaa.navigation': ['26434adf10b122a8708afc496f682242d7f634a344bbd00f4699ff71b2e3a9ae', 'runtime'],
  'top.whitelists.novaa.ai': ['11c75ccdc9f2037548e9eef31bd3ee34134a365e9eaeef741ee8e7917a69ac4e', 'runtime'],
  'top.whitelists.novaa.object-pool': ['1bb0707fffc9aa16790924146797791413754147129750608f29360bd2ee4e86', 'runtime'],
  'top.whitelists.novaa.streaming-tools': ['fbd228b8e1b6f780487885dea93276958c978d2f13f117a7c654c78d630cb047', 'editor'],
  'top.whitelists.novaa.networking': ['fd048525377499fbd054cb74b69d5369c57d11431951695d413ec1e14cfe3424', 'runtime'],
  'top.whitelists.novaa.android': ['cb2f4c6efb9bf972451cf545a4854878f8515ca327417424975ad2756349a5ca', 'build']
}
function refreshPackage(item) {
  if (!item?.manifest) return
  const manifest = item.manifest
  if (manifest.engine) manifest.engine = String(manifest.engine).replace('<5.0.1', '<6.0.0')
  const official = OFFICIAL_SECURITY[manifest.id]
  if (manifest.publisher === 'Whitelist' && (official || String(manifest.signature ?? '').startsWith('nova-official-v1:'))) {
    if (official) {
      manifest.sha256 = official[0]
      manifest.signature = `nova-official-v1:${official[0]}`
      manifest.entryPointType = official[1]
      manifest.apiCompatibility = '>=1 <2'
      manifest.dependencyHashes = {}
    }
    manifest.license = 'MIT'
    manifest.licenseUrl = 'https://github.com/Stevenzhang543/Nova_A/blob/main/LICENSE.md'
    manifest.provenance = 'nova-official-v1'
    manifest.certification = 'certified'
    manifest.vulnerabilityPolicy = 'Report privately through the Nova_A security policy; Critical and High findings block Stable installation.'
  }
}
function refreshProject(project) {
  project.engineVersion = '5.0.1'
  project.formatVersion = 29
  project.manifest ??= {}
  project.manifest.schemaVersion = 29
  project.manifest.engineCompatibility = { minimum: '3.9.0', maximumExclusive: '6.0.0' }
  for (const item of project.packages?.installed ?? []) refreshPackage(item)
  const installed = new Map((project.packages?.installed ?? []).map(item => [item.manifest?.id, item.manifest]))
  for (const lock of project.packages?.lockfile ?? []) {
    const manifest = installed.get(lock.id)
    if (!manifest) continue
    lock.sha256 = manifest.sha256
    lock.signature = manifest.signature
    lock.entryPointType = manifest.entryPointType
    lock.dependencies = { ...(manifest.dependencyHashes ?? {}) }
  }
  for (const asset of project.assets ?? []) if (typeof asset?.source === 'string' && asset.source.includes('"engine"')) asset.source = asset.source.replace('<5.0.1', '<6.0.0')
}
const fixtures = [
  ['build-v50-platform-matrix', 'empty', 'Build 5.0 Platform Matrix', ['Windows Tier 1', 'Web Tier 1', 'explicit unavailable targets', 'export presets', 'content manifest']],
  ['build-v50-release-pipeline', 'build-automation', 'Build 5.0 Release Pipeline', ['provenance', 'SBOM', 'web headers', 'release channel', 'clean-machine job', 'build comparison']],
  ['package-v50-extension-sdk', 'package-authoring', 'Package 5.0 Extension SDK', ['publisher identity', 'checksums', 'permissions', 'license', 'API 2 certification', 'offline mirror', 'rollback']],
  ['collaboration-v50-local-team', 'source-control-workflow', 'Collaboration 5.0 Local Team', ['Git status', 'semantic diff', 'ownership', 'CODEOWNERS', 'task links', 'change notes', 'binary lock guidance']],
  ['first-game-v50-tier1', 'platformer', 'First Game 5.0 Tier-1 Export', ['first-game tutorial', 'Windows export', 'web export', 'Project Health gate', 'release evidence']]
]

function updateProject(project, slug, title, features) {
  refreshProject(project)
  project.projectMetadata ??= {}
  project.projectMetadata.name = title
  project.projectMetadata.template = slug
  project.manifest.name = title
  project.projectSettings ??= {}
  project.projectSettings.build ??= {}
  project.projectSettings.build.releaseEngineering = {
    release: '5.0.1', schema: 29, rhaiApi: 2, pluginApi: 2, packageManifest: 1, buildCli: 1,
    tier1: ['windows', 'web'], experimental: ['linux', 'macos', 'android'],
    provenance: true, sbom: true, deterministicUnsignedPayload: true, features
  }
  project.projectSettings.team ??= {
    enabled: false, networkOperations: false, ownership: [], taskLinks: [], changeNotes: [], sharedPresets: [], binaryLocks: []
  }
}

for (const [slug, source, title, features] of fixtures) {
  const project = JSON.parse(await readFile(join(projects, source, 'project.nova'), 'utf8'))
  updateProject(project, slug, title, features)
  const directory = join(projects, slug)
  await mkdir(directory, { recursive: true })
  await writeFile(join(directory, 'project.nova'), json(project))
  await writeFile(join(directory, 'expected-output.json'), json({
    engineVersion: '5.0.1', schema: 29, projectName: title, expectedValidation: 'pass', features,
    tier1: ['windows', 'web'], externalGatesMayRemainPending: true, untrustedPackagesExecute: false
  }))
  await writeFile(join(directory, 'test-controls.json'), json({
    engineVersion: '5.0.1', open: 'Project Manager > Open project.nova',
    verify: ['Manage > Project Health > Release readiness', 'Build Settings > Evidence', 'Packages > Plugin API compatibility'],
    build: ['pnpm nova -- build --preset windows-release', 'pnpm nova -- build --preset web-release'],
    expected: features
  }))
  await writeFile(join(directory, 'README.md'), `# ${title}\n\nEngine **5.0.1**, Project Format 2, schema 29.\n\nRequired packages: None; the package fixture may additionally load \`../../plugins/hello-plugin/plugin.json\` after reviewing its permissions and provenance.\n\nTarget platforms: Windows x86-64 and Web (Tier 1). Linux and macOS are matching-host Experimental targets; mobile is unavailable.\n\nKnown limitations: signing, disposable clean-machine lifecycle, external browsers, independent-machine reproducibility and the 14-day RC window require real external evidence.\n\n## Purpose\n\nValidates ${features.join(', ')} without a mandatory cloud service.\n\n## Procedure\n\n1. Open \`project.nova\` and follow \`test-controls.json\`.\n2. Resolve local Project Health failures before export.\n3. Build both declared Tier-1 presets and retain manifests, hashes, logs, provenance, and evidence.\n4. Treat matching-host Linux/macOS, mobile, clean-machine lifecycle, independent-machine reproducibility, and the 14-day RC window as external gates until signed evidence is attached.\n`)
}

const entries = (await readdir(projects, { withFileTypes: true })).sort((left, right) => Number(right.isDirectory()) - Number(left.isDirectory()) || left.name.localeCompare(right.name))
for (const entry of entries) {
  if (entry.isFile() && entry.name.endsWith('.nova')) {
    try {
      const projectPath = join(projects, entry.name), sibling = join(projects, entry.name.slice(0, -5), 'project.nova')
      let source = await readFile(projectPath, 'utf8')
      try { source = await readFile(sibling, 'utf8') } catch { /* Standalone project. */ }
      const project = JSON.parse(source)
      refreshProject(project)
      await writeFile(projectPath, json(project))
    } catch { /* helper file */ }
    continue
  }
  if (!entry.isDirectory()) continue
  const directory = join(projects, entry.name)
  try {
    const projectPath = join(directory, 'project.nova')
    const project = JSON.parse(await readFile(projectPath, 'utf8'))
    refreshProject(project)
    await writeFile(projectPath, json(project))
    const readmePath = join(directory, 'README.md')
    const readme = await readFile(readmePath, 'utf8')
    await writeFile(readmePath, readme.replace(/Engine \*\*\d+\.\d+\.\d+\*\*/g, 'Engine **5.0.1**'))
    for (const name of ['expected-output.json', 'test-controls.json']) {
      try {
        const path = join(directory, name)
        const document = JSON.parse(await readFile(path, 'utf8'))
        document.engineVersion = '5.0.1'
        await writeFile(path, json(document))
      } catch { /* optional metadata */ }
    }
  } catch { /* helper directory */ }
}

console.log('Generated five Nova_A v5.0.1 release-system references and refreshed all reference metadata.')

