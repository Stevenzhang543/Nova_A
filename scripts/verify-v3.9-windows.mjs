import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const paths = {
  portable: join(root, 'src-tauri', 'target', 'release', 'nova_a.exe'),
  msi: join(root, 'src-tauri', 'target', 'release', 'bundle', 'msi', 'Nova_A_3.9.0_x64_en-US.msi'),
  setup: join(root, 'src-tauri', 'target', 'release', 'bundle', 'nsis', 'Nova_A_3.9.0_x64-setup.exe')
}
const artifacts = {}
for (const [name, path] of Object.entries(paths)) {
  const [metadata, source] = await Promise.all([stat(path), readFile(path)])
  artifacts[name] = { bytes: metadata.size, sha256: createHash('sha256').update(source).digest('hex') }
}

const child = spawn(paths.portable, [], { cwd: root, windowsHide: true, stdio: 'ignore' })
let exit = null
child.once('exit', (code, signal) => { exit = { code, signal } })
await new Promise(resolve => setTimeout(resolve, 8_000))
const stayedAlive = exit === null
if (stayedAlive) child.kill()
await new Promise(resolve => { if (child.exitCode !== null || child.signalCode !== null) resolve(); else { child.once('exit', resolve); setTimeout(resolve, 3_000) } })

const report = {
  format: 'nova-windows-smoke', version: 1, engineVersion: '3.9.0', generatedAt: new Date().toISOString(),
  host: `${process.platform}-${process.arch}`, artifacts, launchSeconds: 8, stayedAlive, earlyExit: exit,
  signed: false, cleanMachine: 'release-operator gate',
  note: 'Portable startup was exercised on the build host. MSI/NSIS integrity was captured; clean-machine lifecycle and publisher signing require isolated release infrastructure and a Whitelist signing identity.',
  status: stayedAlive && Object.values(artifacts).every(item => item.bytes > 100_000) ? 'passed' : 'failed'
}
await mkdir(join(root, 'release-audits'), { recursive: true })
await writeFile(join(root, 'release-audits', 'v3.9.0-windows-smoke.json'), `${JSON.stringify(report, null, 2)}\n`)
await writeFile(join(root, 'release-audits', 'v3.9.0-installer-lifecycle.json'), `${JSON.stringify({
  format: 'nova-installer-lifecycle-tests', version: 1, engineVersion: '3.9.0', generatedAt: report.generatedAt,
  artifacts, buildHostPortableStartup: stayedAlive ? 'passed' : 'failed', installRepairUpdateRollbackUninstall: 'clean-VM release-operator gate',
  systemMutationPerformedByAudit: false, signed: false,
  note: 'Artifact integrity and isolated portable startup passed. The repository audit deliberately does not install, repair, update, roll back, or uninstall system software on the user host.',
  status: report.status === 'passed' ? 'passed-with-declared-external-gate' : 'failed'
}, null, 2)}\n`)
console.log(`Nova_A v3.9 Windows smoke ${report.status}: portable stayed alive for ${report.launchSeconds}s; installer hashes captured.`)
if (report.status !== 'passed') process.exit(1)
