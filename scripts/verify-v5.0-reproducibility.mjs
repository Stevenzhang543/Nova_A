/** 功能回归脚本：执行 verify-v5.0-reproducibility.mjs 对应场景，保留断言和证据输出。 */
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const project = join(root, 'reference-projects', 'projects', 'first-game-v50-tier1', 'project.nova')
const temporary = await mkdtemp(join(tmpdir(), 'nova-a-v50-clean-builds-'))
const sha = /* 调用 createHash('sha256').update(bytes).digest('hex') 并返回调用结果。 */ bytes => createHash('sha256').update(bytes).digest('hex')
const walk = /** 结构说明（自动提取）：walk；输入 directory；直接调用 readdir、join、entry.isDirectory、files.push、walk；返回路径包含 files；包含循环处理；等待异步结果。 */ async directory => {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await walk(path)); else files.push(path)
  }
  return files
}
const hashTree = /** 结构说明（自动提取）：hashTree；输入 directory；直接调用 sort、walk、stat、readFile、records.push 等；包含循环处理；等待异步结果。 */ async directory => {
  const records = []
  for (const path of (await walk(directory)).sort()) {
    const info = await stat(path), bytes = await readFile(path)
    records.push({ path: relative(directory, path).replaceAll('\\', '/'), bytes: info.size, sha256: sha(bytes) })
  }
  return { digest: sha(Buffer.from(JSON.stringify(records))), records }
}
const runs = []
try {
  for (let cycle = 1; cycle <= 10; cycle++) {
    const targets = []
    for (const target of ['windows', 'web']) {
      const output = join(temporary, `cycle-${cycle}`, target)
      await mkdir(output, { recursive: true })
      const result = spawnSync(process.execPath, [join(root, 'scripts', 'nova-export.mjs'), '--project', project, '--target', target, '--profile', 'release', '--cache', 'clean', '--channel', 'beta', '--output', output], { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 180_000, maxBuffer: 4 * 1024 * 1024 })
      if (result.status !== 0) throw new Error(`${target} clean build ${cycle} failed: ${result.stderr || result.stdout}`)
      targets.push({ target, ...await hashTree(output) })
    }
    runs.push({ cycle, targets })
    console.log(`Clean reproducibility build ${cycle}/10`)
  }
} finally {
  await rm(temporary, { recursive: true, force: true, maxRetries: 10, retryDelay: 150 })
}
const baselines = Object.fromEntries(runs[0].targets.map(/* 返回按声明顺序构造的数组 [target.target, target.digest]。 */ target => [target.target, target.digest]))
const mismatches = runs.flatMap(/** 结构说明（自动提取）：runs.flatMap 回调；输入 run；直接调用 map、run.targets.filter；返回表达式求值结果。 */ run => run.targets.filter(/* 比较 target.digest 与 baselines[target.target]，返回严格不等的判断结果。 */ target => target.digest !== baselines[target.target]).map(/** 结构说明（自动提取）：map 回调；输入 target；返回表达式求值结果。 */ target => ({ cycle: run.cycle, target: target.target, expected: baselines[target.target], actual: target.digest })))
const report = {
  format: 'nova-v5.0-clean-build-reproducibility', version: 1, engineVersion: '5.0.0', generatedAt: new Date().toISOString(),
  sourceProject: 'reference-projects/projects/first-game-v50-tier1/project.nova', model: 'Ten fresh output directories per Tier-1 target; every unsigned payload and manifest byte is SHA-256 inventoried and the sorted inventory is hashed.',
  cycles: runs.length, targets: ['windows', 'web'], baselines, runs: runs.map(/** 结构说明（自动提取）：runs.map 回调；输入 run；直接调用 run.targets.map；返回表达式求值结果。 */ run => ({ cycle: run.cycle, targets: run.targets.map(/** 结构说明（自动提取）：run.targets.map 回调；输入 { target, digest, records }；返回表达式求值结果。 */ ({ target, digest, records }) => ({ target, digest, files: records.length })) })),
  mismatches, qualificationScope: 'same-machine ten-build payload equality', independentMachineComparison: 'pending-external', status: mismatches.length ? 'failed' : 'passed'
}
await mkdir(join(root, 'release-audits'), { recursive: true })
await writeFile(join(root, 'release-audits', 'v5.0.0-clean-build-reproducibility.json'), `${JSON.stringify(report, null, 2)}\n`)
if (mismatches.length) { console.error(mismatches); process.exit(1) }
console.log('Nova_A v5.0 ten consecutive clean Windows/Web payload builds matched on this machine.')
