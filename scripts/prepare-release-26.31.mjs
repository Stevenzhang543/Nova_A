/** Derive the unchanged packaging contracts, then explicitly select this UI release's risks. */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { requiredGateIds, validateQualificationPlan } from './release-qualification.mjs'

const option = name => process.argv.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3)
for (const [id, gameName] of [['creator-v2631-mixed-game', 'Nova 26.31 Coin Trail — mixed'], ['server-v2631-headless-authority', 'Nova 26.31 Headless Authority']]) {
  const project = JSON.parse(await readFile(`reference-projects/projects/${id}/project.nova`, 'utf8'))
  if (project.engineVersion !== '26.31.0' || project.projectSettings?.build?.gameName !== gameName || project.projectMetadata?.name !== gameName || project.manifest?.name !== gameName || project.projectName !== gameName) throw Error(`Reference identity/export name mismatch: ${id}`)
}
const source = await readFile('scripts/prepare-release-26.30.mjs', 'utf8')
const literal = source.match(/const plan=([\s\S]*?)\nplan\.sourceSnapshot=/)?.[1]
if (!literal) throw Error('Previous release plan structure changed; review its packaging contracts.')
const plan = JSON.parse(literal.replaceAll('26.30', '26.31').replaceAll('26_30', '26_31').replaceAll('v2630', 'v2631'))
const retained = new Set(['native-build', 'rust', 'wasm', 'web', 'typescript', 'focus', 'browser-layout', 'user-interactions', 'windows', 'headless', 'hygiene', 'manual', 'product'])
plan.gates = plan.gates.filter(gate => retained.has(gate.id))
plan.documentation = ['docs/RELEASE_NOTES_26_31.md', 'docs/EDIT_LEDGER_26_31.md', 'docs/FEATURE_INVENTORY_26_31.md', 'docs/SOURCE_MAP_26_31.md', 'docs/PANEL_INVENTORY_26_31.md', 'docs/ISSUE_CLOSURE_26_31.md', 'docs/COMPETITIVE_REVIEW_26_31.md', 'docs/WEB_HOSTING_26_31.md', 'docs/NATIVE_HEADLESS_26_31.md']
plan.sourceSnapshot = option('snapshot') ?? '.cache/release-snapshots/v26.31-candidate1/snapshot.json'
for (const gate of plan.gates) {
  gate.command.file = process.execPath
  gate.command.args[0] = resolve(gate.command.args[0])
  gate.command.args = gate.command.args.map(arg => arg.startsWith('--pnpm-entry=') ? '--pnpm-entry=' + option('pnpm-entry') : arg.startsWith('--pnpm-bin=') ? '--pnpm-bin=' + option('pnpm-bin') : arg)
  if (gate.id === 'focus') {
    gate.context = 'Current CI/source/toolchain consistency, workspace/resize semantics, complete static Vue inventory and actual native physics CLI build/process regression required by the reference archive.'
  }
  if (gate.id === 'headless') gate.context = 'Retained renderer-disabled WebView authority export and loopback regression. This is not certification of a native scripted game server.'
  if (gate.id === 'browser-layout') gate.context = 'Actual docked and maximized panel routes, populated fixtures, translated/scaled forms, pending edit/save and collapsed-header containment.'
}
plan.auditPolicy = {
  kind: 'change-risk-v1',
  authorization: 'User requests 26.31 with relevant fatal-risk/helpful checks and no unrelated duplicate audits.',
  omitted: requiredGateIds.filter(id => !retained.has(id)).map(id => ({ id, status: 'not-run', reason: ({
    'rust-lint': 'Rust implementation unchanged except version authority; workspace tests and native/WASM compilation run.',
    'native-rust': 'No Tauri implementation changes; native compilation and Windows/export smoke run.',
    history: 'Project schema unchanged; format migration unit tests and actual browser save are covered.',
    templates: 'No template implementation changes; representative current mixed-game/native authority and downloaded Web game execute.',
    'layout-contract': 'All Vue templates are inventoried and actual docked/maximized routes checked; omit duplicate historical geometry matrices.',
    performance: 'No scheduling/rendering algorithms changed; no new performance claim.',
    stability: 'No timer/resource lifecycle changes; repeated navigation runs in the browser audit. Long-duration soak not performed.',
    security: 'Dependencies and permission configuration unchanged; source/archive hygiene and build checks run. No refreshed vulnerability certification claimed.',
  })[id] }))
}
if (!option('pnpm-entry') || !option('pnpm-bin')) throw Error('Supply pinned --pnpm-entry and --pnpm-bin.')
validateQualificationPlan(plan)
await mkdir('release-audits', { recursive: true })
await writeFile('release-audits/v26.31-qualification-plan.json', JSON.stringify(plan, null, 2) + '\n')
console.log(`26.31: ${plan.gates.length} planned gates; ${plan.auditPolicy.omitted.length} explicit omissions.`)
