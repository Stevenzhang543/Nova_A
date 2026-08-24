import { reactive } from 'vue'

export type FeatureLifecycle = 'stable' | 'beta' | 'experimental' | 'internal' | 'deprecated' | 'removed'
export interface FeatureDefinition { id: string; label: string; lifecycle: FeatureLifecycle; reason: string; defaultEnabled: boolean; replacement?: string }

export const FEATURE_DEFINITIONS: readonly FeatureDefinition[] = Object.freeze([
  { id: 'editor-shell', label: 'Editor shell', lifecycle: 'stable', reason: 'Covered by shell, keyboard, DPI, and parity qualification.', defaultEnabled: true },
  { id: 'workspace-docking', label: 'Workspace docking', lifecycle: 'beta', reason: 'End-to-end workflow exists; cross-monitor floating-window promotion remains under qualification.', defaultEnabled: true },
  { id: 'networking', label: 'Networking package', lifecycle: 'experimental', reason: 'Opt-in package with documented determinism and platform limits.', defaultEnabled: false },
  { id: 'advanced-world-streaming', label: 'Advanced world streaming', lifecycle: 'experimental', reason: 'Excluded from production-readiness claims until later roadmap qualification.', defaultEnabled: false },
  { id: 'developer-internals', label: 'Internal diagnostics', lifecycle: 'internal', reason: 'Development-build diagnostics are never exposed in release UI.', defaultEnabled: false }
])

const STORAGE_KEY = 'nova-a-feature-lifecycle-v1'
function savedFlags(): Record<string, boolean> { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, boolean> } catch { return {} } }
const saved = typeof localStorage === 'undefined' ? {} : savedFlags()
export const featureLifecycleState = reactive({ enabled: Object.fromEntries(FEATURE_DEFINITIONS.map(feature => [feature.id, saved[feature.id] ?? feature.defaultEnabled])) as Record<string, boolean> })

export function featureAvailable(id: string): boolean {
  const feature = FEATURE_DEFINITIONS.find(item => item.id === id)
  if (!feature || feature.lifecycle === 'removed') return false
  if (feature.lifecycle === 'internal') return import.meta.env.DEV && featureLifecycleState.enabled[id] === true
  return feature.lifecycle === 'stable' || feature.lifecycle === 'beta' || featureLifecycleState.enabled[id] === true
}

export function setFeatureEnabled(id: string, enabled: boolean): boolean {
  const feature = FEATURE_DEFINITIONS.find(item => item.id === id)
  if (!feature || feature.lifecycle === 'stable' || feature.lifecycle === 'removed' || (feature.lifecycle === 'internal' && !import.meta.env.DEV)) return false
  featureLifecycleState.enabled[id] = enabled
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(featureLifecycleState.enabled)) } catch { /* Feature preferences are user-local. */ }
  return true
}
