/** Preserve delivery contracts and explicitly qualify V3 presentation/gesture/performance risks. */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { requiredGateIds, validateQualificationPlan } from './release-qualification.mjs'

const option = name => process.argv.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3)
for (const [id, gameName] of [['creator-v2635-mixed-game', 'Nova 26.35 Coin Trail — mixed'], ['server-v2635-headless-authority', 'Nova 26.35 Headless Authority']]) {
  const project = JSON.parse(await readFile(`reference-projects/projects/${id}/project.nova`, 'utf8'))
  if (project.engineVersion !== '26.35.0' || project.projectSettings?.build?.gameName !== gameName || project.projectMetadata?.name !== gameName || project.manifest?.name !== gameName || project.projectName !== gameName) throw Error(`Reference identity/export name mismatch: ${id}`)
}
const source = await readFile('scripts/prepare-release-26.30.mjs', 'utf8')
const literal = source.match(/const plan=([\s\S]*?)\nplan\.sourceSnapshot=/)?.[1]
if (!literal) throw Error('Previous release plan structure changed; review packaging contracts.')
const plan = JSON.parse(literal.replaceAll('26.30', '26.35').replaceAll('26_30', '26_35').replaceAll('v2630', 'v2635'))
const retained = new Set(['native-build', 'rust', 'wasm', 'web', 'typescript', 'focus', 'browser-layout', 'user-interactions', 'windows', 'headless', 'hygiene', 'manual', 'performance', 'product'])
plan.gates = plan.gates.filter(gate => retained.has(gate.id))
plan.editLedger = 'docs/EDIT_LEDGER_26_35.md'
plan.documentation = ['docs/RELEASE_NOTES_26_35.md', 'docs/ui/UI_SPEC.md', 'docs/ui/UI_VISUAL_V3_SPEC.md', 'docs/ui/MOTION_SYSTEM_SPEC.md', 'docs/ui/UI_MOTION_IMPLEMENTATION_PLAN.md', 'docs/ui/MOTION_QA_CHECKLIST.md', 'docs/ui/DECISIONS.md', 'docs/ui/MIGRATION.md', 'docs/WEB_HOSTING_26_35.md', 'docs/NATIVE_HEADLESS_26_35.md']
plan.sourceSnapshot = option('snapshot') ?? '.cache/release-snapshots/v26.35-candidate1/snapshot.json'
for (const gate of plan.gates) {
  gate.command.file = process.execPath
  gate.command.args[0] = resolve(gate.command.args[0])
  gate.command.args = gate.command.args.map(arg => arg.startsWith('--pnpm-entry=') ? '--pnpm-entry=' + option('pnpm-entry') : arg.startsWith('--pnpm-bin=') ? '--pnpm-bin=' + option('pnpm-bin') : arg)
  if (gate.id === 'focus') gate.context = 'Actual shared spring/cancellation/transform/reduced-motion modules, foundational hierarchy and native physics identity; no unrelated engine feature expansion.'
  if (gate.id === 'browser-layout') gate.context = 'Actual populated all-panel routes, translated/scaled/constrained forms, shared geometry and persistent-shell navigation/history.'
  if (gate.id === 'user-interactions') gate.context = 'Actual fresh authoring, nested prefabs/history/save/reopen, SVG/native wheel routing, downloaded reference gameplay and export/static-host behavior.'
  if (gate.id === 'performance') gate.context = 'Actual finite motion, interruption/reduced mode/blur fallback/idle and direct gestures; measured software-browser before/after UI diagnostics with raw baseline preserved, no physical GPU/input-to-display certification.'
  if (gate.id === 'headless') gate.context = 'Retained renderer-disabled WebView authority export/loopback smoke; not certification of a native scripted game server.'
}
plan.auditPolicy = {
  kind: 'change-risk-v1',
  authorization: 'User requests Phase III visual/motion refinement and release26.35 with linked effective audits, preserving existing architecture and avoiding unrelated duplicate sweeps.',
  omitted: requiredGateIds.filter(id => !retained.has(id)).map(id => ({ id, status: 'not-run', reason: ({
    'rust-lint': 'Rust implementation changes only version authority; fresh workspace tests and native/WASM compilation run.',
    'native-rust': 'Tauri implementation unchanged; actual Windows compilation/export smoke covers delivery.',
    history: 'Schema unchanged; migration tests and actual browser authoring/history/save/reopen are covered.',
    templates: 'Template creation/discovery is exercised in motion/layout/authoring; unchanged template catalog is not repeatedly swept.',
    'layout-contract': 'Actual all-panel containment and gesture checks supersede duplicate historical geometry matrices.',
    stability: 'Finite animation/cancellation/preference/disposal, repeated navigation/drag and idle observations run; unrelated long-duration engine soak omitted.',
    security: 'Dependencies/permissions unchanged; source/archive hygiene runs. No refreshed vulnerability certification claimed.',
  })[id] }))
}
if (!option('pnpm-entry') || !option('pnpm-bin')) throw Error('Supply pinned --pnpm-entry and --pnpm-bin.')
validateQualificationPlan(plan)
await mkdir('release-audits', { recursive: true })
await writeFile('release-audits/v26.35-qualification-plan.json', JSON.stringify(plan, null, 2) + '\n')
console.log(`26.35: ${plan.gates.length} planned gates; ${plan.auditPolicy.omitted.length} explicit omissions.`)
