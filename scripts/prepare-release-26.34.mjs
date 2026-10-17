/** Preserve packaging contracts and select current engine, UX and UI risks explicitly. */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { requiredGateIds, validateQualificationPlan } from './release-qualification.mjs'

const option = name => process.argv.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3)
for (const [id, gameName] of [['creator-v2634-mixed-game', 'Nova 26.34 Coin Trail — mixed'], ['server-v2634-headless-authority', 'Nova 26.34 Headless Authority']]) {
  const project = JSON.parse(await readFile(`reference-projects/projects/${id}/project.nova`, 'utf8'))
  if (project.engineVersion !== '26.34.0' || project.projectSettings?.build?.gameName !== gameName || project.projectMetadata?.name !== gameName || project.manifest?.name !== gameName || project.projectName !== gameName) throw Error(`Reference identity/export name mismatch: ${id}`)
}
const source = await readFile('scripts/prepare-release-26.30.mjs', 'utf8')
const literal = source.match(/const plan=([\s\S]*?)\nplan\.sourceSnapshot=/)?.[1]
if (!literal) throw Error('Previous release plan structure changed; review its packaging contracts.')
const plan = JSON.parse(literal.replaceAll('26.30', '26.34').replaceAll('26_30', '26_34').replaceAll('v2630', 'v2634'))
const retained = new Set(['native-build', 'rust', 'wasm', 'web', 'typescript', 'focus', 'browser-layout', 'user-interactions', 'windows', 'headless', 'hygiene', 'manual', 'product'])
plan.gates = plan.gates.filter(gate => retained.has(gate.id))
plan.editLedger = 'docs/EDIT_LEDGER_26_34.md'
plan.documentation = ['docs/RELEASE_NOTES_26_34.md','docs/engine/ENGINE_CAPABILITY_AUDIT.md','docs/engine/FEATURE_MATRIX.md','docs/engine/CAPABILITY_CATALOG.md','docs/engine/TEST_MATRIX.md','docs/engine/IMPLEMENTATION_ROADMAP.md','docs/engine/COMPETITOR_RESEARCH.md','docs/ux/UX_AUDIT.md','docs/ui/UI_V2_PLAN.md','docs/WEB_HOSTING_26_34.md','docs/NATIVE_HEADLESS_26_34.md']
plan.sourceSnapshot = option('snapshot') ?? '.cache/release-snapshots/v26.34-candidate1/snapshot.json'
for (const gate of plan.gates) {
  gate.command.file = process.execPath
  gate.command.args[0] = resolve(gate.command.args[0])
  gate.command.args = gate.command.args.map(arg => arg.startsWith('--pnpm-entry=') ? '--pnpm-entry=' + option('pnpm-entry') : arg.startsWith('--pnpm-bin=') ? '--pnpm-bin=' + option('pnpm-bin') : arg)
  if (gate.id === 'focus') {
    gate.context = 'Current save/project-switch, camera/particle, input ownership, profiler validity, representative WASM games, retained foundational/media/navigation/UI contracts and native physics CLI regressions.'
  }
  if (gate.id === 'headless') gate.context = 'Retained renderer-disabled WebView authority export and loopback regression. This is not certification of a native scripted game server.'
  if (gate.id === 'browser-layout') gate.context = 'Actual docked and maximized panel routes, populated fixtures, translated/scaled forms, pending edit/save and collapsed-header containment.'
}
plan.auditPolicy = {
  kind: 'change-risk-v1',
  authorization: 'User requests full Phase II classification and release26.34, using linked fatal-risk/helpful checks without unrelated duplicate sweeps.',
  omitted: requiredGateIds.filter(id => !retained.has(id)).map(id => ({ id, status: 'not-run', reason: ({
    'rust-lint': 'Rust implementation unchanged except version authority; workspace tests and native/WASM compilation run.',
    'native-rust': 'No Tauri implementation changes; native compilation and Windows/export smoke run.',
    history: 'Project schema unchanged; format migration unit tests and actual browser save are covered.',
    templates: 'Three generated starter projects execute cross-system production-module scenarios, fresh browser creation/save/reopen/play, authored prefab work and downloaded reference gameplay in focus/user gates; no duplicate catalog-only sweep.',
    'layout-contract': 'All Vue templates are inventoried and actual docked/maximized routes checked; omit duplicate historical geometry matrices.',
    performance: 'Profiler evidence validity, unavailable telemetry and estimates execute in focus. No new hardware performance claim or unrelated stress benchmark.',
    stability: 'Changed preview/save lifecycle boundaries execute in focus; retained streaming lifetime tests and repeated browser navigation run. Long-duration soak not performed.',
    security: 'Dependencies and permission configuration unchanged; source/archive hygiene and build checks run. No refreshed vulnerability certification claimed.',
  })[id] }))
}
if (!option('pnpm-entry') || !option('pnpm-bin')) throw Error('Supply pinned --pnpm-entry and --pnpm-bin.')
validateQualificationPlan(plan)
await mkdir('release-audits', { recursive: true })
await writeFile('release-audits/v26.34-qualification-plan.json', JSON.stringify(plan, null, 2) + '\n')
console.log(`26.34: ${plan.gates.length} planned gates; ${plan.auditPolicy.omitted.length} explicit omissions.`)
