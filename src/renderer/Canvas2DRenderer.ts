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
  | { type: 'shape'; value: ShapeRenderCommand; camera: CameraRenderView; cameraIndex: number }
  | { type: 'sprite'; value: SpriteRenderCommand; camera: CameraRenderView; cameraIndex: number }
  | { type: 'text'; value: TextRenderCommand; camera: CameraRenderView; cameraIndex: number }

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
  readonly stats: RendererStats = { backend: 'Canvas2D', drawCalls: 0, batches: 0, triangles: 0, sprites: 0, shapes: 0, text: 0, textures: 0, gpuMs: null, passes: 1, renderTargets: 0, overdraw: 0 }
  private readonly context: CanvasRenderingContext2D
  private commands: QueuedCommand[] = []
  private tintedTextures = new WeakMap<object, Map<string, HTMLCanvasElement>>()
  private frame: FrameOptions = { width: 1, height: 1, pixelRatio: 1, clearColor: { r: 0, g: 0, b: 0, a: 1 } }
  private camera: CameraRenderView = { scale: 1, offset: { x: 0, y: 0 } }
  private cameraIndex = -1

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
    this.cameraIndex = -1
    Object.assign(this.stats, { drawCalls: 0, batches: 0, triangles: 0, sprites: 0, shapes: 0, text: 0, textures: 0, gpuMs: null, passes: 1, renderTargets: 0, overdraw: 0 })
    this.context.setTransform(options.pixelRatio, 0, 0, options.pixelRatio, 0, 0)
    this.context.fillStyle = cssColor(options.clearColor)
    this.context.fillRect(0, 0, options.width, options.height)
  }
  beginCamera(camera: CameraRenderView): void { this.camera = camera; this.cameraIndex++ }
  submitSprite(command: SpriteRenderCommand): void { this.commands.push({ type: 'sprite', value: command, camera: this.camera, cameraIndex: this.cameraIndex }); this.stats.sprites++ }
  submitShape(command: ShapeRenderCommand): void { this.commands.push({ type: 'shape', value: command, camera: this.camera, cameraIndex: this.cameraIndex }); this.stats.shapes++ }
  submitText(command: TextRenderCommand): void { this.commands.push({ type: 'text', value: command, camera: this.camera, cameraIndex: this.cameraIndex }); this.stats.text++ }
  submitTileChunk(command: TileChunkRenderCommand): void { for (const sprite of command.sprites) this.submitSprite({ ...sprite, sortingLayer: command.sortingLayer, orderInLayer: command.orderInLayer, material: command.material, blendMode: command.blendMode }) }
  endCamera(): void { /* Rendering is sorted and performed in endFrame. */ }
  endFrame(): RendererStats {
    this.commands.sort((first, second) => first.cameraIndex - second.cameraIndex || first.value.sortingLayer - second.value.sortingLayer || first.value.orderInLayer - second.value.orderInLayer)
    const context = this.context
    let activeCameraIndex = Number.NaN
    let cameraSaved = false
    for (const command of this.commands) {
      if (command.cameraIndex !== activeCameraIndex) {
        if (cameraSaved) context.restore()
        activeCameraIndex = command.cameraIndex
        cameraSaved = true
        context.save()
        this.applyCamera(context, command.camera)
      }
      context.save()
      const value = command.value
      context.translate(value.position.x, value.position.y)
      context.rotate(value.rotation)
      context.scale(value.scale.x, value.scale.y)
      context.globalCompositeOperation = value.blendMode === 'Additive' ? 'lighter' : value.blendMode === 'Multiply' ? 'multiply' : value.blendMode === 'Screen' ? 'screen' : 'source-over'
      if (command.type === 'shape') this.drawShape(context, command.value)
      else if (command.type === 'sprite') this.drawSprite(context, command.value)
      else this.drawText(context, command.value)
      context.restore()
      this.stats.drawCalls++
      this.stats.triangles += command.type === 'shape'
        ? command.value.shape === 'Line' ? 2 : Math.max(1, command.value.shape === 'Ellipse' ? 46 : command.value.vertices.length - 2)
        : 2
      this.stats.overdraw += command.type === 'shape' ? Math.max(1, command.value.vertices.length - 2) : 2
    }
    if (cameraSaved) context.restore()
    this.stats.batches = this.stats.drawCalls
    return { ...this.stats }
  }
  destroy(): void { this.commands = []; this.tintedTextures = new WeakMap() }

  private applyCamera(context: CanvasRenderingContext2D, camera: CameraRenderView): void {
    const center = camera.position
    const viewport = camera.viewport ?? { x: 0, y: 0, width: 1, height: 1 }
    const viewportX = viewport.x * this.frame.width
    const viewportY = (1 - viewport.y - viewport.height) * this.frame.height
    const viewportWidth = viewport.width * this.frame.width
    const viewportHeight = viewport.height * this.frame.height
    context.beginPath()
    context.rect(viewportX, viewportY, viewportWidth, viewportHeight)
    context.clip()
    context.translate(viewportX + viewportWidth * .5, viewportY + viewportHeight * .5)
    context.scale(camera.scale, -camera.scale)
    context.rotate(-(camera.rotation ?? 0))
    if (center) context.translate(-center.x, -center.y)
    else context.translate(
      -(this.frame.width * .5 - camera.offset.x) / camera.scale,
      -(camera.offset.y - this.frame.height * .5) / camera.scale
    )
  }

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
    if (command.mesh) {
      this.drawSkinnedMesh(context, command)
      return
    }
    const left = -command.pivot.x * command.size.x
    const bottom = -command.pivot.y * command.size.y
    context.globalAlpha = command.tint.a
    context.scale(command.flipX ? -1 : 1, command.flipY ? -1 : 1)
    context.scale(1, -1)
    if (command.nineSlice) this.drawNineSlice(context, command, left, -bottom - command.size.y)
    else this.drawTexture(context, command.texture, left, -bottom - command.size.y, command.size.x, command.size.y, command.tint)
    context.globalAlpha = 1
  }
  private drawSkinnedMesh(context: CanvasRenderingContext2D, command: SpriteRenderCommand): void {
    const mesh = command.mesh!
    const dimensions = textureDimensions(command.texture.source)
    const region = command.texture.uv
    context.globalAlpha = command.tint.a
    context.imageSmoothingEnabled = command.texture.filter !== 'Nearest'
    for (let index = 0; index + 2 < mesh.indices.length; index += 3) {
      const indices = [mesh.indices[index], mesh.indices[index + 1], mesh.indices[index + 2]]
      const p = indices.map(vertex => mesh.positions[vertex])
      const uv = indices.map(vertex => ({
        x: (region.x + (command.flipX ? 1 - mesh.uvs[vertex].x : mesh.uvs[vertex].x) * region.width) * dimensions.width,
        y: (region.y + (command.flipY ? 1 - mesh.uvs[vertex].y : mesh.uvs[vertex].y) * region.height) * dimensions.height
      }))
      const denominator = uv[0].x * (uv[1].y - uv[2].y) + uv[1].x * (uv[2].y - uv[0].y) + uv[2].x * (uv[0].y - uv[1].y)
      if (Math.abs(denominator) < 1e-9) continue
      const a = (p[0].x * (uv[1].y - uv[2].y) + p[1].x * (uv[2].y - uv[0].y) + p[2].x * (uv[0].y - uv[1].y)) / denominator
      const c = (p[0].x * (uv[2].x - uv[1].x) + p[1].x * (uv[0].x - uv[2].x) + p[2].x * (uv[1].x - uv[0].x)) / denominator
      const e = (p[0].x * (uv[1].x * uv[2].y - uv[2].x * uv[1].y) + p[1].x * (uv[2].x * uv[0].y - uv[0].x * uv[2].y) + p[2].x * (uv[0].x * uv[1].y - uv[1].x * uv[0].y)) / denominator
      const b = (p[0].y * (uv[1].y - uv[2].y) + p[1].y * (uv[2].y - uv[0].y) + p[2].y * (uv[0].y - uv[1].y)) / denominator
      const d = (p[0].y * (uv[2].x - uv[1].x) + p[1].y * (uv[0].x - uv[2].x) + p[2].y * (uv[1].x - uv[0].x)) / denominator
      const f = (p[0].y * (uv[1].x * uv[2].y - uv[2].x * uv[1].y) + p[1].y * (uv[2].x * uv[0].y - uv[0].x * uv[2].y) + p[2].y * (uv[0].x * uv[1].y - uv[1].x * uv[0].y)) / denominator
      context.save(); context.beginPath(); context.moveTo(p[0].x, -p[0].y); context.lineTo(p[1].x, -p[1].y); context.lineTo(p[2].x, -p[2].y); context.closePath(); context.clip()
      context.transform(a, -b, c, -d, e, -f)
      context.drawImage(command.texture.source as CanvasImageSource, 0, 0)
      context.restore()
    }
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

  private drawNineSlice(context: CanvasRenderingContext2D, command: SpriteRenderCommand, x: number, y: number): void {
    const slice = command.nineSlice!
    const dimensions = textureDimensions(command.texture.source)
    const sourceX = command.texture.uv.x * dimensions.width, sourceY = command.texture.uv.y * dimensions.height
    const sourceWidth = command.texture.uv.width * dimensions.width, sourceHeight = command.texture.uv.height * dimensions.height
    const sx = [0, Math.min(sourceWidth, slice.left), Math.max(0, sourceWidth - slice.right), sourceWidth]
    const sy = [0, Math.min(sourceHeight, slice.top), Math.max(0, sourceHeight - slice.bottom), sourceHeight]
    const dx = [0, Math.min(command.size.x, slice.left / Math.max(1, sourceWidth) * command.size.x), Math.max(0, command.size.x - slice.right / Math.max(1, sourceWidth) * command.size.x), command.size.x]
    const dy = [0, Math.min(command.size.y, slice.top / Math.max(1, sourceHeight) * command.size.y), Math.max(0, command.size.y - slice.bottom / Math.max(1, sourceHeight) * command.size.y), command.size.y]
    context.imageSmoothingEnabled = command.texture.filter !== 'Nearest'
    for (let row = 0; row < 3; row++) for (let column = 0; column < 3; column++) {
      const sw = sx[column + 1] - sx[column], sh = sy[row + 1] - sy[row], dw = dx[column + 1] - dx[column], dh = dy[row + 1] - dy[row]
      if (sw > 0 && sh > 0 && dw > 0 && dh > 0) context.drawImage(command.texture.source as CanvasImageSource, sourceX + sx[column], sourceY + sy[row], sw, sh, x + dx[column], y + dy[row], dw, dh)
    }
  }
}
