import { reactive } from 'vue'

export type VirtualControlKind = 'button' | 'stick' | 'dpad'
export type VirtualControlAnchor = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'
export type DeviceOrientationPolicy = 'auto' | 'portrait' | 'landscape'
export type DeviceSafeAreaMode = 'system' | 'custom' | 'off'

export interface Insets { left: number; top: number; right: number; bottom: number }
export interface VirtualControlSettings {
  id: string
  label: string
  accessibleLabel: string
  action: string
  kind: VirtualControlKind
  anchor: VirtualControlAnchor
  offsetX: number
  offsetY: number
  size: number
  opacity: number
  value: number
  deadzone: number
  hapticMs: number
}
export interface GamepadAxisCalibration {
  deviceId: string
  axis: number
  minimum: number
  center: number
  maximum: number
  deadzone: number
  invert: boolean
}
export interface DeviceInputSettings {
  virtualControlsEnabled: boolean
  showVirtualControls: 'always' | 'touch-only'
  safeAreaMode: DeviceSafeAreaMode
  customSafeArea: Insets
  orientation: DeviceOrientationPolicy
  referenceDpi: number
  hapticsEnabled: boolean
  motionSensorsEnabled: boolean
  sensorFrequency: number
  gamepadCalibrations: GamepadAxisCalibration[]
  virtualControls: VirtualControlSettings[]
}
export interface DeviceSensorSnapshot {
  orientation: [number, number, number]
  acceleration: [number, number, number]
  rotationRate: [number, number, number]
  permission: 'not-requested' | 'granted' | 'denied' | 'unsupported'
  updatedAt: number
}
export interface DeviceRuntimeCapabilities {
  touch: boolean
  pen: boolean
  maximumTouches: number
  pointerEvents: boolean
  gamepads: boolean
  vibration: boolean
  orientationLock: boolean
  motionSensors: boolean
  devicePixelRatio: number
  viewport: [number, number]
  orientation: 'portrait' | 'landscape'
  safeArea: Insets
}

const bounded = (value: unknown, fallback: number, minimum: number, maximum: number): number => typeof value === 'number' && Number.isFinite(value) ? Math.min(maximum, Math.max(minimum, value)) : fallback
const text = (value: unknown, fallback: string, maximum = 120): string => typeof value === 'string' && value.trim() ? value.trim().slice(0, maximum) : fallback
const insets = (value: unknown): Insets => { const item = value && typeof value === 'object' ? value as Partial<Insets> : {}; return { left: bounded(item.left, 0, 0, 1_000), top: bounded(item.top, 0, 0, 1_000), right: bounded(item.right, 0, 0, 1_000), bottom: bounded(item.bottom, 0, 0, 1_000) } }

export function createVirtualControl(action = 'Jump', kind: VirtualControlKind = 'button', index = 0): VirtualControlSettings {
  const right = index % 2 === 0
  return { id: `virtual-${cryptoId()}`, label: action, accessibleLabel: action, action, kind, anchor: right ? 'bottom-right' : 'bottom-left', offsetX: 24 + Math.floor(index / 2) * 84, offsetY: 24, size: kind === 'button' ? 68 : 132, opacity: .82, value: 1, deadzone: .16, hapticMs: 12 }
}

const defaults = (): DeviceInputSettings => ({
  virtualControlsEnabled: false,
  showVirtualControls: 'touch-only',
  safeAreaMode: 'system', customSafeArea: { left: 0, top: 0, right: 0, bottom: 0 }, orientation: 'auto', referenceDpi: 160,
  hapticsEnabled: true, motionSensorsEnabled: false, sensorFrequency: 30, gamepadCalibrations: [], virtualControls: []
})

export const deviceInputSettings = reactive<DeviceInputSettings>(defaults())
export const deviceSensorState = reactive<DeviceSensorSnapshot>({ orientation: [0, 0, 0], acceleration: [0, 0, 0], rotationRate: [0, 0, 0], permission: 'not-requested', updatedAt: 0 })
export const deviceRuntimeState = reactive({ capabilities: { touch: false, pen: false, maximumTouches: 0, pointerEvents: false, gamepads: false, vibration: false, orientationLock: false, motionSensors: false, devicePixelRatio: 1, viewport: [0, 0], orientation: 'landscape', safeArea: { left: 0, top: 0, right: 0, bottom: 0 } } as DeviceRuntimeCapabilities, lastHapticAt: 0, lastError: '' })

export function normalizeDeviceInputSettings(source: unknown): DeviceInputSettings {
  const item = source && typeof source === 'object' ? source as Partial<DeviceInputSettings> : {}, base = defaults()
  const orientations: DeviceOrientationPolicy[] = ['auto', 'portrait', 'landscape'], safeModes: DeviceSafeAreaMode[] = ['system', 'custom', 'off']
  const virtualControls = (Array.isArray(item.virtualControls) ? item.virtualControls : []).slice(0, 32).flatMap((raw, index) => {
    if (!raw || typeof raw !== 'object') return []
    const value = raw as Partial<VirtualControlSettings>, kinds: VirtualControlKind[] = ['button', 'stick', 'dpad'], anchors: VirtualControlAnchor[] = ['bottom-left', 'bottom-right', 'top-left', 'top-right']
    const action = text(value.action, '', 80); if (!action) return []
    return [{ id: text(value.id, `virtual-${index + 1}`, 80), label: text(value.label, action, 80), accessibleLabel: text(value.accessibleLabel, action, 160), action, kind: kinds.includes(value.kind as VirtualControlKind) ? value.kind as VirtualControlKind : 'button', anchor: anchors.includes(value.anchor as VirtualControlAnchor) ? value.anchor as VirtualControlAnchor : 'bottom-right', offsetX: bounded(value.offsetX, 24, 0, 2_000), offsetY: bounded(value.offsetY, 24, 0, 2_000), size: bounded(value.size, 68, 40, 320), opacity: bounded(value.opacity, .82, .2, 1), value: bounded(value.value, 1, -1, 1), deadzone: bounded(value.deadzone, .16, 0, .95), hapticMs: Math.round(bounded(value.hapticMs, 12, 0, 100)) }]
  })
  const seen = new Set<string>(), gamepadCalibrations = (Array.isArray(item.gamepadCalibrations) ? item.gamepadCalibrations : []).slice(0, 128).flatMap(raw => {
    if (!raw || typeof raw !== 'object') return []
    const value = raw as Partial<GamepadAxisCalibration>, axis = Math.round(bounded(value.axis, 0, 0, 63)), deviceId = text(value.deviceId, '*', 160), key = `${deviceId}:${axis}`
    if (seen.has(key)) return []; seen.add(key)
    const minimum = bounded(value.minimum, -1, -1, 1), center = bounded(value.center, 0, -1, 1), maximum = bounded(value.maximum, 1, -1, 1)
    if (!(minimum < center && center < maximum)) return []
    return [{ deviceId, axis, minimum, center, maximum, deadzone: bounded(value.deadzone, .12, 0, .95), invert: value.invert === true }]
  })
  return { virtualControlsEnabled: item.virtualControlsEnabled === true, showVirtualControls: item.showVirtualControls === 'always' ? 'always' : 'touch-only', safeAreaMode: safeModes.includes(item.safeAreaMode as DeviceSafeAreaMode) ? item.safeAreaMode as DeviceSafeAreaMode : base.safeAreaMode, customSafeArea: insets(item.customSafeArea), orientation: orientations.includes(item.orientation as DeviceOrientationPolicy) ? item.orientation as DeviceOrientationPolicy : base.orientation, referenceDpi: bounded(item.referenceDpi, 160, 72, 1_200), hapticsEnabled: item.hapticsEnabled !== false, motionSensorsEnabled: item.motionSensorsEnabled === true, sensorFrequency: Math.round(bounded(item.sensorFrequency, 30, 1, 120)), gamepadCalibrations, virtualControls }
}

export function loadDeviceInputSettings(source: unknown): void { Object.assign(deviceInputSettings, normalizeDeviceInputSettings(source)) }
export function serializeDeviceInputSettings(): DeviceInputSettings { return normalizeDeviceInputSettings(deviceInputSettings) }

export function applyGamepadAxisCalibration(raw: number, deviceId: string, axis: number): number {
  if (!Number.isFinite(raw)) return 0
  const profile = deviceInputSettings.gamepadCalibrations.find(item => item.axis === axis && item.deviceId === deviceId) ?? deviceInputSettings.gamepadCalibrations.find(item => item.axis === axis && item.deviceId === '*')
  if (!profile) return Math.min(1, Math.max(-1, raw))
  const centered = raw >= profile.center ? (raw - profile.center) / Math.max(1e-9, profile.maximum - profile.center) : (raw - profile.center) / Math.max(1e-9, profile.center - profile.minimum)
  const magnitude = Math.abs(centered)
  if (magnitude <= profile.deadzone) return 0
  const normalized = Math.min(1, (magnitude - profile.deadzone) / Math.max(1e-9, 1 - profile.deadzone))
  return Math.sign(centered) * (profile.invert ? -1 : 1) * normalized
}

export class TouchPointerDeduplicator {
  private recent: Array<{ at: number; x: number; y: number }> = []
  recordPointer(at: number, x: number, y: number): void { this.recent.push({ at, x, y }); this.prune(at) }
  recordTouch(at: number, x: number, y: number): void { this.recordPointer(at, x, y) }
  acceptMouse(at: number, x: number, y: number, firesTouchEvents = false): boolean {
    this.prune(at)
    if (firesTouchEvents) return false
    return !this.recent.some(item => at >= item.at && at - item.at <= 800 && Math.hypot(x - item.x, y - item.y) <= 32)
  }
  clear(): void { this.recent.splice(0) }
  private prune(now: number): void { while (this.recent.length && now - this.recent[0].at > 900) this.recent.shift(); if (this.recent.length > 32) this.recent.splice(0, this.recent.length - 32) }
}

export function refreshDeviceCapabilities(): DeviceRuntimeCapabilities {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return deviceRuntimeState.capabilities
  const safeArea = deviceInputSettings.safeAreaMode === 'custom' ? { ...deviceInputSettings.customSafeArea } : deviceInputSettings.safeAreaMode === 'off' ? { left: 0, top: 0, right: 0, bottom: 0 } : readCssSafeArea()
  const pointerEvents = typeof PointerEvent !== 'undefined'
  const capabilities: DeviceRuntimeCapabilities = { touch: navigator.maxTouchPoints > 0 || 'ontouchstart' in window, pen: pointerEvents, maximumTouches: Math.max(0, navigator.maxTouchPoints || 0), pointerEvents, gamepads: typeof navigator.getGamepads === 'function', vibration: typeof navigator.vibrate === 'function', orientationLock: Boolean(globalThis.screen?.orientation && 'lock' in globalThis.screen.orientation), motionSensors: 'DeviceMotionEvent' in window || 'DeviceOrientationEvent' in window, devicePixelRatio: bounded(window.devicePixelRatio, 1, .25, 8), viewport: [Math.max(0, window.innerWidth), Math.max(0, window.innerHeight)], orientation: window.innerHeight > window.innerWidth ? 'portrait' : 'landscape', safeArea }
  deviceRuntimeState.capabilities = capabilities
  return capabilities
}

export async function applyOrientationPolicy(policy = deviceInputSettings.orientation): Promise<boolean> {
  if (policy === 'auto') return true
  const orientation = globalThis.screen?.orientation as ScreenOrientation & { lock?: (value: string) => Promise<void> } | undefined
  if (!orientation?.lock) { deviceRuntimeState.lastError = 'Orientation lock is unavailable on this device or host.'; return false }
  try { await orientation.lock(policy); deviceRuntimeState.lastError = ''; refreshDeviceCapabilities(); return true } catch (error) { deviceRuntimeState.lastError = error instanceof Error ? error.message : String(error); return false }
}

export function performHaptic(milliseconds = 12): boolean {
  if (!deviceInputSettings.hapticsEnabled || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return false
  const duration = Math.round(bounded(milliseconds, 12, 0, 100)); if (!duration) return false
  const accepted = navigator.vibrate(duration); if (accepted) deviceRuntimeState.lastHapticAt = Date.now(); return accepted
}

export function sensorSampleIntervalMs(frequency = deviceInputSettings.sensorFrequency): number {
  return 1_000 / Math.round(bounded(frequency, 30, 1, 120))
}

export function sensorSampleDue(lastSampleAt: number, now: number, frequency = deviceInputSettings.sensorFrequency): boolean {
  if (!Number.isFinite(now)) return false
  return !Number.isFinite(lastSampleAt) || now < lastSampleAt || now - lastSampleAt + 1e-6 >= sensorSampleIntervalMs(frequency)
}

let sensorAttached = false, sensorLifecycleAttached = false
let lastOrientationSampleAt = -Infinity, lastMotionSampleAt = -Infinity
const monotonicNow = (): number => typeof performance === 'undefined' ? Date.now() : performance.now()
const onOrientation = (event: DeviceOrientationEvent): void => {
  if (!deviceInputSettings.motionSensorsEnabled || deviceSensorState.permission !== 'granted') return
  const now = monotonicNow(); if (!sensorSampleDue(lastOrientationSampleAt, now)) return; lastOrientationSampleAt = now
  deviceSensorState.orientation = [bounded(event.beta, 0, -180, 180), bounded(event.gamma, 0, -90, 90), bounded(event.alpha, 0, 0, 360)]; deviceSensorState.updatedAt = Date.now()
}
const onMotion = (event: DeviceMotionEvent): void => {
  if (!deviceInputSettings.motionSensorsEnabled || deviceSensorState.permission !== 'granted') return
  const now = monotonicNow(); if (!sensorSampleDue(lastMotionSampleAt, now)) return; lastMotionSampleAt = now
  const acceleration = event.accelerationIncludingGravity, rotation = event.rotationRate
  deviceSensorState.acceleration = [bounded(acceleration?.x, 0, -100, 100), bounded(acceleration?.y, 0, -100, 100), bounded(acceleration?.z, 0, -100, 100)]; deviceSensorState.rotationRate = [bounded(rotation?.alpha, 0, -2_000, 2_000), bounded(rotation?.beta, 0, -2_000, 2_000), bounded(rotation?.gamma, 0, -2_000, 2_000)]; deviceSensorState.updatedAt = Date.now()
}
const pauseDeviceSensors = (): void => {
  if (!sensorAttached || typeof window === 'undefined') return
  sensorAttached = false
  window.removeEventListener('deviceorientation', onOrientation)
  window.removeEventListener('devicemotion', onMotion)
  lastOrientationSampleAt = -Infinity
  lastMotionSampleAt = -Infinity
}
const onSensorVisibility = (): void => {
  if (typeof document !== 'undefined' && document.hidden) pauseDeviceSensors()
  else if (deviceSensorState.permission === 'granted' && deviceInputSettings.motionSensorsEnabled) attachDeviceSensors()
}
const onSensorPageHide = (): void => pauseDeviceSensors()
const onSensorPageShow = (): void => { if (deviceSensorState.permission === 'granted' && deviceInputSettings.motionSensorsEnabled) attachDeviceSensors() }

export async function requestDeviceSensorPermission(): Promise<boolean> {
  if (!deviceInputSettings.motionSensorsEnabled || typeof window === 'undefined' || !('DeviceMotionEvent' in window || 'DeviceOrientationEvent' in window)) { deviceSensorState.permission = 'unsupported'; return false }
  try {
    const motion = DeviceMotionEvent as typeof DeviceMotionEvent & { requestPermission?: () => Promise<'granted' | 'denied'> }, orientation = DeviceOrientationEvent as typeof DeviceOrientationEvent & { requestPermission?: () => Promise<'granted' | 'denied'> }
    const results = await Promise.all([motion.requestPermission?.() ?? 'granted', orientation.requestPermission?.() ?? 'granted'])
    if (results.some(result => result !== 'granted')) { deviceSensorState.permission = 'denied'; return false }
    attachDeviceSensors(); deviceSensorState.permission = 'granted'; return true
  } catch (error) { deviceSensorState.permission = 'denied'; deviceRuntimeState.lastError = error instanceof Error ? error.message : String(error); return false }
}
export function attachDeviceSensors(): void {
  if (typeof window === 'undefined' || deviceSensorState.permission !== 'granted' || !deviceInputSettings.motionSensorsEnabled) return
  if (!sensorLifecycleAttached) {
    sensorLifecycleAttached = true
    window.addEventListener('pagehide', onSensorPageHide)
    window.addEventListener('pageshow', onSensorPageShow)
    document.addEventListener('visibilitychange', onSensorVisibility)
  }
  if (sensorAttached || document.hidden) return
  sensorAttached = true
  window.addEventListener('deviceorientation', onOrientation)
  window.addEventListener('devicemotion', onMotion)
}
export function detachDeviceSensors(): void {
  pauseDeviceSensors()
  if (!sensorLifecycleAttached || typeof window === 'undefined') return
  sensorLifecycleAttached = false
  window.removeEventListener('pagehide', onSensorPageHide)
  window.removeEventListener('pageshow', onSensorPageShow)
  document.removeEventListener('visibilitychange', onSensorVisibility)
}

export function sensorValue(code: string): number {
  const values: Record<string, number> = { 'tilt-x': deviceSensorState.orientation[1] / 90, 'tilt-y': deviceSensorState.orientation[0] / 180, heading: deviceSensorState.orientation[2] / 360, 'acceleration-x': deviceSensorState.acceleration[0] / 10, 'acceleration-y': deviceSensorState.acceleration[1] / 10, 'acceleration-z': deviceSensorState.acceleration[2] / 10, 'rotation-x': deviceSensorState.rotationRate[1] / 360, 'rotation-y': deviceSensorState.rotationRate[2] / 360, 'rotation-z': deviceSensorState.rotationRate[0] / 360 }
  return deviceSensorState.permission === 'granted' ? Math.min(1, Math.max(-1, values[code] ?? 0)) : 0
}

function readCssSafeArea(): Insets {
  if (typeof document === 'undefined') return { left: 0, top: 0, right: 0, bottom: 0 }
  const probe = document.createElement('div'); probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)'; document.body.append(probe)
  const style = getComputedStyle(probe), result = { left: Number.parseFloat(style.paddingLeft) || 0, top: Number.parseFloat(style.paddingTop) || 0, right: Number.parseFloat(style.paddingRight) || 0, bottom: Number.parseFloat(style.paddingBottom) || 0 }; probe.remove(); return result
}
let virtualControlSequence = 0
function cryptoId(): string { try { return crypto.randomUUID().slice(0, 12) } catch { virtualControlSequence += 1; return `local-${virtualControlSequence.toString(36).padStart(5, '0')}` } }
