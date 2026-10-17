/** 发布资格执行器：验证门禁计划、执行结果、冻结源码和打包证据，禁止用未执行状态冒充通过。 */
import { createHash, randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import { createWriteStream } from 'node:fs'
import { cp, lstat, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { releaseVersion, verifyReleaseSnapshot } from './release-source-snapshot.mjs'

export const requiredGateIds = ['focus', 'typescript', 'rust', 'rust-lint', 'native-rust', 'wasm', 'web', 'native-build', 'history', 'templates', 'product', 'browser-layout', 'layout-contract', 'user-interactions', 'windows', 'headless', 'performance', 'stability', 'security', 'hygiene', 'manual']
// 26.25 起按用户要求缩小审计范围，构建、行为及归档完整性始终必查。
export const riskRequiredGateIds = ['focus', 'typescript', 'web', 'native-build', 'product', 'browser-layout', 'user-interactions', 'windows', 'headless', 'hygiene', 'manual']
export const reportTargets = {
  focus: 'runtime/focused-verification.json', typescript: 'runtime/verification.json', history: 'runtime/migration-history.json', templates: 'runtime/template-catalog.json', product: 'runtime/product-audit.json',
  'browser-layout': 'layout/layout-browser.json', 'layout-contract': 'layout/layout-contract.json', 'user-interactions': 'runtime/user-interactions.json', windows: 'build/windows-smoke.json', headless: 'build/headless-authority.json',
  performance: 'performance/benchmarks.json', stability: 'performance/stability-local.json', security: 'runtime/dependency-audit.json', hygiene: 'security/repository-hygiene.json'
}
export const artifactNames = ['web-editor', 'web-player', 'windows-editor', 'windows-nsis', 'windows-msi', 'windows-headless-authority']
const userGates = new Set(['browser-layout', 'user-interactions', 'windows', 'headless'])
const sha256 = /* 调用 createHash('sha256').update(bytes).digest('hex') 并返回调用结果。 */ bytes => createHash('sha256').update(bytes).digest('hex')
/** 写入完整的紧凑 JSON；避免嵌套布局证据的缩进膨胀超过 Node 字符串上限。字段及数组顺序保持不变。 */
export const writeJson = /* 调用 writeFile(path, `${JSON.stringify(value)}\n`) 并返回调用结果。 */ (path, value) => writeFile(path, `${JSON.stringify(value)}\n`)
/** 拒绝空路径、绝对路径、盘符和点段，再核对解析结果仍位于根目录内；返回可使用的绝对路径。 */
export function confinedPath(root, path) {
  if (typeof path !== 'string' || !path || isAbsolute(path) || /^[a-z]:/i.test(path) || path.replaceAll('\\', '/').split('/').some(/* 先计算 !part || part === '.'；仅当其为假值时求右侧 part === '..'，返回短路求值结果。 */ part => !part || part === '.' || part === '..')) throw new Error(`Unsafe release input path: ${path}`)
  const result = resolve(root, path), back = relative(root, result)
  if (back.startsWith('..') || isAbsolute(back)) throw new Error(`Release input escapes its root: ${path}`)
  return result
}
/** 限定路径后拒绝符号链接和非普通文件，读取实际字节并返回规范路径、长度和 SHA-256。 */
export async function fileRecord(root, path) {
  const full = confinedPath(root, path)
  const info = await lstat(full)
  if (!info.isFile() || info.isSymbolicLink()) throw new Error(`Expected a regular release file: ${path}`)
  const bytes = await readFile(full)
  return { path: path.replaceAll('\\', '/'), bytes: bytes.length, sha256: sha256(bytes) }
}
/** 递归枚举证据目录的普通文件，遇到链接即失败；排序输出用于逐文件完整性核对。 */
export async function filesBelow(root, prefix = '') {
  const files = []
  for (const item of await readdir(join(root, prefix), { withFileTypes: true })) {
    const path = `${prefix}${item.name}`
    if (item.isSymbolicLink()) throw new Error(`Release evidence refuses a link: ${path}`)
    if (item.isDirectory()) files.push(...await filesBelow(root, `${path}/`))
    else if (item.isFile()) files.push(path)
  }
  return files.sort()
}
/** 检查发布身份、全部必需门禁、报告目标和六项产物是否齐全且唯一；执行上下文和阻塞原因必须明确。 */
export function validateQualificationPlan(plan) {
  if (plan.format !== 'nova-release-qualification-plan' || plan.version !== 1 || releaseVersion(plan.release) !== plan.machineVersion || Number(plan.release.replace('.', '')) < 2612) throw new Error('Expected an explicit qualification plan for release 26.12 or later.')
  if (!Array.isArray(plan.gates)) throw new Error('Qualification plan has no gates.')
  const ids = new Set(), targets = new Set(), artifacts = new Set()
  for (const gate of plan.gates) {
    if (!/^[a-z][a-z0-9-]*$/.test(gate.id) || ids.has(gate.id)) throw new Error(`Duplicate/unsafe gate: ${gate.id}`)
    ids.add(gate.id)
    if (!['programmer', 'user', 'environment'].includes(gate.category) || (userGates.has(gate.id) && gate.category !== 'user') || typeof gate.context !== 'string' || !gate.context.trim()) throw new Error(`Gate ${gate.id} requires an honest category and execution context.`)
    if (!gate.blockedReason && (!gate.command || typeof gate.command.file !== 'string' || !Array.isArray(gate.command.args) || gate.command.args.some(/* 比较 typeof arg 与 'string'，返回严格不等的判断结果。 */ arg => typeof arg !== 'string'))) throw new Error(`Gate ${gate.id} needs an explicit command/argument array or blocking reason.`)
    for (const report of gate.reports ?? []) {
      confinedPath('/qualification', report.path); confinedPath('/qualification', report.target)
      if (targets.has(report.target) || !report.format || !Number.isInteger(report.version) || typeof report.requireRelease !== 'boolean' || typeof report.requireEngine !== 'boolean') throw new Error(`Gate ${gate.id} has a duplicate target or incomplete report schema.`)
      targets.add(report.target)
    }
    if (reportTargets[gate.id] && !(gate.reports ?? []).some(/* 比较 report.target 与 reportTargets[gate.id]，返回严格相等的判断结果。 */ report => report.target === reportTargets[gate.id])) throw new Error(`Gate ${gate.id} must provide ${reportTargets[gate.id]} with its actual report schema.`)
    for (const artifact of gate.artifacts ?? []) {
      confinedPath('/qualification', artifact.path)
      if (!artifactNames.includes(artifact.name) || artifacts.has(artifact.name)) throw new Error(`Unknown/duplicate build artifact: ${artifact.name}`)
      artifacts.add(artifact.name)
    }
  }
  const scoped = plan.auditPolicy?.kind === 'change-risk-v1'
  if (plan.auditPolicy && !scoped) throw new Error('Unknown audit policy.')
  if (scoped) {
    if (Number(plan.release.replace('.', '')) < 2625 || !plan.auditPolicy.authorization?.trim() || !Array.isArray(plan.auditPolicy.omitted)) throw new Error('Risk scope requires 26.25+, explicit authorization and omission reasons.')
    const omissions = new Set()
    for (const entry of plan.auditPolicy.omitted) {
      if (!requiredGateIds.includes(entry.id) || ids.has(entry.id) || omissions.has(entry.id) || !entry.reason?.trim() || entry.status !== 'not-run') throw new Error('Invalid or misleading audit omission.')
      omissions.add(entry.id)
    }
    if (requiredGateIds.some(/* 未执行原门禁必须说明，不能默认为通过。 */ id => !ids.has(id) && !omissions.has(id))) throw new Error('Missing explicit audit omission.')
  }
  const missing = (scoped ? riskRequiredGateIds : requiredGateIds).filter(/* 检查计划是否遗漏不可跳过的门禁。 */ id => !ids.has(id))
  if (missing.length) throw new Error(`Qualification plan omits required gates: ${missing.join(', ')}`)
  if (artifactNames.some(/* 返回 artifacts.has(name) 的逻辑取反结果。 */ name => !artifacts.has(name))) throw new Error('Qualification plan must bind all six actual local build artifacts to executed gates.')
  for (const path of [plan.releaseNotes, plan.editLedger, ...(plan.documentation ?? [])]) confinedPath('/qualification', path)
  if (plan.sourceSnapshot) confinedPath('/qualification', plan.sourceSnapshot)
  return plan
}
/** 核对报告格式、通过状态、发布版本及生成时间属于本次门禁；拒绝未解决的严重问题，再返回文件摘要记录。 */
export async function validateGateReport(root, specification, identity, startedAt) {
  const record = await fileRecord(root, specification.path), report = JSON.parse(await readFile(confinedPath(root, specification.path), 'utf8'))
  if (report.format !== specification.format || report.version !== specification.version || report.status !== 'passed') throw new Error(`${specification.path}: report schema/status did not pass.`)
  if ((specification.requireRelease || report.release !== undefined) && report.release !== identity.release) throw new Error(`${specification.path}: stale release authority.`)
  if ((specification.requireEngine || report.engineVersion !== undefined) && report.engineVersion !== identity.machineVersion) throw new Error(`${specification.path}: stale engine authority.`)
  if (report.machineVersion !== undefined && report.machineVersion !== identity.machineVersion) throw new Error(`${specification.path}: stale machine authority.`)
  const generated = Date.parse(report.generatedAt)
  if (!Number.isFinite(generated) || generated + 1000 < Date.parse(startedAt) || generated > Date.now() + 300000) throw new Error(`${specification.path}: report was not produced during this gate execution.`)
  if (Number(report.severity0Open ?? 0) !== 0 || Number(report.severity1Open ?? 0) !== 0) throw new Error(`${specification.path}: unresolved severity 0/1 findings.`)
  return { ...record, target: specification.target, format: report.format, version: report.version }
}
/** 不经 shell 启动指定程序，将标准输出和错误写入独占日志；关闭日志后返回退出码、信号和启动错误。 */
async function runCommand(command, root, logPath) {
  const log = createWriteStream(logPath, { flags: 'wx' })
  return new Promise(/** 等待子进程关闭，并在日志刷新完成后交付执行结果。 */ resolveResult => {
    const child = spawn(command.file, command.args, { cwd: root, shell: false, windowsHide: true, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] })
    let spawnError
    child.stdout.on('data', /* 调用 log.write(chunk) 并返回调用结果。 */ chunk => log.write(chunk)); child.stderr.on('data', /* 调用 log.write(chunk) 并返回调用结果。 */ chunk => log.write(chunk))
    child.on('error', /** 记录无法启动等进程错误；最终结果仍由关闭事件统一提交。 */ error => { spawnError = error.message; log.write(`\nSPAWN ERROR: ${error.message}\n`) })
    child.on('close', /* 调用 log.end(() => resolveResult({ exitCode: code, signal, ...(spawnError ? { error: spawnError } : {}) })) 并返回调用结果。 */ (code, signal) => log.end(/* 调用 resolveResult({ exitCode: code, signal, ...(spawnError ? { error: spawnError } : {}) }) 并返回调用结果。 */ () => resolveResult({ exitCode: code, signal, ...(spawnError ? { error: spawnError } : {}) })))
  })
}
/** 绑定冻结源码依次执行门禁，每次执行前后核对源码；保存报告和产物摘要，首个未通过项停止后续门禁并保留已有证据。 */
export async function executeReleasePlan(root, planPath) {
  const plan = validateQualificationPlan(JSON.parse(await readFile(planPath, 'utf8')))
  const snapshotPath = confinedPath(root, plan.sourceSnapshot ?? `.cache/release-snapshots/v${plan.release}/snapshot.json`), snapshot = await verifyReleaseSnapshot(snapshotPath, root)
  const audits = join(root, 'release-audits'), run = `qualification-v${plan.release}-${randomUUID()}`, runRoot = join(audits, run)
  await mkdir(runRoot, { recursive: true })
  await cp(planPath, join(runRoot, 'plan.json'))
  await cp(snapshotPath, join(runRoot, 'source-snapshot.json'))
  const result = { format: 'nova-release-executed-gates', version: 1, release: plan.release, machineVersion: plan.machineVersion, sourceInputDigest: snapshot.sourceInputDigest, startedAt: new Date().toISOString(), generatedAt: '', status: 'running', gates: [] }
  await writeJson(join(runRoot, 'executed-gates.json'), result)
  for (const gate of plan.gates) {
    const execution = { id: gate.id, category: gate.category, context: gate.context, sourceInputDigest: snapshot.sourceInputDigest, startedAt: new Date().toISOString(), generatedAt: '', status: 'pending', reports: [], artifacts: [] }
    result.gates.push(execution)
    if (gate.blockedReason) { execution.status = 'context-blocked'; execution.reason = gate.blockedReason }
    else {
      try {
        await verifyReleaseSnapshot(snapshotPath, root)
        execution.command = gate.command
        console.log(`Running ${gate.id} (${gate.category}): ${gate.context}`)
        Object.assign(execution, await runCommand(gate.command, root, join(runRoot, `${gate.id}.log`)))
        execution.log = await fileRecord(runRoot, `${gate.id}.log`)
        if (execution.exitCode !== 0) throw new Error(`Command exited ${execution.exitCode}; see ${run}/${gate.id}.log.`)
        await verifyReleaseSnapshot(snapshotPath, root)
        for (const specification of gate.reports ?? []) {
          const record = await validateGateReport(root, specification, plan, execution.startedAt)
          const target = join(runRoot, 'reports', specification.target); await mkdir(dirname(target), { recursive: true }); await cp(confinedPath(root, specification.path), target)
          execution.reports.push(record)
        }
        for (const artifact of gate.artifacts ?? []) execution.artifacts.push({ ...await fileRecord(root, artifact.path), name: artifact.name, status: 'passed' })
        if ((gate.artifacts ?? []).some(/* 比较 artifact.name 与 'web-editor'，返回严格相等的判断结果。 */ artifact => artifact.name === 'web-editor')) execution.webFiles = await Promise.all((await filesBelow(join(root, 'dist'))).map(/* 调用 fileRecord(root, `dist/${path}`) 并返回调用结果。 */ path => fileRecord(root, `dist/${path}`)))
        execution.status = 'passed'
      } catch (error) { execution.status = 'failed'; execution.reason = error.message }
    }
    execution.generatedAt = new Date().toISOString()
    await writeJson(join(runRoot, 'executed-gates.json'), result)
    // 保留失败命令及此前全部结果；未执行的门禁不生成虚假的通过记录。
    if (execution.status !== 'passed') break
  }
  result.generatedAt = new Date().toISOString()
  result.status = result.gates.length === plan.gates.length && result.gates.every(/* 比较 gate.status 与 'passed'，返回严格相等的判断结果。 */ gate => gate.status === 'passed') ? 'passed' : 'incomplete'
  await writeJson(join(runRoot, 'executed-gates.json'), result)
  console.log(JSON.stringify({ runRoot, status: result.status, executed: result.gates.length, required: plan.gates.length }))
  return { runRoot, result, plan }
}
/** 重新核对完整执行记录与声明计划、冻结源码及当前产物；检查日志、报告和 Web 文件未被替换或改动。 */
export async function verifyExecutedGates(root, runRoot) {
  const plan = validateQualificationPlan(JSON.parse(await readFile(join(runRoot, 'plan.json'), 'utf8')))
  const result = JSON.parse(await readFile(join(runRoot, 'executed-gates.json'), 'utf8'))
  const snapshot = await verifyReleaseSnapshot(join(runRoot, 'source-snapshot.json'), root)
  if (result.format !== 'nova-release-executed-gates' || result.version !== 1 || result.status !== 'passed' || result.release !== plan.release || result.machineVersion !== plan.machineVersion || snapshot.release !== plan.release || result.sourceInputDigest !== snapshot.sourceInputDigest || result.gates.length !== plan.gates.length) throw new Error('Executed gate qualification is incomplete or identifies another source/release.')
  for (let index = 0; index < plan.gates.length; index++) {
    const gate = result.gates[index], expected = plan.gates[index]
    if (gate.id !== expected.id || gate.status !== 'passed' || gate.exitCode !== 0 || gate.sourceInputDigest !== snapshot.sourceInputDigest || gate.category !== expected.category || gate.context !== expected.context || JSON.stringify(gate.command) !== JSON.stringify(expected.command)) throw new Error(`Gate identity/execution mismatch: ${expected.id}`)
    if (JSON.stringify(await fileRecord(runRoot, `${gate.id}.log`)) !== JSON.stringify(gate.log)) throw new Error(`Gate log changed: ${gate.id}`)
    if (gate.reports.length !== (expected.reports ?? []).length || gate.artifacts.length !== (expected.artifacts ?? []).length) throw new Error(`Gate outputs missing: ${gate.id}`)
    for (let reportIndex = 0; reportIndex < gate.reports.length; reportIndex++) {
      const record = gate.reports[reportIndex], specification = expected.reports[reportIndex]
      if (record.target !== specification.target || record.path !== specification.path) throw new Error(`Gate report identity changed: ${gate.id}`)
      const copy = await fileRecord(runRoot, `reports/${record.target}`)
      if (copy.sha256 !== record.sha256 || copy.bytes !== record.bytes) throw new Error(`Gate report changed: ${record.target}`)
      await validateGateReport(runRoot, { ...specification, path: `reports/${record.target}` }, plan, gate.startedAt)
    }
    for (let artifactIndex = 0; artifactIndex < gate.artifacts.length; artifactIndex++) {
      const record = gate.artifacts[artifactIndex], specification = expected.artifacts[artifactIndex]
      const current = await fileRecord(root, record.path)
      if (record.name !== specification.name || record.path !== specification.path || current.sha256 !== record.sha256 || current.bytes !== record.bytes) throw new Error(`Qualified artifact changed: ${record.name}`)
    }
    if ((expected.artifacts ?? []).some(/* 比较 artifact.name 与 'web-editor'，返回严格相等的判断结果。 */ artifact => artifact.name === 'web-editor')) {
      const current = await Promise.all((await filesBelow(join(root, 'dist'))).map(/* 调用 fileRecord(root, `dist/${path}`) 并返回调用结果。 */ path => fileRecord(root, `dist/${path}`)))
      if (JSON.stringify(current) !== JSON.stringify(gate.webFiles)) throw new Error('Qualified web assets changed after the web build gate.')
    }
  }
  return { plan, result, snapshot }
}
/** 从解包目录独立验证源码、门禁日志、报告和 Web 产物；只允许列明的发布附属文件，要求本机构建清单与执行记录一致。 */
export async function verifyPackagedQualification(evidenceRoot, sourceRoot, webRoot) {
  const plan = validateQualificationPlan(JSON.parse(await readFile(join(evidenceRoot, 'qualification/plan.json'), 'utf8')))
  const result = JSON.parse(await readFile(join(evidenceRoot, 'qualification/executed-gates.json'), 'utf8'))
  const snapshot = await verifyReleaseSnapshot(join(evidenceRoot, 'build/source-snapshot.json'), sourceRoot)
  const builds = JSON.parse(await readFile(join(evidenceRoot, 'build/local-builds.json'), 'utf8'))
  if (result.format !== 'nova-release-executed-gates' || result.version !== 1 || result.status !== 'passed' || result.release !== plan.release || result.machineVersion !== plan.machineVersion || snapshot.release !== plan.release || result.sourceInputDigest !== snapshot.sourceInputDigest || result.gates.length !== plan.gates.length || builds.sourceInputDigest !== snapshot.sourceInputDigest) throw new Error('Packaged execution/source/build authority disagrees.')
  const qualifiedArtifacts = []
  for (let index = 0; index < plan.gates.length; index++) {
    const gate = result.gates[index], expected = plan.gates[index]
    if (gate.id !== expected.id || gate.status !== 'passed' || gate.exitCode !== 0 || gate.sourceInputDigest !== snapshot.sourceInputDigest || gate.category !== expected.category || gate.context !== expected.context || JSON.stringify(gate.command) !== JSON.stringify(expected.command)) throw new Error(`Packaged gate did not execute as declared: ${expected.id}`)
    const log = await fileRecord(evidenceRoot, `qualification/${gate.id}.log`)
    if (log.sha256 !== gate.log?.sha256 || log.bytes !== gate.log?.bytes) throw new Error(`Packaged log changed: ${gate.id}`)
    if (gate.reports.length !== (expected.reports ?? []).length || gate.artifacts.length !== (expected.artifacts ?? []).length) throw new Error(`Packaged gate outputs missing: ${gate.id}`)
    for (let reportIndex = 0; reportIndex < gate.reports.length; reportIndex++) {
      const record = gate.reports[reportIndex], specification = expected.reports[reportIndex]
      if (record.target !== specification.target || record.path !== specification.path) throw new Error(`Packaged report identity changed: ${gate.id}`)
      const actual = await validateGateReport(evidenceRoot, { ...specification, path: record.target }, plan, gate.startedAt)
      if (actual.sha256 !== record.sha256 || actual.bytes !== record.bytes) throw new Error(`Packaged report changed: ${record.target}`)
    }
    for (let artifactIndex = 0; artifactIndex < gate.artifacts.length; artifactIndex++) {
      const record = gate.artifacts[artifactIndex], specification = expected.artifacts[artifactIndex]
      if (record.name !== specification.name || record.path !== specification.path) throw new Error(`Packaged artifact identity changed: ${record.name}`)
      qualifiedArtifacts.push(record)
    }
    if ((expected.artifacts ?? []).some(/* 比较 artifact.name 与 'web-editor'，返回严格相等的判断结果。 */ artifact => artifact.name === 'web-editor')) {
      if (!Array.isArray(gate.webFiles) || !gate.webFiles.length) throw new Error('Packaged qualification has no web asset inventory.')
      const allowed = new Set(['README.md', 'LICENSE.md', 'release-metadata.json', 'SHA256SUMS.txt', 'FONT_LICENSES/Nunito-Sans-OFL-1.1.txt', 'FONT_LICENSES/Noto-Sans-SC-OFL-1.1.txt', 'FONT_LICENSES/JetBrains-Mono-OFL-1.1.txt'])
      // 与发布打包器使用同一版本分界：26.24 起必须携带本版部署说明，旧版保持兼容。
      const [releaseYear, releaseSequence] = plan.release.split('.').map(Number)
      const requiresCurrentHostingGuide = releaseYear > 26 || (releaseYear === 26 && releaseSequence >= 24)
      const hostingPath = requiresCurrentHostingGuide ? `docs/WEB_HOSTING_${plan.release.replaceAll('.', '_')}.md` : 'docs/WEB_HOSTING_26_23.md'
      let hostingSource = null
      try { hostingSource = await readFile(join(sourceRoot, hostingPath)) } catch (error) { if (requiresCurrentHostingGuide || error.code !== 'ENOENT') throw error }
      if (hostingSource !== null) {
        const hostedGuide = await readFile(join(webRoot, 'HOSTING.md'))
        if (!hostingSource.equals(hostedGuide)) throw new Error('Packaged hosting guide differs from the frozen source documentation.')
        allowed.add('HOSTING.md')
      }
      for (const record of gate.webFiles) {
        if (!record.path.startsWith('dist/')) throw new Error('Packaged web inventory path is invalid.')
        const path = record.path.slice(5), actual = await fileRecord(webRoot, path); allowed.add(path)
        if (actual.sha256 !== record.sha256 || actual.bytes !== record.bytes) throw new Error(`Packaged web output differs from the qualified build: ${path}`)
      }
      for (const path of await filesBelow(webRoot)) if (!allowed.has(path)) throw new Error(`Unqualified web asset in package: ${path}`)
    }
  }
  if (JSON.stringify(qualifiedArtifacts) !== JSON.stringify(builds.artifacts)) throw new Error('Packaged local builds disagree with executed gates.')
  return { release: plan.release, sourceInputDigest: snapshot.sourceInputDigest, status: 'passed' }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const option = /* 调用 process.argv.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3) 并返回调用结果。 */ name => process.argv.find(/* 调用 arg.startsWith(`--${name}=`) 并返回调用结果。 */ arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3)
  const root = resolve(option('root') ?? dirname(dirname(fileURLToPath(import.meta.url))))
  const run = option('verify')
  const packaged = option('packaged-evidence')
  if (packaged) console.log(JSON.stringify(await verifyPackagedQualification(resolve(packaged), resolve(option('source')), resolve(option('web')))))
  else if (run) { await verifyExecutedGates(root, resolve(run)); console.log('Executed gate/source/artifact verification passed.') }
  else { const { result } = await executeReleasePlan(root, resolve(option('plan') ?? '')); if (result.status !== 'passed') process.exitCode = 1 }
}
