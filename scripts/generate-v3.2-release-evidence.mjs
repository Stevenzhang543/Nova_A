import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { cpus, freemem, platform, release, totalmem } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const output = join(root, 'release-audits')
await mkdir(output, { recursive: true })
const command = (name, args) => { const result = spawnSync(name, args, { cwd: root, encoding: 'utf8' }); return result.status === 0 ? result.stdout.trim() : `unavailable: ${(result.stderr || result.error?.message || '').trim()}` }
const read = path => readFile(join(root, path), 'utf8')
const hash = source => createHash('sha256').update(source).digest('hex')
const [packageJsonSource, pnpmLock, cargoLock, tauriCargoLock] = await Promise.all([read('package.json'), read('pnpm-lock.yaml'), read('Cargo.lock'), read('src-tauri/Cargo.lock')])
const packageJson = JSON.parse(packageJsonSource)
const gitCommit = command('git', ['rev-parse', 'HEAD'])
const gitDescribe = command('git', ['describe', '--tags', '--always', '--dirty'])
const changedFiles = command('git', ['status', '--short']).split(/\r?\n/).filter(Boolean)

const environment = {
  format: 'nova-build-environment', version: 1, product: 'Nova_A', engineVersion: '3.2.0', generatedAt: new Date().toISOString(),
  source: { commit: gitCommit, describe: gitDescribe, signedTag: null, workingTreeDirty: changedFiles.length > 0, changedFiles },
  host: { platform: platform(), release: release(), architecture: process.arch, logicalCpuCount: cpus().length, cpuModel: cpus()[0]?.model ?? '', totalMemoryBytes: totalmem(), freeMemoryAtCaptureBytes: freemem() },
  tools: { node: process.version, pnpm: packageJson.packageManager, cargo: command('cargo', ['--version']), rustc: command('rustc', ['--version']), wasmPack: command('wasm-pack', ['--version']), tauriCli: packageJson.devDependencies['@tauri-apps/cli'], vite: packageJson.devDependencies.vite },
  inputs: { packageJsonSha256: hash(packageJsonSource), pnpmLockSha256: hash(pnpmLock), cargoLockSha256: hash(cargoLock), tauriCargoLockSha256: hash(tauriCargoLock) },
  provenanceNote: 'Working-tree snapshot. No signed release tag or signing key was available; this report does not claim signed provenance.'
}
await writeFile(join(output, 'v3.2.0-build-environment.json'), `${JSON.stringify(environment, null, 2)}\n`, 'utf8')

const packages = new Map()
const addPackage = (ecosystem, name, version, checksum = '') => {
  if (!name || !version) return
  const key = `${ecosystem}:${name}@${version}`
  if (packages.has(key)) return
  packages.set(key, { SPDXID: `SPDXRef-${ecosystem}-${hash(key).slice(0, 16)}`, name, versionInfo: version, downloadLocation: 'NOASSERTION', filesAnalyzed: false, licenseConcluded: 'NOASSERTION', licenseDeclared: 'NOASSERTION', checksums: checksum ? [{ algorithm: 'SHA256', checksumValue: checksum }] : [], externalRefs: [{ referenceCategory: 'PACKAGE-MANAGER', referenceType: ecosystem === 'cargo' ? 'purl' : 'purl', referenceLocator: `pkg:${ecosystem === 'cargo' ? 'cargo' : 'npm'}/${encodeURIComponent(name)}@${version}` }] })
}
const packagesSection = pnpmLock.split(/^packages:\s*$/m)[1]?.split(/^snapshots:\s*$/m)[0] ?? ''
for (const line of packagesSection.split(/\r?\n/)) {
  const match = line.match(/^  (?:'([^']+)'|([^:\s][^:]*)):\s*$/)
  const key = match?.[1] ?? match?.[2]
  if (!key) continue
  const separator = key.lastIndexOf('@')
  if (separator <= 0) continue
  addPackage('npm', key.slice(0, separator), key.slice(separator + 1).split('(')[0])
}
for (const lock of [cargoLock, tauriCargoLock]) {
  for (const block of lock.split('[[package]]').slice(1)) {
    const name = block.match(/\nname = "([^"]+)"/)?.[1], version = block.match(/\nversion = "([^"]+)"/)?.[1], checksum = block.match(/\nchecksum = "([a-f0-9]+)"/)?.[1] ?? ''
    addPackage('cargo', name, version, checksum)
  }
}
const rootPackage = { SPDXID: 'SPDXRef-Package-Nova-A', name: 'Nova_A', versionInfo: '3.2.0', downloadLocation: 'https://github.com/Stevenzhang543/Nova_A/', filesAnalyzed: false, licenseConcluded: 'MIT', licenseDeclared: 'MIT', checksums: [] }
const sbom = {
  spdxVersion: 'SPDX-2.3', dataLicense: 'CC0-1.0', SPDXID: 'SPDXRef-DOCUMENT', name: 'Nova_A-3.2.0', documentNamespace: `https://whitelists.top/spdx/nova-a/3.2.0/${hash(`${gitCommit}:${environment.inputs.pnpmLockSha256}:${environment.inputs.cargoLockSha256}`).slice(0, 32)}`,
  creationInfo: { created: new Date().toISOString(), creators: ['Tool: Nova_A-generate-v3.2-release-evidence', 'Organization: Whitelist'] },
  documentDescribes: [rootPackage.SPDXID], packages: [rootPackage, ...packages.values()],
  relationships: [...packages.values()].map(item => ({ spdxElementId: rootPackage.SPDXID, relationshipType: 'DEPENDS_ON', relatedSpdxElement: item.SPDXID })),
  annotations: [{ annotationDate: new Date().toISOString(), annotationType: 'OTHER', annotator: 'Tool: Nova_A-generate-v3.2-release-evidence', comment: 'Package identities and Cargo checksums are derived from pnpm-lock.yaml and Cargo.lock. Licenses remain NOASSERTION pending legal inventory review.' }]
}
await writeFile(join(output, 'v3.2.0-software-bill-of-materials.spdx.json'), `${JSON.stringify(sbom, null, 2)}\n`, 'utf8')
console.log(`Wrote v3.2 build environment and SPDX inventory (${packages.size} locked packages).`)
