import { resolveTexture } from '../assets/AssetDatabase'
import type { Entity } from '../world/Entity'
import type { Button, Canvas, Checkbox, Image, Panel, ProgressBar, RectTransform, Slider, Text, TextInput } from '../world/components'
import { activeFontFallbackFamilies, activeTextDirection, localizationSettings, localize, localizeUiLabel } from './localization'
import { runtimeAccessibilitySettings, uiAudioSettings } from './presentation'
import { audioRuntime } from './audio'
import { readUiTheme, themeStyle, themeVariant as applyThemeVariant, type UiThemeDocument } from './uiTheme'
import type { InputAction } from './input'
import { formatInputPrompt, inputPromptForAction, setInputModality } from './inputModality'

import { resolveUiLayout, uiClipContains, uiItemVisibleArea, type UiLayoutItem, type UiLayoutIssue, type UiLayoutOptions, type UiRect } from './uiLayout'
import { drawUiText, measureUiText } from './uiTextPresentation'
import { truncateUtf16, uiTextGraphemes } from './uiTextLayout'
import { UiImageTintCache } from './uiImageTint'
export type { UiRect } from './uiLayout'
interface ResolvedUi extends UiLayoutItem { theme: UiThemeDocument | null }
type UiCallback = (entity: Entity, functionName: string) => void
type RemapCallback = (action: string, bindingIndex: number, binding: { device: 'keyboard' | 'gamepad-button' | 'gamepad-axis'; code: string }) => void

export interface GameUiRenderOptions { editor?: boolean; preview?: boolean; selectedEntityIds?: Iterable<number>; layout?: UiLayoutOptions; themeOverride?: { reference: string; theme: UiThemeDocument } }
export interface UiAccessibilityNode { uuid: string; role: string; label: string; description: string; state: string; value: string; valueMin?: number; valueMax?: number; valueNow?: number; checked?: boolean; live: 'off' | 'polite' | 'assertive'; rect: UiRect; tabIndex: number; focused: boolean; disabled: boolean }

function color(value: { r: number; g: number; b: number }, opacity = 100): string {
  return `rgba(${Math.round(value.r)},${Math.round(value.g)},${Math.round(value.b)},${Math.min(1, Math.max(0, opacity / 100))})`
}

function roundRect(context: CanvasRenderingContext2D, rect: UiRect, radius: number): void {
  const safe = Math.min(Math.max(0, radius), rect.width / 2, rect.height / 2)
  context.beginPath(); context.roundRect(rect.x, rect.y, rect.width, rect.height, safe)
}

function drawNineSliceImage(context: CanvasRenderingContext2D, source: CanvasImageSource, sourceRect: UiRect, destination: UiRect, border: { left: number; top: number; right: number; bottom: number }): void {
  const left = Math.min(sourceRect.width, Math.max(0, border.left)), right = Math.min(sourceRect.width - left, Math.max(0, border.right))
  const top = Math.min(sourceRect.height, Math.max(0, border.top)), bottom = Math.min(sourceRect.height - top, Math.max(0, border.bottom))
  const destinationLeft = Math.min(destination.width, left), destinationRight = Math.min(destination.width - destinationLeft, right)
  const destinationTop = Math.min(destination.height, top), destinationBottom = Math.min(destination.height - destinationTop, bottom)
  const sx = [0, left, sourceRect.width - right, sourceRect.width], sy = [0, top, sourceRect.height - bottom, sourceRect.height]
  const dx = [0, destinationLeft, destination.width - destinationRight, destination.width], dy = [0, destinationTop, destination.height - destinationBottom, destination.height]
  for (let row = 0; row < 3; row++) for (let column = 0; column < 3; column++) {
    const sw = sx[column + 1] - sx[column], sh = sy[row + 1] - sy[row], dw = dx[column + 1] - dx[column], dh = dy[row + 1] - dy[row]
    if (sw > 0 && sh > 0 && dw > 0 && dh > 0) context.drawImage(source, sourceRect.x + sx[column], sourceRect.y + sy[row], sw, sh, destination.x + dx[column], destination.y + dy[row], dw, dh)
  }
}

function controlFontFamily(theme: UiThemeDocument | null, locale: string): string { const family = String(theme?.variables.fontFamily ?? 'Nunito Sans').replace(/["\\]/g, ''); return [family, ...activeFontFallbackFamilies(locale), 'Segoe UI', 'sans-serif'].map(value => value === 'sans-serif' ? value : `"${value.replace(/["\\]/g, '')}"`).join(', ') }
function interactive(entity: Entity): boolean { return ['Button', 'Slider', 'Checkbox', 'TextInput'].some(kind => entity.getComponent<Button>(kind as 'Button')?.enabled) }
function isDisabled(entity: Entity): boolean { return ['Button', 'Slider', 'Checkbox', 'TextInput'].some(kind => { const control = entity.getComponent<Button>(kind as 'Button'); return control?.enabled && !control.interactable }) }

export class GameUiRuntime {
  layoutIssues: UiLayoutIssue[] = []
  private imageTints = new UiImageTintCache()
  private resolved: ResolvedUi[] = []
  private hovered: Entity | null = null
  private pressed: Entity | null = null
  private focused: Entity | null = null
  private focusedInput: Entity | null = null
  private callback: UiCallback | null = null
  private remapCallback: RemapCallback | null = null
  private awaitingRemap: { entity: Entity; action: string; bindingIndex: number } | null = null
  private previousGamepadButtons = new Set<string>()
  private previousGamepadDirection = ''
  private dragged: { entity: Entity; start: { x: number; y: number }; origin: { x: number; y: number } } | null = null
  private tooltip: { entity: Entity; since: number } | null = null
  private inputActions: InputAction[] = []

  setCallback(callback: UiCallback): void { this.callback = callback }
  setRemapCallback(callback: RemapCallback): void { this.remapCallback = callback }
  setInputActions(actions: InputAction[]): void { this.inputActions = actions }

  render(context: CanvasRenderingContext2D, width: number, height: number, entities: Entity[], options: GameUiRenderOptions = {}): void {
    const resolved = this.resolve(width, height, entities, context, options)
    this.resolved = options.editor ? resolved.filter(item => item.entity.editorVisible) : resolved
    if (this.focused && !this.resolved.some(item => item.entity === this.focused)) this.focused = null
    const selected = new Set(options.selectedEntityIds ?? [])
    if (!options.editor && !options.preview && runtimeAccessibilitySettings.gamepadNavigation) this.pollGamepads()
    context.save(); context.beginPath(); context.rect(0, 0, Math.max(0, width), Math.max(0, height)); context.clip()
    for (const item of this.resolved) {
      context.save()
      for (const clip of item.clips) { roundRect(context, clip.rect, clip.rounded); context.clip() }
      this.draw(context, item, options.editor === true)
      if (options.editor && !options.preview) this.drawEditorOverlay(context, item.entity, item.rect, selected.has(item.entity.id))
      else if (item.entity === this.focused) this.drawFocusRing(context, item.rect)
      context.restore()
    }
    if (!options.preview) this.drawTooltip(context)
    context.restore()
  }

  entityAt(point: { x: number; y: number }, interactiveOnly = false): Entity | null {
    const modal = [...this.resolved].reverse().find(item => item.entity.getComponent<Panel>('Panel')?.behavior === 'Modal')?.entity ?? null
    for (let index = this.resolved.length - 1; index >= 0; index--) {
      const item = this.resolved[index]
      if (modal && !this.isDescendantOf(item.entity, modal)) continue
      const insideClips = item.clips.every(clip => uiClipContains(clip, point))
      if (insideClips && (!interactiveOnly || interactive(item.entity)) && point.x >= item.rect.x && point.x <= item.rect.x + item.rect.width && point.y >= item.rect.y && point.y <= item.rect.y + item.rect.height) return item.entity
    }
    return null
  }

  accessibilityNodes(): UiAccessibilityNode[] {
    if (!runtimeAccessibilitySettings.screenReaderMetadata) return []
    return this.resolved.filter(item => this.inFocusScope(item)).sort((a, b) => (a.entity.getComponent<RectTransform>('RectTransform')?.readingOrder ?? 0) - (b.entity.getComponent<RectTransform>('RectTransform')?.readingOrder ?? 0)).flatMap(item => {
      const rect = item.entity.getComponent<RectTransform>('RectTransform')!
      if (rect.accessibilityHidden) return []
      const text = item.entity.getComponent<Text>('Text'), checkbox = item.entity.getComponent<Checkbox>('Checkbox')
      const label = localizeUiLabel(rect.accessibilityLabel, item.locale) || (text ? localize(text.localizationKey, text.localizationVariables, text.text, item.locale) : checkbox ? localize(checkbox.localizationKey, {}, localizeUiLabel(checkbox.label, item.locale), item.locale) : item.entity.name)
      const role = rect.accessibilityRole || (item.entity.hasComponent('Button') ? 'button' : item.entity.hasComponent('Slider') ? 'slider' : item.entity.hasComponent('Checkbox') ? 'checkbox' : item.entity.hasComponent('TextInput') ? 'textbox' : item.entity.hasComponent('ProgressBar') ? 'progressbar' : 'group')
      const slider = item.entity.getComponent<Slider>('Slider') ?? item.entity.getComponent<ProgressBar>('ProgressBar'), checkboxValue = item.entity.getComponent<Checkbox>('Checkbox')?.checked, input = item.entity.getComponent<TextInput>('TextInput'), inputValue = input?.password ? '•'.repeat(uiTextGraphemes(input.value).length) : input?.value
      const inferredValue = slider ? String(slider.value) : checkboxValue !== undefined ? String(checkboxValue) : inputValue ?? ''
      return [{ uuid: item.entity.uuid, role, label, description: [rect.accessibilityDescription, rect.accessibilityState].filter(Boolean).join('; '), state: rect.accessibilityState || (isDisabled(item.entity) ? 'disabled' : ''), value: input?.password ? inferredValue : rect.accessibilityValue || inferredValue, valueMin: slider?.min, valueMax: slider?.max, valueNow: slider?.value, checked: checkboxValue, live: rect.accessibilityLive.toLowerCase() as 'off' | 'polite' | 'assertive', rect: { ...item.rect }, tabIndex: rect.focusable && !rect.skipNavigation && !isDisabled(item.entity) ? Math.max(-1, rect.tabIndex) : -1, focused: item.entity === this.focused, disabled: isDisabled(item.entity) }]
    })
  }

  focusByUuid(uuid: string): boolean { const entity = this.resolved.find(item => item.entity.uuid === uuid)?.entity; return entity ? this.setFocus(entity) : false }
  layoutSnapshot(): Array<{ entityUuid: string; rect: UiRect; order: number }> { return this.resolved.map(item => ({ entityUuid: item.entity.uuid, rect: { ...item.rect }, order: item.order })) }

  focusedTextInput(): { entity: Entity; rect: UiRect; input: TextInput } | null {
    if (!this.focusedInput) return null
    const item = this.resolved.find(candidate => candidate.entity === this.focusedInput), input = this.focusedInput.getComponent<TextInput>('TextInput')
    return item && input?.enabled && input.interactable && this.inFocusScope(item) ? { entity: this.focusedInput, rect: { ...item.rect }, input } : null
  }

  focusedTextInputPlaceholder(): string { const active = this.focusedTextInput(); return active ? localizeUiLabel(active.input.placeholder, this.focusedTextInputLocale()) : '' }
  focusedTextInputLocale(): string { return this.resolved.find(item => item.entity === this.focusedInput)?.locale || localizationSettings.previewLocale }
  focusedTextInputStyle(): Record<string, string> {
    const item = this.resolved.find(candidate => candidate.entity === this.focusedInput), input = item?.entity.getComponent<TextInput>('TextInput')
    if (!item || !input) return {}
    const style = themeStyle(item.theme, input.styleClass, 'focused', input.styleOverrides)
    return { fontFamily: controlFontFamily(item.theme, item.locale), fontSize: `${Number(style.fontSize ?? 16) * item.scale * runtimeAccessibilitySettings.textScale}px`, fontWeight: String(style.fontWeight ?? 500), color: runtimeAccessibilitySettings.highContrast ? '#fff' : String(style.foreground ?? '#f5f7fb'), background: runtimeAccessibilitySettings.highContrast ? '#000' : String(style.background ?? '#151b24'), borderColor: String(style.border ?? '#4f96ff'), borderRadius: `${Number(style.cornerRadius ?? 8) * item.scale}px`, textAlign: item.direction === 'rtl' ? 'right' : 'left' }
  }
  blurTextInput(): void { this.focusedInput = null }
  commitTextInput(uuid: string, value: string): boolean {
    const active = this.focusedTextInput(); if (!active || active.entity.uuid !== uuid) return false
    const next = truncateUtf16(value, Math.min(100_000, active.input.maxLength))
    if (next !== active.input.value) { active.input.value = next; this.callback?.(active.entity, 'on_value_changed') }
    return true
  }
  activateByUuid(uuid: string): boolean { const entity = this.focusableItems(true).find(item => item.entity.uuid === uuid)?.entity; if (!entity) return false; this.setFocus(entity); this.activate(entity); return true }
  pointerCancel(): void { const button = this.pressed?.getComponent<Button>('Button'); if (button) button.state = button.interactable ? 'Normal' : 'Disabled'; this.pressed = null; this.dragged = null }


  wheel(point: { x: number; y: number }, deltaX: number, deltaY: number): boolean {
    setInputModality('mouse')
    for (let index = this.resolved.length - 1; index >= 0; index--) {
      const item = this.resolved[index], panel = item.entity.getComponent<Panel>('Panel')
      if (!panel || (!panel.scrollHorizontal && !panel.scrollVertical)) continue
      if (point.x < item.rect.x || point.x > item.rect.x + item.rect.width || point.y < item.rect.y || point.y > item.rect.y + item.rect.height) continue
      const children = this.resolved.filter(candidate => candidate.entity.parentUuid === item.entity.uuid)
      const right = Math.max(item.rect.width, panel.contentSize.x * item.scale, ...children.map(child => child.rect.x + child.rect.width - item.rect.x + panel.scrollOffset.x * item.scale))
      const bottom = Math.max(item.rect.height, panel.contentSize.y * item.scale, ...children.map(child => child.rect.y + child.rect.height - item.rect.y + panel.scrollOffset.y * item.scale))
      const speed = Math.max(0, panel.scrollSpeed) / Math.max(1, item.scale)
      if (panel.scrollHorizontal) panel.scrollOffset.x = Math.min(Math.max(0, right - item.rect.width) / item.scale, Math.max(0, panel.scrollOffset.x + Math.sign(deltaX || (Math.abs(deltaY) > Math.abs(deltaX) ? deltaY : 0)) * speed))
      if (panel.scrollVertical) panel.scrollOffset.y = Math.min(Math.max(0, bottom - item.rect.height) / item.scale, Math.max(0, panel.scrollOffset.y + Math.sign(deltaY) * speed))
      return true
    }
    return false
  }

  pointerDown(point: { x: number; y: number }): boolean {
    setInputModality('mouse')
    const raw = this.rawEntityAt(point), rawPanel = raw?.getComponent<Panel>('Panel')
    const openOverlay = [...this.resolved].reverse().find(item => { const behavior = item.entity.getComponent<Panel>('Panel')?.behavior; return behavior === 'Modal' || behavior === 'Popup' })
    if (openOverlay && (!raw || !this.isDescendantOf(raw, openOverlay.entity))) { const overlay = openOverlay.entity.getComponent<Panel>('Panel')!; if (overlay.closeOnOutside) overlay.visible = false; return true }
    if (raw && rawPanel?.draggable) { const rect = raw.getComponent<RectTransform>('RectTransform')!; this.dragged = { entity: raw, start: { ...point }, origin: { ...rect.position } }; this.setFocus(raw); return true }
    const entity = this.entityAt(point, true)
    if (!entity) { this.focusedInput = null; return false }
    this.setFocus(entity)
    const button = entity.getComponent<Button>('Button'), slider = entity.getComponent<Slider>('Slider'), checkbox = entity.getComponent<Checkbox>('Checkbox'), input = entity.getComponent<TextInput>('TextInput')
    if (button?.enabled && button.interactable) { button.state = 'Pressed'; this.pressed = entity }
    else if (slider?.enabled && slider.interactable) { this.pressed = entity; this.updateSlider(entity, point) }
    else if (checkbox?.enabled && checkbox.interactable) this.pressed = entity
    if (input?.enabled && input.interactable) this.focusedInput = entity
    return Boolean(button || slider || checkbox || input)
  }

  pointerMove(point: { x: number; y: number }): boolean {
    if (this.dragged) { const item = this.resolved.find(candidate => candidate.entity === this.dragged!.entity), rect = this.dragged.entity.getComponent<RectTransform>('RectTransform'); if (rect) { const scale = Math.max(1e-6, item?.scale ?? 1); rect.position.x = this.dragged.origin.x + (point.x - this.dragged.start.x) / scale; rect.position.y = this.dragged.origin.y + (point.y - this.dragged.start.y) / scale }; return true }
    if (this.pressed?.getComponent<Slider>('Slider')) { this.updateSlider(this.pressed, point); return true }
    const entity = this.entityAt(point, true)
    const raw = this.rawEntityAt(point), tooltipPanel = raw?.getComponent<Panel>('Panel'); if (raw && tooltipPanel?.behavior === 'Tooltip' && tooltipPanel.tooltipText) { if (this.tooltip?.entity !== raw) this.tooltip = { entity: raw, since: performance.now() } } else this.tooltip = null
    if (entity === this.hovered) return Boolean(entity)
    const previous = this.hovered; this.hovered = entity
    const previousButton = previous?.getComponent<Button>('Button')
    if (previousButton && previous !== this.pressed) previousButton.state = previousButton.interactable ? 'Normal' : 'Disabled'
    if (previous && previousButton) this.callback?.(previous, previousButton.onHoverExit || 'on_hover_exit')
    const button = entity?.getComponent<Button>('Button')
    if (button && entity !== this.pressed) button.state = button.interactable ? 'Hovered' : 'Disabled'
    if (entity && button) { this.callback?.(entity, button.onHoverEnter || 'on_hover_enter'); audioRuntime.playUiClip(button.hoverAudio ?? this.themeSound(entity, 'hover') ?? uiAudioSettings.hover, uiAudioSettings.bus) }
    return Boolean(entity)
  }

  pointerUp(point: { x: number; y: number }): boolean {
    if (this.dragged) { const dragged = this.dragged.entity, source = dragged.getComponent<Panel>('Panel'), target = this.entityAt(point, false), destination = target?.getComponent<Panel>('Panel'); this.dragged = null; if (source?.dropGroup && destination?.dropGroup === source.dropGroup && target !== dragged) this.callback?.(target!, `on_drop:${dragged.uuid}`); return true }
    const pressed = this.pressed; this.pressed = null
    if (!pressed) return false
    const button = pressed.getComponent<Button>('Button')
    if (button || pressed.getComponent<Checkbox>('Checkbox')) {
      const inside = this.entityAt(point, true) === pressed
      if (button) button.state = button.interactable ? (inside ? 'Hovered' : 'Normal') : 'Disabled'
      if (inside && !isDisabled(pressed)) this.activate(pressed)
    }
    return true
  }

  keyDown(event: KeyboardEvent): boolean {
    if (event.isComposing || event.keyCode === 229 || event.ctrlKey || event.metaKey || event.altKey) return false
    setInputModality('keyboard')
    if (this.awaitingRemap && event.key !== 'Escape') { this.applyRemap({ device: 'keyboard', code: event.code || event.key }); return true }
    if (event.key === 'Escape' && this.awaitingRemap) { this.awaitingRemap = null; audioRuntime.playUiClip(uiAudioSettings.cancel, uiAudioSettings.bus); return true }
    if (this.focusedInput) {
      if (event.key === 'Tab') { this.blurTextInput(); this.focusNext(event.shiftKey ? -1 : 1); return true }
      if (event.key === 'Escape' || event.key === 'Enter') { this.blurTextInput(); return true }
      // Native input owns text editing, selection, surrogate pairs and composition.
      return false
    }
    if (!runtimeAccessibilitySettings.keyboardNavigation) return false
    if (event.key === 'Tab') { if (!this.focusableItems().length) return false; this.focusNext(event.shiftKey ? -1 : 1); return true }
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      const slider = this.focused?.getComponent<Slider>('Slider')
      if (slider?.interactable && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) { this.adjustSlider(this.focused!, slider, event.key === 'ArrowRight' ? 1 : -1); return true }
      this.focusDirection(event.key.replace('Arrow', '').toLowerCase() as 'up' | 'down' | 'left' | 'right'); return true
    }
    if ((event.key === 'Enter' || event.key === ' ') && this.focused) { if (!event.repeat) this.activate(this.focused); return true }
    return false
  }

  reset(): void {
    if (this.hovered) { const button = this.hovered.getComponent<Button>('Button'); if (button) button.state = button.interactable ? 'Normal' : 'Disabled' }
    this.imageTints.clear(); this.resolved = []; this.hovered = null; this.pressed = null; this.focused = null; this.focusedInput = null; this.awaitingRemap = null; this.dragged = null; this.tooltip = null; this.previousGamepadButtons.clear(); this.previousGamepadDirection = ''
  }

  private resolve(width: number, height: number, entities: Entity[], context: CanvasRenderingContext2D, options: GameUiRenderOptions): ResolvedUi[] {
    const result = resolveUiLayout(width, height, entities, { locale: localizationSettings.previewLocale, direction: activeTextDirection(), localeDirection: activeTextDirection, measureText: (_entity, text, scale, locale, available) => measureUiText(text, scale, locale, available, context), ...options.layout })
    this.layoutIssues = result.issues
    const themes = new Map<string, UiThemeDocument | null>()
    return result.items.filter(item => item.visible).map(item => {
      const reference = item.canvas?.themeAsset, variant = item.canvas?.themeVariant ?? 'default', key = `${reference}:${variant}`
      if (!themes.has(key)) themes.set(key, applyThemeVariant(reference && options.themeOverride?.reference === reference ? options.themeOverride.theme : readUiTheme(reference), variant))
      return { ...item, theme: themes.get(key) ?? null }
    })
  }

  private draw(context: CanvasRenderingContext2D, item: ResolvedUi, editor: boolean): void {
    const { entity, rect, theme } = item, panel = entity.getComponent<Panel>('Panel'), button = entity.getComponent<Button>('Button')
      if (panel?.enabled || button?.enabled) {
      const visualState = button?.interactable === false ? 'Disabled' : button?.state
      const state = button ? (visualState ?? 'Normal').toLowerCase() : 'normal', style = themeStyle(theme, button?.styleClass ?? panel?.styleClass ?? 'panel', state, button?.styleOverrides ?? panel?.styleOverrides)
      const stateColor = visualState === 'Hovered' ? button?.hoveredColor : visualState === 'Pressed' ? button?.pressedColor : visualState === 'Disabled' ? button?.disabledColor : button?.normalColor
      const fill = runtimeAccessibilitySettings.highContrast ? '#05070a' : typeof style.background === 'string' ? style.background : panel ? color(panel.color, panel.opacity) : color(stateColor ?? { r: 45, g: 106, b: 214 })
      roundRect(context, rect, Number(style.cornerRadius ?? panel?.cornerRadius ?? 10) * item.scale); context.globalAlpha = Number(style.opacity ?? 1); context.fillStyle = fill; context.fill(); context.globalAlpha = 1
      if (style.border) { context.strokeStyle = String(style.border); context.lineWidth = Number(style.borderWidth ?? 1); context.stroke() }
      if (panel?.showScrollbars && (panel.scrollHorizontal || panel.scrollVertical)) this.drawScrollbars(context, item, panel)
    }
    const image = entity.getComponent<Image>('Image')
    if (image?.enabled && image.spriteAsset) {
      const texture = resolveTexture(image.spriteAsset)
      if (texture) {
        const source = texture.source as CanvasImageSource & { width: number; height: number }, sx = texture.uv.x * source.width, sy = texture.uv.y * source.height, sw = texture.uv.width * source.width, sh = texture.uv.height * source.height
        const destination = { ...rect }
        if (image.preserveAspect && sw > 0 && sh > 0 && rect.width > 0 && rect.height > 0) { const scale = Math.min(rect.width / sw, rect.height / sh); destination.width = sw * scale; destination.height = sh * scale; destination.x += (rect.width - destination.width) / 2; destination.y += (rect.height - destination.height) / 2 }
        let drawable: CanvasImageSource = source, sourceRect = { x: sx, y: sy, width: sw, height: sh }
        if (image.tint.r !== 255 || image.tint.g !== 255 || image.tint.b !== 255) {
          try { const tinted = this.imageTints.resolve(`${texture.key}:${texture.revision}`, source, sourceRect, image.tint); drawable = tinted.source; sourceRect = tinted.rect }
          catch (error) { this.layoutIssues.push({ entityUuid: entity.uuid, code: 'NOVA-UI-TINT-LIMIT', message: String(error) }); this.drawMissingImage(context, rect, true); return }
        }
        context.save(); context.globalAlpha = image.opacity / 100
        if (image.nineSlice.enabled && !image.preserveAspect) drawNineSliceImage(context, drawable, sourceRect, destination, image.nineSlice)
        else context.drawImage(drawable, sourceRect.x, sourceRect.y, sourceRect.width, sourceRect.height, destination.x, destination.y, destination.width, destination.height)
        context.restore()
      } else this.drawMissingImage(context, rect, true)
    } else if (image?.enabled && editor) this.drawMissingImage(context, rect, false)
    const progress = entity.getComponent<ProgressBar>('ProgressBar'), slider = entity.getComponent<Slider>('Slider')
    if (progress?.enabled || slider?.enabled) {
      const component = progress ?? slider!, style = themeStyle(theme, component.styleClass, 'normal', component.styleOverrides)
      const ratio = component.max > component.min ? Math.min(1, Math.max(0, (component.value - component.min) / (component.max - component.min))) : 0, barHeight = Math.min(12 * item.scale, rect.height), bar = { x: rect.x, y: rect.y + (rect.height - barHeight) / 2, width: rect.width, height: barHeight }
      roundRect(context, bar, barHeight / 2); context.fillStyle = typeof style.background === 'string' ? style.background : color(progress?.backgroundColor ?? { r: 31, g: 37, b: 47 }); context.fill()
      const filled = { ...bar, width: bar.width * ratio }; if (filled.width > 0) { roundRect(context, filled, barHeight / 2); context.fillStyle = typeof style.foreground === 'string' ? style.foreground : color(progress?.fillColor ?? { r: 79, g: 150, b: 255 }); context.fill() }
      if (slider) { context.beginPath(); context.arc(bar.x + bar.width * ratio, bar.y + bar.height / 2, 9 * item.scale, 0, Math.PI * 2); context.fillStyle = '#f7f9fc'; context.fill() }
    }
    const checkbox = entity.getComponent<Checkbox>('Checkbox')
    if (checkbox?.enabled) {
      const style = themeStyle(theme, checkbox.styleClass, 'normal', checkbox.styleOverrides), box = Math.min(24 * item.scale, rect.height)
      context.strokeStyle = String(style.border ?? '#8d98aa'); context.lineWidth = Number(style.borderWidth ?? 2); context.strokeRect(rect.x, rect.y + (rect.height - box) / 2, box, box)
      if (checkbox.checked) { context.fillStyle = String(style.background ?? '#4f96ff'); context.fillRect(rect.x + 4, rect.y + (rect.height - box) / 2 + 4, box - 8, box - 8) }
      context.fillStyle = runtimeAccessibilitySettings.highContrast ? '#ffffff' : String(style.foreground ?? '#f5f7fb'); context.font = `${Number(style.fontWeight ?? 600)} ${Number(style.fontSize ?? 16) * item.scale * runtimeAccessibilitySettings.textScale}px ${controlFontFamily(theme, item.locale)}`; context.textAlign = item.direction === 'rtl' ? 'right' : 'left'; context.textBaseline = 'middle'
      const label = localize(checkbox.localizationKey, {}, localizeUiLabel(checkbox.label, item.locale), item.locale), x = item.direction === 'rtl' ? rect.x + rect.width - box - 9 : rect.x + box + 9; context.fillText(label, x, rect.y + rect.height / 2)
    }
    const input = entity.getComponent<TextInput>('TextInput')
    if (input?.enabled) {
      const style = themeStyle(theme, input.styleClass, this.focusedInput === entity ? 'focused' : 'normal', input.styleOverrides)
      roundRect(context, rect, Number(style.cornerRadius ?? 8) * item.scale); context.strokeStyle = String(style.border ?? (this.focusedInput === entity ? '#4f96ff' : '#657085')); context.lineWidth = Number(style.borderWidth ?? (this.focusedInput === entity ? 2 : 1)); context.stroke()
      const shown = input.value ? (input.password ? '•'.repeat(uiTextGraphemes(input.value).length) : input.value) : localizeUiLabel(input.placeholder, item.locale)
      context.fillStyle = runtimeAccessibilitySettings.highContrast ? '#ffffff' : String(style.foreground ?? (input.value ? '#f5f7fb' : '#7e899c')); context.font = `${Number(style.fontWeight ?? 500)} ${Number(style.fontSize ?? 16) * item.scale * runtimeAccessibilitySettings.textScale}px ${controlFontFamily(theme, item.locale)}`; context.textAlign = item.direction === 'rtl' ? 'right' : 'left'; context.textBaseline = 'middle'; context.save(); context.beginPath(); context.rect(rect.x + 12, rect.y, Math.max(0, rect.width - 24), rect.height); context.clip(); context.fillText(shown, item.direction === 'rtl' ? rect.x + rect.width - 12 : rect.x + 12, rect.y + rect.height / 2); context.restore()
    }
    const text = entity.getComponent<Text>('Text')
    if (text?.enabled && (text.captionCategory === 'None' || (text.captionCategory === 'Dialogue' ? runtimeAccessibilitySettings.subtitles : runtimeAccessibilitySettings.captions))) {
      const control = button ?? panel, style = control ? themeStyle(theme, control.styleClass, button?.state.toLowerCase() ?? 'normal', control.styleOverrides) : {}
      const display = text.inputPromptAction ? formatInputPrompt(inputPromptForAction(text.inputPromptAction, this.inputActions)) : undefined
      context.fillStyle = runtimeAccessibilitySettings.highContrast ? '#ffffff' : typeof style.foreground === 'string' ? style.foreground : color(text.color, text.opacity)
      drawUiText(context, text, rect, item.scale, item.locale, display)
    }
  }

  private drawFocusRing(context: CanvasRenderingContext2D, rect: UiRect): void { context.save(); context.strokeStyle = runtimeAccessibilitySettings.focusRingColor; context.lineWidth = runtimeAccessibilitySettings.focusRingWidth; context.setLineDash([]); context.strokeRect(rect.x - 3, rect.y - 3, rect.width + 6, rect.height + 6); context.restore() }
  private drawTooltip(context: CanvasRenderingContext2D): void { const current = this.tooltip; if (!current) return; const panel = current.entity.getComponent<Panel>('Panel'), item = this.resolved.find(candidate => candidate.entity === current.entity); if (!panel || !item || performance.now() - current.since < Math.max(0, panel.tooltipDelay) * 1000) return; const text = panel.tooltipText.slice(0, 500); context.save(); context.font = `${14 * runtimeAccessibilitySettings.textScale}px Nunito Sans, Segoe UI, sans-serif`; const width = Math.min(360, Math.max(90, context.measureText(text).width + 20)), x = Math.min(context.canvas.width - width - 8, Math.max(8, item.rect.x)), y = Math.min(context.canvas.height - 38, item.rect.y + item.rect.height + 6); roundRect(context, { x, y, width, height: 32 }, 7); context.fillStyle = runtimeAccessibilitySettings.highContrast ? '#000' : 'rgba(22,29,40,.96)'; context.fill(); context.strokeStyle = '#79b2ff'; context.stroke(); context.fillStyle = '#fff'; context.textAlign = 'left'; context.textBaseline = 'middle'; context.fillText(text, x + 10, y + 16, width - 20); context.restore() }
  private rawEntityAt(point: { x: number; y: number }): Entity | null { for (let index = this.resolved.length - 1; index >= 0; index--) { const item = this.resolved[index]; if (item.clips.every(clip => uiClipContains(clip, point)) && point.x >= item.rect.x && point.x <= item.rect.x + item.rect.width && point.y >= item.rect.y && point.y <= item.rect.y + item.rect.height) return item.entity }; return null }
  private isDescendantOf(entity: Entity, ancestor: Entity): boolean { if (entity === ancestor) return true; const byUuid = new Map(this.resolved.map(item => [item.entity.uuid, item.entity])), seen = new Set<string>(); let parent = entity.parentUuid ? byUuid.get(entity.parentUuid) : null; while (parent && !seen.has(parent.uuid)) { if (parent === ancestor) return true; seen.add(parent.uuid); parent = parent.parentUuid ? byUuid.get(parent.parentUuid) : null }; return false }
  private inFocusScope(item: ResolvedUi): boolean { const area = uiItemVisibleArea(item), modal = [...this.resolved].reverse().find(candidate => candidate.entity.getComponent<Panel>('Panel')?.behavior === 'Modal'); return area.width > 0 && area.height > 0 && (!modal || this.isDescendantOf(item.entity, modal.entity)) }

  private drawScrollbars(context: CanvasRenderingContext2D, item: ResolvedUi, panel: Panel): void {
    const children = this.resolved.filter(candidate => candidate.entity.parentUuid === item.entity.uuid), rect = item.rect
    const contentWidth = Math.max(rect.width, panel.contentSize.x * item.scale, ...children.map(child => child.rect.x + child.rect.width - rect.x + panel.scrollOffset.x * item.scale))
    const contentHeight = Math.max(rect.height, panel.contentSize.y * item.scale, ...children.map(child => child.rect.y + child.rect.height - rect.y + panel.scrollOffset.y * item.scale))
    context.save(); context.fillStyle = 'rgba(135,154,185,.62)'
    if (panel.scrollHorizontal && contentWidth > rect.width) { const width = Math.max(18, rect.width * rect.width / contentWidth), travel = rect.width - width, x = rect.x + travel * Math.min(1, panel.scrollOffset.x * item.scale / Math.max(1, contentWidth - rect.width)); roundRect(context, { x, y: rect.y + rect.height - 5, width, height: 3 }, 2); context.fill() }
    if (panel.scrollVertical && contentHeight > rect.height) { const height = Math.max(18, rect.height * rect.height / contentHeight), travel = rect.height - height, y = rect.y + travel * Math.min(1, panel.scrollOffset.y * item.scale / Math.max(1, contentHeight - rect.height)); roundRect(context, { x: rect.x + rect.width - 5, y, width: 3, height }, 2); context.fill() }
    context.restore()
  }
  private drawMissingImage(context: CanvasRenderingContext2D, rect: UiRect, broken: boolean): void { context.save(); context.fillStyle = broken ? 'rgba(164,54,102,.2)' : 'rgba(86,105,137,.14)'; context.strokeStyle = broken ? '#ff5f91' : '#71809a'; context.lineWidth = 1; context.setLineDash([6, 5]); context.fillRect(rect.x, rect.y, rect.width, rect.height); context.strokeRect(rect.x + .5, rect.y + .5, Math.max(0, rect.width - 1), Math.max(0, rect.height - 1)); context.restore() }
  private drawEditorOverlay(context: CanvasRenderingContext2D, entity: Entity, rect: UiRect, selected: boolean): void {
    const canvas = entity.getComponent<Canvas>('Canvas'); if (!selected && !canvas) return
    context.save(); context.strokeStyle = selected ? '#61a5ff' : 'rgba(97,165,255,.5)'; context.fillStyle = selected ? 'rgba(97,165,255,.08)' : 'transparent'; context.lineWidth = selected ? 2 : 1; context.setLineDash([]); context.fillRect(rect.x, rect.y, rect.width, rect.height); context.strokeRect(rect.x + 1, rect.y + 1, Math.max(0, rect.width - 2), Math.max(0, rect.height - 2))
    if (selected) for (const point of [[rect.x, rect.y], [rect.x + rect.width, rect.y], [rect.x, rect.y + rect.height], [rect.x + rect.width, rect.y + rect.height]]) { context.beginPath(); context.rect(point[0] - 3.5, point[1] - 3.5, 7, 7); context.fillStyle = '#61a5ff'; context.fill(); context.stroke() }
    if (canvas && rect.width >= 32 && rect.height >= 18) { context.font = '600 11px Nunito Sans, Segoe UI, sans-serif'; context.textAlign = 'right'; context.textBaseline = 'top'; const labelWidth = Math.max(0, Math.min(rect.width - 16, context.measureText(entity.name).width + 12)), labelX = rect.x + rect.width - 6; context.fillStyle = 'rgba(22,31,45,.82)'; context.fillRect(labelX - labelWidth, rect.y + 5, labelWidth, 18); if (labelWidth > 12) { context.fillStyle = '#8bb8ff'; context.fillText(entity.name, labelX - 6, rect.y + 8, labelWidth - 12) } }
    context.restore()
  }

  private focusableItems(includeNegative = false): ResolvedUi[] {
    const priority = (item: ResolvedUi) => { const value = item.entity.getComponent<RectTransform>('RectTransform')?.tabIndex ?? 0; return value > 0 ? value : Number.POSITIVE_INFINITY }
    return this.resolved.filter(item => { const rect = item.entity.getComponent<RectTransform>('RectTransform'); return rect?.focusable && (includeNegative || rect.tabIndex >= 0) && !rect.skipNavigation && !rect.accessibilityHidden && (interactive(item.entity) || Boolean(rect.accessibilityRole)) && !isDisabled(item.entity) && this.inFocusScope(item) }).sort((a, b) => priority(a) - priority(b) || (a.entity.getComponent<RectTransform>('RectTransform')?.readingOrder ?? 0) - (b.entity.getComponent<RectTransform>('RectTransform')?.readingOrder ?? 0))
  }
  private setFocus(entity: Entity): boolean {
    if (!this.focusableItems(true).some(item => item.entity === entity)) return false
    if (this.focused === entity) { if (entity.hasComponent('TextInput')) this.focusedInput = entity; return true }
    const previous = this.focused; this.focused = entity; this.focusedInput = entity.hasComponent('TextInput') ? entity : null
    if (runtimeAccessibilitySettings.announceFocusChanges) { if (previous) this.callback?.(previous, 'on_focus_exit'); this.callback?.(entity, 'on_focus_enter') }
    audioRuntime.playUiClip(entity.getComponent<Button>('Button')?.focusAudio ?? this.themeSound(entity, 'focus') ?? uiAudioSettings.focus, uiAudioSettings.bus); return true
  }

  private focusNext(direction: -1 | 1): void { const items = this.focusableItems(); if (!items.length) return; const current = items.findIndex(item => item.entity === this.focused), next = current < 0 ? (direction > 0 ? 0 : items.length - 1) : (current + direction + items.length) % items.length; this.setFocus(items[next].entity) }
  private focusDirection(direction: 'up' | 'down' | 'left' | 'right'): void {
    const currentItem = this.resolved.find(item => item.entity === this.focused); if (!currentItem) { this.focusNext(1); return }
    const rect = currentItem.entity.getComponent<RectTransform>('RectTransform')!, explicit = rect[`focus${direction[0].toUpperCase()}${direction.slice(1)}` as 'focusUp']
    if (explicit && this.focusByUuid(explicit)) return
    const center = { x: currentItem.rect.x + currentItem.rect.width / 2, y: currentItem.rect.y + currentItem.rect.height / 2 }
    const candidate = this.focusableItems().filter(item => item !== currentItem).map(item => { const point = { x: item.rect.x + item.rect.width / 2, y: item.rect.y + item.rect.height / 2 }, dx = point.x - center.x, dy = point.y - center.y; const valid = direction === 'left' ? dx < 0 : direction === 'right' ? dx > 0 : direction === 'up' ? dy < 0 : dy > 0; return { item, score: valid ? Math.hypot(dx, dy) + (direction === 'left' || direction === 'right' ? Math.abs(dy) : Math.abs(dx)) * 2 : Number.POSITIVE_INFINITY } }).sort((a, b) => a.score - b.score)[0]
    if (candidate && Number.isFinite(candidate.score)) this.setFocus(candidate.item.entity)
  }

  private activate(entity: Entity): void {
    const button = entity.getComponent<Button>('Button'), checkbox = entity.getComponent<Checkbox>('Checkbox'), input = entity.getComponent<TextInput>('TextInput'), rect = entity.getComponent<RectTransform>('RectTransform')
    if (button?.enabled && button.interactable) { audioRuntime.playUiClip(button.pressAudio ?? this.themeSound(entity, 'press') ?? uiAudioSettings.press, uiAudioSettings.bus); if (rect?.remapAction) this.awaitingRemap = { entity, action: rect.remapAction, bindingIndex: Math.max(0, Math.round(rect.remapBindingIndex)) }; else this.callback?.(entity, button.onPressed || 'on_pressed') }
    else if (checkbox?.enabled && checkbox.interactable) { checkbox.checked = !checkbox.checked; this.callback?.(entity, 'on_pressed') }
    else if (input?.enabled && input.interactable) this.focusedInput = entity
  }

  private adjustSlider(entity: Entity, slider: Slider, direction: number): void { const before = slider.value, step = slider.wholeNumbers ? 1 : Math.max((slider.max - slider.min) / 100, 1e-9); slider.value = Math.min(slider.max, Math.max(slider.min, slider.value + direction * step)); if (slider.wholeNumbers) slider.value = Math.round(slider.value); if (slider.value !== before) this.callback?.(entity, 'on_value_changed') }
  private themeSound(entity: Entity, slot: 'hover' | 'press' | 'focus' | 'cancel'): string | null { const value = this.resolved.find(item => item.entity === entity)?.theme?.tokens.sounds[slot]; return typeof value === 'string' && value ? value : null }
  private updateSlider(entity: Entity, point: { x: number; y: number }): void { const slider = entity.getComponent<Slider>('Slider'), item = this.resolved.find(candidate => candidate.entity === entity); if (!slider?.enabled || !slider.interactable || !item) return; const before = slider.value, physical = Math.min(1, Math.max(0, (point.x - item.rect.x) / Math.max(1, item.rect.width))), ratio = item.direction === 'rtl' ? 1 - physical : physical, value = slider.min + (slider.max - slider.min) * ratio; slider.value = slider.wholeNumbers ? Math.round(value) : value; if (slider.value !== before) this.callback?.(entity, 'on_value_changed') }
  private applyRemap(binding: { device: 'keyboard' | 'gamepad-button' | 'gamepad-axis'; code: string }): void { const pending = this.awaitingRemap; if (!pending) return; this.remapCallback?.(pending.action, pending.bindingIndex, binding); this.callback?.(pending.entity, 'on_input_remapped'); this.awaitingRemap = null }

  private pollGamepads(): void {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return
    const nextButtons = new Set<string>(), gamepads = navigator.getGamepads()
    for (let gamepadIndex = 0; gamepadIndex < gamepads.length; gamepadIndex++) {
      const gamepad = gamepads[gamepadIndex]; if (!gamepad) continue
      if (gamepad.buttons.some(button => button.pressed) || gamepad.axes.some(axis => Math.abs(axis) > .35)) setInputModality('gamepad', gamepad.id)
      for (let index = 0; index < gamepad.buttons.length; index++) if (gamepad.buttons[index].pressed) {
        const key = `${gamepadIndex}:${index}`; nextButtons.add(key)
        if (!this.previousGamepadButtons.has(key)) {
          if (this.awaitingRemap) this.applyRemap({ device: 'gamepad-button', code: String(index) })
          else if (index === 0 && this.focused) this.activate(this.focused)
          else if (index === 12) this.focusDirection('up'); else if (index === 13) this.focusDirection('down'); else if (index === 14) this.focusDirection('left'); else if (index === 15) this.focusDirection('right')
        }
      }
      const x = gamepad.axes[0] ?? 0, y = gamepad.axes[1] ?? 0, direction = Math.abs(x) > Math.abs(y) && Math.abs(x) > .65 ? (x < 0 ? 'left' : 'right') : Math.abs(y) > .65 ? (y < 0 ? 'up' : 'down') : ''
      if (direction && direction !== this.previousGamepadDirection) this.focusDirection(direction as 'up' | 'down' | 'left' | 'right')
      this.previousGamepadDirection = direction
    }
    this.previousGamepadButtons = nextButtons
  }
}

export const gameUiRuntime = new GameUiRuntime()
