import type { Entity } from '../world/Entity'
import type { Button, Checkbox, Panel, RectTransform, Slider, Text, TextInput } from '../world/components'

export type AccessibilityIssueSeverity = 'error' | 'warning' | 'info'
export interface AccessibilityIssue { code: string; severity: AccessibilityIssueSeverity; entityUuid: string; entityName: string; source: string; message: string }

function interactive(entity: Entity): boolean { return entity.hasComponent('Button') || entity.hasComponent('Slider') || entity.hasComponent('Checkbox') || entity.hasComponent('TextInput') }
function labelFor(entity: Entity, rect: RectTransform): string { return rect.accessibilityLabel || entity.getComponent<Text>('Text')?.text || entity.getComponent<Checkbox>('Checkbox')?.label || '' }
function linear(channel: number): number { const value = Math.min(1, Math.max(0, channel / 255)); return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4 }
function luminance(color: { r: number; g: number; b: number }): number { return .2126 * linear(color.r) + .7152 * linear(color.g) + .0722 * linear(color.b) }
export function contrastRatio(foreground: { r: number; g: number; b: number }, background: { r: number; g: number; b: number }): number { const first = luminance(foreground), second = luminance(background); return (Math.max(first, second) + .05) / (Math.min(first, second) + .05) }

/** Returns stable, source-linked findings suitable for editor and release audits. */
export function auditUiAccessibility(entities: Entity[], minimumTargetSize = 44): AccessibilityIssue[] {
  const issues: AccessibilityIssue[] = [], byUuid = new Map(entities.map(entity => [entity.uuid, entity])), focusOrders = new Map<number, Entity>()
  const add = (entity: Entity, code: string, severity: AccessibilityIssueSeverity, property: string, message: string) => issues.push({ code, severity, entityUuid: entity.uuid, entityName: entity.name, source: `scene/entity/${entity.uuid}/${property}`, message })
  for (const entity of entities) {
    const rect = entity.getComponent<RectTransform>('RectTransform'); if (!rect || rect.accessibilityHidden) continue
    const isInteractive = interactive(entity)
    if (isInteractive && !rect.focusable && !rect.skipNavigation) add(entity, 'NOVA-A11Y-UNREACHABLE', 'error', 'RectTransform.focusable', 'Interactive control is not keyboard or gamepad reachable.')
    if (rect.focusable && !rect.skipNavigation && !labelFor(entity, rect).trim()) add(entity, 'NOVA-A11Y-LABEL', 'error', 'RectTransform.accessibilityLabel', 'Focusable control has no accessible name.')
    if (rect.focusable && !rect.skipNavigation) {
      if (rect.readingOrder < 0 || !Number.isFinite(rect.readingOrder)) add(entity, 'NOVA-A11Y-ORDER', 'error', 'RectTransform.readingOrder', 'Reading order must be a non-negative finite number.')
      const previous = focusOrders.get(rect.readingOrder); if (previous) { add(entity, 'NOVA-A11Y-ORDER-DUPLICATE', 'warning', 'RectTransform.readingOrder', `Reading order duplicates ${previous.name}.`); add(previous, 'NOVA-A11Y-ORDER-DUPLICATE', 'warning', 'RectTransform.readingOrder', `Reading order duplicates ${entity.name}.`) } else focusOrders.set(rect.readingOrder, entity)
    }
    if (isInteractive && (rect.size.x < minimumTargetSize || rect.size.y < minimumTargetSize)) add(entity, 'NOVA-A11Y-TARGET', 'warning', 'RectTransform.size', `Interactive target is smaller than ${minimumTargetSize} × ${minimumTargetSize}.`)
    for (const [direction, target] of [['focusUp', rect.focusUp], ['focusDown', rect.focusDown], ['focusLeft', rect.focusLeft], ['focusRight', rect.focusRight]] as const) if (target && !byUuid.has(target)) add(entity, 'NOVA-A11Y-FOCUS-TARGET', 'error', `RectTransform.${direction}`, `Focus target ${target} does not exist.`)
    const text = entity.getComponent<Text>('Text'); if (text) { const parent = entity.parentUuid ? byUuid.get(entity.parentUuid) : null, panel = parent?.getComponent<Panel>('Panel'), ratio = panel ? contrastRatio(text.color, panel.color) : 7; if (ratio < (text.fontSize >= 24 || text.fontSize >= 18 && text.fontWeight >= 700 ? 3 : 4.5)) add(entity, 'NOVA-A11Y-CONTRAST', 'warning', 'Text.color', `Text contrast is ${ratio.toFixed(2)}:1.`) }
    const slider = entity.getComponent<Slider>('Slider'), checkbox = entity.getComponent<Checkbox>('Checkbox'), button = entity.getComponent<Button>('Button'), input = entity.getComponent<TextInput>('TextInput')
    if ((slider || checkbox || input) && !rect.accessibilityValue) add(entity, 'NOVA-A11Y-VALUE', 'info', 'RectTransform.accessibilityValue', 'Value metadata will be inferred at runtime; add explicit text when the inferred value is insufficient.')
    if ((button?.interactable === false || slider?.interactable === false || checkbox?.interactable === false || input?.interactable === false) && !rect.accessibilityState) add(entity, 'NOVA-A11Y-STATE', 'info', 'RectTransform.accessibilityState', 'Disabled state is inferred; add state metadata if more context is required.')
  }
  return issues.sort((a, b) => a.source.localeCompare(b.source) || a.code.localeCompare(b.code))
}

export function focusOrder(entities: Entity[]): Array<{ entityUuid: string; entityName: string; order: number }> {
  return entities.flatMap(entity => { const rect = entity.getComponent<RectTransform>('RectTransform'); return rect?.focusable && !rect.accessibilityHidden && !rect.skipNavigation ? [{ entityUuid: entity.uuid, entityName: entity.name, order: rect.readingOrder }] : [] }).sort((a, b) => a.order - b.order || a.entityName.localeCompare(b.entityName))
}
