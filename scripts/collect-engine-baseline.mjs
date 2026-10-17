/** Collect a local, immutable engineering baseline; never infer runtime capability from installed APIs. */
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const directory = join(root, '.cache/engine-overhaul/baseline')
await mkdir(directory, { recursive: true })
const sha = value => createHash('sha256').update(value).digest('hex')
const command = (program, args) => {
  try { return execFileSync(program, args, { cwd: root, windowsHide: true, timeout: 25000, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim() }
  catch (error) { return { status: 'unavailable', reason: String(error.message).slice(0, 700) } }
}
const prompt = await readFile(join(root, 'Nova_A_Engine_Runtime_Player_Overhaul_Prompt_Expanded.md'))
const agents = await readFile(join(root, 'AGENTS.md'))
const packageJson = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
const files = ['Cargo.lock', 'Cargo.toml', 'rust-toolchain.toml', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'package.json', 'vite.config.ts', 'tsconfig.json', 'src-tauri/tauri.conf.json']
const protectedInputs = { expandedPromptSha256: sha(prompt), agentsSha256: sha(agents), originalPrefixBytes: 86218, originalPrefixSha256: sha(prompt.subarray(0, 86218)), expectedOriginalPrefixSha256: 'd1f7ace283bd983ad78c15811211f330a65be7a0d6aad46473ac593932c1efa6', readThroughLine: prompt.toString('utf8').split(/\r?\n/).length }
const inputs = []
for (const path of files) {
  const bytes = await readFile(join(root, path))
  inputs.push({ path, bytes: bytes.length, sha256: sha(bytes) })
}
await cp(join(root, 'AGENTS.md'), join(directory, 'AGENTS.original.md'), { force: false, errorOnExist: true })
await cp(join(root, 'Nova_A_Engine_Runtime_Player_Overhaul_Prompt_Expanded.md'), join(directory, 'expanded-prompt.original.md'), { force: false, errorOnExist: true })
const machine = process.platform === 'win32' ? command('powershell.exe', ['-NoProfile', '-Command', '$x=@{os=(Get-CimInstance Win32_OperatingSystem | Select-Object Caption,Version,BuildNumber);cpu=(Get-CimInstance Win32_Processor | Select-Object Name,NumberOfCores,NumberOfLogicalProcessors);installedGpu=(Get-CimInstance Win32_VideoController | Select-Object Name,DriverVersion,VideoProcessor);powerScheme=(powercfg /getactivescheme)}; $x | ConvertTo-Json -Depth 4 -Compress']) : { status: 'not_collected' }
const report = {
  schemaVersion: 1, generatedAt: new Date().toISOString(), state: 'BASELINE_NOT_QUALIFICATION',
  commit: command('git', ['rev-parse', 'HEAD']), branch: command('git', ['branch', '--show-current']),
  initialWorktree: 'Only AGENTS.md and the expanded prompt were untracked before the audit; both are protected.',
  observedWorktree: command('git', ['status', '--short']), protectedInputs, inputs,
  toolchain: { node: process.version, pinnedNode: packageJson.engines?.node, pinnedPnpm: packageJson.packageManager, rust: command('rustc', ['--version']), cargo: command('cargo', ['--version']), wasmPack: command('wasm-pack', ['--version']) },
  machine: typeof machine === 'string' ? JSON.parse(machine) : machine,
  runtimeMeasurement: { backend: null, executionMode: null, wasmVariant: null, adapter: null, browser: null, webview: null, dpr: null, internalRenderSize: null, physicalMonitorDpi: null, powerWatts: null, gpuTimeMs: null, inputToPhotonMs: null },
  workload: { benchmarkTrack: 'unmeasured', qualityLocked: 'NOT_TESTED', adaptiveExperience: 'NOT_TESTED', formalWarmupSeconds: 10, formalSampleSeconds: 120, formalRuns: 5, soakMinutes: 30 },
  limits: ['Installed GPU metadata does not identify the adapter actually selected by a browser or WebView.', 'Existing 26.37 UI smoke evidence does not qualify the new runtime architecture or formal performance targets.', 'Linux WebKitGTK, H2 and hardware refresh-rate combinations require separate actual environments.']
}
if (protectedInputs.originalPrefixSha256 !== protectedInputs.expectedOriginalPrefixSha256) throw new Error('Original engineering prompt prefix differs; baseline documents must not be rewritten.')
await writeFile(join(directory, 'start.json'), `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' })
console.log(JSON.stringify({ report: '.cache/engine-overhaul/baseline/start.json', commit: report.commit, promptReadToEnd: true, originalPrefixUnchanged: true }))
