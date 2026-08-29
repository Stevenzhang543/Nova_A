import { reactive } from 'vue'
import type { BuildArchitecture, BuildProfile, BuildTarget } from './buildSettings'

export const NOVA_CI_MATRIX_VERSION = 1 as const
export type DeploymentConnectorKind = 'local-folder' | 'https-webhook' | 'external-command'
export interface CiMatrixJob { id: string; target: BuildTarget; architecture: BuildArchitecture; host: 'windows' | 'linux' | 'macos' | 'any'; profile: BuildProfile; templateId: string; required: boolean; status: 'local-ready' | 'pending-external' | 'blocked'; cacheKey: string }
export interface DeploymentConnector { id: string; name: string; kind: DeploymentConnectorKind; destination: string; enabled: boolean; permissionGranted: boolean; headers: string[] }
export interface DeploymentPlan { connectorId: string; kind: DeploymentConnectorKind; destination: string; artifact: string; checksum: string; explicitConfirmationRequired: true; implicitNetworkOperation: false; executableAction: false }
export interface DeltaBuildManifest { format: 'nova-delta-build'; version: 1; baseBuildId: string; targetBuildId: string; added: string[]; changed: string[]; removed: string[]; unchanged: number }

export const deliveryPipelineState = reactive({
  contentCacheEnabled: true, deltaBuildsEnabled: true, selectedConnectorId: 'local', lastPlan: null as DeploymentPlan | null,
  connectors: [{ id: 'local', name: 'Local output folder', kind: 'local-folder', destination: '', enabled: true, permissionGranted: true, headers: [] }] as DeploymentConnector[],
  jobs: [
    { id: 'windows-x64', target: 'windows', architecture: 'x86_64', host: 'windows', profile: 'release', templateId: 'windows-x64-v1', required: true, status: 'local-ready', cacheKey: '' },
    { id: 'web-es2022', target: 'web', architecture: 'x86_64', host: 'any', profile: 'release', templateId: 'web-es2022-v1', required: true, status: 'local-ready', cacheKey: '' },
    { id: 'linux-x64', target: 'linux', architecture: 'x86_64', host: 'linux', profile: 'release', templateId: 'linux-x64-experimental-v1', required: false, status: 'pending-external', cacheKey: '' },
    { id: 'macos-universal', target: 'macos', architecture: 'aarch64', host: 'macos', profile: 'release', templateId: 'macos-universal-experimental-v1', required: false, status: 'pending-external', cacheKey: '' },
    { id: 'android-aarch64', target: 'android', architecture: 'aarch64', host: 'any', profile: 'release', templateId: 'android-aarch64-gated-v1', required: false, status: 'blocked', cacheKey: '' }
  ] as CiMatrixJob[]
})

function stable(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value)
  if (typeof value === 'number') { if (!Number.isFinite(value)) throw new Error('Cache inputs must be finite.'); return JSON.stringify(value) }
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
  if (!value || typeof value !== 'object') throw new Error('Cache inputs must be JSON-compatible.')
  return `{${Object.keys(value as Record<string, unknown>).sort().map(key => `${JSON.stringify(key)}:${stable((value as Record<string, unknown>)[key])}`).join(',')}}`
}
export function contentCacheKey(value: unknown): string { const source = stable(value); let first = 0x811c9dc5, second = 0x9e3779b9; for (let index = 0; index < source.length; index++) { const code = source.charCodeAt(index); first = Math.imul(first ^ code, 0x01000193); second = Math.imul(second ^ code, 0x85ebca6b); second ^= second >>> 13 }; return `${(first >>> 0).toString(16).padStart(8, '0')}${(second >>> 0).toString(16).padStart(8, '0')}${source.length.toString(16).padStart(8, '0')}` }

export function refreshCiCacheKeys(projectId: string, engineVersion: string): void { for (const job of deliveryPipelineState.jobs) job.cacheKey = contentCacheKey({ matrix: NOVA_CI_MATRIX_VERSION, projectId, engineVersion, target: job.target, architecture: job.architecture, profile: job.profile, templateId: job.templateId }) }

export function createDeltaBuild(baseBuildId: string, targetBuildId: string, base: Array<{ path: string; sha256: string }>, target: Array<{ path: string; sha256: string }>): DeltaBuildManifest {
  const before = new Map(base.slice(0, 100_000).map(item => [item.path.replace(/\\/g, '/').slice(0, 500), item.sha256])), after = new Map(target.slice(0, 100_000).map(item => [item.path.replace(/\\/g, '/').slice(0, 500), item.sha256]))
  const added: string[] = [], changed: string[] = [], removed: string[] = []; let unchanged = 0
  for (const [path, hash] of after) { if (!before.has(path)) added.push(path); else if (before.get(path) !== hash) changed.push(path); else unchanged++ }
  for (const path of before.keys()) if (!after.has(path)) removed.push(path)
  return { format: 'nova-delta-build', version: 1, baseBuildId: baseBuildId.slice(0, 128), targetBuildId: targetBuildId.slice(0, 128), added: added.sort(), changed: changed.sort(), removed: removed.sort(), unchanged }
}

export function normalizeDeploymentConnector(value: unknown): DeploymentConnector {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Deployment connector must be an object.')
  const source = value as Partial<DeploymentConnector>, kind: DeploymentConnectorKind = source.kind === 'https-webhook' || source.kind === 'external-command' ? source.kind : 'local-folder', destination = typeof source.destination === 'string' ? source.destination.trim().slice(0, 500) : ''
  if (kind === 'https-webhook' && !/^https:\/\//i.test(destination)) throw new Error('Network deployment connectors require an explicit HTTPS destination.')
  if (kind === 'external-command' && (!destination || /[\r\n\0]/.test(destination))) throw new Error('External deployment connector requires one bounded command path without control characters.')
  return { id: String(source.id ?? '').replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 80) || `connector-${Date.now()}`, name: String(source.name ?? '').trim().slice(0, 120) || 'Deployment connector', kind, destination, enabled: source.enabled === true, permissionGranted: kind === 'local-folder' ? true : source.permissionGranted === true, headers: [...new Set((Array.isArray(source.headers) ? source.headers : []).filter((item): item is string => typeof item === 'string' && /^[A-Za-z0-9-]{1,80}: [^\r\n]{0,300}$/.test(item)))].slice(0, 32) }
}

export function prepareDeployment(connectorId: string, artifact: string, checksum: string): DeploymentPlan {
  const connector = deliveryPipelineState.connectors.find(item => item.id === connectorId); if (!connector || !connector.enabled) throw new Error('Deployment connector is disabled or missing.')
  if (connector.kind !== 'local-folder' && !connector.permissionGranted) throw new Error('Remote or external deployment requires explicit project permission.')
  if (!/^[a-f0-9]{64}$/.test(checksum)) throw new Error('Deployment requires the artifact SHA-256 checksum.')
  const plan: DeploymentPlan = { connectorId: connector.id, kind: connector.kind, destination: connector.destination, artifact: artifact.slice(0, 500), checksum, explicitConfirmationRequired: true, implicitNetworkOperation: false, executableAction: false }
  deliveryPipelineState.lastPlan = plan; return plan
}
