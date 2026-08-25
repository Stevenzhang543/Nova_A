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
  msi: join(root, 'src-tauri', 'target', 'release', 'bundle', 'msi', 'Nova_A_5.0.1_x64_en-US.msi'),
  setup: join(root, 'src-tauri', 'target', 'release', 'bundle', 'nsis', 'Nova_A_5.0.1_x64-setup.exe')
}
const artifacts = {}
for (const [name, path] of Object.entries(paths)) {
  const [metadata, source] = await Promise.all([stat(path), readFile(path)])
  artifacts[name] = { path: path.slice(root.length + 1).replaceAll('\\', '/'), bytes: metadata.size, sha256: createHash('sha256').update(source).digest('hex') }
}

const profile = await mkdtemp(join(tmpdir(), 'nova-a-v50-native-smoke-'))
let child, earlyExit = null
try {
  const env = { ...process.env, APPDATA: join(profile, 'AppData', 'Roaming'), LOCALAPPDATA: join(profile, 'AppData', 'Local'), WEBVIEW2_USER_DATA_FOLDER: join(profile, 'WebView2') }
  await Promise.all([mkdir(env.APPDATA, { recursive: true }), mkdir(env.LOCALAPPDATA, { recursive: true })])
  child = spawn(paths.portable, [], { cwd: root, env, windowsHide: true, stdio: 'ignore' })
  child.once('exit', (code, signal) => { earlyExit = { code, signal } })
  await new Promise(resolve => setTimeout(resolve, 10_000))
  const stayedAlive = earlyExit === null
  const checks = [
    ...Object.entries(artifacts).map(([name, artifact]) => ({ id: `artifact-${name}`, status: artifact.bytes > 100_000 && /^[a-f0-9]{64}$/.test(artifact.sha256) ? 'passed' : 'failed', detail: artifact })),
    { id: 'portable-isolated-startup', status: stayedAlive ? 'passed' : 'failed', detail: { launchSeconds: 10, stayedAlive, earlyExit } }
  ]
  const status = checks.every(item => item.status === 'passed') ? 'passed' : 'failed'
  const report = {
    format: 'nova-v5.0.1-windows-smoke', version: 1, engineVersion: '5.0.1', generatedAt, host: `${process.platform}-${process.arch}`,
    isolatedProfile: true, artifacts, checks, systemMutationPerformedByAudit: false,
    localScope: ['artifact identity', 'isolated portable launch', 'default WebView2 startup'],
    externalGates: {
      cleanMachineLifecycle: 'pending disposable Windows VM install/launch/upgrade/repair/uninstall',
      publisherSigning: 'pending Whitelist Authenticode identity', hardwareMatrix: 'pending representative Intel/AMD/NVIDIA and audio devices'
    },
    status
  }
  await mkdir(join(root, 'release-audits'), { recursive: true })
  await writeFile(join(root, 'release-audits', 'v5.0.1-windows-smoke.json'), `${JSON.stringify(report, null, 2)}\n`)
  if (status !== 'passed') process.exitCode = 1
  console.log(`Nova_A v5.0.1 Windows smoke ${status}.`)
} finally {
  if (child && earlyExit === null) { child.kill(); await new Promise(resolve => { child.once('exit', resolve); setTimeout(resolve, 3_000) }) }
  await rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 150 })
}

