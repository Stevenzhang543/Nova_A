/** 功能生命周期约定：记录功能状态与适用范围，供界面和验证流程查询。 */
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
/** 读取本地功能开关，存储或解析失败时使用空开关集合。 */ function savedFlags(): Record<string, boolean> { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, boolean> } catch { return {} } }
const saved = typeof localStorage === 'undefined' ? {} : savedFlags()
export const featureLifecycleState = reactive({ enabled: Object.fromEntries(FEATURE_DEFINITIONS.map(/* 返回按声明顺序构造的数组 [feature.id, saved[feature.id] ?? feature.defaultEnabled]。 */ feature => [feature.id, saved[feature.id] ?? feature.defaultEnabled])) as Record<string, boolean> })

/** 按生命周期和用户开关判断功能是否可用，内部功能还要求开发环境。 */ export function featureAvailable(id: string): boolean {
  const feature = FEATURE_DEFINITIONS.find(/* 比较 item.id 与 id，返回严格相等的判断结果。 */ item => item.id === id)
  if (!feature || feature.lifecycle === 'removed') return false
  if (feature.lifecycle === 'internal') return import.meta.env.DEV && featureLifecycleState.enabled[id] === true
  return feature.lifecycle === 'stable' || feature.lifecycle === 'beta' || featureLifecycleState.enabled[id] === true
}

/** 只修改允许用户选择的功能开关，尽力保存到本机并返回是否接受修改。 */ export function setFeatureEnabled(id: string, enabled: boolean): boolean {
  const feature = FEATURE_DEFINITIONS.find(/* 比较 item.id 与 id，返回严格相等的判断结果。 */ item => item.id === id)
  if (!feature || feature.lifecycle === 'stable' || feature.lifecycle === 'removed' || (feature.lifecycle === 'internal' && !import.meta.env.DEV)) return false
  featureLifecycleState.enabled[id] = enabled
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(featureLifecycleState.enabled)) } catch { /* Feature preferences are user-local. */ }
  return true
}
