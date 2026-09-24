/** 游戏界面可访问性：检查控件描述及导航信息，并维护辅助访问所需状态。 */
import type { Entity } from '../world/Entity'
import type { Button, Checkbox, Panel, RectTransform, Slider, Text, TextInput } from '../world/components'

export type AccessibilityIssueSeverity = 'error' | 'warning' | 'info'
export interface AccessibilityIssue { code: string; severity: AccessibilityIssueSeverity; entityUuid: string; entityName: string; source: string; message: string }

/** 结构说明（自动提取）：interactive；输入 entity；直接调用 entity.hasComponent。 */ function interactive(entity: Entity): boolean { return entity.hasComponent('Button') || entity.hasComponent('Slider') || entity.hasComponent('Checkbox') || entity.hasComponent('TextInput') }
/** 结构说明（自动提取）：labelFor；输入 entity、rect；直接调用 entity.getComponent。 */ function labelFor(entity: Entity, rect: RectTransform): string { return rect.accessibilityLabel || entity.getComponent<Text>('Text')?.text || entity.getComponent<Checkbox>('Checkbox')?.label || entity.getComponent<TextInput>('TextInput')?.placeholder || entity.name }
/** 结构说明（自动提取）：roleFor；输入 entity；直接调用 entity.hasComponent。 */ function roleFor(entity: Entity): string { return entity.hasComponent('Button') ? 'button' : entity.hasComponent('Slider') ? 'slider' : entity.hasComponent('Checkbox') ? 'checkbox' : entity.hasComponent('TextInput') ? 'textbox' : '' }

/** Applies safe authoring defaults while preserving deliberate skip-navigation and semantic-group choices. */
/** 结构说明（自动提取）：configureUiAccessibility；输入 entity、entities；直接调用 entity.getComponent、interactive、roleFor、trim、labelFor 等；写入 rect.focusable、rect.accessibilityRole、rect.accessibilityLabel、rect.readingOrder 等。 */ export function configureUiAccessibility(entity: Entity, entities: Entity[] = []): void {
  const rect = entity.getComponent<RectTransform>('RectTransform'); if (!rect) return
  if (interactive(entity)) {
    if (!rect.skipNavigation) rect.focusable = true
    rect.accessibilityRole ||= roleFor(entity)
    rect.accessibilityLabel ||= labelFor(entity, rect).trim()
    if (!Number.isFinite(rect.readingOrder) || rect.readingOrder < 0) rect.readingOrder = 0
    if (rect.focusable && !rect.skipNavigation && rect.readingOrder === 0 && entities.length) {
      rect.readingOrder = entities.reduce(/** 结构说明（自动提取）：entities.reduce 回调；输入 maximum、candidate；直接调用 interactive、candidate.getComponent、Math.max；返回路径包含 maximum。 */ (maximum, candidate) => {
        if (candidate === entity || !interactive(candidate)) return maximum
        const candidateRect = candidate.getComponent<RectTransform>('RectTransform')
        return candidateRect?.focusable && !candidateRect.skipNavigation ? Math.max(maximum, candidateRect.readingOrder) : maximum
      }, 0) + 1
    }
  } else if (!rect.accessibilityRole.trim() && !rect.accessibilityLabel.trim()) {
    // Repairs legacy templates where every RectTransform inherited focusability.
    rect.focusable = false
    rect.skipNavigation = true
  }
}
/** 结构说明（自动提取）：linear；输入 channel；直接调用 Math.min、Math.max。 */ function linear(channel: number): number { const value = Math.min(1, Math.max(0, channel / 255)); return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4 }
/* 计算表达式 .2126 * linear(color.r) + .7152 * linear(color.g) + .0722 * linear(color.b) 并返回结果，沿用操作数的原有类型规则。 */ function luminance(color: { r: number; g: number; b: number }): number { return .2126 * linear(color.r) + .7152 * linear(color.g) + .0722 * linear(color.b) }
/** 结构说明（自动提取）：contrastRatio；输入 foreground、background；直接调用 luminance、Math.max、Math.min。 */ export function contrastRatio(foreground: { r: number; g: number; b: number }, background: { r: number; g: number; b: number }): number { const first = luminance(foreground), second = luminance(background); return (Math.max(first, second) + .05) / (Math.min(first, second) + .05) }

/** Returns stable, source-linked findings suitable for editor and release audits. */
/** 结构说明（自动提取）：auditUiAccessibility；输入 entities、minimumTargetSize；直接调用 Map、entities.map、entity.getComponent、interactive、add 等；包含循环处理。 */ export function auditUiAccessibility(entities: Entity[], minimumTargetSize = 44): AccessibilityIssue[] {
  const issues: AccessibilityIssue[] = [], byUuid = new Map(entities.map(/* 返回按声明顺序构造的数组 [entity.uuid, entity]。 */ entity => [entity.uuid, entity])), focusOrders = new Map<number, Entity>()
  const add = /** 结构说明（自动提取）：add；输入 entity、code、severity、property、message；直接调用 issues.push；返回表达式求值结果。 */ (entity: Entity, code: string, severity: AccessibilityIssueSeverity, property: string, message: string) => issues.push({ code, severity, entityUuid: entity.uuid, entityName: entity.name, source: `scene/entity/${entity.uuid}/${property}`, message })
  for (const entity of entities) {
    const rect = entity.getComponent<RectTransform>('RectTransform'); if (!rect || rect.accessibilityHidden) continue
    const isInteractive = interactive(entity)
    if (isInteractive && !rect.focusable && !rect.skipNavigation) add(entity, 'NOVA-A11Y-UNREACHABLE', 'error', 'RectTransform.focusable', 'Interactive control is not keyboard or gamepad reachable.')
    const semanticFocusNode = rect.focusable && !rect.skipNavigation && (isInteractive || !!rect.accessibilityRole.trim() || !!rect.accessibilityLabel.trim())
    if (semanticFocusNode && !labelFor(entity, rect).trim()) add(entity, 'NOVA-A11Y-LABEL', 'error', 'RectTransform.accessibilityLabel', 'Focusable control has no accessible name.')
    if (semanticFocusNode) {
      if (rect.readingOrder < 0 || !Number.isFinite(rect.readingOrder)) add(entity, 'NOVA-A11Y-ORDER', 'error', 'RectTransform.readingOrder', 'Reading order must be a non-negative finite number.')
      // Zero is automatic scene order; only explicit positive orders can conflict.
      if (rect.readingOrder > 0) { const previous = focusOrders.get(rect.readingOrder); if (previous) { add(entity, 'NOVA-A11Y-ORDER-DUPLICATE', 'warning', 'RectTransform.readingOrder', `Reading order duplicates ${previous.name}.`); add(previous, 'NOVA-A11Y-ORDER-DUPLICATE', 'warning', 'RectTransform.readingOrder', `Reading order duplicates ${entity.name}.`) } else focusOrders.set(rect.readingOrder, entity) }
    }
    if (isInteractive && (rect.size.x < minimumTargetSize || rect.size.y < minimumTargetSize)) add(entity, 'NOVA-A11Y-TARGET', 'warning', 'RectTransform.size', `Interactive target is smaller than ${minimumTargetSize} × ${minimumTargetSize}.`)
    for (const [direction, target] of [['focusUp', rect.focusUp], ['focusDown', rect.focusDown], ['focusLeft', rect.focusLeft], ['focusRight', rect.focusRight]] as const) if (target && !byUuid.has(target)) add(entity, 'NOVA-A11Y-FOCUS-TARGET', 'error', `RectTransform.${direction}`, `Focus target ${target} does not exist.`)
    const text = entity.getComponent<Text>('Text'); if (text) { const parent = entity.parentUuid ? byUuid.get(entity.parentUuid) : null, panel = parent?.getComponent<Panel>('Panel'), ratio = panel ? contrastRatio(text.color, panel.color) : 7; if (ratio < (text.fontSize >= 24 || text.fontSize >= 18 && text.fontWeight >= 700 ? 3 : 4.5)) add(entity, 'NOVA-A11Y-CONTRAST', 'warning', 'Text.color', `Text contrast is ${ratio.toFixed(2)}:1.`) }
    const slider = entity.getComponent<Slider>('Slider'), checkbox = entity.getComponent<Checkbox>('Checkbox'), button = entity.getComponent<Button>('Button'), input = entity.getComponent<TextInput>('TextInput')
    if ((slider || checkbox || input) && !rect.accessibilityValue) add(entity, 'NOVA-A11Y-VALUE', 'info', 'RectTransform.accessibilityValue', 'Value metadata will be inferred at runtime; add explicit text when the inferred value is insufficient.')
    if ((button?.interactable === false || slider?.interactable === false || checkbox?.interactable === false || input?.interactable === false) && !rect.accessibilityState) add(entity, 'NOVA-A11Y-STATE', 'info', 'RectTransform.accessibilityState', 'Disabled state is inferred; add state metadata if more context is required.')
  }
  return issues.sort(/* 先计算 a.source.localeCompare(b.source)；仅当其为假值时求右侧 a.code.localeCompare(b.code)，返回短路求值结果。 */ (a, b) => a.source.localeCompare(b.source) || a.code.localeCompare(b.code))
}

/** 结构说明（自动提取）：focusOrder；输入 entities；直接调用 sort、entities.flatMap。 */ export function focusOrder(entities: Entity[]): Array<{ entityUuid: string; entityName: string; order: number }> {
  return entities.flatMap(/** 结构说明（自动提取）：entities.flatMap 回调；输入 entity；直接调用 entity.getComponent、interactive、rect.accessibilityRole.trim、rect.accessibilityLabel.trim。 */ entity => { const rect = entity.getComponent<RectTransform>('RectTransform'); return rect?.focusable && !rect.accessibilityHidden && !rect.skipNavigation && (interactive(entity) || !!rect.accessibilityRole.trim() || !!rect.accessibilityLabel.trim()) ? [{ entityUuid: entity.uuid, entityName: entity.name, order: rect.readingOrder }] : [] }).sort(/* 先计算 a.order - b.order；仅当其为假值时求右侧 a.entityName.localeCompare(b.entityName)，返回短路求值结果。 */ (a, b) => a.order - b.order || a.entityName.localeCompare(b.entityName))
}
