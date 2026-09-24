/** 发布工具回归：使用临时夹具检查计划校验、证据绑定及实际打包文档契约，不代表产品全部通过。 */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { assertReleaseSourceVersions, createReleaseSnapshot, excludedReleaseSource, releaseSourceInventory, releaseVersion, verifyReleaseSnapshot } from './release-source-snapshot.mjs'
import { artifactNames, executeReleasePlan, reportTargets, requiredGateIds, validateGateReport, validateQualificationPlan, verifyExecutedGates, verifyPackagedQualification, writeJson } from './release-qualification.mjs'
import { generateSequentialReleaseEvidence } from './generate-sequential-release-evidence.mjs'
import { generateReleasePlan } from './generate-release-plan.mjs'
import { FOCUS_26_12, summarizeProductEvidence } from './release-milestone-gates.mjs'

const repo = dirname(dirname(fileURLToPath(import.meta.url))), temporary = await mkdtemp(join(tmpdir(), 'nova-release-tooling-'))
// 中文与嵌套数组须无损保存；只移除格式缩进，不删减审计字段。
const compactFixture = { label: '完整审计证据', nested: [{ sample: '\n保留换行', value: 42 }], absent: null }
const compactPath = join(temporary, 'compact-evidence.json')
await writeJson(compactPath, compactFixture)
assert.equal(await readFile(compactPath, 'utf8'), JSON.stringify(compactFixture) + '\n')
assert.deepEqual(JSON.parse(await readFile(compactPath, 'utf8')), compactFixture)
let checks = 2
const check = /** 断言条件成立并递增检查计数。 */ (condition, message) => { assert.ok(condition, message); checks++ }
const rejects = /** 断言异步操作按预期拒绝并递增检查计数。 */ async (callback, pattern) => { await assert.rejects(callback, pattern); checks++ }
const put = /** 创建目标文件的父目录并写入指定内容。 */ async (root, path, contents) => { await mkdir(dirname(join(root, path)), { recursive: true }); await writeFile(join(root, path), contents) }
/** 创建一次性发布工具样本仓库，包含版本、私密文件、生成物和文档以验证版本及快照规则。 */ async function fixture(root) {
  const version = '26.10.0'
  const files = {
    'package.json': JSON.stringify({ name: 'nova_a', version, type: 'module' }, null, 2),
    'nova_core/pkg/package.json': JSON.stringify({ version, name: 'nova_wasm' }, null, 2),
    'src-tauri/tauri.conf.json': JSON.stringify({ version, productName: 'Nova_A' }, null, 2),
    'Cargo.toml': `[workspace.package]\nversion = "${version}"\n`, 'src-tauri/Cargo.toml': `[package]\nname = "nova_a"\nversion = "${version}"\n`,
    'Cargo.lock': [...Array.from({ length: 7 }, /** 按索引生成Nova工作区包的Cargo锁文件片段。 */ (_, index) => `[[package]]\nname = "nova_${index}"\nversion = "${version}"\n`), `[[package]]\nname = "third_party"\nversion = "${version}"\n`].join('\n'),
    'src-tauri/Cargo.lock': `[[package]]\nname = "nova_a"\nversion = "${version}"\n\n[[package]]\nname = "third_party"\nversion = "${version}"\n`,
    'src/projects/projectFormat.ts': `export const NOVA_ENGINE_VERSION = '${version}'\nexport const NOVA_RELEASE_NAME = '26.10'\n`,
    'crates/nova_format/src/lib.rs': `pub const CURRENT_ENGINE_VERSION: &str = "${version}";\n`,
    'tests/fixtures/migrations/public-schema-expected.json': JSON.stringify({ targetEngine: version, schema: 29 }, null, 2), 'src/i18n.ts': "export const releaseLabel = 'Nova_A v26.10'\n",
    '.gitignore': 'node_modules\n.cache\ndist\n', '.env.example': 'EXAMPLE=only\n', '.env': 'PRIVATE=fixture\n', 'src/untracked-new.ts': 'export const value = 1\n',
    '.cache/stale/output.js': 'generated', 'credentials.json': 'private fixture', 'nested/node_modules/dependency.js': 'dependency', 'src-tauri/target/stale.exe': 'stale binary', 'nova_core/pkg/nova_core_bg.wasm': 'generated wasm',
    'docs/notes.md': '# Nova_A 26.12 / 26.12.0\nFixture only, no real release qualified.\n',
    'docs/ledger.md': '# Nova_A 26.12 / 26.12.0\n\n## Files changed\n\nFixture deterministic path-level manifest; no production claim.\n'
  }
  for (const [path, contents] of Object.entries(files)) await put(root, path, contents)
  for (const name of ['MANUAL.en.md', 'MANUAL.de.md', 'MANUAL.zh-CN.md', 'index.html']) await put(root, `manual/${name}`, 'Fixture manual 26.12 / 26.12.0')
  for (const script of ['set-calendar-release.mjs', 'release-source-snapshot.mjs']) await put(root, `scripts/${script}`, await readFile(join(repo, 'scripts', script)))
}
/** 在指定样本目录运行日历版本设置工具并返回输出。 */ function runSetter(root, release) { return execFileSync(process.execPath, [join(root, 'scripts/set-calendar-release.mjs'), `--release=${release}`], { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }) }
try {
  for (const release of ['26.08', '26.10', '26.12', '26.13', '26.14', '26.15', '26.16', '26.99', '27.01']) check(releaseVersion(release) === `${Number(release.slice(0, 2))}.${Number(release.slice(3))}.0`, `Sequence ${release}`)
  for (const release of ['26.00', '26.100', '26.1', '25.12', '../26.12', '26.12.0']) { assert.throws(/* 调用 releaseVersion(release) 并返回调用结果。 */ () => releaseVersion(release)); checks++ }
  for (const path of ['.env', 'src/.env.local', 'secrets.json', 'private.p12', '.agents/prompt.md', '.ssh/config', 'keys/id_ed25519', '.cache/a', 'dist/a', 'node_modules/a', 'x/node_modules/a', 'x/.cache/a', 'release-audits/a', 'releases/v26.10/a', 'src-tauri/target/a', 'nova_core/pkg/a', '../secret', '/absolute']) check(excludedReleaseSource(path), `Exclude ${path}`)
  for (const path of ['.env.example', '.github/workflows/ci.yml', 'src/new.ts', 'docs/manual.md', 'reference-projects/projects/new/main.rhai', '.gitignore']) check(!excludedReleaseSource(path), `Include ${path}`)
  for (const release of ['26.12', '26.13', '26.14', '26.15', '26.16']) {
    const generated = generateReleasePlan(release)
    check(generated.gates.length === 21 && generated.gates[0].id === 'native-build' && generated.gates.at(-1).id === 'product', `Plan orders build before fresh behavior and product aggregation: ${release}`)
    check(Boolean(generated.gates.find(/* 比较 gate.id 与 'focus'，返回严格相等的判断结果。 */ gate => gate.id === 'focus').blockedReason) === (release !== '26.12'), `Future focus remains blocked until its own implementation exists: ${release}`)
  }
  const pinnedPlan = generateReleasePlan('26.12', { node: 'C:/fixture/node.exe', pnpmEntry: 'C:/fixture/pnpm.cjs', pnpmBin: 'C:/fixture/bin' })
  check(pinnedPlan.gates.every(/* 比较 gate.command.file 与 'C:/fixture/node.exe'，返回严格相等的判断结果。 */ gate => gate.command.file === 'C:/fixture/node.exe') && !pinnedPlan.gates.some(/* 返回 gate.blockedReason 的当前值。 */ gate => gate.blockedReason), 'Provided pinned tools produce an executable plan without running it')
  check(pinnedPlan.gates.find(/* 比较 gate.id 与 'stability'，返回严格相等的判断结果。 */ gate => gate.id === 'stability').context.includes('not 1000 real editor'), 'Legacy synthetic stability scope is explicit in the actual plan')
  check(FOCUS_26_12.some(/** 判断API签名检查门禁是否绑定正确脚本、报告参数和报告路径。 */ ([script, args, report]) => script === 'scripts/verify-v26.12-api-signatures.mjs' && args.includes('--report=release-audits/v26.12-api-signatures.json') && report === 'release-audits/v26.12-api-signatures.json'), 'Current API overload execution is a mandatory recorded focus suite')
  check(FOCUS_26_12.some(/** 判断图往返检查门禁是否使用原生运行时参数和对应报告。 */ ([script, args, report]) => script === 'scripts/verify-v26.11-visual-roundtrip.mjs' && args.some(/* 调用 argument.startsWith('--runtime=target/debug/examples/nova_script_test') 并返回调用结果。 */ argument => argument.startsWith('--runtime=target/debug/examples/nova_script_test')) && report === 'release-audits/v26.11-visual-roundtrip.json'), 'Retained legacy graph focus requires actual native execution')
  const root = join(temporary, 'source'); await fixture(root)
  const summary = summarizeProductEvidence([{ path: 'fixture-gate.json', report: { status: 'passed' } }])
  check(summary.globalDefectCount === null && !('severity0Open' in summary) && !('severity1Open' in summary) && summary.evaluatedGateReports[0].status === 'passed', 'Passed product evidence leaves an unmeasured global defect count explicitly unknown')
  assert.throws(/* 调用 summarizeProductEvidence([{ path: 'failed-gate.json', report: { status: 'failed' } }]) 并返回调用结果。 */ () => summarizeProductEvidence([{ path: 'failed-gate.json', report: { status: 'failed' } }]), /missing or failed/); checks++
  const productPath = 'release-audits/fixture-product.json', productAt = new Date().toISOString()
  await put(root, productPath, JSON.stringify({ format: 'nova-release-product-audit', version: 1, release: '26.12', engineVersion: '26.12.0', generatedAt: productAt, status: 'passed', ...summary }))
  check((await validateGateReport(root, { path: productPath, target: 'runtime/product-audit.json', format: 'nova-release-product-audit', version: 1, requireRelease: true, requireEngine: true }, { release: '26.12', machineVersion: '26.12.0' }, productAt)).bytes > 0, 'Existing qualification and packaging report contract accepts scoped product evidence without fabricated defect counts')
  for (const release of ['26.12', '26.13', '26.14', '26.15', '26.16']) {
    runSetter(root, release); check(await assertReleaseSourceVersions(root, release) === releaseVersion(release), `Setter ${release}`)
    check((await readFile(join(root, 'Cargo.lock'), 'utf8')).includes('name = "third_party"\nversion = "26.10.0"'), 'Third-party lock version retained')
    check(runSetter(root, release).includes('0 files changed'), 'Setter idempotence')
  }
  // The source archive excludes generated WASM, so a clean extracted source must be versionable before its first build.
  await rm(join(root, 'nova_core/pkg'), { recursive: true }); runSetter(root, '26.12'); check(await assertReleaseSourceVersions(root, '26.12') === '26.12.0', 'Setter permits an absent generated package')
  const authoritiesBefore = await readFile(join(root, 'package.json'), 'utf8')
  await put(root, 'src/i18n.ts', 'invalid fixture authority')
  assert.throws(/* 调用 runSetter(root, '26.13') 并返回调用结果。 */ () => runSetter(root, '26.13')); checks++
  check(await readFile(join(root, 'package.json'), 'utf8') === authoritiesBefore, 'Setter preflight does not partially mutate authorities')
  await put(root, 'src/i18n.ts', "export const releaseLabel = 'Nova_A v26.12'\n")

  const artifactPaths = ['dist/index.html', 'dist/player.html', 'src-tauri/target/release/editor.exe', 'src-tauri/target/release/setup.exe', 'src-tauri/target/release/editor.msi', 'release-audits/headless/server.exe']
  const userIds = new Set(['browser-layout', 'user-interactions', 'windows', 'headless'])
  const plan = { format: 'nova-release-qualification-plan', version: 1, release: '26.12', machineVersion: '26.12.0', releaseNotes: 'docs/notes.md', editLedger: 'docs/ledger.md', documentation: ['docs/notes.md'], gates: requiredGateIds.map(/** 构造发布门禁测试记录，按标识配置类别、报告要求及原生构建产物。 */ id => ({ id, category: userIds.has(id) ? 'user' : 'programmer', context: 'Disposable verifier fixture; no real UI or production release qualified.', command: { file: process.execPath, args: ['fixture-gate.mjs', id] }, reports: reportTargets[id] ? [{ path: `release-audits/${id}.json`, target: reportTargets[id], format: 'nova-release-test-fixture', version: 1, requireRelease: true, requireEngine: true }] : [], artifacts: id === 'native-build' ? artifactNames.map(/** 将产物名称与对应路径组成描述记录。 */ (name, index) => ({ name, path: artifactPaths[index] })) : [] })) }
  await put(root, 'fixture-plan.json', JSON.stringify(plan))
  await put(root, 'fixture-gate.mjs', `import { readFile, mkdir, writeFile } from 'node:fs/promises'; import { dirname } from 'node:path'; import { createHash } from 'node:crypto';\nconst plan=JSON.parse(await readFile('fixture-plan.json','utf8')), gate=plan.gates.find(g=>g.id===process.argv[2]);\nfor(const a of gate.artifacts){await mkdir(dirname(a.path),{recursive:true});await writeFile(a.path,'fixture '+a.name)}\nconst record=async(name,path)=>{const b=await readFile(path);return{name,path,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')}};\nfor(const s of gate.reports){const report={format:s.format,version:s.version,release:plan.release,engineVersion:plan.machineVersion,generatedAt:new Date().toISOString(),status:'passed',context:'Synthetic fixture only'}; if(gate.id==='windows')report.artifacts=await Promise.all([['editor',2],['setup',3],['msi',4]].map(([n,i])=>record(n,plan.gates.find(g=>g.id==='native-build').artifacts[i].path))); if(gate.id==='headless')report.artifact=await record('headless',plan.gates.find(g=>g.id==='native-build').artifacts[5].path); await mkdir(dirname(s.path),{recursive:true});await writeFile(s.path,JSON.stringify(report))} console.log('fixture gate',gate.id);\n`)
  const snapshot = await createReleaseSnapshot(root, '26.12')
  check(snapshot.files > 15, 'Snapshot includes actual authored files')
  check((await releaseSourceInventory(snapshot.source)).some(/* 比较 file.path 与 'src/untracked-new.ts'，返回严格相等的判断结果。 */ file => file.path === 'src/untracked-new.ts'), 'Snapshot retains untracked authored source')
  check(!(await releaseSourceInventory(snapshot.source)).some(/* 调用 excludedReleaseSource(file.path) 并返回调用结果。 */ file => excludedReleaseSource(file.path)), 'Snapshot excludes generated/private/cache files')
  await rejects(/* 调用 createReleaseSnapshot(root, '26.12') 并返回调用结果。 */ () => createReleaseSnapshot(root, '26.12'), /Immutable release snapshot already exists/)
  await verifyReleaseSnapshot(snapshot.manifest, root); checks++
  const invalidPlan = structuredClone(plan); invalidPlan.gates.shift(); assert.throws(/* 调用 validateQualificationPlan(invalidPlan) 并返回调用结果。 */ () => validateQualificationPlan(invalidPlan), /omits required gates/); checks++
  const invalidUser = structuredClone(plan); invalidUser.gates.find(/* 比较 gate.id 与 'windows'，返回严格相等的判断结果。 */ gate => gate.id === 'windows').category = 'programmer'; assert.throws(/* 调用 validateQualificationPlan(invalidUser) 并返回调用结果。 */ () => validateQualificationPlan(invalidUser), /category/); checks++
  const { runRoot, result } = await executeReleasePlan(root, join(root, 'fixture-plan.json'))
  check(result.status === 'passed' && result.gates.length === 21, 'Runner executes all fixture commands with separate contexts')
  await verifyExecutedGates(root, runRoot); checks++
  const log = await readFile(join(runRoot, 'focus.log')); await writeFile(join(runRoot, 'focus.log'), 'modified')
  await rejects(/* 调用 verifyExecutedGates(root, runRoot) 并返回调用结果。 */ () => verifyExecutedGates(root, runRoot), /Gate log changed/); await writeFile(join(runRoot, 'focus.log'), log)
  await put(root, 'dist/new-unqualified.js', 'modified'); await rejects(/* 调用 verifyExecutedGates(root, runRoot) 并返回调用结果。 */ () => verifyExecutedGates(root, runRoot), /web assets changed/); await rm(join(root, 'dist/new-unqualified.js'))
  const artifact = await readFile(join(root, artifactPaths[2])); await put(root, artifactPaths[2], 'replaced native fixture'); await rejects(/* 调用 verifyExecutedGates(root, runRoot) 并返回调用结果。 */ () => verifyExecutedGates(root, runRoot), /Qualified artifact changed/); await put(root, artifactPaths[2], artifact)
  const generated = await generateSequentialReleaseEvidence(root, runRoot); check(generated.status === 'passed', 'Evidence aggregates only the successful fixture run')
  await verifyPackagedQualification(generated.directory, snapshot.source, join(root, 'dist')); checks++
  await put(root, 'dist/unqualified.js', 'unexpected web payload'); await rejects(/* 调用 verifyPackagedQualification(generated.directory, snapshot.source, join(root, 'dist')) 并返回调用结果。 */ () => verifyPackagedQualification(generated.directory, snapshot.source, join(root, 'dist')), /Unqualified web asset/); await rm(join(root, 'dist/unqualified.js'))
  await rejects(/* 调用 generateSequentialReleaseEvidence(root, runRoot) 并返回调用结果。 */ () => generateSequentialReleaseEvidence(root, runRoot), /Immutable qualified evidence already exists/)
  const blocked = structuredClone(plan); blocked.gates[0].blockedReason = 'Fixture unavailable browser context'; const blockedPath = join(temporary, 'blocked-plan.json'); await writeJson(blockedPath, blocked)
  const stopped = await executeReleasePlan(root, blockedPath); check(stopped.result.status === 'incomplete' && stopped.result.gates[0].status === 'context-blocked' && stopped.result.gates.length === 1, 'Blocked contexts never qualify or fabricate unrun results')
  await rejects(/* 调用 generateSequentialReleaseEvidence(root, stopped.runRoot) 并返回调用结果。 */ () => generateSequentialReleaseEvidence(root, stopped.runRoot), /incomplete/)
  await put(root, 'src/untracked-new.ts', 'changed after freeze'); await rejects(/* 调用 verifyReleaseSnapshot(snapshot.manifest, root) 并返回调用结果。 */ () => verifyReleaseSnapshot(snapshot.manifest, root), /Source changed/)
  const retry = await createReleaseSnapshot(root, '26.12', 'candidate-2'); check(retry.directory.endsWith('v26.12-candidate-2') && retry.sourceInputDigest !== snapshot.sourceInputDigest, 'Changed source can become a new immutable candidate without replacing the prior snapshot')
  const policy = join(repo, 'scripts/release-policy.ps1').replaceAll("'", "''")
  const ps = `$ErrorActionPreference='Stop'; . '${policy}'; foreach($s in 12..16){$l='26.'+$s; if((Get-CalendarReleaseInfo $l).MachineVersion -ne ('26.'+$s+'.0')){throw 'sequence'}}; Assert-ExactProductVersion '26.12.0' '26.12.0'; Assert-ExactProductVersion '26.12.0.0' '26.12.0'; foreach($v in @('26.12.01','26.12.0-beta','26.6.0')){$rejected=$false;try{Assert-ExactProductVersion $v '26.12.0'}catch{$rejected=$true};if(-not $rejected){throw 'version prefix accepted'}}; 'PowerShell policy passed'`
  check(execFileSync('pwsh.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], { encoding: 'utf8', windowsHide: true }).includes('PowerShell policy passed'), 'PowerShell sequence and exact native product version policy')
  const packager = await readFile(join(repo, 'scripts/package-release.ps1'), 'utf8')
  const parameters = packager.slice(packager.indexOf('param('), packager.indexOf("$ErrorActionPreference"))
  const manifestRead = packager.split(/\r?\n/).find(/* 调用 /Get-Content -LiteralPath \$snapshotPath -Raw \| ConvertFrom-Json/.test(line) 并返回调用结果。 */ line => /Get-Content -LiteralPath \$snapshotPath -Raw \| ConvertFrom-Json/.test(line))
  const manifestCheck = packager.split(/\r?\n/).find(/* 调用 line.includes("throw 'Frozen source identifies a different release.'") 并返回调用结果。 */ line => line.includes("throw 'Frozen source identifies a different release.'"))
  check(Boolean(manifestRead && manifestCheck), 'Packager exposes its actual snapshot read and identity check')
  const fragmentPath = join(temporary, 'packager-snapshot-parameters.ps1')
  await writeFile(fragmentPath, `${parameters}\n$MachineVersion=$Version\n$Version=$ReleaseLabel\n$snapshotPath=$SourceSnapshot\n${manifestRead}\n${manifestCheck}\nif($SourceSnapshot -cne $snapshotPath){throw 'Snapshot string parameter was overwritten'}\n'Snapshot parameter preserved'\n`)
  check(execFileSync('pwsh.exe', ['-NoProfile', '-NonInteractive', '-File', fragmentPath, '-Version', '26.12.0', '-ReleaseLabel', '26.12', '-SourceSnapshot', snapshot.manifest], { encoding: 'utf8', windowsHide: true }).includes('Snapshot parameter preserved'), 'Execute production PowerShell parameter types and manifest read without a case-insensitive variable collision')
  const verifier = await readFile(join(repo, 'scripts/verify-release-package.ps1'), 'utf8')
  const ledgerContract = verifier.slice(verifier.indexOf('if ($editLedger -notmatch'), verifier.indexOf('$checksumNames ='))
  const referenceContract = verifier.slice(verifier.indexOf('  $referenceReadmes ='), verifier.indexOf('  $evidence = Join-Path $temporaryRoot'))
  const versionComparison = verifier.slice(verifier.indexOf('function Test-VersionAtMost'), verifier.indexOf('function Assert-VersionAuthorities'))
  check(ledgerContract.includes('ledgerPaths.Count -lt 20') && referenceContract.includes('Current reference expected-output authority/schema'), 'Extract complete production ledger and reference checks')
  const current = JSON.parse(await readFile(join(repo, 'package.json'), 'utf8')).version
  const publicRelease = current.split('.').slice(0, 2).join('.')
  const documentContractPath = join(temporary, 'packaged-document-contract.ps1')
  await writeFile(documentContractPath, `param([string]$Root,[string]$Version,[string]$MachineVersion)\n$ErrorActionPreference='Stop'\n. '${policy}'\n${versionComparison}\n$requiresStructuredEvidence=$true\n$editLedger=Get-Content -Raw -LiteralPath (Join-Path $Root ('docs/EDIT_LEDGER_'+$Version.Replace('.','_')+'.md'))\n${ledgerContract}\n$references=Join-Path $Root 'reference-projects'\n${referenceContract}\n'Release document contracts passed'\n`)
  check(execFileSync('pwsh.exe', ['-NoProfile', '-NonInteractive', '-File', documentContractPath, '-Root', repo, '-Version', publicRelease, '-MachineVersion', current], { encoding: 'utf8', windowsHide: true }).includes('Release document contracts passed'), 'Execute independent archive ledger and all authored reference metadata/behavior checks before packaging')
  console.log(JSON.stringify({ format: 'nova-release-tooling-verification', version: 1, generatedAt: new Date().toISOString(), status: 'passed', checks, context: 'Temporary synthetic fixtures only; no repository version, real build, release or historical evidence changed.' }, null, 2))
} finally { await rm(temporary, { recursive: true, force: true }) }
