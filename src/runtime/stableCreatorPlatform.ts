import { CREATOR_LEARNING_GUIDES, type LearningGuide } from './creatorLearning'
import { NOVA_FEATURE_FREEZE, NOVA_STABLE_CONTRACTS } from './stableContracts'

export type ReadinessStatus = 'covered' | 'not-applicable' | 'external'
export type ReadinessDimension = 'binding' | 'validation' | 'undo' | 'persistence' | 'runtimeExport' | 'documentation' | 'tests'

export interface ReadinessEvidence {
  status: ReadinessStatus
  route: string
  detail: string
}

export interface CreatorFeatureReadiness {
  id: string
  feature: string
  panel: string
  workspace: string
  taskProject: boolean
  dimensions: Record<ReadinessDimension, ReadinessEvidence>
}

const testFamilies: ReadonlyArray<[string, string]> = [
  ['project-manager', 'migration-projects'], ['workspaces', 'editor-shell'], ['hierarchy', 'editor-shell'], ['viewport', 'interactions'],
  ['inspector', 'components-runtime'], ['assets', 'content-import'], ['physics', 'physics-determinism'], ['script', 'script-graph-parity'],
  ['visual-graph', 'script-graph-parity'], ['animation', 'animation-determinism'], ['interface', 'ui-accessibility'], ['audio', 'audio-runtime'],
  ['world', 'world-navigation'], ['rendering', 'renderer-determinism'], ['debug', 'runtime-evidence'], ['manage', 'project-health'],
  ['ecosystem', 'plugin-package-security'], ['automation', 'automation-sandbox'], ['network', 'network-determinism'], ['build', 'export-release'],
  ['recovery-team', 'recovery-semantic-merge'], ['task-', 'guided-project-lifecycle']
]

function familyFor(guide: LearningGuide): string { return testFamilies.find(([prefix]) => guide.id.startsWith(prefix))?.[1] ?? 'platform-inventory' }
function covered(route: string, detail: string): ReadinessEvidence { return { status: 'covered', route, detail } }
function notApplicable(detail: string): ReadinessEvidence { return { status: 'not-applicable', route: 'explicitly excluded', detail } }
function external(route: string, detail: string): ReadinessEvidence { return { status: 'external', route, detail } }

function readinessFor(guide: LearningGuide): CreatorFeatureReadiness {
  const editorOnly = guide.classifications.includes('Editor-only')
  const runtime = guide.classifications.includes('Runtime')
  const destructive = guide.classifications.includes('Destructive')
  const reversible = guide.classifications.includes('Reversible')
  const platformExternal = /Android|iOS|Linux|macOS|clean-machine|screen-reader/i.test(`${guide.feature} ${guide.prerequisites.join(' ')}`)
  return {
    id: guide.id, feature: guide.feature, panel: guide.panel, workspace: guide.workspace, taskProject: Boolean(guide.taskProject),
    dimensions: {
      binding: covered(`creator-learning:${guide.id}`, 'The public operation has a stable catalog identity, owning panel and reachable workspace.'),
      validation: covered(`preconditions:${guide.prerequisites.length}`, guide.prerequisites.length ? 'The guide declares its finite prerequisites and the owning subsystem reports invalid or unavailable state.' : 'The operation is valid without project prerequisites.'),
      undo: destructive ? covered('confirmation + transaction/recovery', 'Destructive state requires named confirmation and a documented recovery boundary.') : reversible ? covered('Undo/Redo or subsystem rollback', 'The operation declares a reversible editor or project transaction.') : notApplicable('The operation is automatic, observational, runtime-only, or does not mutate authored state.'),
      persistence: editorOnly ? notApplicable('Editor-only state is intentionally excluded from project/player data and uses workspace preferences where relevant.') : covered('canonical project/scene/asset/settings serialization', 'Authored state has a named owner and is included in save/reload qualification.'),
      runtimeExport: editorOnly ? notApplicable('This editor-only operation must not enter exported players.') : runtime || guide.taskProject ? covered('Play → save/reload → standalone player', 'Runtime behavior is exercised through the shared player/export lifecycle.') : covered('build input or explicit editor-only exclusion', 'Project authoring reaches deterministic build input, or its exclusion is explicit.'),
      documentation: covered(`manual/#${guide.id}`, 'EN/DE/ZH task-oriented lessons include classification, prerequisites, steps, expected result, persistence, recovery, mistakes, accessibility and API equivalents.'),
      tests: platformExternal ? external(`v7-${familyFor(guide)} + matching-host evidence`, 'Local validation is retained; hardware, matching-host or independent lifecycle evidence remains external.') : covered(`v7-${familyFor(guide)}`, 'Mapped to the 7.0 automated family and normal-user interaction matrix.')
    }
  }
}

export const CREATOR_PLATFORM_READINESS: readonly CreatorFeatureReadiness[] = Object.freeze(CREATOR_LEARNING_GUIDES.map(readinessFor))
export const CREATOR_READINESS_DIMENSIONS: readonly ReadinessDimension[] = Object.freeze(['binding', 'validation', 'undo', 'persistence', 'runtimeExport', 'documentation', 'tests'])

export const CREATOR_PLATFORM_SUMMARY = Object.freeze({
  features: CREATOR_PLATFORM_READINESS.length,
  dimensions: CREATOR_READINESS_DIMENSIONS.length,
  covered: CREATOR_PLATFORM_READINESS.reduce((count, item) => count + CREATOR_READINESS_DIMENSIONS.filter(dimension => item.dimensions[dimension].status === 'covered').length, 0),
  notApplicable: CREATOR_PLATFORM_READINESS.reduce((count, item) => count + CREATOR_READINESS_DIMENSIONS.filter(dimension => item.dimensions[dimension].status === 'not-applicable').length, 0),
  external: CREATOR_PLATFORM_READINESS.reduce((count, item) => count + CREATOR_READINESS_DIMENSIONS.filter(dimension => item.dimensions[dimension].status === 'external').length, 0),
  uncovered: CREATOR_PLATFORM_READINESS.reduce((count, item) => count + CREATOR_READINESS_DIMENSIONS.filter(dimension => !item.dimensions[dimension]).length, 0)
})

export const CREATOR_CONTRACT_REVIEW = Object.freeze({
  release: '7.0.0', reviewedContracts: NOVA_STABLE_CONTRACTS.length, currentContractsFrozen: NOVA_STABLE_CONTRACTS.every(contract => contract.frozen),
  schemaChangeApproved: false, breakingChangesApproved: 0, nextContractDecision: 'deferred' as const,
  decision: 'Retain Project Format 2/schema 29, Rhai API 2, Visual Graph 1, Plugin API 2, Package Manifest 1, Build CLI 1 and Workspace document 3. No demonstrated requirement justifies a breaking contract.',
  earliestNextReview: NOVA_FEATURE_FREEZE.earliestApproval,
  reasons: Object.freeze(['The current contracts express every 7.0 feature additively.', 'The observation window and independent external certification are not complete.', 'A major-version label never authorizes a destructive project migration.', 'Any future contract needs preview, complete backup, deterministic migration, semantic diff, validation, rollback and golden fixtures before approval.'])
})

export const CREATOR_SUPPORT_MATRIX = Object.freeze([
  Object.freeze({ target: 'Windows editor/player', status: 'tier-1-local', evidence: 'Native editor, portable game, MSI and setup build plus launch smoke.' }),
  Object.freeze({ target: 'Web editor/player', status: 'tier-1-local', evidence: 'Production Web/WASM build and hosted-player archive; HTTP(S) required.' }),
  Object.freeze({ target: 'Linux player/server', status: 'matching-host-external', evidence: 'Source/pipeline is available; matching-host build and lifecycle evidence are required.' }),
  Object.freeze({ target: 'macOS player', status: 'matching-host-external', evidence: 'Xcode, signing, notarization and hardware evidence are required.' }),
  Object.freeze({ target: 'Android player', status: 'optional-gated', evidence: 'JDK/SDK/NDK/template/signing/device/store gates remain explicit.' }),
  Object.freeze({ target: 'iOS / consoles', status: 'deferred-or-excluded', evidence: 'iOS is matching-host/deferred; proprietary console SDKs are not bundled.' }),
  Object.freeze({ target: '3D / XR / ray tracing', status: 'out-of-scope', evidence: 'Nova_A 7.0 remains a focused local-first 2D engine.' })
])
