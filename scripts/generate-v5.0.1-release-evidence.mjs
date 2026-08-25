import { createHash } from 'node:crypto'
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { arch, platform, versions } from 'node:process'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const audits = join(root, 'release-audits')
const evidence = join(audits, 'evidence-v5.0.1')
const generatedAt = new Date().toISOString()
const sourceCommit = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding:'utf8' }).trim()
const sha256 = source => createHash('sha256').update(source).digest('hex')
const readJson = async name => JSON.parse(await readFile(join(audits, name), 'utf8'))
const writeJson = (path, value) => writeFile(path, `${JSON.stringify(value, null, 2)}\n`)

const required = {
  audit:'v5.0.1-ux-audit.json', runtime:'v5.0.1-verification.json', layout:'v5.0.1-layout-browser.json',
  windows:'v5.0.1-windows-smoke.json', references:'v5.0.1-reference-ci.json', reproducibility:'v5.0.1-clean-build-reproducibility.json',
  performance:'v5.0.1-performance-baselines.json', stability:'v5.0.1-stability-local.json', dependencies:'v5.0.1-dependency-audit.json'
}
const reports = Object.fromEntries(await Promise.all(Object.entries(required).map(async ([key, name]) => [key, await readJson(name)])))
for (const [name, report] of Object.entries(reports)) if (!['passed','passed-local'].includes(report.status)) throw new Error(`${name} evidence did not pass: ${report.status}`)

await rm(evidence, { recursive:true, force:true })
for (const directory of ['build','layout','runtime','references','security','external','documentation']) await mkdir(join(evidence, directory), { recursive:true })
const destinations = {
  audit:'build/ux-audit.json', runtime:'runtime/runtime-verification.json', layout:'layout/layout-browser.json', windows:'build/windows-smoke.json',
  references:'references/reference-ci.json', reproducibility:'build/reproducibility.json', performance:'runtime/performance-baselines.json', stability:'runtime/stability-smoke.json', dependencies:'security/dependency-audit.json'
}
for (const [key, source] of Object.entries(required)) await cp(join(audits, source), join(evidence, destinations[key]))
await cp(join(root, 'instructions.txt'), join(evidence, 'documentation/instructions-5.0.1.txt'))
await cp(join(root, 'docs/UX_GUIDE_5_0_1.md'), join(evidence, 'documentation/UX_GUIDE_5_0_1.md'))

const externalGates = [
  'minimum 14-day release-candidate observation','72-hour wall-clock soak','two-machine reproducibility','disposable clean-machine install/launch/upgrade/repair/uninstall',
  'publisher signing and notarization','Firefox/WebKit and representative external hardware','exact tagged-source verification','independent verifier sign-off'
].map(name => ({ name, status:'pending-external', claimed:false }))
await writeJson(join(evidence, 'external/gates.json'), { format:'nova-external-certification-gates', version:1, release:'5.0.1', generatedAt, gates:externalGates })

const releaseNotes = `# Nova_A 5.0.1 candidate release notes

## User-experience consolidation

Nova_A 5.0.1 reorganizes the complete editor without deleting a feature, command, shortcut, animation, or data contract. Workspace, transform, history and simulation controls remain direct. Layout, Commands, Authoring tools and View settings expose the complete secondary command set in named keyboard-accessible popovers. The scene toolbar no longer uses horizontal browser-style scrolling.

The patch introduces a 12 px caption and 13 px dense-control floor, clearer dark/light surface steps, distinct selection/creation/secondary role colors, unified rounding/elevation, short press/reveal feedback and complete reduced-motion fallbacks. The context rail is wider with two-line labels. Migration preflight and all new chrome are localized in English, German and Chinese.

Project Format 2 remains schema 29. Rhai API v2, Plugin API 2, Package Manifest 1, Build CLI 1, Workspace document 3, platform tiers and the eleven-file release contract remain frozen. No project migration or asset reimport is required.

## Certification status

Local builds, static/runtime audits, pinned Chromium layouts, reference projects, performance, stability smoke, reproducibility and Windows package checks are attached. The real 72-hour soak, minimum 14-day observation, independent machine/browser/hardware checks, clean-machine lifecycle, signing, exact tagged source and independent sign-off remain pending and are not claimed.
`
const editLedger = `# Nova_A 5.0.1 edit ledger

- Replaced instructions.txt with the complete first-user audit, implementation specification, multilingual matrix and honest release gates.
- Redesigned dark and light surface/color tokens, semantic typography, radii, elevation, control sizes and motion feedback; retained reduced-motion behavior.
- Reorganized workspace chrome into direct workspace/history controls plus named Layout and Commands menus; retained every panel, focus, manager, Quick Open and Command Palette action.
- Reorganized scene chrome into direct Create/Select/Move/Rotate/Scale plus named Authoring, Arrange, Snapping and View Settings groups; removed the toolbar's horizontal-scroll dependency without removing tools.
- Widened the context rail, enabled two-line long labels and gave creation actions a distinct teal role.
- Raised and unified editor typography across controls, menus, docks and status surfaces.
- Localized current context, create, layout, commands, authoring/view groups and all migration-preflight labels/details in English, German and Chinese.
- Corrected workspace-popover stacking above the scene toolbar and clarified the snap-to-grid control label.
- Truncated long asset-folder paths safely with the complete value available as a title, and made registry-generated accessible names and disabled reasons update during live language switches.
- Updated web, Rust, native, CLI/export, capture, diagnostics and visible product authorities to 5.0.1; schema 29 and frozen compatibility boundaries remain unchanged.
- Added the 5.0.1 UX guide, updated both READMEs and all three Markdown manuals plus the interactive manual.
- Added 5.0.1 static/runtime/layout/native/reference/security/performance/stability/reproducibility/evidence commands and the exact eleven-file release workflow.
- No feature, animation, shortcut, project content, API, schema or supported workflow was removed.
`
await writeFile(join(audits, 'v5.0.1-release-notes.md'), releaseNotes)
await writeFile(join(audits, 'v5.0.1-edit-ledger.md'), editLedger)
await writeJson(join(audits, 'v5.0.1-benchmarks.json'), { format:'nova-v5.0.1-benchmark-summary', version:1, engineVersion:'5.0.1', generatedAt, performance:reports.performance, runtimeAudit:reports.runtime.status, layout:reports.layout.status, independentHostPerformance:'pending-external', status:'passed' })
await writeJson(join(audits, 'v5.0.1-stability-smoke.json'), { format:'nova-v5.0.1-stability-summary', version:1, engineVersion:'5.0.1', generatedAt, boundedSmoke:reports.stability, runtime:reports.runtime.status, layout:reports.layout.status, windows:reports.windows.status, minimumRcObservationComplete:false, wallClock72HourSoakComplete:false, status:'passed' })

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes:true, recursive:true })
  return entries.filter(entry => entry.isFile()).map(entry => join(entry.parentPath ?? entry.path, entry.name))
}
const environment = { id:`${platform}-${arch}-node${versions.node}`, os:platform, architecture:arch, node:versions.node }
const evidenceFiles = (await filesUnder(evidence)).sort()
const entries = await Promise.all(evidenceFiles.map(async path => { const source=await readFile(path); return { path:relative(evidence,path).replaceAll('\\','/'), sha256:sha256(source), bytes:(await stat(path)).size, source:sourceCommit, tool:'generate-v5.0.1-release-evidence.mjs', environment:environment.id } }))
await writeJson(join(evidence, 'evidence-manifest.json'), { format:'nova-release-evidence-manifest', version:1, release:'5.0.1', generatedAt, source:{ commit:sourceCommit, dirty:true, note:'The source archive contains the exact working candidate; tagged-source verification remains pending.' }, environment, externalCertificationComplete:false, entries })
console.log(`Nova_A 5.0.1 evidence generated: ${entries.length} hashed entries; ${externalGates.length} external gates remain pending.`)
