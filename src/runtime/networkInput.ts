/** 网络输入同步：记录、验证与组织按帧传递的玩家输入。 */
import type { InputDeviceIdentity, InputPhase, InputSnapshot } from './input'

const MAX_ACTIONS = 256
const MAX_DEVICES = 64
const MAX_CONTEXTS = 32
const MAX_NAME_BYTES = 80
const PHASES = new Set<InputPhase>(['idle', 'started', 'performed', 'cancelled'])

/* 根据 value && typeof value === 'object' && !Array.isArray(value) 的真假，分别返回 value as Record<string, unknown> 或 null。 */ function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

/** 结构说明（自动提取）：text；输入 value、maximum；直接调用 slice、trim、value.replace。 */ function text(value: unknown, maximum = MAX_NAME_BYTES): string {
  if (typeof value !== 'string') return ''
  return value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, maximum)
}

/** 结构说明（自动提取）：finite；输入 value、fallback、minimum、maximum；直接调用 Number、Number.isFinite、Math.min、Math.max。 */ function finite(value: unknown, fallback = 0, minimum = -1e9, maximum = 1e9): number {
  const number = Number(value)
  return Number.isFinite(number) ? Math.min(maximum, Math.max(minimum, number)) : fallback
}

/** 结构说明（自动提取）：tuple；输入 value、length；直接调用 Array.isArray、Array.from、map、value.slice。 */ function tuple(value: unknown, length: 2 | 4): number[] {
  if (!Array.isArray(value) || value.length < length) return Array.from({ length }, /* 返回固定值 0。 */ () => 0)
  return value.slice(0, length).map(/* 调用 finite(item) 并返回调用结果。 */ item => finite(item))
}

/** 结构说明（自动提取）：boundedEntries；输入 value；直接调用 record、flatMap、slice、Object.entries。 */ function boundedEntries(value: unknown): Array<[string, unknown]> {
  const source = record(value)
  if (!source) return []
  return Object.entries(source).slice(0, MAX_ACTIONS).flatMap(/** 结构说明（自动提取）：flatMap 回调；输入 [key, item]；直接调用 text。 */ ([key, item]) => {
    const safeKey = text(key)
    return safeKey ? [[safeKey, item] as [string, unknown]] : []
  })
}

/* 调用 Object.fromEntries(boundedEntries(value).map(([key, item]) => [key, item === true])) 并返回调用结果。 */ function booleans(value: unknown): Record<string, boolean> {
  return Object.fromEntries(boundedEntries(value).map(/* 返回按声明顺序构造的数组 [key, item === true]。 */ ([key, item]) => [key, item === true]))
}

/* 调用 Object.fromEntries(boundedEntries(value).map(([key, item]) => [key, finite(item, 0, minimum, maximum)])) 并返回调用结果。 */ function numbers(value: unknown, minimum = -1e9, maximum = 1e9): Record<string, number> {
  return Object.fromEntries(boundedEntries(value).map(/* 返回按声明顺序构造的数组 [key, finite(item, 0, minimum, maximum)]。 */ ([key, item]) => [key, finite(item, 0, minimum, maximum)]))
}

/** 结构说明（自动提取）：phases；输入 value；直接调用 Object.fromEntries、map、boundedEntries。 */ function phases(value: unknown): Record<string, InputPhase> {
  return Object.fromEntries(boundedEntries(value).map(/* 返回按声明顺序构造的数组 [key, PHASES.has(item as InputPhase) ? item as InputPhase : 'idle']。 */ ([key, item]) => [key, PHASES.has(item as InputPhase) ? item as InputPhase : 'idle']))
}

/** 结构说明（自动提取）：vectors；输入 value；直接调用 Object.fromEntries、map、boundedEntries。 */ function vectors(value: unknown): Record<string, [number, number]> {
  return Object.fromEntries(boundedEntries(value).map(/** 结构说明（自动提取）：map 回调；输入 [key, item]；直接调用 tuple。 */ ([key, item]) => {
    const pair = tuple(item, 2)
    return [key, [pair[0], pair[1]] as [number, number]]
  }))
}

/** 结构说明（自动提取）：devices；输入 value；直接调用 Array.isArray、flatMap、value.slice。 */ function devices(value: unknown): InputDeviceIdentity[] {
  if (!Array.isArray(value)) return []
  return value.slice(0, MAX_DEVICES).flatMap(/** 结构说明（自动提取）：flatMap 回调；输入 item；直接调用 record、text、includes、String、Math.round 等。 */ item => {
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

/** 结构说明（自动提取）：names；输入 value、maximum；直接调用 Array.isArray、Set、filter、map、value.slice。 */ function names(value: unknown, maximum: number): string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.slice(0, maximum).map(/* 调用 text(item) 并返回调用结果。 */ item => text(item)).filter(Boolean))]
}

/** 结构说明（自动提取）：emptyNetworkInput；无显式参数。 */ export function emptyNetworkInput(): InputSnapshot {
  return { down: {}, pressed: {}, released: {}, performed: {}, cancelled: {}, phases: {}, durations: {}, tapCounts: {}, consumed: {}, axes: {}, vectors: {}, mousePosition: [0, 0], mouseWorldPosition: [0, 0], viewBounds: [0, 0, 0, 0], viewportSize: [0, 0], wheel: [0, 0], pointerDelta: [0, 0], touches: 0, devices: [], contexts: [], maps: [], scheme: 'Any' }
}

/**
 * Produces the only InputSnapshot shape accepted from a network or replay file.
 * Strict mode requires the core action maps and pointer tuples, so arbitrary
 * objects cannot enter gameplay as trusted input. Legacy replay normalization
 * can use the default tolerant mode and receives bounded empty fallbacks.
 */
/** 结构说明（自动提取）：normalizeNetworkInput；输入 value、strict；直接调用 record、requiredRecords.some、requiredTuples.some、tuple、booleans 等。 */ export function normalizeNetworkInput(value: unknown, strict = false): InputSnapshot | null {
  const source = record(value)
  if (!source) return null
  if (strict) {
    const requiredRecords = ['down', 'pressed', 'released', 'axes', 'vectors']
    const requiredTuples = ['mousePosition', 'wheel', 'pointerDelta']
    if (requiredRecords.some(/* 返回 record(source[key]) 的逻辑取反结果。 */ key => !record(source[key])) || requiredTuples.some(/* 返回 Array.isArray(source[key]) 的逻辑取反结果。 */ key => !Array.isArray(source[key]))) return null
  }
  const mouse = tuple(source.mousePosition, 2), mouseWorld = tuple(source.mouseWorldPosition ?? source.mousePosition, 2), bounds = tuple(source.viewBounds, 4), viewport = tuple(source.viewportSize, 2), wheel = tuple(source.wheel, 2), pointer = tuple(source.pointerDelta, 2)
  return {
    down: booleans(source.down), pressed: booleans(source.pressed), released: booleans(source.released), performed: booleans(source.performed), cancelled: booleans(source.cancelled), phases: phases(source.phases), durations: numbers(source.durations, 0, 86_400), tapCounts: numbers(source.tapCounts, 0, 1_000), consumed: booleans(source.consumed), axes: numbers(source.axes), vectors: vectors(source.vectors),
    mousePosition: [mouse[0], mouse[1]], mouseWorldPosition: [mouseWorld[0], mouseWorld[1]], viewBounds: [bounds[0], bounds[1], bounds[2], bounds[3]], viewportSize: [Math.max(0, viewport[0]), Math.max(0, viewport[1])], wheel: [wheel[0], wheel[1]], pointerDelta: [pointer[0], pointer[1]],
    touches: Math.round(finite(source.touches, 0, 0, 64)), devices: devices(source.devices), contexts: names(source.contexts, MAX_CONTEXTS), maps: names(source.maps, MAX_CONTEXTS), scheme: text(source.scheme) || 'Any'
  }
}

/* 当 normalizeNetworkInput(value) 为 null 或 undefined 时返回 emptyNetworkInput()，否则保留左侧值。 */ export function cloneNetworkInput(value: unknown): InputSnapshot {
  return normalizeNetworkInput(value) ?? emptyNetworkInput()
}
