import type {
  CameraRenderView,
  FrameOptions,
  Renderer2D,
  RendererStats,
  ShapeRenderCommand,
  SpriteRenderCommand,
  TextRenderCommand,
  TileChunkRenderCommand,
  TextureRegion
} from './types'

type QueuedCommand =
  | { type: 'shape'; value: ShapeRenderCommand }
  | { type: 'sprite'; value: SpriteRenderCommand }
  | { type: 'text'; value: TextRenderCommand }

function cssColor(color: { r: number; g: number; b: number; a: number }): string {
  return `rgba(${color.r},${color.g},${color.b},${Math.min(1, Math.max(0, color.a))})`
}

function textureDimensions(source: TexImageSource): { width: number; height: number } {
  const value = source as unknown as {
    naturalWidth?: number; naturalHeight?: number; videoWidth?: number; videoHeight?: number
    width?: number; height?: number; displayWidth?: number; displayHeight?: number
  }
  return {
    width: value.naturalWidth ?? value.videoWidth ?? value.displayWidth ?? value.width ?? 1,
    height: value.naturalHeight ?? value.videoHeight ?? value.displayHeight ?? value.height ?? 1
  }
}

export class Canvas2DRenderer implements Renderer2D {
  readonly stats: RendererStats = { backend: 'Canvas2D', drawCalls: 0, batches: 0, triangles: 0, sprites: 0, shapes: 0, text: 0 }
  private readonly context: CanvasRenderingContext2D
  private commands: QueuedCommand[] = []
  private tintedTextures = new WeakMap<object, Map<string, HTMLCanvasElement>>()
  private frame: FrameOptions = { width: 1, height: 1, pixelRatio: 1, clearColor: { r: 0, g: 0, b: 0, a: 1 } }
  private camera: CameraRenderView = { scale: 1, offset: { x: 0, y: 0 } }

  constructor(private readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d', { alpha: false })
    if (!context) throw new Error('Canvas2D is unavailable')
    this.context = context
  }

  resize(width: number, height: number, pixelRatio: number): void {
    const pixelWidth = Math.max(1, Math.round(width * pixelRatio))
    const pixelHeight = Math.max(1, Math.round(height * pixelRatio))
    if (this.canvas.width !== pixelWidth) this.canvas.width = pixelWidth
    if (this.canvas.height !== pixelHeight) this.canvas.height = pixelHeight
  }
  beginFrame(options: FrameOptions): void {
    this.frame = options
    this.resize(options.width, options.height, options.pixelRatio)
    this.commands = []
    Object.assign(this.stats, { drawCalls: 0, batches: 0, triangles: 0, sprites: 0, shapes: 0, text: 0 })
    this.context.setTransform(options.pixelRatio, 0, 0, options.pixelRatio, 0, 0)
    this.context.fillStyle = cssColor(options.clearColor)
    this.context.fillRect(0, 0, options.width, options.height)
  }
  beginCamera(camera: CameraRenderView): void { this.camera = camera }
  submitSprite(command: SpriteRenderCommand): void { this.commands.push({ type: 'sprite', value: command }); this.stats.sprites++ }
  submitShape(command: ShapeRenderCommand): void { this.commands.push({ type: 'shape', value: command }); this.stats.shapes++ }
  submitText(command: TextRenderCommand): void { this.commands.push({ type: 'text', value: command }); this.stats.text++ }
  submitTileChunk(command: TileChunkRenderCommand): void { for (const sprite of command.sprites) this.submitSprite({ ...sprite, sortingLayer: command.sortingLayer, orderInLayer: command.orderInLayer, material: command.material, blendMode: command.blendMode }) }
  endCamera(): void { /* Rendering is sorted and performed in endFrame. */ }
  endFrame(): RendererStats {
    this.commands.sort((first, second) => first.value.sortingLayer - second.value.sortingLayer || first.value.orderInLayer - second.value.orderInLayer)
    const context = this.context
    context.save()
    const center = this.camera.position
    const viewport = this.camera.viewport ?? { x: 0, y: 0, width: 1, height: 1 }
    const viewportX = viewport.x * this.frame.width
    const viewportY = (1 - viewport.y - viewport.height) * this.frame.height
    const viewportWidth = viewport.width * this.frame.width
    const viewportHeight = viewport.height * this.frame.height
    context.beginPath()
    context.rect(viewportX, viewportY, viewportWidth, viewportHeight)
    context.clip()
    context.translate(viewportX + viewportWidth * .5, viewportY + viewportHeight * .5)
    context.scale(this.camera.scale, -this.camera.scale)
    context.rotate(-(this.camera.rotation ?? 0))
    if (center) context.translate(-center.x, -center.y)
    else context.translate(
      -(this.frame.width * .5 - this.camera.offset.x) / this.camera.scale,
      -(this.camera.offset.y - this.frame.height * .5) / this.camera.scale
    )
    for (const command of this.commands) {
      context.save()
      const value = command.value
      context.translate(value.position.x, value.position.y)
      context.rotate(value.rotation)
      context.scale(value.scale.x, value.scale.y)
      context.globalCompositeOperation = value.blendMode === 'Additive' ? 'lighter' : 'source-over'
      if (command.type === 'shape') this.drawShape(context, command.value)
      else if (command.type === 'sprite') this.drawSprite(context, command.value)
      else this.drawText(context, command.value)
      context.restore()
      this.stats.drawCalls++
      this.stats.triangles += command.type === 'shape'
        ? command.value.shape === 'Line' ? 2 : Math.max(1, command.value.shape === 'Ellipse' ? 46 : command.value.vertices.length - 2)
        : 2
    }
    context.restore()
    this.stats.batches = this.stats.drawCalls
    return { ...this.stats }
  }
  destroy(): void { this.commands = []; this.tintedTextures = new WeakMap() }

  private drawShape(context: CanvasRenderingContext2D, command: ShapeRenderCommand): void {
    context.beginPath()
    if (command.shape === 'Ellipse') context.ellipse(0, 0, command.radiusX, command.radiusY, 0, 0, Math.PI * 2)
    else if (command.vertices.length) {
      context.moveTo(command.vertices[0].x, command.vertices[0].y)
      for (let index = 1; index < command.vertices.length; index++) context.lineTo(command.vertices[index].x, command.vertices[index].y)
      if (command.shape !== 'Line') context.closePath()
    }
    if (command.shape !== 'Line' && command.fill.a > 0) {
      context.fillStyle = cssColor(command.fill)
      context.fill()
      if (command.texture) {
        const xs = command.vertices.map(point => point.x), ys = command.vertices.map(point => point.y)
        const left = command.shape === 'Ellipse' ? -command.radiusX : Math.min(...xs)
        const right = command.shape === 'Ellipse' ? command.radiusX : Math.max(...xs)
        const bottom = command.shape === 'Ellipse' ? -command.radiusY : Math.min(...ys)
        const top = command.shape === 'Ellipse' ? command.radiusY : Math.max(...ys)
        context.save(); context.clip(); context.scale(1, -1)
        this.drawTexture(context, command.texture, left, -top, right - left, top - bottom)
        context.restore()
      }
    }
    if (command.strokeWidth > 0 && command.stroke.a > 0) {
      context.strokeStyle = cssColor(command.stroke)
      context.lineWidth = command.strokeWidth
      context.stroke()
    }
  }
  private drawSprite(context: CanvasRenderingContext2D, command: SpriteRenderCommand): void {
    const left = -command.pivot.x * command.size.x
    const bottom = -command.pivot.y * command.size.y
    context.globalAlpha = command.tint.a
    context.scale(command.flipX ? -1 : 1, command.flipY ? -1 : 1)
    context.scale(1, -1)
    this.drawTexture(context, command.texture, left, -bottom - command.size.y, command.size.x, command.size.y, command.tint)
    context.globalAlpha = 1
  }
  private drawText(context: CanvasRenderingContext2D, command: TextRenderCommand): void {
    context.scale(1, -1)
    context.fillStyle = cssColor(command.color)
    context.font = `${command.fontWeight} ${command.fontSize}px ${command.fontFamily}`
    context.textAlign = command.align
    context.textBaseline = 'middle'
    context.fillText(command.text, 0, 0, command.maxWidth > 0 ? command.maxWidth : undefined)
  }

  private drawTexture(
    context: CanvasRenderingContext2D,
    region: TextureRegion,
    x: number,
    y: number,
    width: number,
    height: number,
    tint?: { r: number; g: number; b: number }
  ): void {
    const dimensions = textureDimensions(region.source)
    const sourceX = region.uv.x * dimensions.width
    const sourceY = region.uv.y * dimensions.height
    const sourceWidth = Math.max(1, region.uv.width * dimensions.width)
    const sourceHeight = Math.max(1, region.uv.height * dimensions.height)
    context.imageSmoothingEnabled = region.filter !== 'Nearest'
    const white = !tint || (tint.r >= 254.5 && tint.g >= 254.5 && tint.b >= 254.5)
    if (white) {
      context.drawImage(region.source as CanvasImageSource, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height)
      return
    }
    const source = region.source as unknown as object
    let variants = this.tintedTextures.get(source)
    if (!variants) { variants = new Map(); this.tintedTextures.set(source, variants) }
    const key = `${sourceX}:${sourceY}:${sourceWidth}:${sourceHeight}:${tint.r}:${tint.g}:${tint.b}`
    let tinted = variants.get(key)
    if (!tinted) {
      tinted = document.createElement('canvas')
      tinted.width = Math.max(1, Math.round(sourceWidth))
      tinted.height = Math.max(1, Math.round(sourceHeight))
      const tintContext = tinted.getContext('2d', { alpha: true })!
      tintContext.drawImage(region.source as CanvasImageSource, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, tinted.width, tinted.height)
      tintContext.globalCompositeOperation = 'multiply'
      tintContext.fillStyle = `rgb(${tint.r},${tint.g},${tint.b})`
      tintContext.fillRect(0, 0, tinted.width, tinted.height)
      tintContext.globalCompositeOperation = 'destination-in'
      tintContext.drawImage(region.source as CanvasImageSource, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, tinted.width, tinted.height)
      variants.set(key, tinted)
    }
    context.drawImage(tinted, x, y, width, height)
  }
}
