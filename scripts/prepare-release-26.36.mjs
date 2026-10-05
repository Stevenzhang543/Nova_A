/** Qualify the supplied branding and current-version delivery without repeating unrelated engine/UI sweeps. */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { requiredGateIds, validateQualificationPlan } from './release-qualification.mjs'

const option = name => process.argv.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3)
for (const [id, gameName] of [['creator-v2636-mixed-game', 'Nova 26.36 Coin Trail — mixed'], ['server-v2636-headless-authority', 'Nova 26.36 Headless Authority']]) {
  const project = JSON.parse(await readFile(`reference-projects/projects/${id}/project.nova`, 'utf8'))
  if (project.engineVersion !== '26.36.0' || project.projectSettings?.build?.gameName !== gameName || project.projectMetadata?.name !== gameName || project.manifest?.name !== gameName || project.projectName !== gameName) throw Error(`Reference identity/export name mismatch: ${id}`)
}
const source = await readFile('scripts/prepare-release-26.30.mjs', 'utf8')
const literal = source.match(/const plan=([\s\S]*?)\nplan\.sourceSnapshot=/)?.[1]
if (!literal) throw Error('Previous release plan structure changed; review packaging contracts.')
const plan = JSON.parse(literal.replaceAll('26.30', '26.36').replaceAll('26_30', '26_36').replaceAll('v2630', 'v2636'))
const retained = new Set(['native-build', 'wasm', 'web', 'typescript', 'focus', 'browser-layout', 'user-interactions', 'windows', 'headless', 'hygiene', 'manual', 'product'])
plan.gates = plan.gates.filter(gate => retained.has(gate.id))
plan.editLedger = 'docs/EDIT_LEDGER_26_36.md'
plan.documentation = ['docs/RELEASE_NOTES_26_36.md', 'docs/WEB_HOSTING_26_36.md', 'docs/NATIVE_HEADLESS_26_36.md', 'docs/ui/UI_SPEC.md', 'docs/ui/DECISIONS.md', 'docs/ui/MIGRATION.md']
plan.sourceSnapshot = option('snapshot') ?? '.cache/release-snapshots/v26.36-candidate1/snapshot.json'
for (const gate of plan.gates) {
  gate.command.file = process.execPath
  gate.command.args[0] = resolve(gate.command.args[0])
  gate.command.args = gate.command.args.map(arg => arg.startsWith('--pnpm-entry=') ? '--pnpm-entry=' + option('pnpm-entry') : arg.startsWith('--pnpm-bin=') ? '--pnpm-bin=' + option('pnpm-bin') : arg)
  if (gate.id === 'focus') gate.context = 'Exact supplied PNG identity and bounded derivatives, shared branding integration and pinned environment; actual current-version native physics stdio binary verification for the reference archive.'
  if (gate.id === 'browser-layout') gate.context = 'Actual supplied PNG launcher/editor/manual branding, live light/dark theme changes, favicon/manifest images, minimum and large-text containment; no repeated all-panel route matrix.'
  if (gate.id === 'user-interactions') gate.context = 'Actual root/subdirectory static editor hosting, project reopen, downloaded Web player and relative manifest/icon requests. Existing deployment work is preserved, not published or rewritten.'
  if (gate.id === 'headless') gate.context = 'Current-version renderer-disabled WebView authority export and bounded loopback smoke; separate from the native physics-only stdio utility.'
}
plan.auditPolicy = {
  kind: 'change-risk-v1',
  authorization: 'User requests replacement of Nova_A branding with supplied light/dark PNGs and complete release26.36, retaining unrelated engine/editor behavior and avoiding unaffected duplicate audits.',
  omitted: requiredGateIds.filter(id => !retained.has(id)).map(id => ({ id, status: 'not-run', reason: ({
    rust: 'Rust implementation is unchanged beyond release authority. Fresh native/WASM compilation and actual native/WASM execution/version checks qualify this delivery; a full engine test sweep is unrelated to PNG branding.',
    'rust-lint': 'No Rust implementation change. Fresh compilation and focused delivery checks run; no new Rust lint certification is claimed.',
    'native-rust': 'Tauri implementation is unchanged beyond version and icon resources. Fresh Windows compilation, PE/MSI identity and practical Windows export smoke cover delivery.',
    history: 'Project schema/history semantics are unchanged. Actual static-host project save/reopen is retained; historical migration matrices are not repeated.',
    templates: 'The template catalog is unchanged. The focused branding browser check retains ordinary launcher/editor entry; a full template walk-through is outside this change.',
    'layout-contract': 'Focused actual branding/theme/minimum/large-text containment checks cover changed surfaces; unrelated historic panel matrices are not repeated.',
    performance: 'Bounded PNG assets replace branding at existing geometry. Native/Web delivery and actual browser checks run; no refreshed physical GPU or engine performance certification is claimed.',
    stability: 'No engine lifecycle or animation implementation change. Actual theme/navigation/manual checks and export startup cover linked behavior; long-duration soak is omitted.',
    security: 'Dependencies, permissions and credentials are unchanged. Source/archive hygiene runs; no refreshed vulnerability or external security certification is claimed.',
  })[id] }))
}
if (!option('pnpm-entry') || !option('pnpm-bin')) throw Error('Supply pinned --pnpm-entry and --pnpm-bin.')
validateQualificationPlan(plan)
await mkdir('release-audits', { recursive: true })
await writeFile('release-audits/v26.36-qualification-plan.json', JSON.stringify(plan, null, 2) + '\n')
console.log(`26.36: ${plan.gates.length} planned gates; ${plan.auditPolicy.omitted.length} explicit omissions.`)
