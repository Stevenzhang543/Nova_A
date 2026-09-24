/** 项目发行信息：组织交付配置、目标约束与发布相关验证。 */
import { reactive } from 'vue'
import { buildSettings } from './buildSettings'
import { NOVA_ENGINE_VERSION } from '../projects/projectFormat'

export interface TelemetryEvent { name: string; at: string; values: Record<string, string | number | boolean> }

const MAX_EVENTS = 128
export const shippingState = reactive({ telemetryQueue: [] as TelemetryEvent[], telemetryStatus: 'idle' as 'idle' | 'queued' | 'sent' | 'failed' })

/** 结构说明（自动提取）：safeValues；输入 values；直接调用 slice、Object.entries、Number.isFinite、key.slice、value.slice；写入 output[…]；返回路径包含 output；包含循环处理。 */ function safeValues(values: Record<string, unknown>): Record<string, string | number | boolean> {
  const output: Record<string, string | number | boolean> = {}
  for (const [key, value] of Object.entries(values).slice(0, 32)) {
    if (typeof value === 'boolean' || typeof value === 'number' && Number.isFinite(value)) output[key.slice(0, 64)] = value
    else if (typeof value === 'string') output[key.slice(0, 64)] = value.slice(0, 240)
  }
  return output
}
/** Telemetry is inert until both consent and an HTTPS endpoint are configured. */
/** 结构说明（自动提取）：recordTelemetry；输入 name、values；直接调用 test、shippingState.telemetryQueue.push、name.slice、toISOString、Date 等；写入 shippingState.telemetryStatus。 */ export function recordTelemetry(name: string, values: Record<string, unknown> = {}): boolean {
  if (!buildSettings.delivery.telemetryEnabled || !/^https:\/\//i.test(buildSettings.delivery.telemetryEndpoint)) return false
  shippingState.telemetryQueue.push({ name: name.slice(0, 80), at: new Date().toISOString(), values: safeValues(values) })
  if (shippingState.telemetryQueue.length > MAX_EVENTS) shippingState.telemetryQueue.splice(0, shippingState.telemetryQueue.length - MAX_EVENTS)
  shippingState.telemetryStatus = 'queued'
  return true
}

/** 结构说明（自动提取）：flushTelemetry；无显式参数；直接调用 test、shippingState.telemetryQueue.slice、fetch、JSON.stringify、Error 等；写入 shippingState.telemetryStatus；等待异步结果；包含显式抛错路径。 */ export async function flushTelemetry(): Promise<boolean> {
  if (!shippingState.telemetryQueue.length || !buildSettings.delivery.telemetryEnabled || !/^https:\/\//i.test(buildSettings.delivery.telemetryEndpoint)) return false
  const events = shippingState.telemetryQueue.slice(0, MAX_EVENTS)
  try {
    const response = await fetch(buildSettings.delivery.telemetryEndpoint, {
      method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format: 'nova-telemetry', version: 1, engineVersion: NOVA_ENGINE_VERSION, events })
    })
    if (!response.ok) throw new Error(`Telemetry endpoint returned ${response.status}`)
    shippingState.telemetryQueue.splice(0, events.length); shippingState.telemetryStatus = 'sent'; return true
  } catch { shippingState.telemetryStatus = 'failed'; return false }
}

/** 结构说明（自动提取）：telemetryPrivacySummary；无显式参数。 */ export function telemetryPrivacySummary(): string[] {
  return [
    'telemetryPrivacyDefault',
    'telemetryPrivacyScalars',
    'telemetryPrivacyExcluded',
    'telemetryPrivacyHttps'
  ]
}
