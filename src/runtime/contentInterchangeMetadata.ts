/** Original bounded persisted interchange metadata; importer/cache/Tiled conversion stay in assets. */


export type InterchangeFormat = 'aseprite-json' | 'texturepacker-json' | 'tiled-json' | 'tiled-xml' | 'atlas-json' | 'nova-native'

export interface InterchangeSlice {
  id: string
  sourceKey: string
  /** Original playback order, independent of deterministic metadata sorting. */
  sourceIndex?: number
  name: string
  frame: { x: number; y: number; width: number; height: number }
  sourceSize: { width: number; height: number }
  trimOffset?: { x: number; y: number }
  pivot: { x: number; y: number }
  rotated: boolean
  trimmed: boolean
  durationMs: number
  tags: string[]
  collider: Array<{ x: number; y: number }>
}

export interface ContentInterchangeMetadata {
  version: 1
  format: InterchangeFormat
  sourceName: string
  /** Original bounded interchange text for repeatable reimport after save/reopen. */
  originalSource?: string
  sourceHash: string
  texturePath: string
  mapSize: { width: number; height: number } | null
  slices: InterchangeSlice[]
  diagnostics: Array<{ severity: 'info' | 'warning' | 'error'; code: string; message: string }>
}


export const MAX_SOURCE_BYTES = 16 * 1024 * 1024

export const MAX_SLICES = 65_536


/* 根据 value && typeof value === 'object' && !Array.isArray(value) 的真假，分别返回 value as Record<string, unknown> 或 {}。 */ export function object(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {} }

/* 根据 Array.isArray(value) 的真假，分别返回 value 或 []。 */ export function list(value: unknown): unknown[] { return Array.isArray(value) ? value : [] }

/* 根据 typeof value === 'string' 的真假，分别返回 value.slice(0, limit) 或 fallback。 */ export function text(value: unknown, fallback = '', limit = 512): string { return typeof value === 'string' ? value.slice(0, limit) : fallback }

/** 转换并限制数值为给定范围内整数，非有限输入使用默认值。 */ export function integer(value: unknown, fallback = 0, minimum = 0, maximum = 1_000_000): number { const number = Number(value); return Math.round(Math.min(maximum, Math.max(minimum, Number.isFinite(number) ? number : fallback))) }

/** 把数值限制在零到一范围，非有限输入使用默认值。 */ export function unit(value: unknown, fallback = .5): number { const number = Number(value); return Math.min(1, Math.max(0, Number.isFinite(number) ? number : fallback)) }

/** 从来源帧键生成稳定双摘要身份，便于重导入维持帧引用。 */ export function stableId(value: string): string {
  let first = 0x811c9dc5, second = 0x9e3779b9
  for (let index = 0; index < value.length; index++) { const code = value.charCodeAt(index); first = Math.imul(first ^ code, 0x01000193); second = Math.imul(second ^ (code + index), 0x85ebca6b) }
  return `slice-${(first >>> 0).toString(16).padStart(8, '0')}${(second >>> 0).toString(16).padStart(8, '0')}`
}


/** 兼容宽高字段别名并生成有界非零尺寸帧矩形。 */ export function frameRectangle(value: unknown): InterchangeSlice['frame'] {
  const frame = object(value)
  return { x: integer(frame.x), y: integer(frame.y), width: integer(frame.w ?? frame.width, 1, 1), height: integer(frame.h ?? frame.height, 1, 1) }
}

/** 在顶点数量上限内保留具有有限二维坐标的点。 */ export function polygon(value: unknown): Array<{ x: number; y: number }> {
  return list(value).slice(0, 256).flatMap(/** 只接受有限二维坐标，丢弃无效交换多边形点。 */ item => { const point = object(item); const x = Number(point.x), y = Number(point.y); return Number.isFinite(x) && Number.isFinite(y) ? [{ x, y }] : [] })
}


/** 验证交换格式版本并规范化切片、原始源、地图尺寸及有界诊断列表。 */ export function validateInterchangeMetadata(value: ContentInterchangeMetadata | null | undefined): ContentInterchangeMetadata | null {
  if (!value || value.version !== 1 || !['aseprite-json', 'texturepacker-json', 'tiled-json', 'tiled-xml', 'atlas-json', 'nova-native'].includes(value.format)) return null
  const slices = list(value.slices).slice(0, MAX_SLICES).flatMap(/** 规范化单个恢复切片的身份、来源索引、几何、轴心、时长及标签碰撞数据。 */ (raw, index) => { const item = object(raw), sourceKey = text(item.sourceKey, `frame-${index}`, 512), rectangle = frameRectangle(item.frame); return [{ id: text(item.id, stableId(sourceKey), 80), sourceKey, sourceIndex: integer(item.sourceIndex, index, 0, MAX_SLICES - 1), name: text(item.name, sourceKey, 240), frame: rectangle, trimOffset: { x: integer(object(item.trimOffset).x), y: integer(object(item.trimOffset).y) }, sourceSize: { width: integer(object(item.sourceSize).width, rectangle.width, 1), height: integer(object(item.sourceSize).height, rectangle.height, 1) }, pivot: { x: unit(object(item.pivot).x), y: unit(object(item.pivot).y) }, rotated: item.rotated === true, trimmed: item.trimmed === true, durationMs: integer(item.durationMs, 0, 0, 3_600_000), tags: [...new Set(list(item.tags).map(/* 调用 text(tag, '', 120) 并返回调用结果。 */ tag => text(tag, '', 120)).filter(Boolean))].sort(), collider: polygon(item.collider) }] })
  return { version: 1, format: value.format, sourceName: text(value.sourceName, 'source', 240), sourceHash: text(value.sourceHash, '', 128), ...(typeof value.originalSource === 'string' && new TextEncoder().encode(value.originalSource).byteLength <= MAX_SOURCE_BYTES ? {originalSource: value.originalSource} : {}), texturePath: text(value.texturePath, '', 1024), mapSize: value.mapSize ? { width: integer(value.mapSize.width, 1, 1), height: integer(value.mapSize.height, 1, 1) } : null, slices, diagnostics: list(value.diagnostics).slice(0, 512).flatMap(/** 规范化交换诊断严重性并限制代码与消息长度。 */ raw => { const item = object(raw), severity = ['warning', 'error'].includes(text(item.severity)) ? text(item.severity) as 'warning' | 'error' : 'info'; return [{ severity, code: text(item.code, 'CONTENT_INFO', 80), message: text(item.message, '', 2_000) }] }) }
}
