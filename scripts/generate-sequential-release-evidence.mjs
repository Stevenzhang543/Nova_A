/** 汇集发布报告与产物文件，生成带来源记录的发布证据。 */
import { cp, lstat, mkdir, readFile, rename } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { confinedPath, fileRecord, filesBelow, verifyExecutedGates, writeJson } from './release-qualification.mjs'
import { verifyReleaseSnapshot } from './release-source-snapshot.mjs'

/** 验证执行门、源码快照及实际二进制证据，暂存完整发布证据并复验后原子归档，外部资格明确保持待办。 */ export async function generateSequentialReleaseEvidence(root, runRoot) {
  const { plan, result, snapshot } = await verifyExecutedGates(root, runRoot)
  const { release, machineVersion } = plan, generatedAt = new Date().toISOString()
  const audits = join(root, 'release-audits'), final = join(audits, `evidence-v${release}`)
  try { await lstat(final); throw new Error(`Immutable qualified evidence already exists: ${final}`) } catch (error) { if (error.code !== 'ENOENT') throw error }
  const evidence = join(audits, `.evidence-v${release}-${randomUUID()}`)
  const artifacts = result.gates.flatMap(/* 返回 gate.artifacts 的当前值。 */ gate => gate.artifacts)
  const reports = new Map(result.gates.flatMap(/* 返回 gate.reports 的当前值。 */ gate => gate.reports).map(/* 返回按声明顺序构造的数组 [report.target, report]。 */ report => [report.target, report]))
  const readReport = /* 调用 readFile(join(runRoot, 'reports', target), 'utf8').then(JSON.parse) 并返回调用结果。 */ target => readFile(join(runRoot, 'reports', target), 'utf8').then(JSON.parse)
  const windows = await readReport('build/windows-smoke.json'), headless = await readReport('build/headless-authority.json')
  for (const [qualifiedName, artifactName] of [['editor', 'windows-editor'], ['msi', 'windows-msi'], ['setup', 'windows-nsis']]) {
    const proof = windows.artifacts?.find(/* 比较 item.name 与 qualifiedName，返回严格相等的判断结果。 */ item => item.name === qualifiedName), actual = artifacts.find(/* 比较 item.name 与 artifactName，返回严格相等的判断结果。 */ item => item.name === artifactName)
    if (!proof || proof.sha256 !== actual.sha256 || Number(proof.bytes) !== actual.bytes) throw new Error(`Windows user smoke did not exercise the qualified ${artifactName}.`)
  }
  const authority = artifacts.find(/* 比较 item.name 与 'windows-headless-authority'，返回严格相等的判断结果。 */ item => item.name === 'windows-headless-authority')
  if (headless.artifact?.sha256 !== authority.sha256 || Number(headless.artifact?.bytes) !== authority.bytes) throw new Error('Headless behavior report does not identify the qualified executable.')
  const notes = await readFile(confinedPath(root, plan.releaseNotes), 'utf8'), ledger = await readFile(confinedPath(root, plan.editLedger), 'utf8')
  if (![notes, ledger].every(/* 先计算 text.includes(release)；仅当其为真值时求右侧 text.includes(machineVersion)，返回短路求值结果。 */ text => text.includes(release) && text.includes(machineVersion))) throw new Error('Authored release notes and edit ledger must identify the public and machine versions.')
  if (!/Files (changed|added)/.test(ledger) || !ledger.includes('deterministic path-level manifest')) throw new Error('Authored edit ledger must contain the exhaustive Files changed/added section and identify its deterministic path-level manifest.')
  for (const folder of ['build', 'manual', 'documentation', 'external', 'qualification']) await mkdir(join(evidence, folder), { recursive: true })
  for (const target of reports.keys()) { await mkdir(dirname(join(evidence, target)), { recursive: true }); await cp(join(runRoot, 'reports', target), join(evidence, target)) }
  for (const name of ['MANUAL.en.md', 'MANUAL.de.md', 'MANUAL.zh-CN.md', 'index.html']) await cp(join(root, 'manual', name), join(evidence, 'manual', name))
  for (const path of plan.documentation ?? []) {
    const target = join(evidence, 'documentation', path); await mkdir(dirname(target), { recursive: true }); await cp(confinedPath(root, path), target)
  }
  for (const name of ['plan.json', 'executed-gates.json']) await cp(join(runRoot, name), join(evidence, 'qualification', name))
  for (const gate of result.gates) await cp(join(runRoot, `${gate.id}.log`), join(evidence, 'qualification', `${gate.id}.log`))
  await cp(join(runRoot, 'source-snapshot.json'), join(evidence, 'build/source-snapshot.json'))
  await writeJson(join(evidence, 'build/local-builds.json'), { format: 'nova-local-build-evidence', version: 1, release, engineVersion: machineVersion, sourceInputDigest: snapshot.sourceInputDigest, generatedAt, artifacts, status: 'passed' })
  const externalGates = Object.fromEntries(['publisherSigning', 'cleanMachineLifecycle', 'secondMachineReproducibility', 'matchingHostLinuxMacos', 'androidHardwareStore', 'firefoxWebkitMatrix', 'nativeAssistiveTechnology', 'independentBeginnerExpertObservation', 'realLowEndHardware', 'publicRelayHostileNetwork', 'independentSecurityReview', 'ecosystemProductionAdoption', 'soak72Hours'].map(/* 返回按声明顺序构造的数组 [name, 'pending-external']。 */ name => [name, 'pending-external']))
  await writeJson(join(evidence, 'external/gates.json'), { format: 'nova-external-certification-gates', version: 1, release, generatedAt, gates: Object.entries(externalGates).map(/** 将外部检查状态转为未声称通过的证据条目。 */ ([name, status]) => ({ name, status, claimed: false })) })
  const environment = { id: `${process.platform}-${process.arch}-node${process.versions.node}`, platform: process.platform, architecture: process.arch, node: process.versions.node }
  const source = { commit: 'unavailable-source-snapshot', state: 'immutable-filesystem-snapshot', authority: snapshot.sourceInputDigest }
  const entries = await Promise.all((await filesBelow(evidence)).map(/** 为归档文件记录散列信息并附源码、工具与环境来源。 */ async path => ({ ...await fileRecord(evidence, path), source: source.commit, tool: 'generate-sequential-release-evidence.mjs', environment: environment.id })))
  await writeJson(join(evidence, 'evidence-manifest.json'), { format: 'nova-release-evidence-manifest', version: 1, release, machineVersion, engineVersion: machineVersion, generatedAt, source, sourceInputDigest: snapshot.sourceInputDigest, sourceInputs: snapshot.sourceInputs, environment, qualification: { runPath: relative(root, runRoot).replaceAll('\\', '/'), sourceSnapshot: plan.sourceSnapshot ?? `.cache/release-snapshots/v${release}/snapshot.json` }, localQualificationComplete: true, auditPolicy: plan.auditPolicy ?? { kind: 'full-baseline' }, localReportAuthorities: { status: 'passed', issues: [] }, externalCertificationComplete: false, externalGates, entries })
  await verifyReleaseSnapshot(join(runRoot, 'source-snapshot.json'), root)
  await verifyExecutedGates(root, runRoot)
  await cp(confinedPath(root, plan.releaseNotes), join(audits, `v${release}-release-notes.md`))
  await cp(confinedPath(root, plan.editLedger), join(audits, `v${release}-edit-ledger.md`))
  if (reports.has('performance/benchmarks.json')) await cp(join(runRoot, 'reports/performance/benchmarks.json'), join(audits, `v${release}-benchmarks.json`))
  if (reports.has('performance/stability-local.json')) await cp(join(runRoot, 'reports/performance/stability-local.json'), join(audits, `v${release}-stability-smoke.json`))
  // Never replace a previously qualified evidence set. Retain failed staging for diagnosis.
  try { await lstat(final); throw new Error(`Immutable qualified evidence already exists: ${final}`) } catch (error) { if (error.code !== 'ENOENT') throw error }
  await rename(evidence, final)
  return { directory: final, release, sourceInputDigest: snapshot.sourceInputDigest, entries: entries.length, status: 'passed', externalCertificationComplete: false }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const option = /* 调用 process.argv.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3) 并返回调用结果。 */ name => process.argv.find(/* 调用 arg.startsWith(`--${name}=`) 并返回调用结果。 */ arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3)
  const root = resolve(option('root') ?? dirname(dirname(fileURLToPath(import.meta.url))))
  console.log(JSON.stringify(await generateSequentialReleaseEvidence(root, resolve(option('run') ?? '')), null, 2))
}
