import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const generatedAt = new Date().toISOString()
const paths = {
  portable: join(root, 'src-tauri', 'target', 'release', 'nova_a.exe'),
  msi: join(root, 'src-tauri', 'target', 'release', 'bundle', 'msi', 'Nova_A_4.2.0_x64_en-US.msi'),
  setup: join(root, 'src-tauri', 'target', 'release', 'bundle', 'nsis', 'Nova_A_4.2.0_x64-setup.exe')
}

const artifacts = {}
for (const [name, path] of Object.entries(paths)) {
  const [metadata, source] = await Promise.all([stat(path), readFile(path)])
  artifacts[name] = { path: path.slice(root.length + 1).replaceAll('\\', '/'), bytes: metadata.size, sha256: createHash('sha256').update(source).digest('hex') }
}

const profile = await mkdtemp(join(tmpdir(), 'nova-a-v42-native-smoke-'))
let child
let earlyExit = null
try {
  const isolatedEnvironment = {
    ...process.env,
    APPDATA: join(profile, 'AppData', 'Roaming'),
    LOCALAPPDATA: join(profile, 'AppData', 'Local'),
    WEBVIEW2_USER_DATA_FOLDER: join(profile, 'WebView2')
  }
  await Promise.all([mkdir(isolatedEnvironment.APPDATA, { recursive: true }), mkdir(isolatedEnvironment.LOCALAPPDATA, { recursive: true })])
  child = spawn(paths.portable, [], { cwd: root, env: isolatedEnvironment, windowsHide: true, stdio: 'ignore' })
  child.once('exit', (code, signal) => { earlyExit = { code, signal } })
  await new Promise(resolve => setTimeout(resolve, 10_000))
  const stayedAlive = earlyExit === null
  const checks = [
    ...Object.entries(artifacts).map(([name, artifact]) => ({ id: `artifact-${name}`, status: artifact.bytes > 100_000 && /^[a-f0-9]{64}$/.test(artifact.sha256) ? 'passed' : 'failed', detail: artifact })),
    { id: 'portable-isolated-startup', status: stayedAlive ? 'passed' : 'failed', detail: { launchSeconds: 10, stayedAlive, earlyExit } }
  ]
  const status = checks.every(check => check.status === 'passed') ? 'passed' : 'failed'
  const report = { format: 'nova-windows-smoke', version: 1, engineVersion: '4.2.0', generatedAt, host: `${process.platform}-${process.arch}`, isolatedProfile: true, artifacts, launchSeconds: 10, stayedAlive, earlyExit, checks, cleanMachineLifecycle: 'pending external disposable-VM gate', publisherSigning: 'pending signing identity', systemMutationPerformedByAudit: false, status }
  await mkdir(join(root, 'release-audits'), { recursive: true })
  await writeFile(join(root, 'release-audits', 'v4.2.0-windows-smoke.json'), `${JSON.stringify(report, null, 2)}\n`)
  console.log(`Nova_A v4.2 Windows smoke ${status}: portable stayed alive for 10 seconds; EXE/MSI/NSIS hashes captured.`)
  if (status !== 'passed') process.exitCode = 1
} finally {
  if (child && earlyExit === null) {
    child.kill()
    await new Promise(resolve => { child.once('exit', resolve); setTimeout(resolve, 3_000) })
  }
  await rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 150 })
}
