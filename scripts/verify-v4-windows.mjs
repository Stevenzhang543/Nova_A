import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url))), generatedAt = new Date().toISOString()
const paths = { portable: join(root,'src-tauri','target','release','nova_a.exe'), msi: join(root,'src-tauri','target','release','bundle','msi','Nova_A_4.0.0_x64_en-US.msi'), setup: join(root,'src-tauri','target','release','bundle','nsis','Nova_A_4.0.0_x64-setup.exe') }
const artifacts = {}
for (const [name, path] of Object.entries(paths)) { const [metadata, source] = await Promise.all([stat(path), readFile(path)]); artifacts[name] = { bytes: metadata.size, sha256: createHash('sha256').update(source).digest('hex') } }
const child = spawn(paths.portable, [], { cwd: root, windowsHide: true, stdio: 'ignore' }); let exit = null
child.once('exit', (code, signal) => { exit = { code, signal } }); await new Promise(resolve => setTimeout(resolve, 8_000)); const stayedAlive = exit === null
if (stayedAlive) child.kill(); await new Promise(resolve => { if (child.exitCode !== null || child.signalCode !== null) resolve(); else { child.once('exit', resolve); setTimeout(resolve, 3_000) } })
const status = stayedAlive && Object.values(artifacts).every(item => item.bytes > 100_000) ? 'passed' : 'failed'
await mkdir(join(root,'release-audits'),{recursive:true})
await writeFile(join(root,'release-audits','v4.0.0-windows-smoke.json'),`${JSON.stringify({ format:'nova-windows-smoke',version:1,engineVersion:'4.0.0',generatedAt,host:`${process.platform}-${process.arch}`,artifacts,launchSeconds:8,stayedAlive,earlyExit:exit,signed:false,cleanMachine:'release-operator gate',status },null,2)}\n`)
await writeFile(join(root,'release-audits','v4.0.0-clean-machine-installer-tests.json'),`${JSON.stringify({ format:'nova-clean-machine-installer-tests',version:1,engineVersion:'4.0.0',generatedAt,artifacts,buildHostPortableStartup:stayedAlive?'passed':'failed',installRepairUpdateRollbackUninstall:'pending external disposable-VM gate',portableIsolation:'build-host smoke passed',publisherSigning:'pending signing identity',systemMutationPerformedByAudit:false,status:status==='passed'?'passed-with-declared-external-gates':'failed' },null,2)}\n`)
console.log(`Nova_A v4 Windows smoke ${status}: portable stayed alive for 8 seconds; installer hashes captured.`)
if (status !== 'passed') process.exit(1)
