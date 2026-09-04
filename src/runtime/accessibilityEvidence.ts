import { reactive } from 'vue'
import type { UiAccessibilityNode } from './gameUi'
import { NOVA_ENGINE_VERSION } from '../projects/projectFormat'

export interface NativeAccessibilityCapabilities {
  platform: string
  webviewDomBridge: boolean
  nativeCustomAdapters: boolean
  automationProvider: string
  notes: string[]
}
export interface SemanticEvidenceNode {
  uuid: string
  role: string
  name: string
  description: string
  state: string
  value: { text: string; minimum?: number; maximum?: number; current?: number; checked?: boolean }
  live: 'off' | 'polite' | 'assertive'
  focusOrder: number
  disabled: boolean
  focused: boolean
  bounds: { x: number; y: number; width: number; height: number }
}
export interface SemanticEvidenceSnapshot {
  format: 'nova-semantic-accessibility-snapshot'
  version: 1
  engineVersion: string
  generatedAt: string
  locale: string
  direction: 'ltr' | 'rtl'
  textScale: number
  nodes: SemanticEvidenceNode[]
  issues: Array<{ code: string; severity: 'error' | 'warning'; uuid: string; message: string }>
}

export const nativeAccessibilityState = reactive({
  loading: false,
  error: '',
  capabilities: { platform: typeof navigator === 'undefined' ? 'unknown' : navigator.platform || 'web', webviewDomBridge: true, nativeCustomAdapters: false, automationProvider: 'Web ARIA', notes: ['Semantic HTML and ARIA are exposed by the active browser/WebView accessibility tree.'] } as NativeAccessibilityCapabilities
})

const finite = (value: number, fallback = 0): number => Number.isFinite(value) ? value : fallback
export function createSemanticEvidence(nodes: readonly UiAccessibilityNode[], options: { locale?: string; direction?: 'ltr' | 'rtl'; textScale?: number; generatedAt?: string } = {}): SemanticEvidenceSnapshot {
  const result: SemanticEvidenceSnapshot = {
    format: 'nova-semantic-accessibility-snapshot', version: 1, engineVersion: NOVA_ENGINE_VERSION,
    generatedAt: options.generatedAt ?? new Date().toISOString(), locale: (options.locale || 'en').slice(0, 32),
    direction: options.direction === 'rtl' ? 'rtl' : 'ltr', textScale: Math.min(4, Math.max(.75, finite(options.textScale ?? 1, 1))),
    nodes: nodes.slice(0, 10_000).map(node => ({
      uuid: node.uuid.slice(0, 160), role: node.role.slice(0, 64), name: node.label.slice(0, 500), description: node.description.slice(0, 2_000),
      state: node.state.slice(0, 500), value: { text: node.value.slice(0, 500), minimum: node.valueMin, maximum: node.valueMax, current: node.valueNow, checked: node.checked },
      live: node.live, focusOrder: Math.max(-1, Math.round(finite(node.tabIndex, -1))), disabled: node.disabled, focused: node.focused,
      bounds: { x: finite(node.rect.x), y: finite(node.rect.y), width: Math.max(0, finite(node.rect.width)), height: Math.max(0, finite(node.rect.height)) }
    })),
    issues: []
  }
  const names = new Map<number, string>()
  for (const node of result.nodes) {
    if (!node.role.trim()) result.issues.push({ code: 'NOVA-A11Y-SNAPSHOT-ROLE', severity: 'error', uuid: node.uuid, message: 'Semantic node has no role.' })
    if (!node.name.trim()) result.issues.push({ code: 'NOVA-A11Y-SNAPSHOT-NAME', severity: 'error', uuid: node.uuid, message: 'Focusable semantic node has no accessible name.' })
    if (node.role === 'slider' && (node.value.minimum === undefined || node.value.maximum === undefined || node.value.current === undefined)) result.issues.push({ code: 'NOVA-A11Y-SNAPSHOT-RANGE', severity: 'error', uuid: node.uuid, message: 'Slider is missing numeric minimum, maximum, or current value.' })
    if (node.role === 'checkbox' && node.value.checked === undefined) result.issues.push({ code: 'NOVA-A11Y-SNAPSHOT-CHECKED', severity: 'error', uuid: node.uuid, message: 'Checkbox is missing checked state.' })
    if (node.live !== 'off' && !node.name.trim() && !node.value.text.trim()) result.issues.push({ code: 'NOVA-A11Y-SNAPSHOT-LIVE', severity: 'warning', uuid: node.uuid, message: 'Live region has no announceable content.' })
    if (node.focusOrder > 0) { const previous = names.get(node.focusOrder); if (previous) result.issues.push({ code: 'NOVA-A11Y-SNAPSHOT-ORDER', severity: 'warning', uuid: node.uuid, message: `Focus order duplicates ${previous}.` }); else names.set(node.focusOrder, node.name) }
  }
  result.issues.sort((a,b)=>a.uuid.localeCompare(b.uuid)||a.code.localeCompare(b.code))
  return result
}

export async function detectNativeAccessibilityCapabilities(): Promise<NativeAccessibilityCapabilities> {
  nativeAccessibilityState.loading = true; nativeAccessibilityState.error = ''
  if (typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) {
    nativeAccessibilityState.capabilities = {
      platform: typeof navigator === 'undefined' ? 'web' : navigator.platform || 'web',
      webviewDomBridge: true,
      nativeCustomAdapters: false,
      automationProvider: 'Web ARIA',
      notes: ['Semantic HTML and ARIA are exposed by the active browser accessibility tree.']
    }
    nativeAccessibilityState.loading = false
    return nativeAccessibilityState.capabilities
  }
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    const response = await invoke<NativeAccessibilityCapabilities>('native_accessibility_capabilities')
    nativeAccessibilityState.capabilities = {
      platform: String(response.platform || 'unknown').slice(0,64), webviewDomBridge: response.webviewDomBridge === true,
      nativeCustomAdapters: response.nativeCustomAdapters === true, automationProvider: String(response.automationProvider || 'Web ARIA').slice(0,160),
      notes: Array.isArray(response.notes) ? response.notes.map(value=>String(value).slice(0,500)).slice(0,16) : []
    }
  } catch (error) {
    nativeAccessibilityState.error = error instanceof Error ? error.message : String(error)
  } finally { nativeAccessibilityState.loading = false }
  return nativeAccessibilityState.capabilities
}

export function downloadSemanticEvidence(snapshot: SemanticEvidenceSnapshot, filename = 'nova-accessibility-snapshot.json'): void {
  if (typeof document === 'undefined') return
  const blob = new Blob([`${JSON.stringify(snapshot,null,2)}\n`],{type:'application/json'}), url=URL.createObjectURL(blob), link=document.createElement('a')
  link.href=url; link.download=filename.replace(/[^a-z0-9._-]/gi,'_').slice(0,160); link.click(); setTimeout(()=>URL.revokeObjectURL(url),0)
}

