import type { Entity } from '../world/Entity'
import type { Canvas, Panel, RectTransform, Text } from '../world/components'
import type { TextDirection } from './localization'
import { auditUiAccessibility, type AccessibilityIssueSeverity } from './uiAccessibility'
import { readUiTheme, themeInheritanceChain, themeUnusedTokens } from './uiTheme'

export interface UiDevicePreset {
  id: string
  label: string
  width: number
  height: number
  dpi: number
  safeArea: { left: number; top: number; right: number; bottom: number }
}

export type UiValidationCode =
  | 'NOVA-UI-FIXED-LAYOUT' | 'NOVA-UI-BREAKPOINT-RANGE' | 'NOVA-UI-BREAKPOINT-OVERLAP'
  | 'NOVA-UI-MINMAX' | 'NOVA-UI-OVERFLOW' | 'NOVA-UI-CLIPPED-TEXT' | 'NOVA-UI-SAFE-AREA'
  | 'NOVA-UI-MISSING-COMPONENT' | 'NOVA-UI-THEME-CYCLE' | 'NOVA-UI-UNUSED-TOKEN'

export interface UiValidationIssue {
  code: UiValidationCode | string
  severity: AccessibilityIssueSeverity
  entityUuid: string
  entityName: string
  source: string
  message: string
  preset: string
}

export interface UiResolvedRect { entityUuid: string; x: number; y: number; width: number; height: number; visible: boolean }
export interface UiMatrixResult { preset: UiDevicePreset; direction: TextDirection; rects: UiResolvedRect[]; issues: UiValidationIssue[] }

export const UI_DEVICE_PRESETS: readonly UiDevicePreset[] = Object.freeze([
  { id: 'desktop-hd', label: 'Desktop 16:9', width: 1920, height: 1080, dpi: 1, safeArea: { left: 0, top: 0, right: 0, bottom: 0 } },
  { id: 'laptop', label: 'Laptop 16:10', width: 1440, height: 900, dpi: 1.25, safeArea: { left: 0, top: 0, right: 0, bottom: 0 } },
  { id: 'ultrawide', label: 'Ultrawide 21:9', width: 2560, height: 1080, dpi: 1, safeArea: { left: 0, top: 0, right: 0, bottom: 0 } },
  { id: 'classic', label: 'Desktop 4:3', width: 1024, height: 768, dpi: 1, safeArea: { left: 0, top: 0, right: 0, bottom: 0 } },
  { id: 'mobile-portrait', label: 'Mobile portrait', width: 390, height: 844, dpi: 3, safeArea: { left: 0, top: 47, right: 0, bottom: 34 } },
  { id: 'mobile-landscape', label: 'Mobile landscape', width: 844, height: 390, dpi: 3, safeArea: { left: 47, top: 0, right: 47, bottom: 21 } }
])

function issue(entity: Entity, code: UiValidationCode | string, severity: AccessibilityIssueSeverity, property: string, message: string, preset: string): UiValidationIssue {
  return { code, severity, entityUuid: entity.uuid, entityName: entity.name, source: `scene/entity/${entity.uuid}/${property}`, message, preset }
}
function finite(value: number, fallback = 0): number { return Number.isFinite(value) ? value : fallback }

function layoutForPreset(entities: Entity[], preset: UiDevicePreset, direction: TextDirection): UiResolvedRect[] {
  const byUuid = new Map(entities.map(entity => [entity.uuid, entity])), cache = new Map<string, UiResolvedRect>(), active = new Set<string>()
  const resolve = (entity: Entity): UiResolvedRect | null => {
    const cached = cache.get(entity.uuid); if (cached) return cached
    const rect = entity.getComponent<RectTransform>('RectTransform'); if (!rect?.enabled || active.has(entity.uuid)) return null
    active.add(entity.uuid)
    const parent = entity.parentUuid ? byUuid.get(entity.parentUuid) : null, parentRect = parent ? resolve(parent) : null
    const canvas = entity.getComponent<Canvas>('Canvas'), scale = canvas?.scaleWithScreen ? Math.min(preset.width / Math.max(1, canvas.referenceSize.x), preset.height / Math.max(1, canvas.referenceSize.y)) : 1
    const parentBox = parentRect ?? { entityUuid: '', x: 0, y: 0, width: preset.width / scale, height: preset.height / scale, visible: true }
    const breakpoint = rect.breakpoints.find(item => preset.width >= finite(item.minWidth) && preset.width <= finite(item.maxWidth))
    const visible = breakpoint?.visible !== false && parentBox.visible
    const size = breakpoint?.size ?? rect.size, position = breakpoint?.position ?? rect.position
    const stretchX = Math.abs(rect.anchorMax.x - rect.anchorMin.x) > 1e-9, stretchY = Math.abs(rect.anchorMax.y - rect.anchorMin.y) > 1e-9
    const width = stretchX ? parentBox.width * (rect.anchorMax.x - rect.anchorMin.x) - rect.offsets.left - rect.offsets.right : size.x
    const height = stretchY ? parentBox.height * (rect.anchorMax.y - rect.anchorMin.y) - rect.offsets.top - rect.offsets.bottom : size.y
    const anchorX = direction === 'rtl' && rect.mirrorInRtl ? 1 - rect.anchorMin.x : rect.anchorMin.x
    const x = parentBox.x + parentBox.width * anchorX + (direction === 'rtl' && rect.mirrorInRtl ? -position.x : position.x) - width * rect.pivot.x
    const y = parentBox.y + parentBox.height * rect.anchorMin.y + position.y - height * rect.pivot.y
    const resolved = { entityUuid: entity.uuid, x, y, width: Math.max(0, width), height: Math.max(0, height), visible }
    cache.set(entity.uuid, resolved); active.delete(entity.uuid); return resolved
  }
  return entities.flatMap(entity => entity.hasComponent('RectTransform') ? [resolve(entity)].filter((value): value is UiResolvedRect => value !== null) : [])
}

export function validateUiForPreset(entities: Entity[], preset: UiDevicePreset, direction: TextDirection = 'ltr', minimumTargetSize = 44): UiMatrixResult {
  const rects = layoutForPreset(entities, preset, direction), resolved = new Map(rects.map(rect => [rect.entityUuid, rect])), byUuid = new Map(entities.map(entity => [entity.uuid, entity])), issues: UiValidationIssue[] = []
  for (const entity of entities) {
    const rect = entity.getComponent<RectTransform>('RectTransform'); if (!rect) continue
    const actual = resolved.get(entity.uuid); if (!actual?.visible) continue
    if (rect.layoutMode !== 'Fixed' && rect.horizontalPolicy === 'Fixed' && rect.verticalPolicy === 'Fixed' && rect.anchorMin.x === rect.anchorMax.x && rect.anchorMin.y === rect.anchorMax.y) issues.push(issue(entity, 'NOVA-UI-FIXED-LAYOUT', 'warning', 'RectTransform.layoutMode', 'Fixed coordinates require explicit Fixed layout mode.', preset.id))
    if (rect.minSize.x > rect.maxSize.x || rect.minSize.y > rect.maxSize.y) issues.push(issue(entity, 'NOVA-UI-MINMAX', 'error', 'RectTransform.minSize', 'Minimum size exceeds maximum size.', preset.id))
    const ranges = [...rect.breakpoints].sort((a, b) => a.minWidth - b.minWidth)
    ranges.forEach((range, index) => {
      if (!Number.isFinite(range.minWidth) || !Number.isFinite(range.maxWidth) || range.maxWidth < range.minWidth) issues.push(issue(entity, 'NOVA-UI-BREAKPOINT-RANGE', 'error', `RectTransform.breakpoints[${index}]`, 'Breakpoint range is invalid.', preset.id))
      if (index && range.minWidth <= ranges[index - 1].maxWidth) issues.push(issue(entity, 'NOVA-UI-BREAKPOINT-OVERLAP', 'warning', `RectTransform.breakpoints[${index}]`, 'Breakpoint overlaps an earlier rule; the first match wins.', preset.id))
    })
    const parent = entity.parentUuid ? byUuid.get(entity.parentUuid) : null, parentRect = parent ? resolved.get(parent.uuid) : null, parentPanel = parent?.getComponent<Panel>('Panel')
    if (parentRect && (actual.x < parentRect.x - .5 || actual.y < parentRect.y - .5 || actual.x + actual.width > parentRect.x + parentRect.width + .5 || actual.y + actual.height > parentRect.y + parentRect.height + .5)) issues.push(issue(entity, 'NOVA-UI-OVERFLOW', parentPanel?.clipChildren ? 'error' : 'warning', 'RectTransform.position', parentPanel?.clipChildren ? 'Control overflows a clipping container.' : 'Control extends outside its parent.', preset.id))
    const text = entity.getComponent<Text>('Text')
    if (text && text.overflow === 'Clip') {
      const estimated = [...text.text].length * text.fontSize * .56
      if (estimated > actual.width || text.fontSize * 1.3 > actual.height) issues.push(issue(entity, 'NOVA-UI-CLIPPED-TEXT', 'warning', 'Text.overflow', 'Text may clip at this resolution or language length.', preset.id))
    }
    if (rect.componentSource && !byUuid.has(rect.componentSource) && !rect.componentSource.startsWith('asset://')) issues.push(issue(entity, 'NOVA-UI-MISSING-COMPONENT', 'error', 'RectTransform.componentSource', 'Reusable UI component source cannot be resolved.', preset.id))
    const canvas = entity.getComponent<Canvas>('Canvas')
    if (canvas?.safeArea && preset.safeArea.top + preset.safeArea.bottom > 0 && actual.y < preset.safeArea.top) issues.push(issue(entity, 'NOVA-UI-SAFE-AREA', 'warning', 'Canvas.safeArea', 'Canvas content reaches outside the device safe area.', preset.id))
  }
  for (const accessibility of auditUiAccessibility(entities, minimumTargetSize)) issues.push({ ...accessibility, preset: preset.id })
  for (const canvasEntity of entities.filter(entity => entity.hasComponent('Canvas'))) {
    const themeRef = canvasEntity.getComponent<Canvas>('Canvas')?.themeAsset
    if (!themeRef) continue
    const chain = themeInheritanceChain(themeRef)
    if (chain.cycle) issues.push(issue(canvasEntity, 'NOVA-UI-THEME-CYCLE', 'error', 'Canvas.themeAsset', `Theme inheritance cycle: ${chain.references.join(' → ')}`, preset.id))
    const theme = readUiTheme(themeRef)
    if (theme) for (const token of themeUnusedTokens(theme).slice(0, 32)) issues.push(issue(canvasEntity, 'NOVA-UI-UNUSED-TOKEN', 'info', 'Canvas.themeAsset', `Theme token ${token} is unused.`, preset.id))
  }
  return { preset, direction, rects, issues: issues.sort((a, b) => a.source.localeCompare(b.source) || a.code.localeCompare(b.code)) }
}

export function validateResponsiveUi(entities: Entity[], presets: readonly UiDevicePreset[] = UI_DEVICE_PRESETS, direction: TextDirection = 'ltr', minimumTargetSize = 44): UiMatrixResult[] {
  return presets.map(preset => validateUiForPreset(entities, preset, direction, minimumTargetSize))
}

export function uiPerformanceSnapshot(entities: Entity[]): { controls: number; interactive: number; maximumDepth: number; breakpoints: number; estimatedLayoutOperations: number } {
  const byUuid = new Map(entities.map(entity => [entity.uuid, entity]))
  const depth = (entity: Entity): number => { let value = 1, current = entity; const visited = new Set<string>(); while (current.parentUuid && !visited.has(current.parentUuid)) { visited.add(current.parentUuid); const parent = byUuid.get(current.parentUuid); if (!parent) break; value++; current = parent } return value }
  const controls = entities.filter(entity => entity.hasComponent('RectTransform'))
  const interactive = controls.filter(entity => entity.hasComponent('Button') || entity.hasComponent('Slider') || entity.hasComponent('Checkbox') || entity.hasComponent('TextInput')).length
  const breakpoints = controls.reduce((sum, entity) => sum + (entity.getComponent<RectTransform>('RectTransform')?.breakpoints.length ?? 0), 0)
  const maximumDepth = controls.reduce((maximum, entity) => Math.max(maximum, depth(entity)), 0)
  return { controls: controls.length, interactive, maximumDepth, breakpoints, estimatedLayoutOperations: controls.length * Math.max(1, maximumDepth) + breakpoints }
}
