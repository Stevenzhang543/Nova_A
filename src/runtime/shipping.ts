import { reactive } from 'vue'
import { buildSettings } from './buildSettings'

export interface TelemetryEvent { name: string; at: string; values: Record<string, string | number | boolean> }

const MAX_EVENTS = 128
export const shippingState = reactive({ telemetryQueue: [] as TelemetryEvent[], telemetryStatus: 'idle' as 'idle' | 'queued' | 'sent' | 'failed' })

function safeValues(values: Record<string, unknown>): Record<string, string | number | boolean> {
  const output: Record<string, string | number | boolean> = {}
  for (const [key, value] of Object.entries(values).slice(0, 32)) {
    if (typeof value === 'boolean' || typeof value === 'number' && Number.isFinite(value)) output[key.slice(0, 64)] = value
    else if (typeof value === 'string') output[key.slice(0, 64)] = value.slice(0, 240)
  }
  return output
}

/** Telemetry is inert until both consent and an HTTPS endpoint are configured. */
export function recordTelemetry(name: string, values: Record<string, unknown> = {}): boolean {
  if (!buildSettings.delivery.telemetryEnabled || !/^https:\/\//i.test(buildSettings.delivery.telemetryEndpoint)) return false
  shippingState.telemetryQueue.push({ name: name.slice(0, 80), at: new Date().toISOString(), values: safeValues(values) })
  if (shippingState.telemetryQueue.length > MAX_EVENTS) shippingState.telemetryQueue.splice(0, shippingState.telemetryQueue.length - MAX_EVENTS)
  shippingState.telemetryStatus = 'queued'
  return true
}

export async function flushTelemetry(): Promise<boolean> {
  if (!shippingState.telemetryQueue.length || !buildSettings.delivery.telemetryEnabled || !/^https:\/\//i.test(buildSettings.delivery.telemetryEndpoint)) return false
  const events = shippingState.telemetryQueue.slice(0, MAX_EVENTS)
  try {
    const response = await fetch(buildSettings.delivery.telemetryEndpoint, {
      method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format: 'nova-telemetry', version: 1, engineVersion: '4.4.0', events })
    })
    if (!response.ok) throw new Error(`Telemetry endpoint returned ${response.status}`)
    shippingState.telemetryQueue.splice(0, events.length); shippingState.telemetryStatus = 'sent'; return true
  } catch { shippingState.telemetryStatus = 'failed'; return false }
}

export function telemetryPrivacySummary(): string[] {
  return [
    'telemetryPrivacyDefault',
    'telemetryPrivacyScalars',
    'telemetryPrivacyExcluded',
    'telemetryPrivacyHttps'
  ]
}
