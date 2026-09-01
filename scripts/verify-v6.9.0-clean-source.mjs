import { execFileSync, spawnSync } from 'node:child_process'
import { cp, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, normalize, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const version = process.env.NOVA_CLEAN_SOURCE_VERSION || '6.9.0'
const root = dirname(dirname(fileURLToPath(import.meta.url)))
const temporary = await mkdtemp(join(tmpdir(), `nova-v${version.replaceAll('.', '')}-clean-source-`))
const checkout = join(temporary, 'Nova_A')
const startedAt = performance.now()
const commands = []

try {
  await mkdir(checkout, { recursive: true })
  const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8', windowsHide: true }).split(/\r?\n/).filter(Boolean)
  const excluded = /^(?:releases|release-audits|dist|target|src-tauri\/target|nova_core\/target|node_modules|\.pnpm-store|\.git)(?:\/|$)/
  let copied = 0
  for (const relativePath of files) {
    if (excluded.test(relativePath.replaceAll('\\', '/'))) continue
    const source = resolve(root, normalize(relativePath)), destination = resolve(checkout, normalize(relativePath))
    if (relative(root, source).startsWith('..') || relative(checkout, destination).startsWith('..')) throw new Error(`Unsafe source path: ${relativePath}`)
    try { if (!(await stat(source)).isFile()) continue } catch { continue }
    await mkdir(dirname(destination), { recursive: true }); await cp(source, destination); copied++
  }
  const pnpmCli = process.env.npm_execpath
  if (!pnpmCli || !(await readFile(pnpmCli)).length) throw new Error('The pinned pnpm CLI path is unavailable.')
  run('offline frozen dependency restore', process.execPath, [pnpmCli, 'install', '--frozen-lockfile', '--offline'], checkout)
  run('clean-source Rust/WASM core build', 'wasm-pack', ['build', 'crates/nova_wasm', '--target', 'web', '--out-dir', '../../nova_core/pkg', '--out-name', 'nova_core', '--release'], checkout)
  run('clean-source type check', process.execPath, [pnpmCli, 'check'], checkout)
  run('clean-source production web build', process.execPath, [pnpmCli, 'exec', 'vite', 'build', '--outDir', join(temporary, 'dist')], checkout)
  const report = { format: `nova-v${version}-clean-source-offline-build`, version: 1, engineVersion: version, generatedAt: new Date().toISOString(), source: 'fresh temporary copy of tracked and candidate files', networkAllowed: false, dependencyMode: 'pnpm --frozen-lockfile --offline', copiedFiles: copied, commands, durationMs: Math.round(performance.now() - startedAt), status: 'passed', externalBoundary: 'A genuinely independent second machine remains pending-external.' }
  await writeFile(join(root, `release-audits/v${version}-clean-source-offline.json`), `${JSON.stringify(report, null, 2)}\n`)
  console.log(`Nova_A v${version} clean-source offline restore, type check and production build passed (${copied} files).`)
} finally {
  await rm(temporary, { recursive: true, force: true })
}

function run(label, command, args, cwd) {
  const started = performance.now()
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', windowsHide: true, env: { ...process.env, CI: '1' } })
  commands.push({ label, exitCode: result.status, durationMs: Math.round(performance.now() - started) })
  if (result.status !== 0) throw new Error(`${label} failed:\n${result.stderr || result.stdout}`)
}
