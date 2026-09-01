import { spawnSync } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const version = '6.7.0'
const root = dirname(dirname(fileURLToPath(import.meta.url)))
const pnpmCli = process.env.npm_execpath
if (!pnpmCli) throw new Error('Run this audit through pnpm so the pinned package-manager executable is known.')
const run = spawnSync(process.execPath, [pnpmCli, 'audit', '--audit-level', 'high', '--json'], { cwd: root, encoding: 'utf8', windowsHide: true })
const output = run.stdout || ''
let advisory = {}
try { advisory = JSON.parse(output || '{}') } catch { advisory = { output: output.slice(0, 20_000) } }
const report = {
  format: `nova-v${version}-dependency-advisory-audit`, version: 1, engineVersion: version,
  generatedAt: new Date().toISOString(), command: 'pnpm audit --audit-level high --json', packageManager: 'pnpm 10.30.0',
  lockfile: 'pnpm-lock.yaml', advisory, stderr: (run.stderr || '').slice(0, 20_000), exitCode: run.status,
  status: run.status === 0 ? 'passed' : 'failed'
}
await mkdir(join(root, 'release-audits'), { recursive: true })
await writeFile(join(root, `release-audits/v${version}-dependency-audit.json`), `${JSON.stringify(report, null, 2)}\n`)
if (run.status !== 0) { console.error(run.stderr || run.stdout); process.exit(run.status || 1) }
console.log(`Nova_A v${version} dependency advisory audit passed: no High/Critical advisory blocks.`)
