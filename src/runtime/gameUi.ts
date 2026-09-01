import { resolveAsset, resolveTexture } from '../assets/AssetDatabase'
import type { Entity } from '../world/Entity'
import type { Button, Canvas, Checkbox, Image, Panel, ProgressBar, RectTransform, Slider, Text, TextInput } from '../world/components'
import { activeFontFallbackFamilies, activeTextDirection, localize } from './localization'
import { runtimeAccessibilitySettings, uiAudioSettings } from './presentation'
import { audioRuntime } from './audio'
import { readUiTheme, themeStyle, themeVariant as applyThemeVariant, type UiThemeDocument } from './uiTheme'
import type { InputAction } from './input'
import { formatInputPrompt, inputPromptForAction, setInputModality } from './inputModality'

export interface UiRect { x: number; y: number; width: number; height: number }
interface ResolvedUi { entity: Entity; rect: UiRect; order: number; clips: Array<{ rect: UiRect; rounded: number }>; scale: number; theme: UiThemeDocument | null }
type UiCallback = (entity: Entity, functionName: string) => void
type RemapCallback = (action: string, bindingIndex: number, binding: { device: 'keyboard' | 'gamepad-button' | 'gamepad-axis'; code: string }) => void

export interface GameUiRenderOptions { editor?: boolean; selectedEntityIds?: Iterable<number> }
export interface UiAccessibilityNode { uuid: string; role: string; label: string; description: string; state: string; value: string; valueMin?: number; valueMax?: number; valueNow?: number; checked?: boolean; live: 'off' | 'polite' | 'assertive'; rect: UiRect; tabIndex: number; focused: boolean; disabled: boolean }

function color(value: { r: number; g: number; b: number }, opacity = 100): string {
  return `rgba(${Math.round(value.r)},${Math.round(value.g)},${Math.round(value.b)},${Math.min(1, Math.max(0, opacity / 100))})`
}

function anchorPoint(preset: RectTransform['anchorPreset'], parent: UiRect): { x: number; y: number } {
  const left = preset.includes('left') || preset === 'left', right = preset.includes('right') || preset === 'right'
  const top = preset.includes('top') || preset === 'top', bottom = preset.includes('bottom') || preset === 'bottom'
  return { x: left ? parent.x : right ? parent.x + parent.width : parent.x + parent.width / 2, y: top ? parent.y : bottom ? parent.y + parent.height : parent.y + parent.height / 2 }
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

function clampSize(value: number, minimum: number, maximum: number): number { return Math.min(Math.max(0, maximum), Math.max(Math.max(0, minimum), Math.max(0, value))) }
function interactive(entity: Entity): boolean { return entity.hasComponent('Button') || entity.hasComponent('Slider') || entity.hasComponent('Checkbox') || entity.hasComponent('TextInput') }
function isDisabled(entity: Entity): boolean { return entity.getComponent<Button>('Button')?.interactable === false || entity.getComponent<Slider>('Slider')?.interactable === false || entity.getComponent<Checkbox>('Checkbox')?.interactable === false || entity.getComponent<TextInput>('TextInput')?.interactable === false }

class GameUiRuntime {
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
    const resolved = this.resolve(width, height, entities)
    this.resolved = options.editor ? resolved.filter(item => item.entity.editorVisible) : resolved
    if (this.focused && !this.resolved.some(item => item.entity === this.focused)) this.focused = null
    const selected = new Set(options.selectedEntityIds ?? [])
    if (!options.editor && runtimeAccessibilitySettings.gamepadNavigation) this.pollGamepads()
    context.save(); context.beginPath(); context.rect(0, 0, Math.max(0, width), Math.max(0, height)); context.clip()
    for (const item of this.resolved) {
      context.save()
      for (const clip of item.clips) { roundRect(context, clip.rect, clip.rounded); context.clip() }
      this.draw(context, item, options.editor === true)
      if (options.editor) this.drawEditorOverlay(context, item.entity, item.rect, selected.has(item.entity.id))
      else if (item.entity === this.focused) this.drawFocusRing(context, item.rect)
      context.restore()
    }
    this.drawTooltip(context)
    context.restore()
  }

  entityAt(point: { x: number; y: number }, interactiveOnly = false): Entity | null {
    const modal = [...this.resolved].reverse().find(item => item.entity.getComponent<Panel>('Panel')?.behavior === 'Modal')?.entity ?? null
    for (let index = this.resolved.length - 1; index >= 0; index--) {
      const item = this.resolved[index]
      if (modal && !this.isDescendantOf(item.entity, modal)) continue
      const insideClips = item.clips.every(clip => point.x >= clip.rect.x && point.x <= clip.rect.x + clip.rect.width && point.y >= clip.rect.y && point.y <= clip.rect.y + clip.rect.height)
      if (insideClips && (!interactiveOnly || interactive(item.entity)) && point.x >= item.rect.x && point.x <= item.rect.x + item.rect.width && point.y >= item.rect.y && point.y <= item.rect.y + item.rect.height) return item.entity
    }
    return null
  }

  accessibilityNodes(): UiAccessibilityNode[] {
    if (!runtimeAccessibilitySettings.screenReaderMetadata) return []
    return this.focusableItems(true).flatMap(item => {
      const rect = item.entity.getComponent<RectTransform>('RectTransform')!
      if (rect.accessibilityHidden) return []
      const text = item.entity.getComponent<Text>('Text'), checkbox = item.entity.getComponent<Checkbox>('Checkbox')
      const label = rect.accessibilityLabel || (text ? localize(text.localizationKey, text.localizationVariables, text.text) : checkbox ? localize(checkbox.localizationKey, {}, checkbox.label) : item.entity.name)
      const role = rect.accessibilityRole || (item.entity.hasComponent('Button') ? 'button' : item.entity.hasComponent('Slider') ? 'slider' : item.entity.hasComponent('Checkbox') ? 'checkbox' : item.entity.hasComponent('TextInput') ? 'textbox' : 'group')
      const slider = item.entity.getComponent<Slider>('Slider'), checkboxValue = item.entity.getComponent<Checkbox>('Checkbox')?.checked, inputValue = item.entity.getComponent<TextInput>('TextInput')?.value
      const inferredValue = slider ? String(slider.value) : checkboxValue !== undefined ? String(checkboxValue) : inputValue ?? ''
      return [{ uuid: item.entity.uuid, role, label, description: rect.accessibilityDescription, state: rect.accessibilityState || (isDisabled(item.entity) ? 'disabled' : ''), value: rect.accessibilityValue || inferredValue, valueMin: slider?.min, valueMax: slider?.max, valueNow: slider?.value, checked: checkboxValue, live: rect.accessibilityLive.toLowerCase() as 'off' | 'polite' | 'assertive', rect: { ...item.rect }, tabIndex: rect.readingOrder, focused: item.entity === this.focused, disabled: isDisabled(item.entity) }]
    })
  }

  focusByUuid(uuid: string): boolean { const entity = this.resolved.find(item => item.entity.uuid === uuid)?.entity; return entity ? this.setFocus(entity) : false }
  layoutSnapshot(): Array<{ entityUuid: string; rect: UiRect; order: number }> { return this.resolved.map(item => ({ entityUuid: item.entity.uuid, rect: { ...item.rect }, order: item.order })) }

  focusedTextInput(): { entity: Entity; rect: UiRect; input: TextInput } | null {
    if (!this.focusedInput) return null
    const item = this.resolved.find(candidate => candidate.entity === this.focusedInput), input = this.focusedInput.getComponent<TextInput>('TextInput')
    return item && input ? { entity: this.focusedInput, rect: { ...item.rect }, input } : null
  }

  blurTextInput(): void { this.focusedInput = null }

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
    if (button?.interactable) { button.state = 'Pressed'; this.pressed = entity }
    else if (slider?.interactable) { this.pressed = entity; this.updateSlider(entity, point) }
    else if (checkbox?.interactable) { checkbox.checked = !checkbox.checked; this.callback?.(entity, 'on_pressed') }
    if (input?.interactable) this.focusedInput = entity
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
    if (button) {
      const inside = this.entityAt(point, true) === pressed
      button.state = button.interactable ? (inside ? 'Hovered' : 'Normal') : 'Disabled'
      if (inside && button.interactable) this.activate(pressed)
    }
    return true
  }

  keyDown(event: KeyboardEvent): boolean {
    setInputModality('keyboard')
    if (this.awaitingRemap && event.key !== 'Escape') { this.applyRemap({ device: 'keyboard', code: event.code || event.key }); return true }
    if (event.key === 'Escape' && this.awaitingRemap) { this.awaitingRemap = null; audioRuntime.playUiClip(uiAudioSettings.cancel, uiAudioSettings.bus); return true }
    const input = this.focusedInput?.getComponent<TextInput>('TextInput')
    if (input?.interactable) {
      if (event.key === 'Backspace') input.value = input.value.slice(0, -1)
      else if (event.key === 'Escape' || event.key === 'Enter') this.focusedInput = null
      else if (event.key.length === 1 && input.value.length < Math.max(0, input.maxLength)) input.value += event.key
      else return false
      return true
    }
    if (!runtimeAccessibilitySettings.keyboardNavigation) return false
    if (event.key === 'Tab') { this.focusNext(event.shiftKey ? -1 : 1); return true }
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      const slider = this.focused?.getComponent<Slider>('Slider')
      if (slider?.interactable && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) { this.adjustSlider(slider, event.key === 'ArrowRight' ? 1 : -1); return true }
      this.focusDirection(event.key.replace('Arrow', '').toLowerCase() as 'up' | 'down' | 'left' | 'right'); return true
    }
    if ((event.key === 'Enter' || event.key === ' ') && this.focused) { this.activate(this.focused); return true }
    return false
  }

  reset(): void {
    if (this.hovered) { const button = this.hovered.getComponent<Button>('Button'); if (button) button.state = button.interactable ? 'Normal' : 'Disabled' }
    this.resolved = []; this.hovered = null; this.pressed = null; this.focused = null; this.focusedInput = null; this.awaitingRemap = null; this.dragged = null; this.tooltip = null; this.previousGamepadButtons.clear(); this.previousGamepadDirection = ''
  }

  private resolve(width: number, height: number, entities: Entity[]): ResolvedUi[] {
    const byUuid = new Map(entities.map(entity => [entity.uuid, entity])), cache = new Map<string, UiRect>(), scaleCache = new Map<string, number>(), orderCache = new Map<string, number>(), themeCache = new Map<string, UiThemeDocument | null>()
    const viewport = { x: 0, y: 0, width, height }, resolving = new Set<string>(), direction = activeTextDirection()
    const children = new Map<string, Entity[]>()
    for (const entity of entities) if (entity.parentUuid) { const list = children.get(entity.parentUuid) ?? []; list.push(entity); children.set(entity.parentUuid, list) }
    const rectFor = (entity: Entity): UiRect | null => {
      const cached = cache.get(entity.uuid); if (cached) return cached
      const rect = entity.getComponent<RectTransform>('RectTransform'); if (!rect?.enabled || resolving.has(entity.uuid)) return null
      resolving.add(entity.uuid)
      const parent = entity.parentUuid ? byUuid.get(entity.parentUuid) : null, parentRect = parent ? rectFor(parent) ?? viewport : viewport
      const parentScale = parent ? scaleCache.get(parent.uuid) ?? 1 : 1, parentOrder = parent ? orderCache.get(parent.uuid) ?? 0 : 0
      const canvas = entity.getComponent<Canvas>('Canvas')
      const ownScale = canvas?.scaleWithScreen ? Math.min(width / Math.max(1, canvas.referenceSize.x), height / Math.max(1, canvas.referenceSize.y)) * canvas.dpiScale : parentScale
      const scale = canvas ? ownScale : parentScale
      const breakpoint = rect.breakpoints.find(item => width >= Number(item.minWidth) && width <= Number(item.maxWidth))
      if (breakpoint?.visible === false) { resolving.delete(entity.uuid); return null }
      const position = breakpoint ? breakpoint.position : rect.position, requestedSize = breakpoint ? breakpoint.size : rect.size
      let desiredWidth = clampSize(requestedSize.x * scale, rect.minSize.x * scale, rect.maxSize.x * scale)
      let desiredHeight = clampSize(requestedSize.y * scale, rect.minSize.y * scale, rect.maxSize.y * scale)
      if (rect.horizontalPolicy === 'Fill') desiredWidth = Math.max(0, parentRect.width - (rect.margins.left + rect.margins.right) * scale)
      if (rect.verticalPolicy === 'Fill') desiredHeight = Math.max(0, parentRect.height - (rect.margins.top + rect.margins.bottom) * scale)
      const text = entity.getComponent<Text>('Text')
      if (rect.horizontalPolicy === 'Content' && text) desiredWidth = clampSize((text.text.length * text.fontSize * .62 + 20) * scale, rect.minSize.x * scale, rect.maxSize.x * scale)
      if (rect.verticalPolicy === 'Content' && text) desiredHeight = clampSize((text.fontSize * 1.35 + 14) * scale, rect.minSize.y * scale, rect.maxSize.y * scale)
      if (rect.aspectRatio > 0 && Number.isFinite(rect.aspectRatio)) {
        if (rect.aspectConstraint === 'WidthControlsHeight') desiredHeight = desiredWidth / rect.aspectRatio
        else if (rect.aspectConstraint === 'HeightControlsWidth') desiredWidth = desiredHeight * rect.aspectRatio
        else if (rect.aspectConstraint === 'Fit') { const ratio = desiredWidth / Math.max(1e-9, desiredHeight); if (ratio > rect.aspectRatio) desiredWidth = desiredHeight * rect.aspectRatio; else desiredHeight = desiredWidth / rect.aspectRatio }
      }
      let result: UiRect
      if (canvas) {
        const inset = canvas.safeArea ? canvas.safeAreaInsets : { left: 0, top: 0, right: 0, bottom: 0 }
        result = { x: inset.left * scale, y: inset.top * scale, width: Math.max(0, width - (inset.left + inset.right) * scale), height: Math.max(0, height - (inset.top + inset.bottom) * scale) }
      } else if (rect.anchorPreset === 'stretch' || rect.anchorMin.x !== rect.anchorMax.x || rect.anchorMin.y !== rect.anchorMax.y) {
        result = { x: parentRect.x + rect.margins.left * scale, y: parentRect.y + rect.margins.top * scale, width: Math.max(0, parentRect.width - (rect.margins.left + rect.margins.right) * scale), height: Math.max(0, parentRect.height - (rect.margins.top + rect.margins.bottom) * scale) }
      } else {
        const anchor = anchorPoint(rect.anchorPreset, parentRect)
        result = { x: anchor.x + position.x * scale - desiredWidth * rect.pivot.x, y: anchor.y + position.y * scale - desiredHeight * rect.pivot.y, width: desiredWidth, height: desiredHeight }
      }
      result.x += (rect.offsets.left - rect.offsets.right) * scale; result.y += (rect.offsets.top - rect.offsets.bottom) * scale
      const parentPanel = parent?.getComponent<Panel>('Panel')
      if (parentPanel && parentPanel.layout !== 'None') {
        const siblings = (children.get(parent!.uuid) ?? []).filter(sibling => sibling.enabled && sibling.getComponent<RectTransform>('RectTransform')?.enabled)
        const layout = parentPanel.layout === 'Horizontal' ? 'Row' : parentPanel.layout === 'Vertical' ? 'Column' : parentPanel.layout
        const sourceIndex = Math.max(0, siblings.indexOf(entity)), index = direction === 'rtl' && (layout === 'Row' || layout === 'Grid' || layout === 'Flow' || layout === 'Split') ? siblings.length - 1 - sourceIndex : sourceIndex
        const padding = parentPanel.padding, inner = { x: parentRect.x + padding.left * scale, y: parentRect.y + padding.top * scale, width: Math.max(0, parentRect.width - (padding.left + padding.right) * scale), height: Math.max(0, parentRect.height - (padding.top + padding.bottom) * scale) }
        const gap = parentPanel.gap * scale
        if (layout === 'Column') {
          const cellHeight = Math.max(0, (inner.height - Math.max(0, siblings.length - 1) * gap) / Math.max(1, siblings.length)); result = { x: inner.x, y: inner.y + index * (cellHeight + gap), width: inner.width, height: cellHeight }
        } else if (layout === 'Row' && !parentPanel.wrap || layout === 'Split') {
          const cellWidth = Math.max(0, (inner.width - Math.max(0, siblings.length - 1) * gap) / Math.max(1, siblings.length)); result = { x: inner.x + index * (cellWidth + gap), y: inner.y, width: cellWidth, height: inner.height }
        } else if (layout === 'Overlay' || layout === 'Margin') result = { ...inner }
        else if (layout === 'Center') result = { x: inner.x + (inner.width - desiredWidth) / 2, y: inner.y + (inner.height - desiredHeight) / 2, width: desiredWidth, height: desiredHeight }
        else if (layout === 'Aspect') { const ratio = rect.aspectRatio > 0 ? rect.aspectRatio : Math.max(1e-9, desiredWidth / Math.max(1e-9, desiredHeight)); let aspectWidth = inner.width, aspectHeight = aspectWidth / ratio; if (aspectHeight > inner.height) { aspectHeight = inner.height; aspectWidth = aspectHeight * ratio }; result = { x: inner.x + (inner.width - aspectWidth) / 2, y: inner.y + (inner.height - aspectHeight) / 2, width: aspectWidth, height: aspectHeight } }
        else {
          const flowColumns = Math.max(1, Math.floor((inner.width + gap) / Math.max(1, rect.preferredSize.x * scale + gap)))
          const columns = layout === 'Flow' ? Math.min(Math.max(1, siblings.length), flowColumns) : Math.max(1, Math.min(Math.max(1, siblings.length), Math.round(parentPanel.columns))), rows = Math.max(1, Math.ceil(siblings.length / columns)), column = index % columns, row = Math.floor(index / columns)
          const cellWidth = Math.max(0, (inner.width - (columns - 1) * gap) / columns), cellHeight = Math.max(0, (inner.height - (rows - 1) * gap) / rows)
          result = { x: inner.x + column * (cellWidth + gap), y: inner.y + row * (cellHeight + gap), width: cellWidth, height: cellHeight }
        }
      }
      if (parentPanel && (parentPanel.scrollHorizontal || parentPanel.scrollVertical)) { result.x -= (parentPanel.scrollHorizontal ? parentPanel.scrollOffset.x : 0) * scale; result.y -= (parentPanel.scrollVertical ? parentPanel.scrollOffset.y : 0) * scale }
      if (direction === 'rtl' && rect.mirrorInRtl && (!parentPanel || parentPanel.layout === 'None')) result.x = parentRect.x + parentRect.width - (result.x - parentRect.x) - result.width
      resolving.delete(entity.uuid); cache.set(entity.uuid, result); scaleCache.set(entity.uuid, scale); orderCache.set(entity.uuid, canvas?.sortingOrder ?? parentOrder)
      const inheritedTheme = parent ? themeCache.get(parent.uuid) ?? null : null; themeCache.set(entity.uuid, canvas?.themeAsset ? applyThemeVariant(readUiTheme(canvas.themeAsset), canvas.themeVariant) : inheritedTheme)
      return result
    }
    for (const entity of entities) if (entity.enabled && entity.hasComponent('RectTransform')) rectFor(entity)
    return entities.flatMap((entity, index) => {
      if (!entity.enabled || !entity.hasComponent('RectTransform') || entity.getComponent<Panel>('Panel')?.visible === false) return []
      const rect = cache.get(entity.uuid); if (!rect) return []
      const clips: ResolvedUi['clips'] = []
      let parent = entity.parentUuid ? byUuid.get(entity.parentUuid) : null
      while (parent) {
        const panel = parent.getComponent<Panel>('Panel'), parentBounds = cache.get(parent.uuid)
        if (panel && parentBounds && (panel.clipChildren || panel.maskChildren || panel.scrollHorizontal || panel.scrollVertical)) clips.unshift({ rect: parentBounds, rounded: panel.maskChildren ? panel.cornerRadius * (scaleCache.get(parent.uuid) ?? 1) : 0 })
        parent = parent.parentUuid ? byUuid.get(parent.parentUuid) : null
      }
      const zOrder = entity.getComponent<RectTransform>('RectTransform')?.zOrder ?? 0
      return [{ entity, rect, clips, scale: scaleCache.get(entity.uuid) ?? 1, theme: themeCache.get(entity.uuid) ?? null, order: (orderCache.get(entity.uuid) ?? 0) * 1_000_000 + entity.layer * 1000 + zOrder * 10 + index }]
    }).sort((first, second) => first.order - second.order)
  }

  private draw(context: CanvasRenderingContext2D, item: ResolvedUi, editor: boolean): void {
    const { entity, rect, theme } = item, panel = entity.getComponent<Panel>('Panel'), button = entity.getComponent<Button>('Button')
      if (panel || button) {
      if (button && !button.interactable) button.state = 'Disabled'
      const state = button ? button.state.toLowerCase() : 'normal', style = themeStyle(theme, button?.styleClass ?? panel?.styleClass ?? 'panel', state, button?.styleOverrides ?? panel?.styleOverrides)
      const stateColor = button?.state === 'Hovered' ? button.hoveredColor : button?.state === 'Pressed' ? button.pressedColor : button?.state === 'Disabled' ? button.disabledColor : button?.normalColor
      const fill = runtimeAccessibilitySettings.highContrast ? '#05070a' : typeof style.background === 'string' ? style.background : panel ? color(panel.color, panel.opacity) : color(stateColor ?? { r: 45, g: 106, b: 214 })
      roundRect(context, rect, Number(style.cornerRadius ?? panel?.cornerRadius ?? 10) * item.scale); context.globalAlpha = Number(style.opacity ?? 1); context.fillStyle = fill; context.fill(); context.globalAlpha = 1
      if (style.border) { context.strokeStyle = String(style.border); context.lineWidth = Number(style.borderWidth ?? 1); context.stroke() }
      if (panel?.showScrollbars && (panel.scrollHorizontal || panel.scrollVertical)) this.drawScrollbars(context, item, panel)
    }
    const image = entity.getComponent<Image>('Image')
    if (image?.spriteAsset) {
      const texture = resolveTexture(image.spriteAsset)
      if (texture) {
        const source = texture.source as CanvasImageSource & { width: number; height: number }, sx = texture.uv.x * source.width, sy = texture.uv.y * source.height, sw = texture.uv.width * source.width, sh = texture.uv.height * source.height
        const destination = { ...rect }
        if (image.preserveAspect && sw > 0 && sh > 0 && rect.width > 0 && rect.height > 0) { const scale = Math.min(rect.width / sw, rect.height / sh); destination.width = sw * scale; destination.height = sh * scale; destination.x += (rect.width - destination.width) / 2; destination.y += (rect.height - destination.height) / 2 }
        context.save(); context.globalAlpha = image.opacity / 100
        if (image.nineSlice.enabled && !image.preserveAspect) drawNineSliceImage(context, source, { x: sx, y: sy, width: sw, height: sh }, destination, image.nineSlice)
        else context.drawImage(source, sx, sy, sw, sh, destination.x, destination.y, destination.width, destination.height)
        if (image.tint.r !== 255 || image.tint.g !== 255 || image.tint.b !== 255) { context.globalCompositeOperation = 'multiply'; context.fillStyle = color(image.tint); context.fillRect(destination.x, destination.y, destination.width, destination.height); context.globalCompositeOperation = 'destination-in'; context.drawImage(source, sx, sy, sw, sh, destination.x, destination.y, destination.width, destination.height) }
        context.restore()
      } else this.drawMissingImage(context, rect, true)
    } else if (image && editor) this.drawMissingImage(context, rect, false)
    const progress = entity.getComponent<ProgressBar>('ProgressBar'), slider = entity.getComponent<Slider>('Slider')
    if (progress || slider) {
      const component = progress ?? slider!, style = themeStyle(theme, component.styleClass, 'normal', component.styleOverrides)
      const ratio = component.max > component.min ? Math.min(1, Math.max(0, (component.value - component.min) / (component.max - component.min))) : 0, barHeight = Math.min(12 * item.scale, rect.height), bar = { x: rect.x, y: rect.y + (rect.height - barHeight) / 2, width: rect.width, height: barHeight }
      roundRect(context, bar, barHeight / 2); context.fillStyle = typeof style.background === 'string' ? style.background : color(progress?.backgroundColor ?? { r: 31, g: 37, b: 47 }); context.fill()
      const filled = { ...bar, width: bar.width * ratio }; if (filled.width > 0) { roundRect(context, filled, barHeight / 2); context.fillStyle = typeof style.foreground === 'string' ? style.foreground : color(progress?.fillColor ?? { r: 79, g: 150, b: 255 }); context.fill() }
      if (slider) { context.beginPath(); context.arc(bar.x + bar.width * ratio, bar.y + bar.height / 2, 9 * item.scale, 0, Math.PI * 2); context.fillStyle = '#f7f9fc'; context.fill() }
    }
    const checkbox = entity.getComponent<Checkbox>('Checkbox')
    if (checkbox) {
      const style = themeStyle(theme, checkbox.styleClass, 'normal', checkbox.styleOverrides), box = Math.min(24 * item.scale, rect.height)
      context.strokeStyle = String(style.border ?? '#8d98aa'); context.lineWidth = Number(style.borderWidth ?? 2); context.strokeRect(rect.x, rect.y + (rect.height - box) / 2, box, box)
      if (checkbox.checked) { context.fillStyle = String(style.background ?? '#4f96ff'); context.fillRect(rect.x + 4, rect.y + (rect.height - box) / 2 + 4, box - 8, box - 8) }
      context.fillStyle = runtimeAccessibilitySettings.highContrast ? '#ffffff' : String(style.foreground ?? '#f5f7fb'); context.font = `${Number(style.fontWeight ?? 600)} ${Number(style.fontSize ?? 16) * item.scale * runtimeAccessibilitySettings.textScale}px Nunito Sans, Segoe UI, sans-serif`; context.textAlign = activeTextDirection() === 'rtl' ? 'right' : 'left'; context.textBaseline = 'middle'
      const label = localize(checkbox.localizationKey, {}, checkbox.label), x = activeTextDirection() === 'rtl' ? rect.x + rect.width - box - 9 : rect.x + box + 9; context.fillText(label, x, rect.y + rect.height / 2)
    }
    const input = entity.getComponent<TextInput>('TextInput')
    if (input) {
      const style = themeStyle(theme, input.styleClass, this.focusedInput === entity ? 'focused' : 'normal', input.styleOverrides)
      roundRect(context, rect, Number(style.cornerRadius ?? 8) * item.scale); context.strokeStyle = String(style.border ?? (this.focusedInput === entity ? '#4f96ff' : '#657085')); context.lineWidth = Number(style.borderWidth ?? (this.focusedInput === entity ? 2 : 1)); context.stroke()
      const shown = input.value ? (input.password ? '•'.repeat(input.value.length) : input.value) : input.placeholder
      context.fillStyle = runtimeAccessibilitySettings.highContrast ? '#ffffff' : String(style.foreground ?? (input.value ? '#f5f7fb' : '#7e899c')); context.font = `${Number(style.fontWeight ?? 500)} ${Number(style.fontSize ?? 16) * item.scale * runtimeAccessibilitySettings.textScale}px Nunito Sans, Segoe UI, sans-serif`; context.textAlign = activeTextDirection() === 'rtl' ? 'right' : 'left'; context.textBaseline = 'middle'; context.fillText(shown, activeTextDirection() === 'rtl' ? rect.x + rect.width - 12 : rect.x + 12, rect.y + rect.height / 2, Math.max(0, rect.width - 24))
    }
    const text = entity.getComponent<Text>('Text')
    if (text) {
      const fontAsset = resolveAsset(text.fontAsset), importedFallbacks = fontAsset?.assetType === 'font' ? fontAsset.settings.fontSettings.fallbackFamilies : [], fallbacks = [...new Set([...importedFallbacks, ...activeFontFallbackFamilies()])], localizedText = localize(text.localizationKey, text.localizationVariables, text.text), displayText = text.inputPromptAction ? formatInputPrompt(inputPromptForAction(text.inputPromptAction, this.inputActions)) : localizedText, rtl = activeTextDirection() === 'rtl'
      context.fillStyle = runtimeAccessibilitySettings.highContrast ? '#ffffff' : color(text.color, text.opacity); context.font = `${text.fontWeight} ${Math.max(1, text.fontSize * item.scale * runtimeAccessibilitySettings.textScale)}px ${fontAsset?.assetType === 'font' && fontAsset.fontFamily ? `"${fontAsset.fontFamily}"` : text.fontFamily}${fallbacks.length ? `, ${fallbacks.map(family => `"${family.replace(/["\\]/g, '')}"`).join(', ')}` : ''}`
      const align = rtl && text.align === 'left' ? 'right' : rtl && text.align === 'right' ? 'left' : text.align; context.textAlign = align; context.direction = rtl ? 'rtl' : 'ltr'; context.textBaseline = 'middle'
      const x = align === 'left' || align === 'start' ? rect.x : align === 'right' || align === 'end' ? rect.x + rect.width : rect.x + rect.width / 2
      const outline = fontAsset?.assetType === 'font' ? fontAsset.settings.fontSettings.outlineWidth * item.scale : 0
      if (outline > 0) { context.strokeStyle = '#000000'; context.lineWidth = outline * 2; context.lineJoin = 'round'; context.strokeText(displayText, x, rect.y + rect.height / 2, rect.width) }
      context.fillText(displayText, x, rect.y + rect.height / 2, rect.width)
    }
  }

  private drawFocusRing(context: CanvasRenderingContext2D, rect: UiRect): void { context.save(); context.strokeStyle = runtimeAccessibilitySettings.focusRingColor; context.lineWidth = runtimeAccessibilitySettings.focusRingWidth; context.setLineDash([]); context.strokeRect(rect.x - 3, rect.y - 3, rect.width + 6, rect.height + 6); context.restore() }
  private drawTooltip(context: CanvasRenderingContext2D): void { const current = this.tooltip; if (!current) return; const panel = current.entity.getComponent<Panel>('Panel'), item = this.resolved.find(candidate => candidate.entity === current.entity); if (!panel || !item || performance.now() - current.since < Math.max(0, panel.tooltipDelay) * 1000) return; const text = panel.tooltipText.slice(0, 500); context.save(); context.font = `${14 * runtimeAccessibilitySettings.textScale}px Nunito Sans, Segoe UI, sans-serif`; const width = Math.min(360, Math.max(90, context.measureText(text).width + 20)), x = Math.min(context.canvas.width - width - 8, Math.max(8, item.rect.x)), y = Math.min(context.canvas.height - 38, item.rect.y + item.rect.height + 6); roundRect(context, { x, y, width, height: 32 }, 7); context.fillStyle = runtimeAccessibilitySettings.highContrast ? '#000' : 'rgba(22,29,40,.96)'; context.fill(); context.strokeStyle = '#79b2ff'; context.stroke(); context.fillStyle = '#fff'; context.textAlign = 'left'; context.textBaseline = 'middle'; context.fillText(text, x + 10, y + 16, width - 20); context.restore() }
  private rawEntityAt(point: { x: number; y: number }): Entity | null { for (let index = this.resolved.length - 1; index >= 0; index--) { const item = this.resolved[index]; if (item.clips.every(clip => point.x >= clip.rect.x && point.x <= clip.rect.x + clip.rect.width && point.y >= clip.rect.y && point.y <= clip.rect.y + clip.rect.height) && point.x >= item.rect.x && point.x <= item.rect.x + item.rect.width && point.y >= item.rect.y && point.y <= item.rect.y + item.rect.height) return item.entity }; return null }
  private isDescendantOf(entity: Entity, ancestor: Entity): boolean { if (entity === ancestor) return true; const byUuid = new Map(this.resolved.map(item => [item.entity.uuid, item.entity])); let parent = entity.parentUuid ? byUuid.get(entity.parentUuid) : null; while (parent) { if (parent === ancestor) return true; parent = parent.parentUuid ? byUuid.get(parent.parentUuid) : null }; return false }
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

  private focusableItems(includeNonInteractive = false): ResolvedUi[] { return this.resolved.filter(item => { const rect = item.entity.getComponent<RectTransform>('RectTransform'); return rect?.focusable && !rect.skipNavigation && !rect.accessibilityHidden && (includeNonInteractive || interactive(item.entity)) && !isDisabled(item.entity) }).sort((first, second) => (first.entity.getComponent<RectTransform>('RectTransform')?.readingOrder ?? 0) - (second.entity.getComponent<RectTransform>('RectTransform')?.readingOrder ?? 0) || first.order - second.order) }
  private setFocus(entity: Entity): boolean { const item = this.resolved.find(candidate => candidate.entity === entity), rect = entity.getComponent<RectTransform>('RectTransform'); if (!item || !rect?.focusable || rect.skipNavigation || rect.accessibilityHidden || isDisabled(entity)) return false; this.focused = entity; if (runtimeAccessibilitySettings.announceFocusChanges) this.callback?.(entity, 'on_focus_enter'); audioRuntime.playUiClip(entity.getComponent<Button>('Button')?.focusAudio ?? this.themeSound(entity, 'focus') ?? uiAudioSettings.focus, uiAudioSettings.bus); return true }
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
    if (button?.interactable) { audioRuntime.playUiClip(button.pressAudio ?? this.themeSound(entity, 'press') ?? uiAudioSettings.press, uiAudioSettings.bus); if (rect?.remapAction) this.awaitingRemap = { entity, action: rect.remapAction, bindingIndex: Math.max(0, Math.round(rect.remapBindingIndex)) }; else this.callback?.(entity, button.onPressed || 'on_pressed') }
    else if (checkbox?.interactable) { checkbox.checked = !checkbox.checked; this.callback?.(entity, 'on_pressed') }
    else if (input?.interactable) this.focusedInput = entity
  }

  private adjustSlider(slider: Slider, direction: number): void { const step = slider.wholeNumbers ? 1 : Math.max((slider.max - slider.min) / 100, 1e-9); slider.value = Math.min(slider.max, Math.max(slider.min, slider.value + direction * step)); if (slider.wholeNumbers) slider.value = Math.round(slider.value) }
  private themeSound(entity: Entity, slot: 'hover' | 'press' | 'focus' | 'cancel'): string | null { const value = this.resolved.find(item => item.entity === entity)?.theme?.tokens.sounds[slot]; return typeof value === 'string' && value ? value : null }
  private updateSlider(entity: Entity, point: { x: number; y: number }): void { const slider = entity.getComponent<Slider>('Slider'), item = this.resolved.find(candidate => candidate.entity === entity); if (!slider || !item) return; const ratio = Math.min(1, Math.max(0, (point.x - item.rect.x) / Math.max(1, item.rect.width))), value = slider.min + (slider.max - slider.min) * ratio; slider.value = slider.wholeNumbers ? Math.round(value) : value }
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
