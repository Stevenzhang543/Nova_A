import { reactive } from 'vue'
import {
  NOVA_ENGINE_VERSION,
  NOVA_MINIMUM_SCHEMA_VERSION,
  NOVA_PROJECT_FORMAT,
  NOVA_PROJECT_FORMAT_MAJOR,
  NOVA_PROJECT_SCHEMA_VERSION
} from '../projects/projectFormat'
import { NOVA_GRAPH_FORMAT, NOVA_GRAPH_VERSION } from '../visual/graphTypes'

export const NOVA_RUNTIME_API_VERSION = 2
export const NOVA_PLUGIN_API_VERSION = 2
export const NOVA_PACKAGE_MANIFEST_VERSION = 1
export const NOVA_BUILD_CLI_VERSION = 1
export const NOVA_WORKSPACE_DOCUMENT_VERSION = 3
export const NOVA_FEATURE_FREEZE = Object.freeze({ channel: '6.1-stable-contract-candidate', frozenAt: '6.0.0', lockedAt: '6.1.0', observationDays: 14, earliestApproval: '2026-09-12', externalCertificationComplete: false, exceptions: ['release-blocking correction', 'security correction', 'migration correctness', 'accessibility correction', 'performance correction', 'evidence or documentation correction'] })

export interface StableContract {
  id: 'project' | 'script' | 'graph' | 'plugin' | 'package' | 'build' | 'workspace'
  version: string
  compatibility: string
  migration: string
  frozen: boolean
}

export const NOVA_STABLE_CONTRACTS: readonly StableContract[] = Object.freeze([
  Object.freeze({ id: 'project', version: `${NOVA_PROJECT_FORMAT_MAJOR}.${NOVA_PROJECT_SCHEMA_VERSION}`, compatibility: `${NOVA_PROJECT_FORMAT}; schemas ${NOVA_MINIMUM_SCHEMA_VERSION}-${NOVA_PROJECT_SCHEMA_VERSION}`, migration: `Schemas ${NOVA_MINIMUM_SCHEMA_VERSION}-${NOVA_PROJECT_SCHEMA_VERSION - 1} migrate in memory, validate, canonicalize and commit only after backup.`, frozen: true }),
  Object.freeze({ id: 'script', version: String(NOVA_RUNTIME_API_VERSION), compatibility: 'Rhai API v2; imported API v1 remains readable through the compatibility adapter.', migration: 'API v1 calls map through the generated v1-to-v2 manifest; source changes remain explicit and undoable.', frozen: true }),
  Object.freeze({ id: 'graph', version: String(NOVA_GRAPH_VERSION), compatibility: `${NOVA_GRAPH_FORMAT} Format 1 with Rhai API v2 command parity.`, migration: 'Unknown future formats fail closed; known node deprecations use UUID-preserving migration records.', frozen: true }),
  Object.freeze({ id: 'plugin', version: String(NOVA_PLUGIN_API_VERSION), compatibility: 'WASM Plugin API 2; API 1 manifests remain readable but cannot bypass current permissions.', migration: 'API 1 contributions normalize to declarative API 2 descriptors and require permission review before load.', frozen: true }),
  Object.freeze({ id: 'package', version: String(NOVA_PACKAGE_MANIFEST_VERSION), compatibility: 'Package Manifest 1 with semver, engine/API ranges, permission, dependency-hash and archive identity checks.', migration: 'Legacy registry metadata is normalized to Manifest 1 and re-certified; trust is never inferred during migration.', frozen: true }),
  Object.freeze({ id: 'build', version: String(NOVA_BUILD_CLI_VERSION), compatibility: 'Build CLI 1: validate/import/test/build/export/package/version and deterministic manifests.', migration: 'Legacy build settings receive safe defaults; host, permission, template and signing gates remain explicit.', frozen: true }),
  Object.freeze({ id: 'workspace', version: String(NOVA_WORKSPACE_DOCUMENT_VERSION), compatibility: 'Workspace document 3 with six task workspaces and additive custom layouts.', migration: 'Workspace document 2 imports into document 3; unsupported panels are ignored without changing project data.', frozen: true })
])

export interface ContractMigrationCheck { contract: StableContract['id']; sourceVersion: number; targetVersion: number; supported: boolean; action: 'none' | 'migrate' | 'read-only' | 'blocked'; message: string }
const minimumVersions: Record<StableContract['id'], number> = { project: NOVA_MINIMUM_SCHEMA_VERSION, script: 1, graph: 1, plugin: 1, package: 1, build: 1, workspace: 2 }
const currentVersions: Record<StableContract['id'], number> = { project: NOVA_PROJECT_SCHEMA_VERSION, script: NOVA_RUNTIME_API_VERSION, graph: NOVA_GRAPH_VERSION, plugin: NOVA_PLUGIN_API_VERSION, package: NOVA_PACKAGE_MANIFEST_VERSION, build: NOVA_BUILD_CLI_VERSION, workspace: NOVA_WORKSPACE_DOCUMENT_VERSION }

export function contractMigrationCheck(contract: StableContract['id'], sourceVersion: unknown): ContractMigrationCheck {
  const source = Number(sourceVersion), targetVersion = currentVersions[contract], minimum = minimumVersions[contract]
  if (!Number.isInteger(source) || source < minimum) return { contract, sourceVersion: Number.isFinite(source) ? source : -1, targetVersion, supported: false, action: 'blocked', message: `${contract} version is missing or older than the supported migration floor ${minimum}.` }
  if (source > targetVersion) return { contract, sourceVersion: source, targetVersion, supported: false, action: 'read-only', message: `${contract} version ${source} is newer than this editor's version ${targetVersion}.` }
  if (source === targetVersion) return { contract, sourceVersion: source, targetVersion, supported: true, action: 'none', message: `${contract} is already on the frozen 6.0 contract.` }
  return { contract, sourceVersion: source, targetVersion, supported: true, action: 'migrate', message: `${contract} version ${source} can migrate to ${targetVersion} through its reviewed compatibility path.` }
}

export function stableContractMatrix(): ContractMigrationCheck[] {
  return (Object.keys(currentVersions) as StableContract['id'][]).map(contract => contractMigrationCheck(contract, currentVersions[contract]))
}

export const studioStatusState = reactive({ visible: false })
export function openStudioStatus(): void { studioStatusState.visible = true }
export function closeStudioStatus(): void { studioStatusState.visible = false }

export function stableContractDiagnostics(): string {
  return JSON.stringify({
    product: 'Nova_A Studio', engineVersion: NOVA_ENGINE_VERSION,
    projectFormat: NOVA_PROJECT_FORMAT, projectFormatMajor: NOVA_PROJECT_FORMAT_MAJOR,
    schemaVersion: NOVA_PROJECT_SCHEMA_VERSION, minimumSchemaVersion: NOVA_MINIMUM_SCHEMA_VERSION,
    contracts: NOVA_STABLE_CONTRACTS, featureFreeze: NOVA_FEATURE_FREEZE,
    platform: typeof navigator === 'undefined' ? 'headless' : navigator.userAgent.slice(0, 500),
    generatedAt: new Date().toISOString()
  }, null, 2)
}
