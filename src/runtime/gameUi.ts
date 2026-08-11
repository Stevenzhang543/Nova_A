import { resolveAsset, resolveTexture } from '../assets/AssetDatabase'
import type { Entity } from '../world/Entity'
import type {
  Button, Canvas, Checkbox, Image, Panel, ProgressBar, RectTransform, Slider, Text, TextInput
} from '../world/components'

interface UiRect { x: number; y: number; width: number; height: number }
interface ResolvedUi { entity: Entity; rect: UiRect; order: number }
type UiCallback = (entity: Entity, functionName: string) => void

function color(value: { r: number; g: number; b: number }, opacity = 100): string {
  return `rgba(${Math.round(value.r)},${Math.round(value.g)},${Math.round(value.b)},${Math.min(1, Math.max(0, opacity / 100))})`
}

function anchorPoint(preset: RectTransform['anchorPreset'], parent: UiRect): { x: number; y: number } {
  const left = preset.includes('left') || preset === 'left'
  const right = preset.includes('right') || preset === 'right'
  const top = preset.includes('top') || preset === 'top'
  const bottom = preset.includes('bottom') || preset === 'bottom'
  return {
    x: left ? parent.x : right ? parent.x + parent.width : parent.x + parent.width / 2,
    y: top ? parent.y : bottom ? parent.y + parent.height : parent.y + parent.height / 2
  }
}

function roundRect(context: CanvasRenderingContext2D, rect: UiRect, radius: number): void {
  const safe = Math.min(Math.max(0, radius), rect.width / 2, rect.height / 2)
  context.beginPath(); context.roundRect(rect.x, rect.y, rect.width, rect.height, safe)
}

class GameUiRuntime {
  private resolved: ResolvedUi[] = []
  private hovered: Entity | null = null
  private pressed: Entity | null = null
  private focusedInput: Entity | null = null
  private callback: UiCallback | null = null

  setCallback(callback: UiCallback): void { this.callback = callback }

  render(context: CanvasRenderingContext2D, width: number, height: number, entities: Entity[]): void {
    this.resolved = this.resolve(width, height, entities)
    context.save()
    for (const item of this.resolved) this.draw(context, item.entity, item.rect)
    context.restore()
  }

  pointerDown(point: { x: number; y: number }): boolean {
    const entity = this.hit(point)
    if (!entity) { this.focusedInput = null; return false }
    const button = entity.getComponent<Button>('Button')
    const slider = entity.getComponent<Slider>('Slider')
    const checkbox = entity.getComponent<Checkbox>('Checkbox')
    const input = entity.getComponent<TextInput>('TextInput')
    if (button?.interactable) { button.state = 'Pressed'; this.pressed = entity }
    else if (slider?.interactable) { this.pressed = entity; this.updateSlider(entity, point) }
    else if (checkbox?.interactable) { checkbox.checked = !checkbox.checked; this.callback?.(entity, 'on_pressed') }
    if (input?.interactable) this.focusedInput = entity
    return Boolean(button || slider || checkbox || input)
  }

  pointerMove(point: { x: number; y: number }): boolean {
    if (this.pressed?.getComponent<Slider>('Slider')) { this.updateSlider(this.pressed, point); return true }
    const entity = this.hit(point)
    if (entity === this.hovered) return Boolean(entity)
    const previous = this.hovered
    this.hovered = entity
    const previousButton = previous?.getComponent<Button>('Button')
    if (previousButton && previous !== this.pressed) previousButton.state = previousButton.interactable ? 'Normal' : 'Disabled'
    if (previous && previousButton) this.callback?.(previous, previousButton.onHoverExit || 'on_hover_exit')
    const button = entity?.getComponent<Button>('Button')
    if (button && entity !== this.pressed) button.state = button.interactable ? 'Hovered' : 'Disabled'
    if (entity && button) this.callback?.(entity, button.onHoverEnter || 'on_hover_enter')
    return Boolean(entity)
  }

  pointerUp(point: { x: number; y: number }): boolean {
    const pressed = this.pressed
    this.pressed = null
    if (!pressed) return false
    const button = pressed.getComponent<Button>('Button')
    if (button) {
      const inside = this.hit(point) === pressed
      button.state = button.interactable ? (inside ? 'Hovered' : 'Normal') : 'Disabled'
      if (inside && button.interactable) this.callback?.(pressed, button.onPressed || 'on_pressed')
    }
    return true
  }

  keyDown(event: KeyboardEvent): boolean {
    const input = this.focusedInput?.getComponent<TextInput>('TextInput')
    if (!input?.interactable) return false
    if (event.key === 'Backspace') input.value = input.value.slice(0, -1)
    else if (event.key === 'Escape' || event.key === 'Enter') this.focusedInput = null
    else if (event.key.length === 1 && input.value.length < Math.max(0, input.maxLength)) input.value += event.key
    else return false
    return true
  }

  reset(): void {
    if (this.hovered) {
      const button = this.hovered.getComponent<Button>('Button')
      if (button) button.state = button.interactable ? 'Normal' : 'Disabled'
    }
    this.resolved = []; this.hovered = null; this.pressed = null; this.focusedInput = null
  }

  private resolve(width: number, height: number, entities: Entity[]): ResolvedUi[] {
    const byUuid = new Map(entities.map(entity => [entity.uuid, entity]))
    const cache = new Map<string, UiRect>()
    const scaleCache = new Map<string, number>()
    const canvasOrderCache = new Map<string, number>()
    const viewport = { x: 0, y: 0, width, height }
    const resolving = new Set<string>()
    const rectFor = (entity: Entity): UiRect | null => {
      const cached = cache.get(entity.uuid); if (cached) return cached
      const rect = entity.getComponent<RectTransform>('RectTransform')
      if (!rect?.enabled || resolving.has(entity.uuid)) return null
      resolving.add(entity.uuid)
      const parent = entity.parentUuid ? byUuid.get(entity.parentUuid) : null
      const parentRect = parent ? rectFor(parent) ?? viewport : viewport
      const parentScale = parent ? scaleCache.get(parent.uuid) ?? 1 : 1
      const parentCanvasOrder = parent ? canvasOrderCache.get(parent.uuid) ?? 0 : 0
      const canvas = entity.getComponent<Canvas>('Canvas')
      const ownScale = canvas?.scaleWithScreen
        ? Math.min(width / Math.max(1, canvas.referenceSize.x), height / Math.max(1, canvas.referenceSize.y))
        : parentScale
      const scale = canvas ? ownScale : parentScale
      let result: UiRect
      if (canvas) result = viewport
      else if (rect.anchorPreset === 'stretch') {
        result = {
          x: parentRect.x + rect.margins.left * scale,
          y: parentRect.y + rect.margins.top * scale,
          width: Math.max(0, parentRect.width - (rect.margins.left + rect.margins.right) * scale),
          height: Math.max(0, parentRect.height - (rect.margins.top + rect.margins.bottom) * scale)
        }
      } else {
        const anchor = anchorPoint(rect.anchorPreset, parentRect)
        result = {
          x: anchor.x + rect.position.x * scale - rect.size.x * scale * rect.pivot.x,
          y: anchor.y + rect.position.y * scale - rect.size.y * scale * rect.pivot.y,
          width: Math.max(0, rect.size.x * scale), height: Math.max(0, rect.size.y * scale)
        }
      }
      resolving.delete(entity.uuid); cache.set(entity.uuid, result); scaleCache.set(entity.uuid, scale); canvasOrderCache.set(entity.uuid, canvas?.sortingOrder ?? parentCanvasOrder); return result
    }
    return entities.flatMap((entity, index) => {
      if (!entity.enabled || !entity.hasComponent('RectTransform')) return []
      const rect = rectFor(entity); if (!rect) return []
      return [{ entity, rect, order: (canvasOrderCache.get(entity.uuid) ?? 0) * 1_000_000 + entity.layer * 1000 + index }]
    }).sort((first, second) => first.order - second.order)
  }

  private draw(context: CanvasRenderingContext2D, entity: Entity, rect: UiRect): void {
    const panel = entity.getComponent<Panel>('Panel')
    const button = entity.getComponent<Button>('Button')
    if (panel || button) {
      let fill = panel ? color(panel.color, panel.opacity) : color({ r: 45, g: 106, b: 214 })
      if (button) {
        if (!button.interactable) button.state = 'Disabled'
        const stateColor = button.state === 'Hovered' ? button.hoveredColor : button.state === 'Pressed' ? button.pressedColor : button.state === 'Disabled' ? button.disabledColor : button.normalColor
        fill = color(stateColor)
      }
      roundRect(context, rect, panel?.cornerRadius ?? 10); context.fillStyle = fill; context.fill()
    }
    const image = entity.getComponent<Image>('Image')
    if (image?.spriteAsset) {
      const texture = resolveTexture(image.spriteAsset)
      if (texture) {
        const source = texture.source as CanvasImageSource & { width: number; height: number }
        const sx = texture.uv.x * source.width; const sy = texture.uv.y * source.height
        const sw = texture.uv.width * source.width; const sh = texture.uv.height * source.height
        const destination = { ...rect }
        if (image.preserveAspect && sw > 0 && sh > 0 && rect.width > 0 && rect.height > 0) {
          const scale = Math.min(rect.width / sw, rect.height / sh)
          destination.width = sw * scale; destination.height = sh * scale
          destination.x += (rect.width - destination.width) / 2; destination.y += (rect.height - destination.height) / 2
        }
        context.save(); context.globalAlpha = image.opacity / 100
        context.drawImage(source, sx, sy, sw, sh, destination.x, destination.y, destination.width, destination.height)
        if (image.tint.r !== 255 || image.tint.g !== 255 || image.tint.b !== 255) {
          context.globalCompositeOperation = 'multiply'; context.fillStyle = color(image.tint); context.fillRect(destination.x, destination.y, destination.width, destination.height)
          context.globalCompositeOperation = 'destination-in'; context.drawImage(source, sx, sy, sw, sh, destination.x, destination.y, destination.width, destination.height)
        }
        context.restore()
      }
    }
    const progress = entity.getComponent<ProgressBar>('ProgressBar')
    const slider = entity.getComponent<Slider>('Slider')
    if (progress || slider) {
      const min = progress?.min ?? slider!.min; const max = progress?.max ?? slider!.max; const value = progress?.value ?? slider!.value
      const ratio = max > min ? Math.min(1, Math.max(0, (value - min) / (max - min))) : 0
      const barHeight = Math.min(12, rect.height)
      const bar = { x: rect.x, y: rect.y + (rect.height - barHeight) / 2, width: rect.width, height: barHeight }
      roundRect(context, bar, barHeight / 2); context.fillStyle = color(progress?.backgroundColor ?? { r: 31, g: 37, b: 47 }); context.fill()
      const filled = { ...bar, width: bar.width * ratio }
      if (filled.width > 0) { roundRect(context, filled, barHeight / 2); context.fillStyle = color(progress?.fillColor ?? { r: 79, g: 150, b: 255 }); context.fill() }
      if (slider) { context.beginPath(); context.arc(bar.x + bar.width * ratio, bar.y + bar.height / 2, 9, 0, Math.PI * 2); context.fillStyle = '#f7f9fc'; context.fill() }
    }
    const checkbox = entity.getComponent<Checkbox>('Checkbox')
    if (checkbox) {
      const box = Math.min(24, rect.height); context.strokeStyle = '#8d98aa'; context.lineWidth = 2; context.strokeRect(rect.x, rect.y + (rect.height - box) / 2, box, box)
      if (checkbox.checked) { context.fillStyle = '#4f96ff'; context.fillRect(rect.x + 4, rect.y + (rect.height - box) / 2 + 4, box - 8, box - 8) }
      context.fillStyle = '#f5f7fb'; context.font = '600 16px Nunito Sans, Segoe UI, sans-serif'; context.textAlign = 'left'; context.textBaseline = 'middle'; context.fillText(checkbox.label, rect.x + box + 9, rect.y + rect.height / 2)
    }
    const input = entity.getComponent<TextInput>('TextInput')
    if (input) {
      roundRect(context, rect, 8); context.strokeStyle = this.focusedInput === entity ? '#4f96ff' : '#657085'; context.lineWidth = this.focusedInput === entity ? 2 : 1; context.stroke()
      const shown = input.value ? (input.password ? '•'.repeat(input.value.length) : input.value) : input.placeholder
      context.fillStyle = input.value ? '#f5f7fb' : '#7e899c'; context.font = '500 16px Nunito Sans, Segoe UI, sans-serif'; context.textAlign = 'left'; context.textBaseline = 'middle'; context.fillText(shown, rect.x + 12, rect.y + rect.height / 2, Math.max(0, rect.width - 24))
    }
    const text = entity.getComponent<Text>('Text')
    if (text) {
      const fontAsset = resolveAsset(text.fontAsset)
      context.fillStyle = color(text.color, text.opacity); context.font = `${text.fontWeight} ${Math.max(1, text.fontSize)}px ${fontAsset?.assetType === 'font' && fontAsset.fontFamily ? fontAsset.fontFamily : text.fontFamily}`
      context.textAlign = text.align; context.textBaseline = 'middle'
      const x = text.align === 'left' || text.align === 'start' ? rect.x : text.align === 'right' || text.align === 'end' ? rect.x + rect.width : rect.x + rect.width / 2
      context.fillText(text.text, x, rect.y + rect.height / 2, rect.width)
    }
  }

  private hit(point: { x: number; y: number }): Entity | null {
    for (let index = this.resolved.length - 1; index >= 0; index--) {
      const { entity, rect } = this.resolved[index]
      const interactive = entity.hasComponent('Button') || entity.hasComponent('Slider') || entity.hasComponent('Checkbox') || entity.hasComponent('TextInput')
      if (interactive && point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height) return entity
    }
    return null
  }

  private updateSlider(entity: Entity, point: { x: number; y: number }): void {
    const slider = entity.getComponent<Slider>('Slider'); const item = this.resolved.find(candidate => candidate.entity === entity)
    if (!slider || !item) return
    const ratio = Math.min(1, Math.max(0, (point.x - item.rect.x) / Math.max(1, item.rect.width)))
    const value = slider.min + (slider.max - slider.min) * ratio
    slider.value = slider.wholeNumbers ? Math.round(value) : value
  }
}

export const gameUiRuntime = new GameUiRuntime()
