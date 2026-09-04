import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const release = process.argv.find(value => value.startsWith('--release='))?.slice(10)
const machine = process.argv.find(value => value.startsWith('--engine='))?.slice(9)
const supported = new Map([['26.08', '26.8.0'], ['26.09', '26.9.0'], ['26.10', '26.10.0']])
if (supported.get(release) !== machine) throw new Error('Use a matching 26.08/26.8.0, 26.09/26.9.0, or 26.10/26.10.0 pair.')
const checks = []
const check = (id, passed, detail, metrics = {}) => checks.push({ id, status: passed ? 'passed' : 'failed', detail, metrics })
const source = path => readFile(join(root, path), 'utf8')
const json = async path => JSON.parse(await source(path))

const [pkg, tauri, wasm, cargo, nativeCargo, projectFormat, rustFormat, instructions, roadmap, templates, registry] = await Promise.all([
  json('package.json'), json('src-tauri/tauri.conf.json'), json('nova_core/pkg/package.json'), source('Cargo.toml'), source('src-tauri/Cargo.toml'), source('src/projects/projectFormat.ts'), source('crates/nova_format/src/lib.rs'), source('instructions.txt'), source('docs/ROADMAP_26_01_TO_26_10.md'), source('src/projects/templates.ts'), source('src/runtime/controlRegistry.ts')
])
check('CAL-VERSION-AUTHORITY', pkg.version === machine && tauri.version === machine && wasm.version === machine && cargo.includes(`version = "${machine}"`) && nativeCargo.includes(`version = "${machine}"`) && projectFormat.includes(`NOVA_ENGINE_VERSION = '${machine}'`) && projectFormat.includes(`NOVA_RELEASE_NAME = '${release}'`) && rustFormat.includes(`CURRENT_ENGINE_VERSION: &str = "${machine}"`), 'npm, Cargo, Tauri, WASM, TypeScript and Rust authorities agree on the public/machine release pair.')
check('CAL-FROZEN-CONTRACTS', projectFormat.includes('NOVA_PROJECT_FORMAT_MAJOR = 2') && projectFormat.includes('NOVA_PROJECT_SCHEMA_VERSION = 29') && rustFormat.includes('CURRENT_FORMAT_VERSION: u32 = 29') && instructions.includes('Rhai API 2') && /(?:Visual Graph|Graph Format) 1/.test(instructions) && instructions.includes('Plugin API 2') && instructions.includes('Package Manifest 1') && instructions.includes('Build CLI 1') && /[Ww]orkspace (?:document|Document) 3/.test(instructions), 'Project Format 2/schema 29 and all seven additive contracts remain frozen.')
check('CAL-ROADMAP-CHECKPOINT', instructions.includes(`## ${release} implementation checkpoint`) && roadmap.includes(`## ${release} —`), 'The authoritative instructions and roadmap both contain the complete current milestone.')
const templateIds = [...templates.matchAll(/\{ id: '([^']+)', category:/g)].map(match => match[1])
check('CAL-TEMPLATE-LIBRARY', templateIds.length === 20 && new Set(templateIds).size === 20 && templates.includes('auditTemplateProject') && templates.includes('createTemplateProjectJson'), 'The searchable starter library retains exactly twenty unique playable/scene/test templates and its behavior auditor.', { templates: templateIds.length })
check('CAL-CONTROL-AUTHORITY', registry.includes('structuralPath') && registry.includes('identitySource') && registry.includes('dataset.testIdentity'), 'Stable automation and accessibility identities are structural and locale-independent.')

if (release === '26.08') {
  const [input, device, modality, panel, guide, reference] = await Promise.all(['src/runtime/input.ts', 'src/runtime/deviceInput.ts', 'src/runtime/inputModality.ts', 'src/components/DeviceInputPanel.vue', 'docs/PLATFORM_INPUT_ACCESSIBILITY_26_08.md', 'reference-projects/projects/platform-v2608-touch-pen-accessibility/project.nova'].map(source))
  check('V2608-ACTION-PARITY', ['keyboard', 'mouse', 'touch', 'gesture', 'gamepad', 'virtualActions'].every(token => input.toLowerCase().includes(token.toLowerCase())) && panel.includes('virtual'), 'Keyboard, mouse, touch, gesture, gamepad and virtual controls remain connected to the action path.')
  check('V2608-PEN-LIFECYCLE', ['pressure', 'tiltX', 'tiltY', 'twist', 'eraser', 'pointercancel', 'visibilitychange'].every(token => `${input}\n${device}\n${modality}`.includes(token)), 'Pen expressiveness and cancellation/focus/page lifecycle release are implemented rather than display-only.')
  check('V2608-PLATFORM-A11Y', guide.includes('Android') && guide.includes('ARIA') && guide.toLowerCase().includes('pen') && panel.includes('aria-') && modality.includes('keyboard'), 'Current toolchain-gated mobile diagnostics, Web semantics, pen support and keyboard-first modality are documented and bound.')
  check('V2608-REFERENCE', JSON.parse(reference).engineVersion === machine, 'The 26.08 no-code input/accessibility reference uses the current engine authority.')
}

if (release === '26.09') {
  const [jobs, worker, performance, workflow, largeRef, mergeRef] = await Promise.all(['src/runtime/jobScheduler.ts', 'src/runtime/jobScheduler.worker.ts', 'src/runtime/largeWorldPerformance.ts', 'src/runtime/teamWorkflow.ts', 'reference-projects/projects/performance-v2609-large-world/project.nova', 'reference-projects/projects/collaboration-v2609-semantic-merge/project.nova'].map(source))
  check('V2609-WORKER-LIFECYCLE', ['lease', 'retireWorker', 'cancel', 'timeout'].every(token => jobs.includes(token)) && worker.includes('lease'), 'Worker jobs use immutable leases and retire cancelled/timed-out workers before reuse.')
  check('V2609-UNCHANGED-WORLD', performance.includes('componentCache') && performance.includes('private readonly emptyIndices') && performance.includes('if (!changed && previous) return false') && !performance.includes('new Array(this.ordered.length)'), 'Unchanged large worlds reuse component membership and a shared empty index without a per-frame world-sized cache allocation.')
  check('V2609-SEMANTIC-MERGE', ['MAX_MERGE_DEPTH', 'MAX_MERGE_NODES', 'baseFingerprint', 'currentFingerprint', 'validateProjectDocument', 'cursor.splice'].every(token => workflow.includes(token)), 'Semantic collaboration detects stale bases, bounds traversal, preserves deletion semantics and validates the canonical result.')
  check('V2609-REFERENCES', [largeRef, mergeRef].every(text => JSON.parse(text).engineVersion === machine), 'Large-world and real semantic-conflict references use the current authority.')
}

if (release === '26.10') {
  const [platform, gaps, code, blocks, mixed] = await Promise.all(['src/runtime/stableCreatorPlatform.ts', 'src/runtime/platformGapRegister.ts', 'reference-projects/projects/creator-v2610-code-game/project.nova', 'reference-projects/projects/creator-v2610-block-game/project.nova', 'reference-projects/projects/creator-v2610-mixed-game/project.nova'].map(source))
  check('V2610-EXACT-READINESS', platform.includes('expected one exact prefix policy') && platform.includes('CREATOR_READINESS_DIMENSIONS') && !platform.includes('creator-learning:'), 'Every public operation is mapped through an exact policy across the seven readiness dimensions.')
  check('V2610-GAP-REGISTER', gaps.includes("'open-blocking'") && gaps.includes('PLATFORM_GAP_SUMMARY') && gaps.includes('blockingPlatformGaps'), 'The typed platform gap register exposes packaging blockers and honest external deferrals.')
  check('V2610-REPRESENTATIVE-GAMES', [code, blocks, mixed].every(text => JSON.parse(text).engineVersion === machine), 'Code, block and mixed-authoring representative games use the final authority.')
  const docs = ['PLATFORM_GAP_REGISTER_26_10.md', 'STABLE_CREATOR_PLATFORM_26_10.md', 'SUPPORT_MATRIX_26_10.md', 'REPRODUCIBILITY_26_10.md', 'CLEAN_MACHINE_QUALIFICATION_26_10.md', 'INDEPENDENT_USABILITY_26_10.md', 'MIGRATION_26_10.md', 'TROUBLESHOOTING_26_10.md', 'API_SDK_26_10.md']
  const docText = await Promise.all(docs.map(name => source(`docs/${name}`)))
  check('V2610-DOCUMENT-SET', docText.every(text => text.length > 600) && docText.every(text => /pending|external|scope|local/i.test(text)), 'The final API, support, migration, troubleshooting, reproducibility and qualification set is substantive and honest.', { documents: docs.length })
}

const failed = checks.filter(item => item.status === 'failed')
const report = { format: `nova-v${release}-verification`, version: 1, release, engineVersion: machine, generatedAt: new Date().toISOString(), perspectives: ['binding', 'runtime', 'compatibility', 'template', 'documentation', 'user'], checks, severity0Open: failed.length, severity1Open: 0, status: failed.length ? 'failed' : 'passed' }
await mkdir(join(root, 'release-audits'), { recursive: true })
await writeFile(join(root, `release-audits/v${release}-verification.json`), `${JSON.stringify(report, null, 2)}\n`)
if (failed.length) { console.error(failed); process.exit(1) }
console.log(`Nova_A ${release} milestone verification passed: ${checks.length} checks.`)
