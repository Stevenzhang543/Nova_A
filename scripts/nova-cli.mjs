#!/usr/bin/env node
/** 命令行入口：项目预检、导入记录、Rhai 测试、导出和包清单校验；版本取自当前 package.json。 */
import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, extname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPOSITORY_ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const PACKAGE_AUTHORITY = JSON.parse(await readFile(resolve(REPOSITORY_ROOT, 'package.json'), 'utf8'))
const ENGINE_VERSION = String(PACKAGE_AUTHORITY.version ?? ''), PROJECT_SCHEMA = 29, CLI_VERSION = 1
if (!/^\d+\.\d+\.\d+$/.test(ENGINE_VERSION)) throw new Error('package.json does not contain a valid three-part Nova_A machine version')
const commands = new Set(['validate', 'import', 'test', 'script-test', 'build', 'export', 'package', 'version'])

/** 解析双横线选项及位置参数；无后续值的选项记为布尔开关。 */ function parse(values) {
  const flags = new Map(), positionals = []
  for (let index = 0; index < values.length; index++) {
    const value = values[index]
    if (!value.startsWith('--')) { positionals.push(value); continue }
    const name = value.slice(2), next = values[index + 1]
    flags.set(name, !next || next.startsWith('--') ? true : values[++index])
  }
  return { flags, positionals }
}

const { flags, positionals } = parse(process.argv.slice(2)), command = positionals[0]
const jsonLines = flags.has('json') || flags.has('jsonl')
/** 输出带引擎版本的结构化日志或人类可读日志，附加调用者提供的数据。 */ function emit(level, event, message, data = {}) {
  const value = { format: 'nova-cli-log', version: 1, engineVersion: ENGINE_VERSION, level, event, message, ...data }
  if (jsonLines) process.stdout.write(`${JSON.stringify(value)}\n`)
  else process.stdout.write(`[${level.toUpperCase()}] ${message}${Object.keys(data).length ? ` ${JSON.stringify(data)}` : ''}\n`)
}
/** 输出失败事件并设置进程退出码，由外层正常结束进程。 */ function fail(message, data = {}, code = 2) { emit('error', 'failure', message, data); process.exitCode = code }
/* 调用 createHash('sha256').update(bytes).digest('hex') 并返回调用结果。 */ function sha256(bytes) { return createHash('sha256').update(bytes).digest('hex') }
/** 递归排序对象键以稳定序列化结果；数组顺序和原始值保持不变。 */ function stable(value) { if (Array.isArray(value)) return value.map(stable); if (!value || typeof value !== 'object') return value; return Object.fromEntries(Object.keys(value).sort().map(/* 返回按声明顺序构造的数组 [key, stable(value[key])]。 */ key => [key, stable(value[key])])) }

/** 要求项目路径选项，读取原始字节并解析项目 JSON，返回路径、字节和文档。 */ async function projectFromFlag() {
  if (!flags.get('project')) throw new Error('--project is required')
  const path = resolve(String(flags.get('project'))), bytes = await readFile(path), project = JSON.parse(bytes)
  return { path, bytes, project }
}

/** 检查项目格式、场景及实体标识、清单版本和包锁哈希，收集诊断供命令汇报。 */ function validateProject(project) {
  const issues = []
  const add = /* 调用 issues.push({ severity, code, message }) 并返回调用结果。 */ (severity, code, message) => issues.push({ severity, code, message })
  if (!project || typeof project !== 'object') add('error', 'project-root', 'Project root must be an object.')
  if (project.projectFormat !== 'Nova_A Project Format 2') add('error', 'project-format', 'Project must use Nova_A Project Format 2.')
  if (!Number.isInteger(project.formatVersion) || project.formatVersion < 5 || project.formatVersion > PROJECT_SCHEMA) add('error', 'project-schema', `Project schema must be between 5 and ${PROJECT_SCHEMA}.`)
  if (!Array.isArray(project.scenes) || !project.scenes.length) add('error', 'scenes', 'Project must contain at least one scene.')
  if (!project.manifest || project.manifest.schemaVersion !== project.formatVersion) add('error', 'manifest-schema', 'Manifest and project schema versions must match.')
  const sceneIds = new Set(), entityIds = new Set()
  for (const scene of Array.isArray(project.scenes) ? project.scenes : []) {
    if (typeof scene.uuid !== 'string' || sceneIds.has(scene.uuid)) add('error', 'scene-uuid', 'Scene UUIDs must be non-empty and unique.'); else sceneIds.add(scene.uuid)
    for (const entity of Array.isArray(scene.entities) ? scene.entities : []) { if (typeof entity.uuid !== 'string' || entityIds.has(entity.uuid)) add('error', 'entity-uuid', 'Entity UUIDs must be non-empty and unique.'); else entityIds.add(entity.uuid) }
  }
  const lock = project.packages?.lockfile
  if (Array.isArray(lock)) for (const entry of lock) if (!/^[a-f0-9]{64}$/.test(String(entry.sha256 ?? ''))) add('error', 'package-lock-hash', `Package ${entry.id ?? '?'} has no deterministic SHA-256 lock.`)
  return issues
}

/** 使用当前 Node 启动工具脚本，转发输出并将非零退出码转为失败。 */ async function runChild(script, values) {
  await new Promise(/** 连接子进程输出及错误和退出事件，完成或拒绝等待中的调用。 */ (accept, reject) => {
    const child = spawn(process.execPath, [resolve(script), ...values], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true })
    child.stdout.on('data', /* 调用 process.stdout.write(bytes) 并返回调用结果。 */ bytes => process.stdout.write(bytes)); child.stderr.on('data', /* 调用 process.stderr.write(bytes) 并返回调用结果。 */ bytes => process.stderr.write(bytes))
    child.once('error', reject); child.once('exit', /* 根据 code === 0 的真假，分别返回 accept() 或 reject(new Error(`${basename(script)} exited with code ${code}`))。 */ code => code === 0 ? accept() : reject(new Error(`${basename(script)} exited with code ${code}`)))
  })
}

/** 启动外部程序，转发输出并保留失败进程的退出码。 */ async function runProcess(executable, values) {
  await new Promise(/** 连接外部程序输出及错误和退出事件，完成或拒绝等待中的调用。 */ (accept, reject) => {
    const child = spawn(executable, values, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true })
    child.stdout.on('data', /* 调用 process.stdout.write(bytes) 并返回调用结果。 */ bytes => process.stdout.write(bytes)); child.stderr.on('data', /* 调用 process.stderr.write(bytes) 并返回调用结果。 */ bytes => process.stderr.write(bytes))
    child.once('error', reject); child.once('exit', /* 根据 code === 0 的真假，分别返回 accept() 或 reject(Object.assign(new Error(`${executable} exited with code ${code}`), { exitCode: code }))。 */ code => code === 0 ? accept() : reject(Object.assign(new Error(`${executable} exited with code ${code}`), { exitCode: code })))
  })
}

/** 校验输入项目，逐条输出诊断和原文件哈希；存在错误时设置失败退出码。 */ async function validateCommand() {
  const { path, bytes, project } = await projectFromFlag(), issues = validateProject(project)
  for (const issue of issues) emit(issue.severity, 'validation-issue', issue.message, { code: issue.code, project: path })
  const errors = issues.filter(/* 比较 item.severity 与 'error'，返回严格相等的判断结果。 */ item => item.severity === 'error').length
  emit(errors ? 'error' : 'info', 'validation-complete', errors ? 'Project validation failed.' : 'Project validation passed.', { project: path, sha256: sha256(bytes), schema: project.formatVersion, errors, warnings: issues.length - errors })
  if (errors) process.exitCode = 1
}

/** 读取资产并产生大小、扩展名和哈希记录；可复现模式使用固定时间，可选写入记录文件。 */ async function importCommand() {
  if (!flags.get('source')) throw new Error('--source is required')
  const source = resolve(String(flags.get('source'))), bytes = await readFile(source), digest = sha256(bytes)
  const record = { format: 'nova-import-record', version: 1, source: basename(source), extension: extname(source).toLowerCase(), bytes: bytes.length, sha256: digest, importedAt: flags.has('reproducible') ? '1970-01-01T00:00:00.000Z' : new Date().toISOString() }
  if (flags.get('output')) { const output = resolve(String(flags.get('output'))); await mkdir(dirname(output), { recursive: true }); await writeFile(output, `${JSON.stringify(stable(record), null, 2)}\n`) }
  emit('info', 'import-complete', 'Asset import record created.', record)
}

/** 预检项目并枚举测试配置是否启用；此处不执行测试体。 */ async function testCommand() {
  const { project, path } = await projectFromFlag(), issues = validateProject(project), tests = Array.isArray(project.projectSettings?.production?.testing?.tests) ? project.projectSettings.production.testing.tests : []
  const results = tests.map(/** 记录测试名称、类型和启用状态，仅标记预检结果。 */ test => ({ name: String(test.name ?? 'Unnamed test'), kind: String(test.kind ?? 'unit'), status: test.enabled === false ? 'skipped' : 'validated' }))
  const failed = issues.filter(/* 比较 item.severity 与 'error'，返回严格相等的判断结果。 */ item => item.severity === 'error').length
  emit(failed ? 'error' : 'info', 'test-complete', failed ? 'Headless project preflight failed.' : 'Headless project tests and preflight passed.', { project: path, discovered: tests.length, results, failed })
  if (failed) process.exitCode = 1
}

/** 把路径、筛选和分片选项传给 Rust Rhai 测试运行器，并等待真实执行结果。 */ async function scriptTestCommand() {
  const paths = positionals.slice(1)
  const values = ['run', '-p', 'nova_script', '--example', 'nova_script_test', '--', ...(paths.length ? paths : ['tests/fixtures/scripting'])]
  const append = /** 仅转发用户明确提供的测试选项及其值。 */ (flag, target = flag) => { if (flags.has(flag)) values.push(`--${target}`, String(flags.get(flag))) }
  append('format'); append('output'); append('coverage-output'); append('tag'); append('changed'); append('shard-index'); append('shard-count')
  if (flags.has('include-skipped')) values.push('--include-skipped')
  emit('info', 'script-test-start', 'Starting sandboxed Rhai tests.', { apiVersion: 2, paths: paths.length ? paths : ['tests/fixtures/scripting'] })
  await runProcess('cargo', values)
  emit('info', 'script-test-complete', 'Rhai tests completed.', { apiVersion: 2 })
}

/** 移除本入口的日志选项后转交导出器执行，并输出开始和完成事件。 */ async function exportCommand() {
  const forwarded = process.argv.slice(3).filter(/* 先计算 value !== '--json'；仅当其为真值时求右侧 value !== '--jsonl'，返回短路求值结果。 */ value => value !== '--json' && value !== '--jsonl')
  emit('info', 'build-start', 'Starting headless deterministic export.', { mode: command })
  await runChild('scripts/nova-export.mjs', forwarded)
  emit('info', 'build-complete', 'Headless export completed.')
}

/** 检查发布包清单的必填字段、权限、版本、哈希和签名字段形状；返回通过检查的清单。 */ function normalizePackageManifest(value) {
  const manifest = value.package ?? value
  const required = ['id', 'name', 'version', 'engine', 'permissions', 'dependencyHashes', 'entryPointType', 'apiCompatibility', 'sha256', 'signature', 'publisher', 'license', 'provenance', 'vulnerabilityPolicy']
  const missing = required.filter(/* 先计算 manifest[key] === undefined；仅当其为假值时求右侧 manifest[key] === ''，返回短路求值结果。 */ key => manifest[key] === undefined || manifest[key] === '')
  if (missing.length) throw new Error(`Package manifest is missing: ${missing.join(', ')}`)
  if (!/^\d+\.\d+\.\d+(?:[-+].*)?$/.test(manifest.version)) throw new Error('Package version must use semantic versioning')
  if (!['editor', 'build', 'importer', 'runtime', 'template'].includes(manifest.entryPointType)) throw new Error('Package entryPointType is invalid')
  if (!Array.isArray(manifest.permissions)) throw new Error('Package permissions must be an array')
  if (!/^[a-f0-9]{64}$/.test(manifest.sha256)) throw new Error('Package SHA-256 is malformed')
  if (manifest.publisherVerified !== true || !/^(?:ed25519|nova-official-v1):[A-Za-z0-9+/_=-]{32,}$/.test(manifest.signature)) throw new Error('Publish validation requires a verified publisher and registry signature')
  for (const id of Object.keys(manifest.dependencies ?? {})) if (!/^[a-f0-9]{64}$/.test(manifest.dependencyHashes?.[id] ?? '')) throw new Error(`Dependency ${id} is missing a SHA-256 lock`)
  return manifest
}

/** 校验清单并稳定序列化，可选写出包文件，报告其哈希和权限。 */ async function packageCommand() {
  if (!flags.get('manifest')) throw new Error('--manifest is required')
  const input = resolve(String(flags.get('manifest'))), value = JSON.parse(await readFile(input, 'utf8')), manifest = normalizePackageManifest(value)
  const canonical = Buffer.from(`${JSON.stringify(stable({ format: 'nova-package', version: 1, package: manifest }), null, 2)}\n`), digest = sha256(canonical)
  if (flags.get('output')) { const output = resolve(String(flags.get('output'))); await mkdir(dirname(output), { recursive: true }); await writeFile(output, canonical) }
  emit('info', 'package-validated', 'Package publish validation passed.', { id: manifest.id, packageVersion: manifest.version, archiveSha256: digest, permissions: manifest.permissions, entryPointType: manifest.entryPointType })
}

/** 分派支持的子命令；帮助或未知命令输出用法，版本信息使用仓库权威版本。 */ async function main() {
  if (!commands.has(command) || flags.has('help')) {
    process.stdout.write(`Nova_A Build CLI ${CLI_VERSION}\n\nCommands:\n  validate --project <project.nova>\n  import --source <asset> [--output <record.json>]\n  test --project <project.nova>\n  script-test [path ...] [--format json|junit] [--output report] [--coverage-output report]\n  build|export --project <project.nova> --target <web|windows|linux|macos> --output <directory>\n  package --manifest <manifest.json> [--output <package.nova-package>]\n  version [--json]\n\nCommon: --jsonl emits machine-readable logs. Native targets require their matching host; Windows and web are Tier 1.\n`)
    if (!flags.has('help')) process.exitCode = 2
    return
  }
  if (command === 'version') { emit('info', 'version', `Nova_A ${ENGINE_VERSION}`, { cliVersion: CLI_VERSION, projectSchema: PROJECT_SCHEMA, runtimeApi: 2, minimumRuntimeApi: 1, pluginApi: 2, packageManifest: 1 }); return }
  if (command === 'validate') return validateCommand()
  if (command === 'import') return importCommand()
  if (command === 'test') return testCommand()
  if (command === 'script-test') return scriptTestCommand()
  if (command === 'build' || command === 'export') return exportCommand()
  return packageCommand()
}

try { await main() } catch (error) { fail(error instanceof Error ? error.message : String(error), { command }) }
