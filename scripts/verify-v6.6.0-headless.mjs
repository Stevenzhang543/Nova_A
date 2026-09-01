import { createHash } from 'node:crypto'
import { spawn, spawnSync } from 'node:child_process'
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const version = '6.6.0', root = dirname(dirname(fileURLToPath(import.meta.url)))
if (process.platform !== 'win32') throw new Error('The v6.6.0 headless export verifier must run on Windows.')
const editor = join(root, 'src-tauri/target/release/nova_a.exe')
const project = join(root, 'reference-projects/projects/creator-v660-headless-authority/project.nova')
const output = join(root, 'release-audits/headless-output-v6.6.0')
const executable = join(output, 'Nova 6.6 Headless Authority.exe')
for (const path of [editor, project]) await stat(path)
await rm(output, { recursive: true, force: true }); await mkdir(output, { recursive: true })

const command = [join(root, 'scripts/nova-export.mjs'), '--project', project, '--target', 'windows', '--output', output, '--profile', 'release', '--architecture', 'x86_64', '--runtime', 'headless-server', '--single-file', '--player', editor]
const exported = spawnSync(process.execPath, command, { cwd: root, encoding: 'utf8', windowsHide: true })
if (exported.status !== 0) throw new Error(`Headless export failed: ${exported.stderr || exported.stdout}`)
const bytes = await readFile(executable), footerStart = bytes.length - 48
if (footerStart <= 0 || bytes.subarray(footerStart, footerStart + 8).toString('ascii') !== 'NOVAPK2!') throw new Error('Exported headless server has no Nova embedded-package footer.')
const packageLength = Number(bytes.readBigUInt64LE(footerStart + 8)), packageStart = footerStart - packageLength
if (packageStart <= 0) throw new Error('Exported headless server reports an invalid embedded package length.')
const embedded = bytes.subarray(packageStart, footerStart), expectedHash = bytes.subarray(footerStart + 16).toString('hex'), packageSha256 = createHash('sha256').update(embedded).digest('hex')
if (packageSha256 !== expectedHash) throw new Error('Exported headless server embedded-package SHA-256 does not match.')

const smoke = await launchSmoke(executable, 5_000), report = {
  format: 'nova-v6.6.0-headless-server-smoke', version: 1, engineVersion: version, generatedAt: new Date().toISOString(),
  export: { command: command.slice(1), output: executable, runtimeMode: 'headless-server', singleFile: !await exists(join(output, 'game.nova-pak')), packageLength, packageSha256 },
  smoke, artifact: { path: executable, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }, status: smoke.status
}
await writeFile(join(root, 'release-audits/v6.6.0-headless-smoke.json'), `${JSON.stringify(report, null, 2)}\n`)
if (report.status !== 'passed') throw new Error('Exported headless server did not remain alive during the native smoke interval.')
console.log('Nova_A v6.6.0 headless Windows export and launch smoke passed.')

async function launchSmoke(path, duration) {
  const child = spawn(path, [], { cwd: dirname(path), windowsHide: true, stdio: 'ignore' }), startedAt = Date.now()
  let exit = null, error = ''; child.once('exit', (code, signal) => { exit = { code, signal } }); child.once('error', value => { error = value instanceof Error ? value.message : String(value) })
  await new Promise(resolve => setTimeout(resolve, duration)); const stayedAlive = exit === null && !error
  if (stayedAlive) { child.kill(); await new Promise(resolve => { child.once('exit', resolve); setTimeout(resolve, 2_000) }) }
  return { path, durationMs: Date.now() - startedAt, stayedAlive, exit, error, status: stayedAlive ? 'passed' : 'failed' }
}
async function exists(path) { try { await stat(path); return true } catch { return false } }
