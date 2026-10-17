/** 功能回归脚本：执行 verify-v6.2.0-windows.mjs 对应场景，保留断言和证据输出。 */
import { createHash } from 'node:crypto'
import { spawn, spawnSync } from 'node:child_process'
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const version=process.env.NOVA_WINDOWS_VERSION||'6.2.0',referenceName=process.env.NOVA_WINDOWS_REFERENCE||'creator-v620-behavior-contract'
if (process.platform !== 'win32') throw new Error(`The v${version} Windows verifier must run on Windows.`)
const root = dirname(dirname(fileURLToPath(import.meta.url)))
const editor = join(root, 'src-tauri/target/release/nova_a.exe')
const msi = join(root, `src-tauri/target/release/bundle/msi/Nova_A_${version}_x64_en-US.msi`)
const setup = join(root, `src-tauri/target/release/bundle/nsis/Nova_A_${version}_x64-setup.exe`)
const project = join(root, `reference-projects/projects/${referenceName}/project.nova`)
const output = join(root, `release-audits/game-output-v${version}`)
for (const path of [editor, msi, setup, project]) await stat(path)
await rm(output, { recursive: true, force: true })
await mkdir(output, { recursive: true })

const command = [join(root, 'scripts/nova-export.mjs'), '--project', project, '--target', 'windows', '--output', output, '--profile', 'release', '--architecture', 'x86_64', '--runtime', 'game', '--single-file', '--player', editor]
const exported = spawnSync(process.execPath, command, { cwd: root, encoding: 'utf8' })
if (exported.status !== 0) throw new Error(`Game export failed: ${exported.stderr || exported.stdout}`)
const buildReport = JSON.parse(await readFile(join(output, 'nova-build-report.json'), 'utf8'))
if (buildReport.format !== 'nova-build-report' || buildReport.version !== 2 || buildReport.engineVersion !== version || buildReport.target !== 'windows' || buildReport.architecture !== 'x86_64' || buildReport.runtimeMode !== 'game') throw new Error('Exported build report does not describe the requested Windows game build.')
const executableNames = (buildReport.files ?? []).map(/* 返回 file?.path 的当前值。 */ file => file?.path).filter(/* 先计算 typeof path === 'string' && /\.exe$/i.test(path) && !path.includes('/')；仅当其为真值时求右侧 !path.includes('\\')，返回短路求值结果。 */ path => typeof path === 'string' && /\.exe$/i.test(path) && !path.includes('/') && !path.includes('\\'))
if (executableNames.length !== 1) throw new Error(`Exported build report must declare exactly one root executable; found ${executableNames.length}.`)
const executableName = executableNames[0]
if (executableName === '.' || executableName === '..' || executableName.includes('..') || !(buildReport.ownedFiles ?? []).includes(executableName)) throw new Error('Exported build report declares an unsafe or unowned executable path.')
const game = join(output, executableName)
const bytes = await readFile(game)
const declaredGame = buildReport.files.find(/* 比较 file.path 与 executableName，返回严格相等的判断结果。 */ file => file.path === executableName)
if (declaredGame.bytes !== bytes.length || declaredGame.sha256 !== createHash('sha256').update(bytes).digest('hex')) throw new Error('Exported executable does not match its build-report bytes and SHA-256.')
const footerStart = bytes.length - 48
if (footerStart <= 0 || bytes.subarray(footerStart, footerStart + 8).toString('ascii') !== 'NOVAPK2!') throw new Error('Exported game has no Nova embedded-package footer.')
const packageLength = Number(bytes.readBigUInt64LE(footerStart + 8)), packageStart = footerStart - packageLength
if (packageStart <= 0) throw new Error('Exported game reports an invalid embedded package length.')
const embedded = bytes.subarray(packageStart, footerStart), expectedHash = bytes.subarray(footerStart + 16).toString('hex'), actualHash = createHash('sha256').update(embedded).digest('hex')
if (expectedHash !== actualHash) throw new Error('Exported game embedded-package SHA-256 does not match.')

const gameSmoke = await launchSmoke(game, 5_000), editorSmoke = await launchSmoke(editor, 3_000)
const artifacts = await Promise.all([['editor', editor], ['game', game], ['msi', msi], ['setup', setup]].map(/** 结构说明（自动提取）：map 回调；输入 [name, path]；直接调用 readFile、digest、update、createHash；等待异步结果。 */ async ([name, path]) => { const value = await readFile(path); return { name, path, bytes: value.length, sha256: createHash('sha256').update(value).digest('hex') } }))
const report = { format: `nova-v${version}-windows-game-smoke`, version: 1, engineVersion: version, generatedAt: new Date().toISOString(), host: { platform: process.platform, architecture: process.arch }, relocation: { repositoryRoot: root, legacyRootAbsentFromCommand: !command.join(' ').includes('OneDrive\\Desktop\\Nova_A') }, export: { command: command.slice(1), output: game, template: buildReport.exportTemplate, packageLength, footer: 'NOVAPK2!', packageSha256: actualHash, singleFile: !await exists(join(output, 'game.nova-pak')), buildReport: { format: buildReport.format, version: buildReport.version, declaredExecutable: executableName } }, gameSmoke, editorSmoke, artifacts, externalGates: { signing: 'pending-external', cleanMachineLifecycle: 'pending-external', secondMachineReproducibility: 'pending-external', soak72Hours: 'pending-external' }, status: gameSmoke.status === 'passed' && editorSmoke.status === 'passed' ? 'passed' : 'failed' }
await writeFile(join(root, `release-audits/v${version}-windows-smoke.json`), `${JSON.stringify(report, null, 2)}\n`)
if (report.status !== 'passed') throw new Error('Windows editor/game launch smoke failed.')
console.log(`Nova_A v${version} Windows smoke passed from ${root}; editor and exported game remained alive.`)

/** 结构说明（自动提取）：launchSmoke；输入 path、duration；直接调用 spawn、dirname、Date.now、child.once、Promise 等；等待异步结果。 */ async function launchSmoke(path, duration) { const child = spawn(path, [], { cwd: dirname(path), windowsHide: true, stdio: 'ignore' }), startedAt = Date.now(); let exit = null, error = ''; child.once('exit', /** 结构说明（自动提取）：child.once 回调；输入 code、signal；写入 exit。 */ (code, signal) => { exit = { code, signal } }); child.once('error', /** 结构说明（自动提取）：child.once 回调；输入 value；直接调用 String；写入 error。 */ value => { error = value instanceof Error ? value.message : String(value) }); await new Promise(/* 调用 setTimeout(resolve, duration) 并返回调用结果。 */ resolve => setTimeout(resolve, duration)); const stayedAlive = exit === null && !error; if (stayedAlive) { child.kill(); await new Promise(/** 结构说明（自动提取）：匿名回调；输入 resolve；直接调用 child.once、setTimeout。 */ resolve => { child.once('exit', resolve); setTimeout(resolve, 2_000) }) } return { path, durationMs: Date.now() - startedAt, stayedAlive, exit, error, status: stayedAlive ? 'passed' : 'failed' } }
/** 读取文件状态判断路径存在性，失败时返回假。 */ async function exists(path) { try { await stat(path); return true } catch { return false } }
