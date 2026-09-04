import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { arch, platform, versions } from 'node:process'
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const release = '26.06', machineVersion = '26.6.0'
const root = dirname(dirname(fileURLToPath(import.meta.url))), audits = join(root, 'release-audits'), evidence = join(audits, `evidence-v${release}`), generatedAt = new Date().toISOString()
const sha256 = value => createHash('sha256').update(value).digest('hex')
const readJson = async name => JSON.parse(await readFile(join(audits, name), 'utf8'))
const writeJson = (path, value) => writeFile(path, `${JSON.stringify(value, null, 2)}\n`)
await rm(evidence, { recursive: true, force: true })
for (const folder of ['runtime','layout','build','manual','documentation','performance','external']) await mkdir(join(evidence, folder), { recursive: true })
const reports = {
  product: await readJson('v26.06-product-audit.json'), verification: await readJson('v26.06-verification.json'), interactions: await readJson('v26.06-user-interactions.json'),
  layout: await readJson('v26.06-layout-browser.json'), layoutContract: await readJson('v26.06-layout-contract.json'), templates: await readJson('template-catalog-verification.json'),
  templateOutput: await readJson('v26.06-template-output.json'), visualGraph: await readJson('v26.06-visual-graph.json'), history: await readJson('v26.06-history-verification.json'), security: await readJson('v26.06-dependency-audit.json'),
  windows: await readJson('v26.06-windows-smoke.json'), performance: await readJson('v26.06-benchmarks.json'), stability: await readJson('v26.06-stability-smoke.json')
}
const reportAuthorityIssues = Object.entries(reports).flatMap(([name, report]) => {
  const issues = []
  if (report.status !== 'passed') issues.push(`${name}: status=${String(report.status)}`)
  if (report.engineVersion && report.engineVersion !== machineVersion) issues.push(`${name}: engineVersion=${report.engineVersion}`)
  if (report.release && report.release !== release) issues.push(`${name}: release=${report.release}`)
  if (report.releaseLabel && report.releaseLabel !== release) issues.push(`${name}: releaseLabel=${report.releaseLabel}`)
  return issues
})
for (const [source, target] of [
  ['v26.06-product-audit.json','runtime/product-audit.json'],['v26.06-verification.json','runtime/verification.json'],['v26.06-user-interactions.json','runtime/user-interactions.json'],
  ['template-catalog-verification.json','runtime/template-catalog.json'],['v26.06-template-output.json','build/template-output.json'],['v26.06-visual-graph.json','runtime/visual-graph.json'],['v26.06-history-verification.json','runtime/migration-history.json'],
  ['v26.06-dependency-audit.json','runtime/dependency-audit.json'],['v26.06-windows-smoke.json','build/windows-smoke.json'],['v26.06-layout-browser.json','layout/layout-browser.json'],
  ['v26.06-layout-contract.json','layout/layout-contract.json'],['v26.06-benchmarks.json','performance/benchmarks.json'],['v26.06-stability-smoke.json','performance/stability-local.json']
]) await cp(join(audits, source), join(evidence, target))
for (const name of ['MANUAL.en.md','MANUAL.de.md','MANUAL.zh-CN.md','index.html']) await cp(join(root, 'manual', name), join(evidence, 'manual', name))
for (const name of ['VERSIONING_2026.md','FEATURE_INVENTORY_26_06.md','COMPETITIVE_REVIEW_26_01.md','ROADMAP_26_01_TO_26_10.md','TEMPLATE_LIBRARY_26_01.md','VISUAL_SCRIPTING_26_01.md','SIMULATION_AUTHORING_26_06.md','OUTPUT_BUILD_RELIABILITY_26_06.md','UI_LAYOUT_AUDIT_26_06.md','RELEASE_NOTES_26_06.md','COMPATIBILITY.md','STABLE_CONTRACTS.md','KNOWN_LIMITATIONS.md']) await cp(join(root, 'docs', name), join(evidence, 'documentation', name))
const artifactInputs = [['web-editor','dist/index.html'],['web-player','dist/player.html'],['windows-editor','src-tauri/target/release/nova_a.exe'],['windows-nsis',`src-tauri/target/release/bundle/nsis/Nova_A_${machineVersion}_x64-setup.exe`],['windows-msi',`src-tauri/target/release/bundle/msi/Nova_A_${machineVersion}_x64_en-US.msi`]]
const artifacts = await Promise.all(artifactInputs.map(async ([name,path]) => { try { const bytes = await readFile(join(root,path)); return { name,path,bytes:bytes.length,sha256:sha256(bytes),status:'passed' } } catch { return { name,path,status:'missing' } } }))
const buildsPassed = artifacts.every(item => item.status === 'passed')
await writeJson(join(evidence,'build/local-builds.json'), { format:'nova-local-build-evidence',version:1,release,engineVersion:machineVersion,generatedAt,artifacts,status:buildsPassed?'passed':'incomplete' })
const externalGates = { publisherSigning:'pending-external', cleanMachineLifecycle:'pending-external', secondMachineReproducibility:'pending-external', matchingHostLinuxMacos:'pending-external', androidIosHardwareStore:'pending-external', independentUsability:'pending-external', independentAccessibilitySecurity:'pending-external', soak72Hours:'pending-external' }
await writeJson(join(evidence,'external/gates.json'), { format:'nova-external-certification-gates',version:1,release,generatedAt,gates:Object.entries(externalGates).map(([name,status])=>({name,status,claimed:false})) })
const commit = safeExec('git',['-c',`safe.directory=${root.replaceAll('\\','/')}`,'rev-parse','HEAD'])
const gitWorkingTree = safeExec('git',['-c',`safe.directory=${root.replaceAll('\\','/')}`,'status','--porcelain'])
const sourceHasCommit = /^[a-f0-9]{40,64}$/.test(commit)
const sourceState = sourceHasCommit ? (gitWorkingTree && gitWorkingTree !== 'unavailable' ? 'git-working-tree' : 'git-commit') : 'filesystem-snapshot'
const sourceCommit = sourceHasCommit ? commit : 'unavailable-source-snapshot'
const environment = { id:`${platform}-${arch}-${versions.node}`,platform,architecture:arch,node:versions.node,rust:safeExec('rustc',['--version']),cargo:safeExec('cargo',['--version']) }
const localQualificationComplete = reportAuthorityIssues.length === 0 && buildsPassed
const entries = await Promise.all((await filesUnder(evidence)).sort().filter(path => !path.endsWith('evidence-manifest.json')).map(async path => { const contents=await readFile(path); return { path:relative(evidence,path).replaceAll('\\','/'),sha256:sha256(contents),bytes:contents.length,source:sourceCommit,tool:'generate-v26.06-release-evidence.mjs',environment:environment.id } }))
await writeJson(join(evidence,'evidence-manifest.json'), { format:'nova-release-evidence-manifest',version:1,release,machineVersion,engineVersion:machineVersion,generatedAt,source:{commit:sourceCommit,state:sourceState,dirty:sourceState!=='git-commit',note:sourceState==='git-working-tree'?'Working-tree source snapshot, based on the recorded commit and including the packaged uncommitted changes; an exact signed tag remains external.':sourceState==='git-commit'?'Clean Git commit; an exact signed tag remains external.':'Filesystem source snapshot without an available Git commit; an exact signed tag remains external.'},environment,localQualificationComplete,localReportAuthorities:{ status:reportAuthorityIssues.length===0?'passed':'failed',issues:reportAuthorityIssues },externalCertificationComplete:false,externalGates,entries })
if (!localQualificationComplete) {
  const detail = [...reportAuthorityIssues, ...artifacts.filter(item => item.status !== 'passed').map(item => `missing build artifact: ${item.path}`)]
  throw new Error(`The Nova_A 26.06 local evidence tree is incomplete; release packaging is blocked. ${detail.join('; ')}`)
}
console.log(`Nova_A ${release} evidence generated with ${entries.length} hashed entries; external certification remains pending.`)

function safeExec(command,args){ try { return execFileSync(command,args,{cwd:root,encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','ignore']}).trim() } catch { return 'unavailable' } }
async function filesUnder(directory){ const files=[]; for(const entry of await readdir(directory,{withFileTypes:true})){ const path=join(directory,entry.name); entry.isDirectory()?files.push(...await filesUnder(path)):files.push(path) } return files }
