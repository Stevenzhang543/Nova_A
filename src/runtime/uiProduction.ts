import type { Entity } from '../world/Entity'
import type { Canvas, Panel, RectTransform, Text, TextInput } from '../world/components'
import { activeTextDirection, localizationSettings, type TextDirection } from './localization'
import { resolveUiLayout, type UiLayoutOptions } from './uiLayout'
import { layoutUiText } from './uiTextLayout'
import { measureUiText, uiTextPresentation } from './uiTextPresentation'
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

let textContext: CanvasRenderingContext2D | null | undefined
function validationTextContext(): CanvasRenderingContext2D | null { if (textContext === undefined) textContext = typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d'); return textContext }

export function validateUiForPreset(entities: Entity[], preset: UiDevicePreset, direction: TextDirection = 'ltr', minimumTargetSize = 44, layoutOptions: UiLayoutOptions = {}): UiMatrixResult {
  const context = validationTextContext(), layout = resolveUiLayout(preset.width, preset.height, entities, { locale: localizationSettings.previewLocale, direction, safeArea: preset.safeArea, localeDirection: activeTextDirection, measureText: (_entity, text, scale, locale, width) => measureUiText(text, scale, locale, width, context), ...layoutOptions }), actualItems = new Map(layout.items.map(item => [item.entity.uuid, item]))
  const rects = layout.items.map(item => ({ entityUuid: item.entity.uuid, ...item.rect, visible: item.visible })), resolved = new Map(rects.map(rect => [rect.entityUuid, rect])), byUuid = new Map(entities.map(entity => [entity.uuid, entity])), issues: UiValidationIssue[] = layout.issues.map(finding => { const entity = byUuid.get(finding.entityUuid); return { ...finding, entityName: entity?.name ?? '', source: `scene/entity/${finding.entityUuid}/RectTransform`, severity: 'error', preset: preset.id } })
  for (const entity of entities) {
    const rect = entity.getComponent<RectTransform>('RectTransform'); if (!rect) continue
    const actual = resolved.get(entity.uuid); if (!actual?.visible) continue
    if (rect.layoutMode === 'Fixed' && rect.breakpoints.length) issues.push(issue(entity, 'NOVA-UI-FIXED-LAYOUT', 'warning', 'RectTransform.breakpoints', 'Fixed layout ignores responsive breakpoints; use Responsive to apply them.', preset.id))
    if (rect.minSize.x > rect.maxSize.x || rect.minSize.y > rect.maxSize.y) issues.push(issue(entity, 'NOVA-UI-MINMAX', 'error', 'RectTransform.minSize', 'Minimum size exceeds maximum size.', preset.id))
    const ranges = [...rect.breakpoints].sort((a, b) => a.minWidth - b.minWidth)
    ranges.forEach((range, index) => {
      if (!Number.isFinite(range.minWidth) || !Number.isFinite(range.maxWidth) || range.maxWidth < range.minWidth) issues.push(issue(entity, 'NOVA-UI-BREAKPOINT-RANGE', 'error', `RectTransform.breakpoints[${index}]`, 'Breakpoint range is invalid.', preset.id))
      if (index && range.minWidth <= ranges[index - 1].maxWidth) issues.push(issue(entity, 'NOVA-UI-BREAKPOINT-OVERLAP', 'warning', `RectTransform.breakpoints[${index}]`, 'Breakpoint overlaps an earlier rule; the first match wins.', preset.id))
    })
    const parent = entity.parentUuid ? byUuid.get(entity.parentUuid) : null, parentRect = parent ? resolved.get(parent.uuid) : null, parentPanel = parent?.getComponent<Panel>('Panel')
    if (parentRect && (actual.x < parentRect.x - .5 || actual.y < parentRect.y - .5 || actual.x + actual.width > parentRect.x + parentRect.width + .5 || actual.y + actual.height > parentRect.y + parentRect.height + .5)) issues.push(issue(entity, 'NOVA-UI-OVERFLOW', parentPanel?.clipChildren ? 'error' : 'warning', 'RectTransform.position', parentPanel?.clipChildren ? 'Control overflows a clipping container.' : 'Control extends outside its parent.', preset.id))
    const text = entity.getComponent<Text>('Text')
    if (text?.enabled) {
      const item = actualItems.get(entity.uuid)!, style = uiTextPresentation(text, item.scale, item.locale)
      context?.save(); if (context) context.font = style.font
      const measured = layoutUiText(style.value, { width: actual.width, height: actual.height, lineHeight: style.lineHeight, wrap: text.wrap, overflow: text.overflow, measure: value => context?.measureText(value).width ?? [...value].length * style.size * .62 })
      context?.restore()
      if (measured.clipped && text.overflow !== 'Visible') issues.push(issue(entity, 'NOVA-UI-CLIPPED-TEXT', 'warning', 'Text.overflow', `Text ${text.overflow === 'Ellipsis' ? 'uses ellipsis' : 'clips'} at this viewport and locale${context ? '' : ' (estimated font metrics)'}.`, preset.id))
      if (measured.limited) issues.push(issue(entity, 'NOVA-UI-TEXT-LIMIT', 'error', 'Text.text', 'Text exceeds the 32,768 UTF-16 unit rendering limit.', preset.id))
    }
    const textInput = entity.getComponent<TextInput>('TextInput')
    if (textInput && textInput.value.length > 32_768) issues.push(issue(entity, 'NOVA-UI-TEXT-LIMIT', 'warning', 'TextInput.value', 'The native input retains up to 100,000 UTF-16 units; canvas paragraph and password-glyph processing is bounded to 32,768 units.', preset.id))
    if (Object.values(rect.margins).some(value => value < 0) || entity.getComponent<Panel>('Panel') && Object.values(entity.getComponent<Panel>('Panel')!.padding).some(value => value < 0)) issues.push(issue(entity, 'NOVA-UI-NEGATIVE-INSET', 'warning', 'RectTransform.margins', 'Container padding and margin insets are clamped to zero when negative; use signed position or anchor offsets for overlap.', preset.id))
    if (rect.componentSource) issues.push(issue(entity, 'NOVA-UI-COMPONENT-BINDING', 'warning', 'RectTransform.componentSource', 'Reusable component metadata does not instantiate content at runtime; the serialized scene children are rendered. Use a prefab instance for linked content.', preset.id))
    if (['Button', 'Slider', 'Checkbox', 'TextInput'].some(kind => entity.hasComponent(kind as 'Button')) && (actual.width < minimumTargetSize || actual.height < minimumTargetSize)) issues.push(issue(entity, 'NOVA-A11Y-TARGET', 'warning', 'RectTransform.size', `Rendered interactive target is smaller than ${minimumTargetSize} × ${minimumTargetSize} logical pixels.`, preset.id))
    if (rect.componentSource && !byUuid.has(rect.componentSource) && !rect.componentSource.startsWith('asset://')) issues.push(issue(entity, 'NOVA-UI-MISSING-COMPONENT', 'error', 'RectTransform.componentSource', 'Reusable UI component source cannot be resolved.', preset.id))
    const canvas = entity.getComponent<Canvas>('Canvas')
    if (canvas?.safeArea && preset.safeArea.top + preset.safeArea.bottom > 0 && actual.y < preset.safeArea.top) issues.push(issue(entity, 'NOVA-UI-SAFE-AREA', 'warning', 'Canvas.safeArea', 'Canvas content reaches outside the device safe area.', preset.id))
  }
  for (const accessibility of auditUiAccessibility(entities, minimumTargetSize).filter(finding => finding.code !== 'NOVA-A11Y-TARGET' && resolved.get(finding.entityUuid)?.visible)) issues.push({ ...accessibility, preset: preset.id })
  for (const canvasEntity of entities.filter(entity => entity.hasComponent('Canvas'))) {
    const themeRef = canvasEntity.getComponent<Canvas>('Canvas')?.themeAsset
    if (!themeRef) continue
    const chain = themeInheritanceChain(themeRef)
    if (chain.cycle) issues.push(issue(canvasEntity, 'NOVA-UI-THEME-CYCLE', 'error', 'Canvas.themeAsset', `Theme inheritance cycle: ${chain.references.join(' → ')}`, preset.id))
    if (chain.missing.length) issues.push(issue(canvasEntity, 'NOVA-UI-THEME-MISSING', 'error', 'Canvas.themeAsset', `Theme cannot resolve: ${chain.missing.join(', ')}`, preset.id))
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
