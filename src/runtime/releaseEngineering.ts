import { reactive } from 'vue'

export type ReleaseGateStatus = 'passed' | 'warning' | 'blocked' | 'external'
export type ReleaseEvidenceKind = 'automated' | 'manual' | 'external'

export interface ReleaseEvidenceGate {
  id: string
  area: 'build' | 'package' | 'health' | 'documentation' | 'platform' | 'security' | 'release'
  label: string
  status: ReleaseGateStatus
  evidenceKind: ReleaseEvidenceKind
  evidence: string
  fix: string
}

export interface BuildManifestFile {
  path: string
  sha256: string
  bytes: number
}

export interface BuildProvenance {
  format: 'nova-build-provenance'
  version: 1
  engineVersion: string
  buildId: string
  projectId: string
  target: string
  architecture: string
  profile: string
  releaseChannel: string
  sourceCommit: string
  toolchain: Record<string, string>
  inputsHash: string
  outputsHash: string
  cacheKey: string
  deterministic: boolean
  generatedAt: string
  files: BuildManifestFile[]
}

export interface BuildComparison {
  reproducible: boolean
  inputMatch: boolean
  outputMatch: boolean
  added: string[]
  removed: string[]
  changed: string[]
  firstBuild: string
  secondBuild: string
}

export interface ReleasePipelineStage {
  id: string
  label: string
  command: string
  required: boolean
  mutation: 'none' | 'workspace' | 'release-output' | 'external'
}

export const NOVA_RELEASE_PIPELINE: readonly ReleasePipelineStage[] = Object.freeze([
  Object.freeze({ id: 'lock', label: 'Pinned dependency restore', command: 'pnpm install --frozen-lockfile --offline', required: true, mutation: 'workspace' as const }),
  Object.freeze({ id: 'audit', label: 'Complete regression catalog', command: 'pnpm run audit', required: true, mutation: 'workspace' as const }),
  Object.freeze({ id: 'rust', label: 'Rust format, lint and tests', command: 'cargo test --workspace --all-targets', required: true, mutation: 'workspace' as const }),
  Object.freeze({ id: 'web', label: 'Deterministic web build', command: 'pnpm build', required: true, mutation: 'workspace' as const }),
  Object.freeze({ id: 'native', label: 'Windows release build', command: 'pnpm tauri build', required: true, mutation: 'workspace' as const }),
  Object.freeze({ id: 'evidence', label: 'Evidence, SBOM and provenance', command: 'pnpm evidence:v26.04', required: true, mutation: 'workspace' as const }),
  Object.freeze({ id: 'package', label: 'Eleven-artifact release package', command: 'pnpm release:v26.04', required: true, mutation: 'release-output' as const }),
  Object.freeze({ id: 'external', label: 'Signing and clean-machine matrix', command: 'release operator workflow', required: true, mutation: 'external' as const })
])

export const RELEASE_CANDIDATE_FREEZE = Object.freeze({
  release: '26.04',
  machineVersion: '26.4.0',
  sourceRelease: '7.0.0',
  active: true,
  openedAt: '2026-09-02T00:00:00.000Z',
  minimumDays: 14,
  earliestApprovalAt: '2026-09-16T00:00:00.000Z',
  policy: 'Feature development is frozen. Only release-blocking corrections, documentation and evidence fixes are accepted.',
  frozenContracts: Object.freeze(['Project Format 2 / schema 29', 'Rhai API v2', 'Plugin API 2', 'Package manifest 1', 'Build CLI 1', 'Eleven-file release artifact format'])
})

export const releaseEngineeringState = reactive({
  selectedEvidenceGate: '',
  lastManifest: null as BuildProvenance | null,
  previousManifest: null as BuildProvenance | null,
  lastComparison: null as BuildComparison | null,
  releaseNotesReviewed: false,
  privacyReviewed: false,
  signOffOwner: 'Whitelist',
  signOffStatus: 'blocked' as 'candidate' | 'blocked' | 'approved',
  changeNotes: [] as Array<{ id: string; task: string; owner: string; note: string; createdAt: string }>
})

function normalized(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalized)
  if (!value || typeof value !== 'object') return value
  const output: Record<string, unknown> = {}
  for (const key of Object.keys(value as Record<string, unknown>).sort()) output[key] = normalized((value as Record<string, unknown>)[key])
  return output
}

export function canonicalReleaseJson(value: unknown): string {
  return `${JSON.stringify(normalized(value), null, 2)}\n`
}

/** Stable non-cryptographic identity used for immediate editor comparisons. Packagers replace file hashes with SHA-256. */
export function stableReleaseFingerprint(value: unknown): string {
  const source = JSON.stringify(normalized(value))
  let first = 0x811c9dc5, second = 0x9e3779b9
  for (let index = 0; index < source.length; index++) {
    const code = source.charCodeAt(index)
    first = Math.imul(first ^ code, 0x01000193) >>> 0
    second = Math.imul(second ^ code, 0x85ebca6b) >>> 0
  }
  return `${first.toString(16).padStart(8, '0')}${second.toString(16).padStart(8, '0')}`
}

export function createBuildProvenance(input: {
  engineVersion: string
  buildId: string
  projectId: string
  target: string
  architecture: string
  profile: string
  releaseChannel: string
  sourceCommit?: string
  settings: unknown
  packages: unknown
  files: BuildManifestFile[]
  deterministic: boolean
  toolchain?: Record<string, string>
}): BuildProvenance {
  const files = input.files.map(file => ({ path: file.path.replace(/\\/g, '/'), sha256: file.sha256.toLowerCase(), bytes: Math.max(0, Math.round(file.bytes)) })).sort((a, b) => a.path.localeCompare(b.path))
  const inputsHash = stableReleaseFingerprint({ settings: input.settings, packages: input.packages })
  const outputsHash = stableReleaseFingerprint(files)
  const manifest: BuildProvenance = {
    format: 'nova-build-provenance', version: 1, engineVersion: input.engineVersion, buildId: input.buildId,
    projectId: input.projectId, target: input.target, architecture: input.architecture, profile: input.profile,
    releaseChannel: input.releaseChannel, sourceCommit: input.sourceCommit?.trim().slice(0, 80) || 'working-tree',
    toolchain: { ...input.toolchain }, inputsHash, outputsHash,
    cacheKey: stableReleaseFingerprint({ engine: input.engineVersion, target: input.target, architecture: input.architecture, profile: input.profile, inputsHash }),
    deterministic: input.deterministic,
    generatedAt: input.deterministic ? '1970-01-01T00:00:00.000Z' : new Date().toISOString(), files
  }
  releaseEngineeringState.previousManifest = releaseEngineeringState.lastManifest
  releaseEngineeringState.lastManifest = manifest
  if (releaseEngineeringState.previousManifest) releaseEngineeringState.lastComparison = compareBuildProvenance(releaseEngineeringState.previousManifest, manifest)
  return manifest
}

export function compareBuildProvenance(first: BuildProvenance, second: BuildProvenance): BuildComparison {
  const before = new Map(first.files.map(file => [file.path, file.sha256])), after = new Map(second.files.map(file => [file.path, file.sha256]))
  const added = [...after.keys()].filter(path => !before.has(path)).sort()
  const removed = [...before.keys()].filter(path => !after.has(path)).sort()
  const changed = [...after.keys()].filter(path => before.has(path) && before.get(path) !== after.get(path)).sort()
  const comparison = {
    reproducible: first.inputsHash === second.inputsHash && first.outputsHash === second.outputsHash && !added.length && !removed.length && !changed.length,
    inputMatch: first.inputsHash === second.inputsHash, outputMatch: first.outputsHash === second.outputsHash,
    added, removed, changed, firstBuild: first.buildId, secondBuild: second.buildId
  }
  releaseEngineeringState.lastComparison = comparison
  return comparison
}

export function webDeploymentHeaders(): string {
  return [
    '/*',
    '  X-Content-Type-Options: nosniff',
    '  Referrer-Policy: strict-origin-when-cross-origin',
    '  Permissions-Policy: camera=(), microphone=(), geolocation=()',
    '  Cross-Origin-Resource-Policy: same-origin',
    '',
    '/assets/*',
    '  Cache-Control: public, max-age=31536000, immutable',
    '',
    '/index.html',
    '  Cache-Control: no-cache',
    '/player.html',
    '  Cache-Control: no-cache'
  ].join('\n') + '\n'
}

export function releaseGateSummary(gates: readonly ReleaseEvidenceGate[]): { status: ReleaseGateStatus; blockers: number; warnings: number; external: number; passed: number } {
  const blockers = gates.filter(gate => gate.status === 'blocked').length
  const warnings = gates.filter(gate => gate.status === 'warning').length
  const external = gates.filter(gate => gate.status === 'external').length
  const passed = gates.filter(gate => gate.status === 'passed').length
  return { status: blockers ? 'blocked' : warnings || external ? 'warning' : 'passed', blockers, warnings, external, passed }
}

export function addReleaseChangeNote(task: string, note: string, owner = releaseEngineeringState.signOffOwner): boolean {
  const cleanTask = task.trim().slice(0, 120), cleanNote = note.trim().slice(0, 1_000), cleanOwner = owner.trim().slice(0, 120)
  if (!cleanTask || !cleanNote || !cleanOwner) return false
  releaseEngineeringState.changeNotes.unshift({ id: crypto.randomUUID(), task: cleanTask, owner: cleanOwner, note: cleanNote, createdAt: new Date().toISOString() })
  if (releaseEngineeringState.changeNotes.length > 256) releaseEngineeringState.changeNotes.splice(256)
  return true
}

export function diagnosticPrivacyChecklist(): readonly string[] {
  return Object.freeze([
    'Project names and identifiers are excluded unless the user opts in.',
    'Absolute file paths are redacted unless the user opts in.',
    'Source assets, scripts, save data, credentials and signing identities are never included.',
    'The bundle is written locally; Nova_A does not upload it automatically.',
    'The user can inspect the JSON archive before sharing it.'
  ])
}

