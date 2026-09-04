import type { InputDeviceIdentity, InputPhase, InputSnapshot } from './input'

const MAX_ACTIONS = 256
const MAX_DEVICES = 64
const MAX_CONTEXTS = 32
const MAX_NAME_BYTES = 80
const PHASES = new Set<InputPhase>(['idle', 'started', 'performed', 'cancelled'])

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function text(value: unknown, maximum = MAX_NAME_BYTES): string {
  if (typeof value !== 'string') return ''
  return value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, maximum)
}

function finite(value: unknown, fallback = 0, minimum = -1e9, maximum = 1e9): number {
  const number = Number(value)
  return Number.isFinite(number) ? Math.min(maximum, Math.max(minimum, number)) : fallback
}

function tuple(value: unknown, length: 2 | 4): number[] {
  if (!Array.isArray(value) || value.length < length) return Array.from({ length }, () => 0)
  return value.slice(0, length).map(item => finite(item))
}

function boundedEntries(value: unknown): Array<[string, unknown]> {
  const source = record(value)
  if (!source) return []
  return Object.entries(source).slice(0, MAX_ACTIONS).flatMap(([key, item]) => {
    const safeKey = text(key)
    return safeKey ? [[safeKey, item] as [string, unknown]] : []
  })
}

function booleans(value: unknown): Record<string, boolean> {
  return Object.fromEntries(boundedEntries(value).map(([key, item]) => [key, item === true]))
}

function numbers(value: unknown, minimum = -1e9, maximum = 1e9): Record<string, number> {
  return Object.fromEntries(boundedEntries(value).map(([key, item]) => [key, finite(item, 0, minimum, maximum)]))
}

function phases(value: unknown): Record<string, InputPhase> {
  return Object.fromEntries(boundedEntries(value).map(([key, item]) => [key, PHASES.has(item as InputPhase) ? item as InputPhase : 'idle']))
}

function vectors(value: unknown): Record<string, [number, number]> {
  return Object.fromEntries(boundedEntries(value).map(([key, item]) => {
    const pair = tuple(item, 2)
    return [key, [pair[0], pair[1]] as [number, number]]
  }))
}

function devices(value: unknown): InputDeviceIdentity[] {
  if (!Array.isArray(value)) return []
  return value.slice(0, MAX_DEVICES).flatMap(item => {
    const source = record(item), id = text(source?.id), kind = source?.kind
    if (!source || !id || !['keyboard', 'mouse', 'gamepad', 'touch', 'sensor', 'pen'].includes(String(kind))) return []
    return [{
      id,
      kind: kind as InputDeviceIdentity['kind'],
      index: Math.round(finite(source.index, 0, 0, 255)),
      connected: source.connected === true,
      mapping: text(source.mapping)
    }]
  })
}

function names(value: unknown, maximum: number): string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.slice(0, maximum).map(item => text(item)).filter(Boolean))]
}

export function emptyNetworkInput(): InputSnapshot {
  return { down: {}, pressed: {}, released: {}, performed: {}, cancelled: {}, phases: {}, durations: {}, tapCounts: {}, consumed: {}, axes: {}, vectors: {}, mousePosition: [0, 0], mouseWorldPosition: [0, 0], viewBounds: [0, 0, 0, 0], viewportSize: [0, 0], wheel: [0, 0], pointerDelta: [0, 0], touches: 0, devices: [], contexts: [], maps: [], scheme: 'Any' }
}

/**
 * Produces the only InputSnapshot shape accepted from a network or replay file.
 * Strict mode requires the core action maps and pointer tuples, so arbitrary
 * objects cannot enter gameplay as trusted input. Legacy replay normalization
 * can use the default tolerant mode and receives bounded empty fallbacks.
 */
export function normalizeNetworkInput(value: unknown, strict = false): InputSnapshot | null {
  const source = record(value)
  if (!source) return null
  if (strict) {
    const requiredRecords = ['down', 'pressed', 'released', 'axes', 'vectors']
    const requiredTuples = ['mousePosition', 'wheel', 'pointerDelta']
    if (requiredRecords.some(key => !record(source[key])) || requiredTuples.some(key => !Array.isArray(source[key]))) return null
  }
  const mouse = tuple(source.mousePosition, 2), mouseWorld = tuple(source.mouseWorldPosition ?? source.mousePosition, 2), bounds = tuple(source.viewBounds, 4), viewport = tuple(source.viewportSize, 2), wheel = tuple(source.wheel, 2), pointer = tuple(source.pointerDelta, 2)
  return {
    down: booleans(source.down), pressed: booleans(source.pressed), released: booleans(source.released), performed: booleans(source.performed), cancelled: booleans(source.cancelled), phases: phases(source.phases), durations: numbers(source.durations, 0, 86_400), tapCounts: numbers(source.tapCounts, 0, 1_000), consumed: booleans(source.consumed), axes: numbers(source.axes), vectors: vectors(source.vectors),
    mousePosition: [mouse[0], mouse[1]], mouseWorldPosition: [mouseWorld[0], mouseWorld[1]], viewBounds: [bounds[0], bounds[1], bounds[2], bounds[3]], viewportSize: [Math.max(0, viewport[0]), Math.max(0, viewport[1])], wheel: [wheel[0], wheel[1]], pointerDelta: [pointer[0], pointer[1]],
    touches: Math.round(finite(source.touches, 0, 0, 64)), devices: devices(source.devices), contexts: names(source.contexts, MAX_CONTEXTS), maps: names(source.maps, MAX_CONTEXTS), scheme: text(source.scheme) || 'Any'
  }
}

export function cloneNetworkInput(value: unknown): InputSnapshot {
  return normalizeNetworkInput(value) ?? emptyNetworkInput()
}
