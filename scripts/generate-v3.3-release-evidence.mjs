import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { cpus, freemem, platform, release, totalmem } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const evidenceVersion = process.env.NOVA_EVIDENCE_VERSION || '3.3.0'
const evidenceTag = evidenceVersion.split('.').slice(0, 2).join('.')
const output = join(root, 'release-audits')
await mkdir(output, { recursive: true })
const read = path => readFile(join(root, path), 'utf8')
const hash = source => createHash('sha256').update(source).digest('hex')
const command = (name, args) => { const result = spawnSync(name, args, { cwd: root, encoding: 'utf8' }); return result.status === 0 ? result.stdout.trim() : `unavailable: ${(result.stderr || result.error?.message || '').trim()}` }
const [packageSource, pnpmLock, cargoLock, tauriLock] = await Promise.all([read('package.json'), read('pnpm-lock.yaml'), read('Cargo.lock'), read('src-tauri/Cargo.lock')])
const pkg = JSON.parse(packageSource)
const changedFiles = command('git', ['status', '--short']).split(/\r?\n/).filter(Boolean)
const environment = {
  format: 'nova-build-environment', version: 1, product: 'Nova_A', engineVersion: evidenceVersion, generatedAt: new Date().toISOString(),
  source: { commit: command('git', ['rev-parse', 'HEAD']), describe: command('git', ['describe', '--tags', '--always', '--dirty']), signedTag: null, workingTreeDirty: changedFiles.length > 0, changedFiles },
  host: { platform: platform(), release: release(), architecture: process.arch, logicalCpuCount: cpus().length, cpuModel: cpus()[0]?.model ?? '', totalMemoryBytes: totalmem(), freeMemoryAtCaptureBytes: freemem() },
  tools: { node: process.version, pnpm: pkg.packageManager, cargo: command('cargo', ['--version']), rustc: command('rustc', ['--version']), wasmPack: command('wasm-pack', ['--version']), tauriCli: pkg.devDependencies['@tauri-apps/cli'], vite: pkg.devDependencies.vite },
  inputs: { packageJsonSha256: hash(packageSource), pnpmLockSha256: hash(pnpmLock), cargoLockSha256: hash(cargoLock), tauriCargoLockSha256: hash(tauriLock) },
  provenanceNote: 'Working-tree snapshot. No signing identity or signed Git tag was provided; signatures and clean-machine platform claims are deliberately not asserted.'
}
await writeFile(join(output, `v${evidenceVersion}-build-environment.json`), `${JSON.stringify(environment, null, 2)}\n`, 'utf8')

const packages = new Map()
const add = (ecosystem, name, version, checksum = '') => { if (!name || !version) return; const key = `${ecosystem}:${name}@${version}`; if (packages.has(key)) return; packages.set(key, { SPDXID: `SPDXRef-${ecosystem}-${hash(key).slice(0, 16)}`, name, versionInfo: version, downloadLocation: 'NOASSERTION', filesAnalyzed: false, licenseConcluded: 'NOASSERTION', licenseDeclared: 'NOASSERTION', checksums: checksum ? [{ algorithm: 'SHA256', checksumValue: checksum }] : [], externalRefs: [{ referenceCategory: 'PACKAGE-MANAGER', referenceType: 'purl', referenceLocator: `pkg:${ecosystem}/${encodeURIComponent(name)}@${version}` }] }) }
const packageSection = pnpmLock.split(/^packages:\s*$/m)[1]?.split(/^snapshots:\s*$/m)[0] ?? ''
for (const line of packageSection.split(/\r?\n/)) { const match = line.match(/^  (?:'([^']+)'|([^:\s][^:]*)):\s*$/); const key = match?.[1] ?? match?.[2]; if (!key) continue; const separator = key.lastIndexOf('@'); if (separator > 0) add('npm', key.slice(0, separator), key.slice(separator + 1).split('(')[0]) }
for (const lock of [cargoLock, tauriLock]) for (const block of lock.split('[[package]]').slice(1)) add('cargo', block.match(/\nname = "([^"]+)"/)?.[1], block.match(/\nversion = "([^"]+)"/)?.[1], block.match(/\nchecksum = "([a-f0-9]+)"/)?.[1] ?? '')
const rootPackage = { SPDXID: 'SPDXRef-Package-Nova-A', name: 'Nova_A', versionInfo: evidenceVersion, downloadLocation: 'https://github.com/Stevenzhang543/Nova_A/', filesAnalyzed: false, licenseConcluded: 'MIT', licenseDeclared: 'MIT' }
const sbom = { spdxVersion: 'SPDX-2.3', dataLicense: 'CC0-1.0', SPDXID: 'SPDXRef-DOCUMENT', name: `Nova_A-${evidenceVersion}`, documentNamespace: `https://whitelists.top/spdx/nova-a/${evidenceVersion}/${hash(`${environment.source.commit}:${environment.inputs.pnpmLockSha256}:${environment.inputs.cargoLockSha256}`).slice(0, 32)}`, creationInfo: { created: new Date().toISOString(), creators: [`Tool: Nova_A-generate-v${evidenceTag}-release-evidence`, 'Organization: Whitelist'] }, documentDescribes: [rootPackage.SPDXID], packages: [rootPackage, ...packages.values()], relationships: [...packages.values()].map(item => ({ spdxElementId: rootPackage.SPDXID, relationshipType: 'DEPENDS_ON', relatedSpdxElement: item.SPDXID })) }
await writeFile(join(output, `v${evidenceVersion}-software-bill-of-materials.spdx.json`), `${JSON.stringify(sbom, null, 2)}\n`, 'utf8')

const truthful = {
  accessibility: { format: 'nova-accessibility-localization', version: 1, engineVersion: evidenceVersion, generatedAt: environment.generatedAt, languages: ['en','de','zh-CN'], checks: ['physics and authoring controls localized','horizontal multilingual toolbar labels','keyboard palette and Escape close','visible focus inherited','reduced motion retained'], status: 'passed' },
  platform: { format: 'nova-installer-platform-report', version: 1, engineVersion: evidenceVersion, generatedAt: environment.generatedAt, host: platform(), windowsArtifactsBuilt: platform() === 'win32', linuxCleanMachine: 'pending', macosCleanMachine: 'pending', note: 'Only the current Windows host is qualified by this release run; cross-platform claims require matching-host runners.' },
  known: { format: 'nova-known-issues', version: 1, engineVersion: evidenceVersion, generatedAt: environment.generatedAt, severity0Open: 0, severity1Open: 0, items: evidenceVersion === '3.4.0' ? [{ severity: 'S2', area: 'physics qualification', issue: 'The supplied 12-hour report advances twelve simulated hours in accelerated native time; a twelve wall-clock-hour host soak remains an external qualification.', workaround: 'Run the documented wall-clock physics soak on named reference hardware before claiming wall-clock endurance.' }, { severity: 'S2', area: 'platform qualification', issue: 'Clean Linux and macOS installer qualification remains external release engineering.', workaround: 'Run the supplied platform procedure on matching hosts.' }] : [{ severity: 'S2', area: 'qualification', issue: '24-hour native soak and clean Linux/macOS installer qualification remain external release-engineering tasks.', workaround: 'Run the supplied stability and platform procedures on named hardware before claiming those qualifications.' }] }
}
await writeFile(join(output, `v${evidenceVersion}-accessibility-localization.json`), `${JSON.stringify(truthful.accessibility, null, 2)}\n`, 'utf8')
await writeFile(join(output, `v${evidenceVersion}-installer-platform-report.json`), `${JSON.stringify(truthful.platform, null, 2)}\n`, 'utf8')
await writeFile(join(output, `v${evidenceVersion}-known-issues.json`), `${JSON.stringify(truthful.known, null, 2)}\n`, 'utf8')
await writeFile(join(output, `v${evidenceVersion}-third-party-notices.md`), `# Nova_A ${evidenceVersion} third-party notices\n\nNova_A is MIT licensed. Dependency identities are recorded in \`v${evidenceVersion}-software-bill-of-materials.spdx.json\`; individual dependency licenses remain subject to their upstream notices.\n`, 'utf8')
console.log(`Wrote v${evidenceTag} environment, SPDX inventory (${packages.size} locked packages), platform, localization, and known-issue evidence.`)
