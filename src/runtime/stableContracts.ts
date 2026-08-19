import { reactive } from 'vue'
import {
  NOVA_ENGINE_VERSION,
  NOVA_MINIMUM_SCHEMA_VERSION,
  NOVA_PROJECT_FORMAT,
  NOVA_PROJECT_FORMAT_MAJOR,
  NOVA_PROJECT_SCHEMA_VERSION
} from '../projects/projectFormat'

export const NOVA_RUNTIME_API_VERSION = 1
export const NOVA_PLUGIN_API_VERSION = 2
export const NOVA_PACKAGE_MANIFEST_VERSION = 1
export const NOVA_BUILD_CLI_VERSION = 1
export const NOVA_FEATURE_FREEZE = Object.freeze({ channel: 'stable', frozenAt: '3.9.0', lockedAt: '4.0.0', exceptions: ['backward-compatible patch', 'security correction', 'migration correctness'] })

export interface StableContract {
  id: 'project' | 'runtime' | 'plugin' | 'package' | 'cli'
  version: string
  compatibility: string
}

export const NOVA_STABLE_CONTRACTS: readonly StableContract[] = Object.freeze([
  Object.freeze({ id: 'project', version: `${NOVA_PROJECT_FORMAT_MAJOR}.${NOVA_PROJECT_SCHEMA_VERSION}`, compatibility: `${NOVA_PROJECT_FORMAT}; schemas ${NOVA_MINIMUM_SCHEMA_VERSION}-${NOVA_PROJECT_SCHEMA_VERSION}` }),
  Object.freeze({ id: 'runtime', version: String(NOVA_RUNTIME_API_VERSION), compatibility: 'Rhai lifecycle and typed-handle API 1' }),
  Object.freeze({ id: 'plugin', version: String(NOVA_PLUGIN_API_VERSION), compatibility: 'WASM Plugin API 2; API 1 remains readable' }),
  Object.freeze({ id: 'package', version: String(NOVA_PACKAGE_MANIFEST_VERSION), compatibility: 'Package Manifest 1; semver, engine/API ranges, permissions, dependency hashes, entry type and signed archive identity required' }),
  Object.freeze({ id: 'cli', version: String(NOVA_BUILD_CLI_VERSION), compatibility: 'Build CLI 1; validate/import/test/build/export/package/version; compatible output and additive flags throughout Nova_A 4.0.x' })
])

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
