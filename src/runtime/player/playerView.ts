/** 26.43 P-E2：独立播放器的游戏视图。一个世界画布 + 一个界面叠加画布，原生 DOM，无框架。
 *
 * Owns the frame loop for one play session: samples game UI input, advances the Runtime with the
 * viewport rectangle, renders the World through the shared scene renderer (WebGL2, or Canvas2D when
 * WebGL2 is unavailable), then draws the HUD, Canvas2D lighting fallback and debug views on the overlay.
 * HUD controls get invisible accessibility nodes, text fields a real <input>, touch screens the
 * project's (or automatic) virtual controls, and timeline subtitles/captions a live region. */
import { createRenderer2D, RendererCanvasReplacementRequired, type Renderer2D } from '../../renderer/core'
import { renderWorld } from '../../renderer/sceneRenderer'
import { renderDebugView2D, renderLighting2D, renderPostProcessOverlay } from '../../renderer/lighting2d'
import { boundedFrame } from '../../renderer/surfaceLimits'
import { prepareHierarchyIndex } from '../../world/hierarchy'
import { normalizeSimulationFrameDelta } from '../engineTiming'
import { UiNativeInputBridge } from '../uiNativeInput'
import { latencyProbe } from '../latencyProbe'
import { beginPerformanceFrame, completePerformanceFrame, markPerformanceSubmission, performanceRuntimeState, rebasePerformanceFrameContinuity } from '../largeWorldPerformance'
import { automaticVirtualControls, deviceInputSettings, deviceRuntimeState, performHaptic, refreshDeviceCapabilities, type VirtualControlSettings } from '../deviceInput'
import { createVirtualControlsInputOwner } from '../virtualControlsInputOwner'
import type { GameplayRuntime } from '../GameplayRuntimeCore'
import type { GameUiOwner, UiAccessibilityNode } from '../gameUiOwner'
import type { RuntimeWorldHost } from '../runtimeWorldHost'
import type { RuntimeRenderingPolicyOwner } from '../../renderer/runtimeRenderingPolicyOwner'
import type { PlayerSurface } from './playerSurface'
import type { Entity } from '../../world/Entity'
import type { RectTransform, TextInput } from '../../world/components'

export interface PlayerViewOptions {
  readonly runtime: GameplayRuntime
  readonly host: RuntimeWorldHost
  readonly surface: PlayerSurface
  readonly rendering: RuntimeRenderingPolicyOwner
  readonly gameUi: GameUiOwner
  readonly setInputModality: (modality: 'touch' | 'pen' | 'mouse') => void
  readonly label: string
  readonly controlsLabel?: string
  readonly uiLabel?: string
  /** Called at the start of every rendered frame, before input is sampled. */
  readonly beforeFrame?: () => void
  readonly log: (message: string, level: 'error' | 'warning' | 'info') => void
}
export interface PlayerFrameInfo { readonly width: number; readonly height: number; readonly pixelRatio: number; readonly frameMs: number }
export interface PlayerView { readonly root: HTMLElement; readonly stats: PlayerViewStats; rebuildRenderer(reason: string): void; setAfterFrame(listener: ((frame: PlayerFrameInfo) => void) | null): void; dispose(): void }
export interface PlayerViewStats { frames: number; backend: 'WebGL2' | 'Canvas2D' | 'none'; rebuilds: number; lastFrameMs: number; drawCalls: number; worldSubmissions: number; lightingBackend: string }

const element = <K extends keyof HTMLElementTagNameMap>(tag: K, className: string, parent?: HTMLElement): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag); node.className = className; parent?.appendChild(node); return node
}

export function createPlayerView(container: HTMLElement, options: PlayerViewOptions): PlayerView {
  const { runtime, host, surface, rendering, gameUi } = options
  const state = host.state, world = state.world, settings = rendering.state.renderingSettings
  const root = element('div', 'nova-player-view', container)
  let worldCanvas = element('canvas', 'nova-player-world', root)
  worldCanvas.setAttribute('aria-hidden', 'true')
  const overlay = element('canvas', 'nova-player-overlay', root)
  overlay.tabIndex = 0
  overlay.dataset.gameInputSurface = ''
  overlay.setAttribute('aria-label', options.label)
  const controlsLayer = element('div', 'nova-player-controls', root)
  controlsLayer.setAttribute('aria-label', options.controlsLabel ?? 'Touch controls')
  const a11yLayer = element('div', 'nova-player-a11y', root)
  a11yLayer.setAttribute('aria-label', options.uiLabel ?? 'Game interface')
  const captionLayer = element('div', 'nova-player-captions', root)
  captionLayer.setAttribute('aria-live', 'polite'); captionLayer.setAttribute('aria-atomic', 'false')
  const context = overlay.getContext('2d', { alpha: true })!
  const stats: PlayerViewStats = { frames: 0, backend: 'none', rebuilds: 0, lastFrameMs: 0, drawCalls: 0, worldSubmissions: 0, lightingBackend: '' }

  // ---- renderer ownership (rebuilt on context restore / submission fault, at most three times) ----
  let renderer: Renderer2D | null = null, disposed = false
  let logicalWidth = 0, logicalHeight = 0, pixelRatio = 1
  function replaceWorldCanvas(): void {
    // A canvas that already handed out a WebGL context cannot become Canvas2D: replace it.
    const replacement = document.createElement('canvas'); replacement.className = worldCanvas.className; replacement.setAttribute('aria-hidden', 'true')
    worldCanvas.replaceWith(replacement); worldCanvas = replacement
  }
  function createRenderer(forceCanvas2D = false): void {
    renderer?.destroy(); renderer = null
    try {
      if (forceCanvas2D) replaceWorldCanvas()
      renderer = createRenderer2D(worldCanvas, forceCanvas2D, surface.renderer)
    } catch (error) {
      if (!(error instanceof RendererCanvasReplacementRequired)) { options.log(`Renderer initialization failed: ${error instanceof Error ? error.message : String(error)}`, 'error'); return }
      replaceWorldCanvas()
      renderer = createRenderer2D(worldCanvas, true, surface.renderer)
    }
    stats.backend = renderer.stats.backend
    renderer.resize(logicalWidth || 1, logicalHeight || 1, pixelRatio)
    if (latencyProbe.enabled) { latencyProbe.context.backend = renderer.stats.backend; latencyProbe.context.desynchronized = renderer.stats.desynchronized === true }
  }
  // Context restore and GPU submission faults rebuild the renderer once per burst; after three
  // rebuilds the game continues on Canvas2D instead of failing again every frame.
  let rebuildPending = false
  function rebuildRenderer(reason: string): void {
    if (disposed || rebuildPending || stats.rebuilds >= 4) return
    rebuildPending = true; stats.rebuilds++
    const fallback = stats.rebuilds >= 3 && stats.backend === 'WebGL2'
    options.log(fallback ? `Renderer switched to Canvas2D after repeated faults: ${reason}` : `Renderer rebuilt: ${reason}`, 'warning')
    setTimeout(() => { rebuildPending = false; if (!disposed) createRenderer(fallback) }, 0)
  }

  // ---- size and pixel ratio (same bounded policy as the Editor's Game view) ----
  function desiredPixelRatio(width: number, height: number): number {
    const quality = rendering.state.activeRenderQuality
    const scale = Number.isFinite(settings.resolutionScale) ? Math.min(2, Math.max(.5, settings.resolutionScale)) : 1
    return boundedFrame({ width, height, pixelRatio: Math.max(.5, Math.min(window.devicePixelRatio || 1, quality.maximumPixelRatio) * performanceRuntimeState.adaptivePixelRatioScale * scale), clearColor: { r: 0, g: 0, b: 0, a: 1 } }).pixelRatio
  }
  function resize(): void {
    const rect = overlay.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return
    logicalWidth = rect.width; logicalHeight = rect.height
    pixelRatio = desiredPixelRatio(rect.width, rect.height)
    renderer?.resize(rect.width, rect.height, pixelRatio)
  }
  const resizeObserver = new ResizeObserver(() => resize())
  resizeObserver.observe(root)

  // ---- game UI input, accessibility and native text input ----
  const inputBridge = new UiNativeInputBridge((uuid, value) => gameUi.commitTextInput(uuid, value))
  let nativeInput: HTMLInputElement | null = null, focusedUuid = ''
  let uiPointer: number | null = null
  const screenPosition = (event: { clientX: number; clientY: number }) => { const rect = overlay.getBoundingClientRect(); return { x: event.clientX - rect.left, y: event.clientY - rect.top } }
  gameUi.setCallback((entity, functionName) => runtime.invokeUiCallback(entity, functionName))
  gameUi.setInputActions(state.inputMap)
  gameUi.setRemapCallback(() => undefined)

  function closeNativeInput(): void {
    const active = gameUi.focusedTextInput()
    if (nativeInput && active) { if (inputBridge.isComposing) inputBridge.compositionEnd(nativeInput, active.input.maxLength); else inputBridge.flush(nativeInput, active.input.maxLength) }
    gameUi.blurTextInput(); inputBridge.reset(); nativeInput?.remove(); nativeInput = null; focusedUuid = ''
  }
  function synchronizeNativeInput(focus = false): void {
    const active = gameUi.focusedTextInput() as { entity: Entity; rect: { x: number; y: number; width: number; height: number }; input: TextInput } | null
    if (!active) { if (nativeInput) { inputBridge.reset(); nativeInput.remove(); nativeInput = null; focusedUuid = '' } return }
    const changed = active.entity.uuid !== focusedUuid
    if (!nativeInput) {
      nativeInput = element('input', 'nova-player-native-input', root)
      nativeInput.dataset.gameUiControl = ''
      nativeInput.addEventListener('input', event => { const current = gameUi.focusedTextInput(); if (current) inputBridge.input(nativeInput!, current.input.maxLength, (event as InputEvent).isComposing) })
      nativeInput.addEventListener('compositionstart', () => inputBridge.compositionStart())
      nativeInput.addEventListener('compositionend', () => { const current = gameUi.focusedTextInput(); if (current) inputBridge.compositionEnd(nativeInput!, current.input.maxLength) })
      nativeInput.addEventListener('keydown', event => {
        event.stopPropagation()
        if (inputBridge.ownsCompositionKey(event)) return
        if (event.key === 'Tab') { event.preventDefault(); const current = gameUi.focusedTextInput(); if (current && nativeInput) inputBridge.flush(nativeInput, current.input.maxLength); gameUi.keyDown(event); synchronizeNativeInput(true); return }
        if (event.key === 'Enter' || event.key === 'Escape') { event.preventDefault(); closeNativeInput(); overlay.focus({ preventScroll: true }) }
      })
      nativeInput.addEventListener('blur', () => { if (gameUi.focusedTextInput()) closeNativeInput() })
    }
    const input = nativeInput
    input.type = active.input.password ? 'password' : 'text'
    input.placeholder = gameUi.focusedTextInputPlaceholder()
    input.maxLength = Math.max(0, active.input.maxLength)
    input.lang = gameUi.focusedTextInputLocale() || ''
    input.setAttribute('aria-label', active.entity.getComponent<RectTransform>('RectTransform')?.accessibilityLabel || active.entity.name)
    Object.assign(input.style, { left: `${active.rect.x}px`, top: `${active.rect.y}px`, width: `${active.rect.width}px`, height: `${active.rect.height}px` }, gameUi.focusedTextInputStyle())
    if (changed) { focusedUuid = active.entity.uuid; inputBridge.bind(input, active.entity.uuid, active.input.value) }
    if (focus || changed) input.focus({ preventScroll: true })
  }
  overlay.addEventListener('pointerdown', event => {
    if (event.button !== 0 || uiPointer !== null) return
    overlay.focus({ preventScroll: true })
    if (event.pointerType !== 'mouse') options.setInputModality(event.pointerType === 'pen' ? 'pen' : 'touch')
    if (!gameUi.pointerDown(screenPosition(event))) { synchronizeNativeInput(); return }
    uiPointer = event.pointerId; event.preventDefault(); event.stopPropagation(); overlay.setPointerCapture(event.pointerId)
    synchronizeNativeInput(true)
  })
  overlay.addEventListener('pointermove', event => {
    if (uiPointer !== null && event.pointerId !== uiPointer) return
    if (gameUi.pointerMove(screenPosition(event)) && uiPointer !== null) { event.preventDefault(); event.stopPropagation() }
  })
  const pointerEnd = (event: PointerEvent) => {
    if (event.pointerId !== uiPointer) return
    event.preventDefault(); event.stopPropagation(); gameUi.pointerUp(screenPosition(event)); uiPointer = null
    if (overlay.hasPointerCapture(event.pointerId)) overlay.releasePointerCapture(event.pointerId)
    synchronizeNativeInput(true)
  }
  overlay.addEventListener('pointerup', pointerEnd)
  overlay.addEventListener('pointercancel', event => { if (event.pointerId === uiPointer) { gameUi.pointerCancel(); uiPointer = null } })
  overlay.addEventListener('wheel', event => {
    if (gameUi.wheel(screenPosition(event), event.deltaX, event.deltaY)) { event.preventDefault(); return }
    runtime.input.onWheel(event)
    event.preventDefault()
  }, { passive: false })
  overlay.addEventListener('contextmenu', event => event.preventDefault())
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.isComposing || event.target === nativeInput) return
    if (gameUi.keyDown(event)) { event.preventDefault(); event.stopPropagation(); synchronizeNativeInput(true); focusAccessibleNode() }
  }
  window.addEventListener('keydown', onKeyDown, true)

  let accessibilitySignature = ''
  function focusAccessibleNode(): void {
    if (gameUi.focusedTextInput()) return
    const focused = gameUi.accessibilityNodes().find(node => node.focused)
    if (focused) requestAnimationFrame(() => (a11yLayer.querySelector(`[data-ui-uuid="${CSS.escape(focused.uuid)}"]`) as HTMLElement | null)?.focus({ preventScroll: true }))
  }
  function renderAccessibility(nodes: UiAccessibilityNode[]): void {
    const signature = JSON.stringify(nodes)
    if (signature === accessibilitySignature) return
    accessibilitySignature = signature
    a11yLayer.replaceChildren(...nodes.map(node => {
      const item = document.createElement('div')
      item.className = 'nova-player-a11y-node'; item.dataset.gameUiControl = ''; item.dataset.uiUuid = node.uuid
      Object.assign(item.style, { left: `${node.rect.x}px`, top: `${node.rect.y}px`, width: `${node.rect.width}px`, height: `${node.rect.height}px` })
      item.setAttribute('role', node.role); item.setAttribute('aria-label', node.label)
      const set = (name: string, value: unknown) => { if (value !== undefined && value !== null && value !== '') item.setAttribute(name, String(value)) }
      set('aria-valuemin', node.valueMin); set('aria-valuemax', node.valueMax); set('aria-valuenow', node.valueNow); set('aria-checked', node.checked)
      set('aria-description', node.description); set('aria-valuetext', node.value); set('aria-live', node.live); set('aria-disabled', node.disabled)
      if (node.focused) item.setAttribute('aria-current', 'true')
      item.tabIndex = node.disabled ? -1 : node.tabIndex
      item.addEventListener('focus', () => { gameUi.focusByUuid(node.uuid); synchronizeNativeInput(true) })
      item.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); gameUi.activateByUuid(node.uuid); synchronizeNativeInput(true) })
      return item
    }))
  }

  // ---- subtitles and captions ----
  let captionSignature = ''
  function renderCaptions(): void {
    const accessibility = runtime.presentation.state.accessibility
    const subtitles = accessibility.subtitles ? runtime.animationTimeline.presentation.subtitles : []
    const captions = runtime.presentation.activeRuntimeCaptions()
    const lines = [
      ...subtitles.map(item => ({ text: item.text, className: `safe-${item.safeArea}`, lang: item.locale || '' })),
      ...captions.map(item => ({ text: item.speaker ? `${item.speaker}: ${item.text}` : item.text, className: 'safe-TitleSafe', lang: '' }))
    ]
    const signature = JSON.stringify([lines, accessibility.captionBackground, accessibility.captionScale])
    if (signature === captionSignature) return
    captionSignature = signature
    captionLayer.classList.toggle('caption-transparent', !accessibility.captionBackground)
    captionLayer.style.setProperty('--caption-scale', String(accessibility.captionScale))
    captionLayer.replaceChildren(...lines.map(line => { const paragraph = document.createElement('p'); paragraph.className = line.className; paragraph.textContent = line.text; if (line.lang) paragraph.lang = line.lang; return paragraph }))
  }

  // ---- virtual controls (project controls, or automatic ones on touch screens) ----
  const controlValues = new Map<string, { x: number; y: number }>()
  const pointerOwners = new Map<string, number>()
  const configured = () => deviceInputSettings.virtualControlsEnabled && deviceInputSettings.virtualControls.length > 0
  const effectiveControls = (): VirtualControlSettings[] => configured() ? deviceInputSettings.virtualControls : deviceInputSettings.automaticVirtualControls && deviceRuntimeState.capabilities.touch ? automaticVirtualControls(state.inputMap) : []
  const controlsOwner = createVirtualControlsInputOwner(runtime, runtime.presentation.world, {
    controls: effectiveControls,
    current: control => controlValues.get(control.id) ?? { x: 0, y: 0 },
    actionKinds: () => new Map(state.inputMap.map(action => [action.name, action.kind]))
  })
  let controlsSignature = ''
  const controlButtons = new Map<string, HTMLButtonElement>()
  function safeInsets() { return deviceInputSettings.safeAreaMode === 'custom' ? deviceInputSettings.customSafeArea : deviceInputSettings.safeAreaMode === 'off' ? { left: 0, top: 0, right: 0, bottom: 0 } : deviceRuntimeState.capabilities.safeArea }
  function setControl(control: VirtualControlSettings, value: { x: number; y: number }): void {
    controlValues.set(control.id, value); controlsOwner.recomputeAction(control.action)
    const button = controlButtons.get(control.id)
    if (!button) return
    button.classList.toggle('active', Math.abs(value.x) > .001 || Math.abs(value.y) > .001)
    const knob = button.querySelector('i') as HTMLElement | null
    if (knob) knob.style.transform = `translate(calc(-50% + ${value.x * control.size * .28}px), calc(-50% - ${value.y * control.size * .28}px))`
  }
  function pointerValue(control: VirtualControlSettings, event: PointerEvent): { x: number; y: number } {
    if (control.kind === 'button') return { x: control.value, y: 0 }
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect(), radius = Math.max(1, Math.min(rect.width, rect.height) / 2)
    let x = (event.clientX - (rect.left + rect.width / 2)) / radius, y = (event.clientY - (rect.top + rect.height / 2)) / radius
    const magnitude = Math.hypot(x, y)
    if (magnitude > 1) { x /= magnitude; y /= magnitude }
    if (magnitude < control.deadzone) return { x: 0, y: 0 }
    const scaled = Math.min(1, (magnitude - control.deadzone) / Math.max(1e-6, 1 - control.deadzone))
    return { x: x / Math.max(magnitude, 1e-6) * scaled, y: -y / Math.max(magnitude, 1e-6) * scaled }
  }
  function releaseControls(): void { controlValues.clear(); pointerOwners.clear(); controlsOwner.releaseAll(); for (const button of controlButtons.values()) { button.classList.remove('active'); const knob = button.querySelector('i') as HTMLElement | null; if (knob) knob.style.transform = '' } }
  function renderControls(): void {
    const controls = effectiveControls(), visible = controls.length > 0 && (!configured() || deviceInputSettings.showVirtualControls === 'always' || deviceRuntimeState.capabilities.touch)
    const insets = safeInsets()
    const signature = JSON.stringify([visible, controls, insets])
    if (signature === controlsSignature) return
    controlsSignature = signature
    releaseControls(); controlButtons.clear()
    controlsLayer.hidden = !visible
    if (!visible) { controlsLayer.replaceChildren(); return }
    controlsLayer.replaceChildren(...controls.map(control => {
      const button = document.createElement('button')
      button.type = 'button'; button.className = `nova-player-control kind-${control.kind}`
      button.setAttribute('aria-label', control.accessibleLabel)
      button.setAttribute('aria-keyshortcuts', control.kind === 'button' ? 'Enter Space' : 'ArrowUp ArrowDown ArrowLeft ArrowRight')
      const style: Record<string, string> = { width: `${control.size}px`, height: `${control.size}px`, opacity: String(control.opacity) }
      if (control.anchor.endsWith('left')) style.left = `${insets.left + control.offsetX}px`; else style.right = `${insets.right + control.offsetX}px`
      if (control.anchor.startsWith('top')) style.top = `${insets.top + control.offsetY}px`; else style.bottom = `${insets.bottom + control.offsetY}px`
      Object.assign(button.style, style)
      if (control.kind === 'button') { const label = document.createElement('span'); label.className = 'nova-player-control-label'; label.textContent = control.label; button.appendChild(label) }
      else { for (const [direction, glyph] of [['up', '▲'], ['right', '▶'], ['down', '▼'], ['left', '◀']]) { const marker = document.createElement('span'); marker.className = `nova-player-control-marker ${direction}`; marker.textContent = glyph; button.appendChild(marker) } button.appendChild(document.createElement('i')) }
      button.addEventListener('pointerdown', event => { if (pointerOwners.has(control.id)) return; event.preventDefault(); button.setPointerCapture(event.pointerId); pointerOwners.set(control.id, event.pointerId); setControl(control, pointerValue(control, event)); performHaptic(control.hapticMs) })
      button.addEventListener('pointermove', event => { if (pointerOwners.get(control.id) !== event.pointerId || control.kind === 'button') return; event.preventDefault(); setControl(control, pointerValue(control, event)) })
      const end = (event?: PointerEvent) => { if (event && pointerOwners.get(control.id) !== event.pointerId) return; pointerOwners.delete(control.id); setControl(control, { x: 0, y: 0 }) }
      button.addEventListener('pointerup', end); button.addEventListener('pointercancel', end); button.addEventListener('lostpointercapture', () => end())
      const keyboard = (event: KeyboardEvent, down: boolean) => {
        if (control.kind === 'button' && (event.key === ' ' || event.key === 'Enter')) { event.preventDefault(); setControl(control, down ? { x: control.value, y: 0 } : { x: 0, y: 0 }); if (down && !event.repeat) performHaptic(control.hapticMs); return }
        if (control.kind !== 'button' && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) { event.preventDefault(); setControl(control, down ? { x: event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0, y: event.key === 'ArrowDown' ? -1 : event.key === 'ArrowUp' ? 1 : 0 } : { x: 0, y: 0 }) }
      }
      button.addEventListener('keydown', event => keyboard(event, true)); button.addEventListener('keyup', event => keyboard(event, false))
      controlButtons.set(control.id, button)
      return button
    }))
  }
  const refreshDevice = () => { refreshDeviceCapabilities(); controlsSignature = '' }
  refreshDevice()
  window.addEventListener('resize', refreshDevice, { passive: true }); window.addEventListener('orientationchange', refreshDevice, { passive: true })
  window.addEventListener('blur', releaseControls); window.addEventListener('pagehide', releaseControls)

  // ---- frame loop ----
  let raf = 0, lastTime = performance.now(), lightingOnGpu = false, overlayDrewLastFrame = true
  function overlayHasContent(entities: readonly Entity[]): boolean {
    return !lightingOnGpu && settings.lightingEnabled || stats.backend !== 'WebGL2' && settings.postProcessing.enabled || settings.debugView !== 'None'
      || entities.some(entity => entity.enabled && entity.hasComponent('RectTransform'))
  }
  function frame(time: number): void {
    raf = 0
    if (disposed) return
    if (!document.hidden) {
      const started = performance.now(), dt = Math.max(0, (time - lastTime) / 1000); lastTime = time
      beginPerformanceFrame(started, time)
      if (!logicalWidth) resize()
      options.beforeFrame?.()
      gameUi.sampleInput({ editor: false })
      synchronizeNativeInput()
      runtime.frame(normalizeSimulationFrameDelta(dt), overlay.getBoundingClientRect())
      prepareHierarchyIndex(world.entities)
      const simulationEnded = performance.now()
      render(dt)
      stats.frames++; stats.lastFrameMs = performance.now() - started
      afterFrame?.({ width: logicalWidth, height: logicalHeight, pixelRatio, frameMs: stats.lastFrameMs })
      if (latencyProbe.enabled) latencyProbe.frameCompleted({ rafTime: time, cpuStart: started, simulationEnd: simulationEnded, renderStart: simulationEnded, submittedAt: lastSubmissionAt, deferred: lastDeferred, gpuMs: null, fixedSteps: state.engineDiagnostics.stepsLastFrame ?? 0 })
      completePerformanceFrame()
    }
    if (!disposed) raf = requestAnimationFrame(frame)
  }
  let lastSubmissionAt: number | null = null, lastDeferred = false
  let afterFrame: ((frame: PlayerFrameInfo) => void) | null = null
  function render(dt: number): void {
    const width = logicalWidth, height = logicalHeight
    if (!renderer || width <= 0 || height <= 0) return
    const desired = desiredPixelRatio(width, height)
    if (Math.abs(desired - pixelRatio) > .001) resize()
    lastSubmissionAt = null; lastDeferred = false
    const rendered = renderWorld(renderer, world.entities, {
      width, height, pixelRatio,
      deltaSeconds: state.playMode === 'playing' ? dt * state.globalSettings.timeScale : 0,
      editorCamera: { scale: state.camera.scale, offset: { ...state.camera.offset } },
      gameView: true, activeLayer: host.view.activeLayer, renderLayer: host.view.renderLayer,
      canvasColor: '#000000', connections: world.connections,
      editorGrid: { enabled: false, step: 1, color: '#000000' }, performanceMode: false,
      lighting: { environment: surface.lighting }
    }, surface.scene)
    lightingOnGpu = rendered.lightingBackend === 'WebGL2'
    stats.lightingBackend = rendered.lightingBackend ?? ''
    stats.drawCalls = rendered.drawCalls ?? 0
    const submitted = typeof rendered.cpuSubmissionAtMs === 'number' && Number.isFinite(rendered.cpuSubmissionAtMs)
    if (!submitted) return
    stats.worldSubmissions++
    lastSubmissionAt = rendered.cpuSubmissionAtMs!; lastDeferred = (rendered as { gpuSubmissionStatus?: string }).gpuSubmissionStatus === 'deferred'
    runtime.bindConsumedInputToPacket(markPerformanceSubmission(rendered.cpuSubmissionAtMs!))
    // Overlay: HUD, Canvas2D lighting fallback, post overlay and debug views. Skipped while empty.
    const backingWidth = Math.max(1, Math.round(width * pixelRatio)), backingHeight = Math.max(1, Math.round(height * pixelRatio))
    const resized = overlay.width !== backingWidth || overlay.height !== backingHeight
    if (resized) { overlay.width = backingWidth; overlay.height = backingHeight }
    if (!overlayHasContent(world.entities)) {
      if (overlayDrewLastFrame && !resized) { context.setTransform(1, 0, 0, 1, 0, 0); context.clearRect(0, 0, overlay.width, overlay.height) }
      overlayDrewLastFrame = false
      renderAccessibility([]); renderCaptions(); renderControls()
      return
    }
    overlayDrewLastFrame = true
    context.setTransform(1, 0, 0, 1, 0, 0); context.clearRect(0, 0, overlay.width, overlay.height)
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    context.imageSmoothingEnabled = true; context.imageSmoothingQuality = 'high'
    const view = { width, height, editorCamera: { scale: state.camera.scale, offset: { ...state.camera.offset } }, gameView: true, activeLayer: host.view.activeLayer }
    if (!lightingOnGpu) renderLighting2D(context, world.entities, view, surface.lighting)
    if (stats.backend !== 'WebGL2') renderPostProcessOverlay(context, width, height, surface.lighting)
    renderDebugView2D(context, world.entities, view, surface.lighting)
    gameUi.render(context, width, height, world.entities, { editor: false })
    renderAccessibility(gameUi.accessibilityNodes()); renderCaptions(); renderControls()
  }
  const onVisibility = () => {
    runtime.setHostSuspended(document.hidden)
    if (document.hidden) { releaseControls(); return }
    world.resetSimulationClock(); lastTime = performance.now(); rebasePerformanceFrameContinuity()
    if (!raf && !disposed) raf = requestAnimationFrame(frame)
  }
  document.addEventListener('visibilitychange', onVisibility)

  createRenderer(); resize()
  raf = requestAnimationFrame(frame)
  overlay.focus({ preventScroll: true })

  return {
    root, stats, rebuildRenderer,
    setAfterFrame(listener) { afterFrame = listener },
    dispose() {
      if (disposed) return
      disposed = true
      if (raf) cancelAnimationFrame(raf)
      resizeObserver.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('resize', refreshDevice); window.removeEventListener('orientationchange', refreshDevice)
      window.removeEventListener('blur', releaseControls); window.removeEventListener('pagehide', releaseControls)
      releaseControls(); controlsOwner.dispose()
      closeNativeInput()
      renderer?.destroy(); renderer = null
      root.remove()
    }
  }
}
