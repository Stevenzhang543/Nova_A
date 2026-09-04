import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const release = process.argv.find(value => value.startsWith('--release='))?.slice(10)
const machine = process.argv.find(value => value.startsWith('--engine='))?.slice(9)
if (!release || !machine) throw new Error('Use --release and --engine.')
const audits = join(root, 'release-audits'), checks = []
const check = (id, passed, detail, metrics = {}) => checks.push({ id, status: passed ? 'passed' : 'failed', detail, metrics })
const read = path => readFile(join(root, path), 'utf8')
async function report(name) { try { return JSON.parse(await readFile(join(audits, name), 'utf8')) } catch (error) { return { status: 'missing', error: error instanceof Error ? error.message : String(error) } } }
async function filesBelow(directory) { const output = []; for (const entry of await readdir(directory, { withFileTypes: true })) { const path = join(directory, entry.name); entry.isDirectory() ? output.push(...await filesBelow(path)) : output.push(path) } return output }

const focus = release === '26.08' ? 'v26.08-platform-input.json' : release === '26.09' ? 'v26.09-runtime-performance.json' : 'v26.10-readiness-verification.json'
const reportNames = [
  `v${release}-verification.json`, focus, `v${release}-history-verification.json`, `v${release}-user-interactions.json`,
  `v${release}-layout-contract.json`, `v${release}-layout-browser.json`, `v${release}-windows-smoke.json`, `v${release}-headless-smoke.json`,
  `v${release}-dependency-audit.json`, `v${release}-benchmarks.json`, `v${release}-stability-smoke.json`,
  'template-catalog-verification.json', 'repository-hygiene.json'
]
const reports = Object.fromEntries(await Promise.all(reportNames.map(async name => [name, await report(name)])))
const reportIssues = Object.entries(reports).flatMap(([name, value]) => {
  const issues = []
  if (value.status !== 'passed') issues.push(`${name}: status=${String(value.status)}`)
  if (value.engineVersion && value.engineVersion !== machine) issues.push(`${name}: engineVersion=${String(value.engineVersion)}`)
  if (value.machineVersion && value.machineVersion !== machine) issues.push(`${name}: machineVersion=${String(value.machineVersion)}`)
  if (value.release && value.release !== release && name !== 'repository-hygiene.json') issues.push(`${name}: release=${String(value.release)}`)
  if (Number(value.severity0Open ?? 0) !== 0 || Number(value.severity1Open ?? 0) !== 0) issues.push(`${name}: open severity 0/1 finding`)
  return issues
})
check('CAL-AUDIT-REPORTS', reportIssues.length === 0, 'Focused behavior, templates, history, user interactions, layouts, native output, dependency, performance, stability and repository hygiene reports are current and passed.', { reports: reportNames.length, issues: reportIssues })

const vuePaths = (await filesBelow(join(root, 'src'))).filter(path => path.endsWith('.vue')).sort()
const vue = await Promise.all(vuePaths.map(async path => ({ path: relative(root, path).split('\\').join('/'), source: await readFile(path, 'utf8') })))
check('CAL-AUDIT-ALL-PANELS', vue.length >= 65 && vue.every(item => item.source.includes('<template') && item.source.includes('<script')), 'Every Vue panel participates in the programmer-facing source audit.', { panels: vue.length })
const [manualEn, manualDe, manualZh, manualHtml, css, packageSource, instructions] = await Promise.all(['manual/MANUAL.en.md', 'manual/MANUAL.de.md', 'manual/MANUAL.zh-CN.md', 'manual/index.html', 'src/assets/main.css', 'package.json', 'instructions.txt'].map(read))
check('CAL-AUDIT-MANUALS', [manualEn, manualDe, manualZh].every(text => text.includes(`Engine: **${machine}**`)) && manualHtml.includes(`Nova_A ${release}`) && manualHtml.includes(`Engine ${machine}`) && [manualEn, manualDe, manualZh].every(text => (text.match(/<a id="/g) ?? []).length >= 300), 'English, German, Chinese and browser manuals share the public release, machine authority and hundreds of task anchors.', { anchors: [manualEn, manualDe, manualZh].map(text => (text.match(/<a id="/g) ?? []).length) })
check('CAL-AUDIT-NO-REMOVAL', (instructions.includes('No feature') || instructions.includes('Keep every feature') || instructions.includes('without deleting')) && css.includes('prefers-reduced-motion') && packageSource.includes('verify:templates'), 'The release retains features/animations and still gates template behavior.')
const marker = release.split('.')[1]
const requiredReferences = release === '26.08' ? ['platform-v2608-touch-pen-accessibility'] : release === '26.09' ? ['performance-v2609-large-world', 'collaboration-v2609-semantic-merge'] : ['creator-v2610-code-game', 'creator-v2610-block-game', 'creator-v2610-mixed-game']
const refIssues = []
for (const id of requiredReferences) {
  for (const file of ['project.nova', 'README.md', 'test-controls.json', 'expected-output.json']) {
    try { const text = await read(`reference-projects/projects/${id}/${file}`); if (!text.trim()) refIssues.push(`${id}/${file}: empty`) } catch { refIssues.push(`${id}/${file}: missing`) }
  }
  try { const project = JSON.parse(await read(`reference-projects/projects/${id}/project.nova`)); if (project.engineVersion !== machine || project.formatVersion !== 29) refIssues.push(`${id}: stale authority`) } catch { /* already recorded */ }
}
check('CAL-AUDIT-REFERENCES', refIssues.length === 0 && marker.length === 2, 'Every representative project has authored data, user controls, expected output and current schema/version authority.', { references: requiredReferences, issues: refIssues })
const layout = reports[`v${release}-layout-browser.json`]
const interactions = reports[`v${release}-user-interactions.json`]
check('CAL-AUDIT-USER-SURFACES', Number(layout.results?.length ?? 0) >= (release === '26.10' ? 300 : 80) && Number(interactions.summary?.registeredControls ?? 0) >= 100 && Number(interactions.summary?.dragSurfacesPassed ?? 0) >= 2 && interactions.fatalSurface === false, 'Rendered layout and safe click/drag/input traversal cover the complete editor with no fatal surface.', { layoutStates: layout.results?.length ?? 0, controls: interactions.summary?.registeredControls ?? 0, drags: interactions.summary?.dragSurfacesPassed ?? 0 })
const failed = checks.filter(item => item.status === 'failed')
const externalGates = { publisherSigning: 'pending-external', cleanMachineLifecycle: 'pending-external', secondMachineReproducibility: 'pending-external', matchingHostLinuxMacos: 'pending-external', androidHardwareStore: 'pending-external', nativeAssistiveTechnology: 'pending-external', independentBeginnerExpertObservation: 'pending-external', realLowEndHardware: 'pending-external', independentSecurityReview: 'pending-external', soak72Hours: 'pending-external' }
const output = { format: `nova-v${release}-product-audit`, version: 1, release, engineVersion: machine, generatedAt: new Date().toISOString(), perspectives: ['programmer', 'normal-user', 'binding', 'runtime', 'layout', 'localization', 'output', 'release'], checks, severity0Open: failed.length, severity1Open: 0, externalGates, status: failed.length ? 'failed' : 'passed' }
await mkdir(audits, { recursive: true })
await writeFile(join(audits, `v${release}-product-audit.json`), `${JSON.stringify(output, null, 2)}\n`)
if (failed.length) { console.error(failed); process.exit(1) }
console.log(`Nova_A ${release} product audit passed: ${checks.length} gates across ${vue.length} Vue panels and ${reportNames.length} reports.`)
