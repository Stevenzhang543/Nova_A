/** 游戏界面布局：依据矩形变换、容器及约束计算控件显示区域。 */
import type { Entity } from '../world/Entity'
import type { Canvas, Panel, RectTransform, Text } from '../world/components'

export interface UiRect { x: number; y: number; width: number; height: number }
export interface UiLayoutIssue { entityUuid: string; code: string; message: string }
export interface UiLayoutItem { entity: Entity; rect: UiRect; scale: number; order: number; visible: boolean; clips: Array<{ rect: UiRect; rounded: number }>; canvas: Canvas | null; locale: string; direction: 'ltr' | 'rtl' }
export interface UiLayoutOptions { direction?: 'ltr' | 'rtl'; locale?: string; safeArea?: { left: number; top: number; right: number; bottom: number }; dpiScale?: number; localeDirection?: (locale: string) => 'ltr' | 'rtl'; measureText?: (entity: Entity, text: Text, scale: number, locale: string, availableWidth: number) => { width: number; height: number } }
export interface UiLayoutResult { items: UiLayoutItem[]; issues: UiLayoutIssue[] }
const finite = /* 根据 Number.isFinite(value) 的真假，分别返回 value 或 fallback。 */ (value: number, fallback = 0): number => Number.isFinite(value) ? value : fallback
const positive = /* 调用 Math.max(0, finite(value)) 并返回调用结果。 */ (value: number): number => Math.max(0, finite(value))
const clamp = /* 调用 Math.min(Math.max(positive(minimum), positive(maximum)), Math.max(positive(minimum), positive(value))) 并返回调用结果。 */ (value: number, minimum: number, maximum: number): number => Math.min(Math.max(positive(minimum), positive(maximum)), Math.max(positive(minimum), positive(value)))
const inset = /** 结构说明（自动提取）：inset；输入 rect、values、scale；直接调用 positive、Math.max；返回表达式求值结果。 */ (rect: UiRect, values: { left: number; top: number; right: number; bottom: number }, scale: number): UiRect => ({ x: rect.x + positive(values.left) * scale, y: rect.y + positive(values.top) * scale, width: Math.max(0, rect.width - (positive(values.left) + positive(values.right)) * scale), height: Math.max(0, rect.height - (positive(values.top) + positive(values.bottom)) * scale) })
/** 结构说明（自动提取）：intersectUiRects；输入 first、second；直接调用 Math.max、Math.min。 */ export function intersectUiRects(first: UiRect, second: UiRect): UiRect { const x = Math.max(first.x, second.x), y = Math.max(first.y, second.y); return { x, y, width: Math.max(0, Math.min(first.x + first.width, second.x + second.width) - x), height: Math.max(0, Math.min(first.y + first.height, second.y + second.height) - y) } }
/** 结构说明（自动提取）：uiClipContains；输入 clip、point；直接调用 Math.min、Math.max。 */ export function uiClipContains(clip: { rect: UiRect; rounded: number }, point: { x: number; y: number }): boolean {
  const { rect } = clip, radius = Math.min(Math.max(0, clip.rounded), rect.width / 2, rect.height / 2)
  if (point.x < rect.x || point.y < rect.y || point.x > rect.x + rect.width || point.y > rect.y + rect.height) return false
  const x = Math.min(rect.x + rect.width - radius, Math.max(rect.x + radius, point.x)), y = Math.min(rect.y + rect.height - radius, Math.max(rect.y + radius, point.y))
  return (point.x - x) ** 2 + (point.y - y) ** 2 <= radius ** 2
}
/* 调用 item.clips.reduce((rect, clip) => intersectUiRects(rect, clip.rect), item.rect) 并返回调用结果。 */ export function uiItemVisibleArea(item: UiLayoutItem): UiRect { return item.clips.reduce(/* 调用 intersectUiRects(rect, clip.rect) 并返回调用结果。 */ (rect, clip) => intersectUiRects(rect, clip.rect), item.rect) }

/** Pure geometry shared by the actual renderer and responsive preflight; does not mutate scene components. */
/** 结构说明（自动提取）：resolveUiLayout；输入 width、height、entities、options；直接调用 positive、Map、entities.map、Set、children.get 等；包含循环处理。 */ export function resolveUiLayout(width: number, height: number, entities: readonly Entity[], options: UiLayoutOptions = {}): UiLayoutResult {
  const issues: UiLayoutIssue[] = [], viewport = { x: 0, y: 0, width: positive(width), height: positive(height) }
  if (entities.length > 20_000) return { items: [], issues: [{ entityUuid: '', code: 'NOVA-UI-LAYOUT-LIMIT', message: 'UI layout refuses more than 20,000 scene entities.' }] }
  const byUuid = new Map(entities.map(/* 返回按声明顺序构造的数组 [entity.uuid, entity]。 */ entity => [entity.uuid, entity])), indices = new Map(entities.map(/* 返回按声明顺序构造的数组 [entity.uuid, index]。 */ (entity, index) => [entity.uuid, index])), children = new Map<string, Entity[]>(), cache = new Map<string, UiLayoutItem | null>(), active = new Set<string>(), slots = new Map<string, Map<string, UiRect>>()
  for (const entity of entities) if (entity.parentUuid) { const siblings = children.get(entity.parentUuid) ?? []; siblings.push(entity); children.set(entity.parentUuid, siblings) }
  const report = /** 结构说明（自动提取）：report；输入 entity、code、message；直接调用 issues.push。 */ (entity: Entity, code: string, message: string) => { if (issues.length < 2000) issues.push({ entityUuid: entity.uuid, code, message }) }
  const breakpointFor = /** 结构说明（自动提取）：breakpointFor；输入 rect；直接调用 find、rect.breakpoints.slice；返回表达式求值结果。 */ (rect: RectTransform) => rect.layoutMode === 'Fixed' ? undefined : rect.breakpoints.slice(0, 256).find(/* 先计算 width >= finite(item.minWidth)；仅当其为真值时求右侧 width <= finite(item.maxWidth)，返回短路求值结果。 */ item => width >= finite(item.minWidth) && width <= finite(item.maxWidth))
  const desired = /** 结构说明（自动提取）：desired；输入 entity、rect、available、inheritedScale、locale、container；直接调用 breakpointFor、positive、entity.getComponent、options.measureText、text.text.slice 等；写入 resultWidth、resultHeight。 */ (entity: Entity, rect: RectTransform, available: UiRect, inheritedScale: number, locale: string, container = false): { width: number; height: number } => {
    const scale = rect.layoutMode === 'Fixed' ? 1 : inheritedScale, breakpoint = breakpointFor(rect), requested = breakpoint?.size ?? (container ? rect.preferredSize : rect.size)
    let resultWidth = positive(requested.x) * scale, resultHeight = positive(requested.y) * scale
    const text = entity.getComponent<Text>('Text'), measured = text?.enabled ? options.measureText?.(entity, text, scale, locale, rect.horizontalPolicy === 'Content' || rect.horizontalPolicy === 'Fill' ? available.width : resultWidth) ?? { width: [...text.text.slice(0, 32768)].length * positive(text.fontSize) * .62 * scale, height: positive(text.fontSize) * 1.3 * scale } : null
    if (rect.horizontalPolicy === 'Fill') resultWidth = available.width - (positive(rect.margins.left) + positive(rect.margins.right)) * scale
    if (rect.verticalPolicy === 'Fill') resultHeight = available.height - (positive(rect.margins.top) + positive(rect.margins.bottom)) * scale
    if (rect.horizontalPolicy === 'Content' && measured) resultWidth = measured.width
    if (rect.verticalPolicy === 'Content' && measured) resultHeight = measured.height
    resultWidth = clamp(resultWidth, rect.minSize.x * scale, rect.maxSize.x * scale); resultHeight = clamp(resultHeight, rect.minSize.y * scale, rect.maxSize.y * scale)
    if (finite(rect.aspectRatio) > 0) {
      if (rect.aspectConstraint === 'WidthControlsHeight') resultHeight = resultWidth / rect.aspectRatio
      else if (rect.aspectConstraint === 'HeightControlsWidth') resultWidth = resultHeight * rect.aspectRatio
      else if (rect.aspectConstraint === 'Fit') { const aspect = Math.min(resultWidth, resultHeight * rect.aspectRatio); resultWidth = aspect; resultHeight = aspect / rect.aspectRatio }
    }
    return { width: clamp(resultWidth, rect.minSize.x * scale, rect.maxSize.x * scale), height: clamp(resultHeight, rect.minSize.y * scale, rect.maxSize.y * scale) }
  }
  const childSlots = /** 结构说明（自动提取）：childSlots；输入 parent、panel；直接调用 slots.get、Map、slots.set、inset、positive 等；写入 w、h、used、crossPosition；返回路径包含 cached、result；包含循环处理。 */ (parent: UiLayoutItem, panel: Panel): Map<string, UiRect> => {
    const cached = slots.get(parent.entity.uuid); if (cached) return cached
    const result = new Map<string, UiRect>(); slots.set(parent.entity.uuid, result)
    const inner = inset(parent.rect, panel.padding, parent.scale), gap = positive(panel.gap) * parent.scale, layout = panel.layout === 'Horizontal' ? 'Row' : panel.layout === 'Vertical' ? 'Column' : panel.layout
    const siblings = (children.get(parent.entity.uuid) ?? []).filter(/** 结构说明（自动提取）：filter 回调；输入 entity；直接调用 entity.getComponent、breakpointFor。 */ entity => { const rect = entity.getComponent<RectTransform>('RectTransform'); return entity.enabled && rect?.enabled && (!entity.getComponent<Panel>('Panel')?.enabled || entity.getComponent<Panel>('Panel')!.visible) && breakpointFor(rect)?.visible !== false })
    const items = siblings.map(/** 结构说明（自动提取）：siblings.map 回调；输入 entity；直接调用 entity.getComponent、desired。 */ entity => { const rect = entity.getComponent<RectTransform>('RectTransform')!; return { entity, rect, size: desired(entity, rect, inner, parent.scale, parent.locale, true) } })
    const put = /** 结构说明（自动提取）：put；输入 item、box；直接调用 inset、result.set。 */ (item: typeof items[number], box: UiRect) => { const value = inset(box, item.rect.margins, parent.scale); result.set(item.entity.uuid, parent.direction === 'rtl' && item.rect.mirrorInRtl ? { ...value, x: inner.x + inner.width - (value.x - inner.x) - value.width } : value) }
    if (layout === 'Overlay' || layout === 'Margin') for (const item of items) put(item, inner)
    else if (layout === 'Center' || layout === 'Aspect') for (const item of items) { let { width: w, height: h } = item.size; if (layout === 'Aspect') { const ratio = finite(item.rect.aspectRatio) > 0 ? item.rect.aspectRatio : w / Math.max(1e-9, h); w = Math.min(inner.width, inner.height * ratio); h = w / Math.max(1e-9, ratio) }; put(item, { x: inner.x + (inner.width - w) / 2, y: inner.y + (inner.height - h) / 2, width: w, height: h }) }
    else if (layout === 'Grid' || layout === 'Split') {
      const columns = layout === 'Split' ? Math.max(1, items.length) : Math.max(1, Math.min(Math.max(1, items.length), Math.floor(finite(panel.columns, 1)))), rows = Math.max(1, Math.ceil(items.length / columns)), cellWidth = Math.max(0, (inner.width - gap * (columns - 1)) / columns), cellHeight = Math.max(0, (inner.height - gap * (rows - 1)) / rows)
      items.forEach(/** 结构说明（自动提取）：items.forEach 回调；输入 item、index；直接调用 put、Math.floor；返回表达式求值结果。 */ (item, index) => put(item, { x: inner.x + index % columns * (cellWidth + gap), y: inner.y + Math.floor(index / columns) * (cellHeight + gap), width: cellWidth, height: cellHeight }))
    } else {
      const vertical = layout === 'Column', wrap = layout === 'Flow' || panel.wrap, main = vertical ? 'height' : 'width', cross = vertical ? 'width' : 'height', mainPolicy = vertical ? 'verticalPolicy' : 'horizontalPolicy'
      const lines: Array<typeof items> = [[]]; let used = 0
      for (const item of items) { const size = item.rect[mainPolicy] === 'Fill' ? 0 : item.size[main]; if (wrap && lines.at(-1)!.length && used + gap + size > inner[main]) { lines.push([]); used = 0 }; const line = lines.at(-1)!; used += (line.length ? gap : 0) + size; line.push(item) }
      let crossPosition = 0
      for (const line of lines) {
        if (!line.length) continue
        const fillers = line.filter(/* 比较 item.rect[mainPolicy] 与 'Fill'，返回严格相等的判断结果。 */ item => item.rect[mainPolicy] === 'Fill'), occupied = line.reduce(/* 计算表达式 sum + (item.rect[mainPolicy] === 'Fill' ? 0 : item.size[main]) 并返回结果，沿用操作数的原有类型规则。 */ (sum, item) => sum + (item.rect[mainPolicy] === 'Fill' ? 0 : item.size[main]), 0) + gap * (line.length - 1), fill = Math.max(0, inner[main] - occupied) / Math.max(1, fillers.length)
        const sizes = line.map(/** 结构说明（自动提取）：line.map 回调；输入 item；直接调用 clamp；返回表达式求值结果。 */ item => item.rect[mainPolicy] === 'Fill' ? clamp(fill, (vertical ? item.rect.minSize.y : item.rect.minSize.x) * parent.scale, (vertical ? item.rect.maxSize.y : item.rect.maxSize.x) * parent.scale) : item.size[main])
        const free = Math.max(0, inner[main] - sizes.reduce(/* 计算表达式 sum + value 并返回结果，沿用操作数的原有类型规则。 */ (sum, value) => sum + value, 0) - gap * (line.length - 1)), spacing = gap + (panel.justify === 'SpaceBetween' && line.length > 1 ? free / (line.length - 1) : 0)
        let position = panel.justify === 'Center' ? free / 2 : panel.justify === 'End' ? free : 0
        const crossSize = wrap ? Math.max(0, ...line.map(/* 返回 item.size[cross] 的当前值。 */ item => item.size[cross])) : inner[cross]
        line.forEach(/** 结构说明（自动提取）：line.forEach 回调；输入 item、index；直接调用 put；写入 position。 */ (item, index) => { const extent = panel.align === 'Stretch' || item.rect[vertical ? 'horizontalPolicy' : 'verticalPolicy'] === 'Fill' ? crossSize : item.size[cross], offset = panel.align === 'Center' ? (crossSize - extent) / 2 : panel.align === 'End' ? crossSize - extent : 0; put(item, vertical ? { x: inner.x + crossPosition + offset, y: inner.y + position, width: extent, height: sizes[index] } : { x: inner.x + position, y: inner.y + crossPosition + offset, width: sizes[index], height: extent }); position += sizes[index] + spacing })
        crossPosition += crossSize + gap
      }
    }
    return result
  }
  const resolve = /** 结构说明（自动提取）：resolve；输入 entity、depth；直接调用 cache.has、cache.get、active.has、report、cache.set 等；写入 bounds、bounds.x、bounds.y；返回路径包含 item。 */ (entity: Entity, depth = 0): UiLayoutItem | null => {
    if (cache.has(entity.uuid)) return cache.get(entity.uuid) ?? null
    if (active.has(entity.uuid) || depth > 64) { report(entity, 'NOVA-UI-HIERARCHY', 'Cyclic or deeper-than-64 UI ancestry is not rendered.'); cache.set(entity.uuid, null); return null }
    active.add(entity.uuid)
    const rect = entity.getComponent<RectTransform>('RectTransform'), parentEntity = entity.parentUuid ? byUuid.get(entity.parentUuid) : undefined, parent = parentEntity ? resolve(parentEntity, depth + 1) : null
    if (parentEntity && !parent) { active.delete(entity.uuid); cache.set(entity.uuid, null); return null }
    const parentRect = parent?.rect ?? viewport, ownCanvas = entity.getComponent<Canvas>('Canvas'), canvas = ownCanvas?.enabled ? ownCanvas : parent?.canvas ?? null
    const scale = ownCanvas?.enabled ? (ownCanvas.scaleWithScreen ? Math.min(viewport.width / Math.max(1, finite(ownCanvas.referenceSize.x, 1920)), viewport.height / Math.max(1, finite(ownCanvas.referenceSize.y, 1080))) : 1) * Math.min(8, Math.max(.1, finite(options.dpiScale ?? ownCanvas.dpiScale, 1))) : parent?.scale ?? 1
    const locale = ownCanvas?.localePreview || parent?.locale || options.locale || '', direction = options.direction === 'rtl' ? 'rtl' : locale && options.localeDirection ? options.localeDirection(locale) : parent?.direction ?? options.direction ?? 'ltr', panel = entity.getComponent<Panel>('Panel'), breakpoint = rect ? breakpointFor(rect) : undefined
    const visible = entity.enabled && (rect?.enabled ?? true) && (!panel?.enabled || panel.visible) && breakpoint?.visible !== false && (parent?.visible ?? true), pixelScale = rect?.layoutMode === 'Fixed' ? 1 : scale
    let bounds = { ...parentRect }
    if (ownCanvas?.enabled) { const authored = ownCanvas.safeArea ? ownCanvas.safeAreaInsets : { left: 0, top: 0, right: 0, bottom: 0 }, safe = options.safeArea && ownCanvas.safeArea ? { left: Math.max(authored.left * scale, options.safeArea.left), top: Math.max(authored.top * scale, options.safeArea.top), right: Math.max(authored.right * scale, options.safeArea.right), bottom: Math.max(authored.bottom * scale, options.safeArea.bottom) } : { left: authored.left * scale, top: authored.top * scale, right: authored.right * scale, bottom: authored.bottom * scale }; bounds = inset(parentRect, safe, 1) }
    else if (rect) {
      if (rect.breakpoints.length > 256) report(entity, 'NOVA-UI-BREAKPOINT-LIMIT', 'Only the first 256 breakpoint rules are evaluated.')
      const position = breakpoint?.position ?? rect.position, size = desired(entity, rect, parentRect, scale, locale), custom = rect.anchorMin.x !== .5 || rect.anchorMin.y !== .5 || rect.anchorMax.x !== .5 || rect.anchorMax.y !== .5
      const presetX = rect.anchorPreset.includes('left') ? 0 : rect.anchorPreset.includes('right') ? 1 : .5, presetY = rect.anchorPreset.includes('top') ? 0 : rect.anchorPreset.includes('bottom') ? 1 : .5
      const min = custom ? rect.anchorMin : rect.anchorPreset === 'stretch' ? { x: 0, y: 0 } : { x: presetX, y: presetY }, max = custom ? rect.anchorMax : rect.anchorPreset === 'stretch' ? { x: 1, y: 1 } : min
      const axis = /** 结构说明（自动提取）：axis；输入 span、start、end、wanted、offset、pivot、leading、trailing、before、after、minimum、maximum；直接调用 Math.abs、clamp、finite。 */ (span: number, start: number, end: number, wanted: number, offset: number, pivot: number, leading: number, trailing: number, before: number, after: number, minimum: number, maximum: number) => { const stretch = Math.abs(end - start) > 1e-9, length = clamp(stretch ? span * (finite(end) - finite(start)) - (leading + trailing + before + after) * pixelScale : wanted, minimum * pixelScale, maximum * pixelScale); return { position: span * finite(start) + finite(offset) * pixelScale + (stretch ? (leading + before) * pixelScale : (leading - trailing) * pixelScale - length * finite(pivot, .5)), length } }
      const x = axis(parentRect.width, min.x, max.x, size.width, position.x, rect.pivot.x, rect.offsets.left, rect.offsets.right, rect.margins.left, rect.margins.right, rect.minSize.x, rect.maxSize.x), y = axis(parentRect.height, min.y, max.y, size.height, position.y, rect.pivot.y, rect.offsets.top, rect.offsets.bottom, rect.margins.top, rect.margins.bottom, rect.minSize.y, rect.maxSize.y)
      bounds = { x: parentRect.x + x.position, y: parentRect.y + y.position, width: x.length, height: y.length }
      const parentPanel = parentEntity?.getComponent<Panel>('Panel')
      if (parent && parentPanel?.enabled && parentPanel.layout !== 'None') bounds = childSlots(parent, parentPanel).get(entity.uuid) ?? bounds
      else if (direction === 'rtl' && rect.mirrorInRtl) bounds.x = parentRect.x + parentRect.width - (bounds.x - parentRect.x) - bounds.width
      if (parentPanel?.enabled) { if (parentPanel.scrollHorizontal) bounds.x -= finite(parentPanel.scrollOffset.x) * scale; if (parentPanel.scrollVertical) bounds.y -= finite(parentPanel.scrollOffset.y) * scale }
    }
    const clips = [...(parent?.clips ?? [{ rect: viewport, rounded: 0 }])], parentPanel = parentEntity?.getComponent<Panel>('Panel')
    if (parent && parentPanel?.enabled && (parentPanel.clipChildren || parentPanel.maskChildren || parentPanel.scrollHorizontal || parentPanel.scrollVertical)) clips.push({ rect: parent.rect, rounded: parentPanel.maskChildren ? positive(parentPanel.cornerRadius) * parent.scale : 0 })
    const order = finite(canvas?.sortingOrder ?? 0) * 1_000_000 + finite(entity.layer) * 1000 + finite(rect?.zOrder ?? 0) * 10 + (indices.get(entity.uuid) ?? 0)
    const item = { entity, rect: bounds, scale: pixelScale, order, visible, clips, canvas, locale, direction }
    active.delete(entity.uuid); cache.set(entity.uuid, item); return item
  }
  for (const entity of entities) resolve(entity)
  return { items: [...cache.values()].filter(/* 调用 Boolean(item?.entity.hasComponent('RectTransform')) 并返回调用结果。 */ (item): item is UiLayoutItem => Boolean(item?.entity.hasComponent('RectTransform'))).sort(/** 结构说明（自动提取）：sort 回调；输入 a、b；直接调用 finite、a.entity.getComponent、b.entity.getComponent、indices.get；返回表达式求值结果。 */ (a, b) => finite(a.canvas?.sortingOrder ?? 0) - finite(b.canvas?.sortingOrder ?? 0) || finite(a.entity.layer) - finite(b.entity.layer) || finite(a.entity.getComponent<RectTransform>('RectTransform')?.zOrder ?? 0) - finite(b.entity.getComponent<RectTransform>('RectTransform')?.zOrder ?? 0) || (indices.get(a.entity.uuid) ?? 0) - (indices.get(b.entity.uuid) ?? 0)), issues }
}
