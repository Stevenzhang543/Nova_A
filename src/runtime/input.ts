import { applyGamepadAxisCalibration, sensorValue, TouchPointerDeduplicator } from './deviceInput'
import { inputPromptForAction, inputPromptState, setInputModality } from './inputModality'

export { inputPromptForAction, inputPromptState, setInputModality }

export type InputActionKind = 'button' | 'axis' | 'vector2'
export type InputDevice = 'keyboard' | 'physical-key' | 'mouse-button' | 'mouse-wheel' | 'mouse-motion' | 'gamepad-button' | 'gamepad-axis' | 'touch' | 'gesture' | 'sensor' | 'pen-button' | 'pen-pressure' | 'pen-tilt' | 'pen-twist'
export type InputDeviceKind = 'keyboard' | 'mouse' | 'gamepad' | 'touch' | 'sensor' | 'pen'
export type InputModifier = 'Control' | 'Shift' | 'Alt' | 'Meta'
export type InputResponseCurve = 'linear' | 'square' | 'cubic' | 'exponential'
export type InputInteraction = 'press' | 'hold' | 'tap' | 'multiTap'
export type InputPhase = 'idle' | 'started' | 'performed' | 'cancelled'

export interface InputBinding {
  device: InputDevice
  code: string
  scale: number
  x: number
  y: number
  gamepad: number
  deviceId: string
  deadzone: number
  threshold: number
  invert: boolean
  responseCurve: InputResponseCurve
  modifiers: InputModifier[]
  chord: string[]
}

export interface InputAction {
  name: string
  kind: InputActionKind
  bindings: InputBinding[]
  enabled: boolean
  context: string
  map: string
  schemes: string[]
  interaction: InputInteraction
  holdSeconds: number
  tapSeconds: number
  multiTapCount: number
  consume: boolean
  priority: number
  callback: string
}

export interface InputSnapshot {
  down: Record<string, boolean>
  pressed: Record<string, boolean>
  released: Record<string, boolean>
  performed: Record<string, boolean>
  cancelled: Record<string, boolean>
  phases: Record<string, InputPhase>
  durations: Record<string, number>
  tapCounts: Record<string, number>
  consumed: Record<string, boolean>
  axes: Record<string, number>
  vectors: Record<string, [number, number]>
  mousePosition: [number, number]
  mouseWorldPosition: [number, number]
  viewBounds: [number, number, number, number]
  viewportSize: [number, number]
  wheel: [number, number]
  pointerDelta: [number, number]
  touches: number
  devices: InputDeviceIdentity[]
  contexts: string[]
  maps: string[]
  scheme: string
}

export interface InputDeviceIdentity { id: string; kind: InputDeviceKind; index: number; connected: boolean; mapping: string }
export interface InputConflict { signature: string; action: string; bindingIndex: number; conflictsWithAction: string; conflictsWithBindingIndex: number }
export interface InputRecordingFrame { time: number; snapshot: InputSnapshot }
export interface InputRecording { version: 1; duration: number; frames: InputRecordingFrame[] }

export interface PenInputState {
  pointerId: number
  x: number
  y: number
  pressure: number
  tiltX: number
  tiltY: number
  twist: number
  buttons: number
  eraser: boolean
}

export const INPUT_DEVICES: readonly InputDevice[] = ['keyboard', 'physical-key', 'mouse-button', 'mouse-wheel', 'mouse-motion', 'gamepad-button', 'gamepad-axis', 'touch', 'gesture', 'sensor', 'pen-button', 'pen-pressure', 'pen-tilt', 'pen-twist']
const INPUT_DEVICE_KINDS: readonly InputDeviceKind[] = ['keyboard', 'mouse', 'gamepad', 'touch', 'sensor', 'pen']
const defaultDeadzone = (device: InputDevice): number => device === 'pen-pressure' || device === 'pen-tilt' || device === 'pen-twist' ? 0 : .18

export function createInputBinding(device: InputDevice = 'keyboard', code = 'Space'): InputBinding {
  return { device, code: normalizePenBindingCode(device, code), scale: 1, x: 1, y: 0, gamepad: 0, deviceId: '', deadzone: defaultDeadzone(device), threshold: .0001, invert: false, responseCurve: 'linear', modifiers: [], chord: [] }
}

export function defaultInputMap(): InputAction[] {
  return [
    createInputAction('MoveLeft', 'button', [createInputBinding('keyboard', 'KeyA'), createInputBinding('keyboard', 'ArrowLeft')]),
    createInputAction('MoveRight', 'button', [createInputBinding('keyboard', 'KeyD'), createInputBinding('keyboard', 'ArrowRight')]),
    createInputAction('Jump', 'button', [createInputBinding('keyboard', 'Space'), createInputBinding('gamepad-button', '0')]),
    {
      ...createInputAction('Horizontal', 'axis', [
        { ...createInputBinding('keyboard', 'KeyA'), scale: -1 },
        { ...createInputBinding('keyboard', 'ArrowLeft'), scale: -1 },
        createInputBinding('keyboard', 'KeyD'),
        createInputBinding('keyboard', 'ArrowRight'),
        createInputBinding('gamepad-axis', '0')
      ])
    },
    {
      ...createInputAction('Move', 'vector2', [
        { ...createInputBinding('keyboard', 'KeyA'), x: -1 },
        { ...createInputBinding('keyboard', 'KeyD'), x: 1 },
        { ...createInputBinding('keyboard', 'KeyW'), x: 0, y: 1 },
        { ...createInputBinding('keyboard', 'KeyS'), x: 0, y: -1 },
        { ...createInputBinding('gamepad-axis', '0'), x: 1, y: 0 },
        { ...createInputBinding('gamepad-axis', '1'), x: 0, y: -1 }
      ])
    }
  ]
}

export function createInputAction(name: string, kind: InputActionKind = 'button', bindings: InputBinding[] = [createInputBinding()]): InputAction {
  return { name, kind, bindings, enabled: true, context: 'Gameplay', map: 'Default', schemes: [], interaction: 'press', holdSeconds: .35, tapSeconds: .25, multiTapCount: 2, consume: false, priority: 0, callback: '' }
}

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function cleanText(value: unknown, fallback: string, maximum = 160): string {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, maximum) : fallback
}

export function normalizePenBindingCode(device: InputDevice, source: unknown): string {
  const code = typeof source === 'string' ? source.trim().toLowerCase().slice(0, 80) : ''
  if (device === 'pen-button') return code === 'tip' || code === 'barrel' || code === 'eraser' || /^button-(?:[0-9]|[12][0-9]|3[01])$/.test(code) ? code : 'tip'
  if (device === 'pen-pressure') return 'pressure'
  if (device === 'pen-tilt') return code === 'y' || code === 'tilt-y' ? 'y' : 'x'
  if (device === 'pen-twist') return 'twist'
  return typeof source === 'string' ? source.slice(0, 80) : ''
}

export function normalizeInputDeviceIdentity(source: unknown, fallbackIndex = 0): InputDeviceIdentity {
  const item = source && typeof source === 'object' ? source as Partial<InputDeviceIdentity> : {}
  const kind = INPUT_DEVICE_KINDS.includes(item.kind as InputDeviceKind) ? item.kind as InputDeviceKind : 'keyboard'
  const index = Math.min(63, Math.max(0, Math.round(finite(item.index, fallbackIndex))))
  return {
    id: cleanText(item.id, `${kind}:${index}`),
    kind,
    index,
    connected: item.connected !== false,
    mapping: cleanText(item.mapping, kind === 'pen' ? 'pointer' : kind === 'touch' ? 'direct' : kind === 'mouse' ? 'pointer' : 'standard', 80)
  }
}

export function normalizeInputDeviceIdentities(source: unknown): InputDeviceIdentity[] {
  if (!Array.isArray(source)) return []
  const seen = new Set<string>()
  return source.slice(0, 64).flatMap((value, index) => {
    const identity = normalizeInputDeviceIdentity(value, index), key = `${identity.kind}:${identity.index}:${identity.id}`
    if (seen.has(key)) return []
    seen.add(key)
    return [identity]
  })
}

export function normalizeInputMap(source: unknown): InputAction[] {
  if (!Array.isArray(source)) return defaultInputMap()
  const names = new Set<string>()
  const actions: InputAction[] = []
  for (const raw of source) {
    if (!raw || typeof raw !== 'object') continue
    const item = raw as Partial<InputAction>
    const name = typeof item.name === 'string' ? item.name.trim().slice(0, 80) : ''
    if (!name || names.has(name)) continue
    names.add(name)
    const kind: InputActionKind = item.kind === 'axis' || item.kind === 'vector2' ? item.kind : 'button'
    const bindings = Array.isArray(item.bindings) ? item.bindings.flatMap(rawBinding => {
      if (!rawBinding || typeof rawBinding !== 'object') return []
      const binding = rawBinding as Partial<InputBinding>
      const device = INPUT_DEVICES.includes(binding.device as InputDevice) ? binding.device as InputDevice : 'keyboard'
      const responseCurves: InputResponseCurve[] = ['linear', 'square', 'cubic', 'exponential']
      const allowedModifiers: InputModifier[] = ['Control', 'Shift', 'Alt', 'Meta']
      return [{
        device,
        code: normalizePenBindingCode(device, typeof binding.code === 'string' ? binding.code : device === 'keyboard' ? 'Space' : '0'),
        scale: Math.min(100, Math.max(-100, finite(binding.scale, 1))),
        x: Math.min(100, Math.max(-100, finite(binding.x, 1))),
        y: Math.min(100, Math.max(-100, finite(binding.y, 0))),
        gamepad: Math.min(15, Math.max(0, Math.round(finite(binding.gamepad, 0)))),
        deviceId: typeof binding.deviceId === 'string' ? binding.deviceId.trim().slice(0, 160) : '',
        deadzone: Math.min(.99, Math.max(0, finite(binding.deadzone, defaultDeadzone(device)))),
        threshold: Math.min(1, Math.max(0, finite(binding.threshold, .0001))),
        invert: binding.invert === true,
        responseCurve: responseCurves.includes(binding.responseCurve as InputResponseCurve) ? binding.responseCurve as InputResponseCurve : 'linear',
        modifiers: Array.isArray(binding.modifiers) ? [...new Set(binding.modifiers.filter((value): value is InputModifier => allowedModifiers.includes(value as InputModifier)))].slice(0, 4) : [],
        chord: Array.isArray(binding.chord) ? [...new Set(binding.chord.filter(value => typeof value === 'string').map(value => value.slice(0, 80)).filter(Boolean))].slice(0, 8) : []
      }]
    }) : []
    const interactions: InputInteraction[] = ['press', 'hold', 'tap', 'multiTap']
    actions.push({
      name, kind, bindings: bindings.slice(0, 32), enabled: item.enabled !== false,
      context: typeof item.context === 'string' ? item.context.trim().slice(0, 80) || 'Gameplay' : 'Gameplay',
      map: typeof item.map === 'string' ? item.map.trim().slice(0, 80) || 'Default' : 'Default',
      schemes: Array.isArray(item.schemes) ? [...new Set(item.schemes.filter(value => typeof value === 'string').map(value => value.trim().slice(0, 80)).filter(Boolean))].slice(0, 16) : [],
      interaction: interactions.includes(item.interaction as InputInteraction) ? item.interaction as InputInteraction : 'press',
      holdSeconds: Math.min(60, Math.max(.001, finite(item.holdSeconds, .35))),
      tapSeconds: Math.min(10, Math.max(.001, finite(item.tapSeconds, .25))),
      multiTapCount: Math.min(16, Math.max(2, Math.round(finite(item.multiTapCount, 2)))),
      consume: item.consume === true,
      priority: Math.min(10_000, Math.max(-10_000, Math.round(finite(item.priority, 0)))),
      callback: typeof item.callback === 'string' ? item.callback.trim().slice(0, 80) : ''
    })
  }
  return actions.length ? actions.slice(0, 128) : defaultInputMap()
}

/** Replaces one project input binding without changing the action's axis/vector semantics. */
export function rebindInputAction(actions: InputAction[], actionName: string, bindingIndex: number, value: Pick<InputBinding, 'device' | 'code'>): boolean {
  const action = actions.find(candidate => candidate.name === actionName)
  if (!action || bindingIndex < 0 || bindingIndex > 31 || !INPUT_DEVICES.includes(value.device)) return false
  while (action.bindings.length <= bindingIndex) action.bindings.push(createInputBinding(value.device, value.code))
  const previous = action.bindings[bindingIndex]
  action.bindings[bindingIndex] = { ...previous, device: value.device, code: normalizePenBindingCode(value.device, value.code) }
  return true
}

function bindingSignature(binding: InputBinding): string {
  return [binding.device, binding.deviceId || binding.gamepad, binding.code, [...binding.modifiers].sort().join('+'), [...binding.chord].sort().join('+')].join(':')
}

function looksLikePhysicalKeyCode(code: string): boolean {
  return /^(?:Key[A-Z]|Digit[0-9]|Numpad[A-Za-z0-9]+|Arrow(?:Up|Down|Left|Right)|F(?:[1-9]|1[0-9]|2[0-4])|(?:Shift|Control|Alt|Meta)(?:Left|Right)|Space|Enter|Escape|Tab|Backspace|Delete|Insert|Home|End|Page(?:Up|Down)|CapsLock|ContextMenu|Bracket(?:Left|Right)|Backslash|Semicolon|Quote|Comma|Period|Slash|Backquote|Minus|Equal)$/.test(code)
}

function logicalKey(code: string): string { return code.length === 1 ? code.toLocaleLowerCase() : code }

function pointerButtonMask(button: number): number {
  if (button === 0) return 1
  if (button === 1) return 4
  if (button === 2) return 2
  if (button === 3) return 8
  if (button === 4) return 16
  if (button === 5) return 32
  return button >= 0 && button < 31 ? 1 << button : 0
}

/** Finds deterministic duplicate physical bindings without treating two bindings inside one action as a conflict. */
export function detectInputConflicts(actions: InputAction[]): InputConflict[] {
  const seen = new Map<string, { action: string; bindingIndex: number }>()
  const conflicts: InputConflict[] = []
  for (const action of normalizeInputMap(actions)) for (const [bindingIndex, binding] of action.bindings.entries()) {
    const signature = bindingSignature(binding), previous = seen.get(signature)
    if (previous && previous.action !== action.name) conflicts.push({ signature, action: action.name, bindingIndex, conflictsWithAction: previous.action, conflictsWithBindingIndex: previous.bindingIndex })
    else if (!previous) seen.set(signature, { action: action.name, bindingIndex })
  }
  return conflicts.sort((first, second) => first.signature.localeCompare(second.signature) || first.action.localeCompare(second.action))
}

function cloneSnapshot(snapshot: InputSnapshot): InputSnapshot {
  return {
    down: { ...snapshot.down }, pressed: { ...snapshot.pressed }, released: { ...snapshot.released }, performed: { ...snapshot.performed }, cancelled: { ...snapshot.cancelled }, phases: { ...snapshot.phases }, durations: { ...snapshot.durations }, tapCounts: { ...snapshot.tapCounts }, consumed: { ...snapshot.consumed }, axes: { ...snapshot.axes },
    vectors: Object.fromEntries(Object.entries(snapshot.vectors).map(([key, value]) => [key, [...value] as [number, number]])),
    mousePosition: [...snapshot.mousePosition], mouseWorldPosition: [...snapshot.mouseWorldPosition], viewBounds: [...snapshot.viewBounds], viewportSize: [...snapshot.viewportSize], wheel: [...snapshot.wheel], pointerDelta: [...snapshot.pointerDelta], touches: snapshot.touches,
    devices: snapshot.devices.map(device => ({ ...device })), contexts: [...snapshot.contexts], maps: [...snapshot.maps], scheme: snapshot.scheme
  }
}

function emptySnapshot(): InputSnapshot {
  return { down: {}, pressed: {}, released: {}, performed: {}, cancelled: {}, phases: {}, durations: {}, tapCounts: {}, consumed: {}, axes: {}, vectors: {}, mousePosition: [0, 0], mouseWorldPosition: [0, 0], viewBounds: [0, 0, 0, 0], viewportSize: [0, 0], wheel: [0, 0], pointerDelta: [0, 0], touches: 0, devices: [], contexts: ['Gameplay'], maps: ['Default'], scheme: 'Any' }
}

export class InputManager {
  private keyboard = new Set<string>()
  private logicalKeys = new Set<string>()
  private modifiers = new Set<InputModifier>()
  private mouseButtons = new Set<number>()
  private touches = new Map<number, { x: number; y: number; previousX: number; previousY: number; startX: number; startY: number; startedAt: number }>()
  private pens = new Map<number, PenInputState>()
  private lastPenPointerId: number | null = null
  private gestures = new Map<string, number>()
  private pairGesture: { distance: number; angle: number; centerX: number; centerY: number } | null = null
  private lastTouchTapAt = -Infinity
  private pointerDeduplicator = new TouchPointerDeduplicator()
  private virtualActions = new Map<string, number | [number, number]>()
  private previousDown = new Map<string, boolean>()
  private interactionState = new Map<string, { startedAt: number; lastTapAt: number; taps: number; performed: boolean }>()
  private contexts: Array<{ name: string; priority: number; consume: boolean }> = [{ name: 'Gameplay', priority: 0, consume: false }]
  private maps = new Set(['Default'])
  private scheme = 'Any'
  private wheelX = 0
  private wheelY = 0
  private clientX = 0
  private clientY = 0
  private movementX = 0
  private movementY = 0
  private attached = false
  private current = emptySnapshot()
  private devices = new Map<string, InputDeviceIdentity>()
  private sampledGamepads: Gamepad[] = []
  private lastGamepadInventoryAt = -Infinity
  private gamepadInventorySignature = ''
  private deviceListeners = new Set<(device: InputDeviceIdentity, event: 'connected' | 'disconnected') => void>()
  private recording: { startedAt: number; frames: InputRecordingFrame[] } | null = null
  private replay: { recording: InputRecording; startedAt: number; index: number; loop: boolean } | null = null

  readonly onKeyDown = (event: KeyboardEvent) => {
    if (!this.isTypingTarget(event.target)) { this.keyboard.add(event.code); this.logicalKeys.add(logicalKey(event.key)); this.updateModifiers(event); if (!event.repeat) setInputModality('keyboard') }
  }
  readonly onKeyUp = (event: KeyboardEvent) => { this.keyboard.delete(event.code); this.logicalKeys.delete(logicalKey(event.key)); this.updateModifiers(event) }
  readonly onMouseDown = (event: MouseEvent) => { if (this.acceptMouse(event)) { this.mouseButtons.add(event.button); setInputModality('mouse') } }
  readonly onMouseUp = (event: MouseEvent) => { if (this.acceptMouse(event)) this.mouseButtons.delete(event.button) }
  readonly onMouseMove = (event: MouseEvent) => { if (!this.acceptMouse(event)) return; this.clientX = event.clientX; this.clientY = event.clientY; this.movementX += event.movementX; this.movementY += event.movementY; if (Math.abs(event.movementX) + Math.abs(event.movementY) >= 1) setInputModality('mouse') }
  readonly onWheel = (event: WheelEvent) => { this.wheelX += event.deltaX; this.wheelY += event.deltaY; if (Math.abs(event.deltaX) + Math.abs(event.deltaY) >= .5) setInputModality('mouse') }
  readonly onBlur = () => this.releaseTransientInput()
  readonly onPageHide = () => this.releaseTransientInput()
  readonly onVisibilityChange = () => { if (typeof document !== 'undefined' && document.hidden) this.releaseTransientInput() }
  readonly onTouchStart = (event: TouchEvent) => {
    const now = performance.now()
    this.mouseButtons.clear()
    for (const touch of Array.from(event.changedTouches)) { this.pointerDeduplicator.recordTouch(now, touch.clientX, touch.clientY); this.touches.set(touch.identifier, { x: touch.clientX, y: touch.clientY, previousX: touch.clientX, previousY: touch.clientY, startX: touch.clientX, startY: touch.clientY, startedAt: now }); this.clientX = touch.clientX; this.clientY = touch.clientY }
    if (event.changedTouches.length) setInputModality('touch')
    this.resetPairGesture()
  }
  readonly onTouchMove = (event: TouchEvent) => {
    const now = performance.now()
    let moved = false
    for (const touch of Array.from(event.changedTouches)) { const state = this.touches.get(touch.identifier); this.pointerDeduplicator.recordTouch(now, touch.clientX, touch.clientY); if (state) { state.previousX = state.x; state.previousY = state.y; state.x = touch.clientX; state.y = touch.clientY; const dx = state.x - state.previousX, dy = state.y - state.previousY; this.gestures.set('pan-x', Math.max(-1, Math.min(1, dx / 48))); this.gestures.set('pan-y', Math.max(-1, Math.min(1, dy / 48))); moved ||= Math.abs(dx) + Math.abs(dy) >= 1; this.clientX = touch.clientX; this.clientY = touch.clientY } }
    if (moved) setInputModality('touch')
    const pair = [...this.touches.values()]
    if (pair.length >= 2) {
      const distance = Math.hypot(pair[0].x - pair[1].x, pair[0].y - pair[1].y), angle = Math.atan2(pair[1].y - pair[0].y, pair[1].x - pair[0].x), centerX = (pair[0].x + pair[1].x) / 2, centerY = (pair[0].y + pair[1].y) / 2
      this.pairGesture ??= { distance, angle, centerX, centerY }
      this.gestures.set('pinch', this.pairGesture.distance > 1e-6 ? Math.max(-1, Math.min(1, distance / this.pairGesture.distance - 1)) : 0)
      let delta = angle - this.pairGesture.angle; while (delta > Math.PI) delta -= Math.PI * 2; while (delta < -Math.PI) delta += Math.PI * 2
      this.gestures.set('rotate', Math.max(-1, Math.min(1, delta / Math.PI)))
      this.gestures.set('two-finger-pan-x', Math.max(-1, Math.min(1, (centerX - this.pairGesture.centerX) / 96))); this.gestures.set('two-finger-pan-y', Math.max(-1, Math.min(1, (centerY - this.pairGesture.centerY) / 96)))
    }
  }
  readonly onTouchEnd = (event: TouchEvent) => {
    const now = performance.now()
    for (const touch of Array.from(event.changedTouches)) { this.pointerDeduplicator.recordTouch(now, touch.clientX, touch.clientY); const state = this.touches.get(touch.identifier); if (!state) continue; const dx = touch.clientX - state.startX, dy = touch.clientY - state.startY, elapsed = now - state.startedAt, distance = Math.hypot(dx, dy); if (elapsed <= 350 && distance < 18) { this.gestures.set('tap', 1); if (now - this.lastTouchTapAt <= 450) this.gestures.set('double-tap', 1); this.lastTouchTapAt = now } else if (elapsed >= 500 && distance < 18) this.gestures.set('long-press', 1); else { this.gestures.set('swipe-x', Math.max(-1, Math.min(1, dx / 120))); this.gestures.set('swipe-y', Math.max(-1, Math.min(1, dy / 120))) }; this.touches.delete(touch.identifier) }
    this.resetPairGesture()
  }
  readonly onTouchCancel = (event: TouchEvent) => {
    const now = performance.now()
    for (const touch of Array.from(event.changedTouches)) { this.pointerDeduplicator.recordTouch(now, touch.clientX, touch.clientY); this.touches.delete(touch.identifier) }
    this.gestures.clear()
    this.resetPairGesture()
  }
  readonly onPointerDown = (event: PointerEvent) => {
    if (event.pointerType !== 'pen') return
    this.updatePen(event)
    setInputModality('pen')
  }
  readonly onPointerMove = (event: PointerEvent) => {
    if (event.pointerType !== 'pen') return
    const previous = this.pens.get(event.pointerId), moved = !previous || Math.abs(event.clientX - previous.x) + Math.abs(event.clientY - previous.y) >= 1 || Math.abs(event.pressure - previous.pressure) >= .01 || Math.abs(event.tiltX - previous.tiltX) + Math.abs(event.tiltY - previous.tiltY) >= 1 || event.twist !== previous.twist
    this.updatePen(event)
    if (moved) setInputModality('pen')
  }
  readonly onPointerUp = (event: PointerEvent) => { if (event.pointerType === 'pen') this.releasePen(event.pointerId, event.clientX, event.clientY) }
  readonly onPointerCancel = (event: PointerEvent) => { if (event.pointerType === 'pen') this.releasePen(event.pointerId, event.clientX, event.clientY) }
  readonly onGamepadConnected = (event: GamepadEvent) => this.updateGamepad(event.gamepad, true)
  readonly onGamepadDisconnected = (event: GamepadEvent) => this.updateGamepad(event.gamepad, false)

  start(): void {
    if (this.attached) return
    this.attached = true
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('mousedown', this.onMouseDown)
    window.addEventListener('mouseup', this.onMouseUp)
    window.addEventListener('mousemove', this.onMouseMove)
    window.addEventListener('wheel', this.onWheel, { passive: true })
    window.addEventListener('touchstart', this.onTouchStart, { passive: true })
    window.addEventListener('touchmove', this.onTouchMove, { passive: true })
    window.addEventListener('touchend', this.onTouchEnd, { passive: true })
    window.addEventListener('touchcancel', this.onTouchCancel, { passive: true })
    window.addEventListener('pointerdown', this.onPointerDown, { passive: true })
    window.addEventListener('pointermove', this.onPointerMove, { passive: true })
    window.addEventListener('pointerup', this.onPointerUp, { passive: true })
    window.addEventListener('pointercancel', this.onPointerCancel, { passive: true })
    window.addEventListener('lostpointercapture', this.onPointerCancel, { passive: true })
    window.addEventListener('gamepadconnected', this.onGamepadConnected)
    window.addEventListener('gamepaddisconnected', this.onGamepadDisconnected)
    window.addEventListener('blur', this.onBlur)
    window.addEventListener('pagehide', this.onPageHide)
    document.addEventListener('visibilitychange', this.onVisibilityChange)
    this.devices.set('keyboard:0', { id: 'keyboard:0', kind: 'keyboard', index: 0, connected: true, mapping: 'standard' })
    this.devices.set('mouse:0', { id: 'mouse:0', kind: 'mouse', index: 0, connected: true, mapping: 'pointer' })
  }

  stop(): void {
    if (!this.attached) return
    this.attached = false
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('mousedown', this.onMouseDown)
    window.removeEventListener('mouseup', this.onMouseUp)
    window.removeEventListener('mousemove', this.onMouseMove)
    window.removeEventListener('wheel', this.onWheel)
    window.removeEventListener('touchstart', this.onTouchStart)
    window.removeEventListener('touchmove', this.onTouchMove)
    window.removeEventListener('touchend', this.onTouchEnd)
    window.removeEventListener('touchcancel', this.onTouchCancel)
    window.removeEventListener('pointerdown', this.onPointerDown)
    window.removeEventListener('pointermove', this.onPointerMove)
    window.removeEventListener('pointerup', this.onPointerUp)
    window.removeEventListener('pointercancel', this.onPointerCancel)
    window.removeEventListener('lostpointercapture', this.onPointerCancel)
    window.removeEventListener('gamepadconnected', this.onGamepadConnected)
    window.removeEventListener('gamepaddisconnected', this.onGamepadDisconnected)
    window.removeEventListener('blur', this.onBlur)
    window.removeEventListener('pagehide', this.onPageHide)
    document.removeEventListener('visibilitychange', this.onVisibilityChange)
    this.releaseAllInputs()
    this.devices.clear()
    this.sampledGamepads = []
    this.lastGamepadInventoryAt = -Infinity
    this.gamepadInventorySignature = ''
    this.previousDown.clear()
    this.interactionState.clear()
    this.contexts = [{ name: 'Gameplay', priority: 0, consume: false }]
    this.maps = new Set(['Default'])
    this.scheme = 'Any'
    this.current = emptySnapshot()
    this.recording = null
    this.replay = null
  }

  sample(actions: InputAction[], viewport?: DOMRect): InputSnapshot {
    const replayed = this.sampleReplay()
    if (replayed) { this.current = replayed; return replayed }
    const samplesGamepad = actions.some(action => action.bindings.some(binding => binding.device === 'gamepad-button' || binding.device === 'gamepad-axis')) || [...this.devices.values()].some(device => device.kind === 'gamepad' && device.connected)
    this.sampledGamepads = samplesGamepad ? this.readGamepads() : []
    if (samplesGamepad) { this.synchronizeGamepadInventory(this.sampledGamepads); this.detectMeaningfulGamepadActivity(this.sampledGamepads) }
    const snapshot = emptySnapshot()
    snapshot.mousePosition = viewport
      ? [this.clientX - viewport.left, this.clientY - viewport.top]
      : [this.clientX, this.clientY]
    snapshot.wheel = [this.wheelX, this.wheelY]
    snapshot.pointerDelta = [this.movementX, this.movementY]
    snapshot.touches = this.touches.size
    snapshot.devices = this.deviceSnapshot()
    snapshot.contexts = this.contexts.map(context => context.name)
    snapshot.maps = [...this.maps].sort()
    snapshot.scheme = this.scheme
    const activeContexts = new Map(this.contexts.map(context => [context.name, context]))
    const consumedBindings = new Set<string>()
    const ordered = normalizeInputMap(actions).filter(action => action.enabled && this.maps.has(action.map) && activeContexts.has(action.context) && (!action.schemes.length || this.scheme === 'Any' || action.schemes.includes(this.scheme))).sort((first, second) => {
      const contextDelta = (activeContexts.get(second.context)?.priority ?? 0) - (activeContexts.get(first.context)?.priority ?? 0)
      return contextDelta || second.priority - first.priority || first.name.localeCompare(second.name)
    })
    const now = performance.now() / 1_000
    const nowMs = now * 1_000
    for (const touch of this.touches.values()) if (nowMs - touch.startedAt >= 500 && Math.hypot(touch.x - touch.startX, touch.y - touch.startY) < 18) this.gestures.set('long-press', 1)
    for (const action of ordered) {
      const values = action.bindings.map(binding => consumedBindings.has(bindingSignature(binding)) ? 0 : this.bindingValue(binding))
      if (action.kind === 'vector2') {
        let x = 0, y = 0
        for (const [index, binding] of action.bindings.entries()) {
          const value = values[index]
          x += value * binding.x
          y += value * binding.y
        }
        const length = Math.hypot(x, y)
        if (length > 1) { x /= length; y /= length }
        const virtual = this.virtualActions.get(action.name)
        if (Array.isArray(virtual)) { x += virtual[0]; y += virtual[1]; const combined = Math.hypot(x, y); if (combined > 1) { x /= combined; y /= combined } }
        snapshot.vectors[action.name] = [x, y]
        snapshot.axes[action.name] = Math.hypot(x, y)
      } else {
        const virtual = this.virtualActions.get(action.name), virtualValue = typeof virtual === 'number' ? virtual : 0
        const value = Math.min(1, Math.max(-1, action.bindings.reduce((total, binding, index) => total + values[index] * binding.scale, 0) + virtualValue))
        snapshot.axes[action.name] = value
      }
      const threshold = Math.min(...action.bindings.map(binding => binding.threshold), .0001)
      const down = Math.abs(snapshot.axes[action.name] ?? 0) > threshold
      const previous = this.previousDown.get(action.name) ?? false
      const state = this.interactionState.get(action.name) ?? { startedAt: now, lastTapAt: -Infinity, taps: 0, performed: false }
      let phase: InputPhase = down ? 'started' : 'idle', performed = false, cancelled = false
      if (down && !previous) { state.startedAt = now; state.performed = false; phase = 'started' }
      const duration = down ? Math.max(0, now - state.startedAt) : 0
      if (action.interaction === 'press') performed = down && !previous
      else if (action.interaction === 'hold') {
        performed = down && !state.performed && duration >= action.holdSeconds
        cancelled = !down && previous && !state.performed
      } else if (!down && previous) {
        const validTap = now - state.startedAt <= action.tapSeconds
        if (action.interaction === 'tap') { performed = validTap; cancelled = !validTap }
        else if (validTap) {
          state.taps = now - state.lastTapAt <= action.tapSeconds * 2 ? state.taps + 1 : 1
          state.lastTapAt = now
          performed = state.taps >= action.multiTapCount
          if (performed) state.taps = 0
        } else { state.taps = 0; cancelled = true }
      }
      if (performed) { state.performed = true; phase = 'performed' }
      else if (cancelled) phase = 'cancelled'
      snapshot.down[action.name] = down
      snapshot.pressed[action.name] = action.interaction === 'press' ? down && !previous : performed
      snapshot.released[action.name] = !down && previous
      snapshot.performed[action.name] = performed
      snapshot.cancelled[action.name] = cancelled
      snapshot.phases[action.name] = phase
      snapshot.durations[action.name] = duration
      snapshot.tapCounts[action.name] = state.taps
      const contextConsumes = activeContexts.get(action.context)?.consume === true
      const consumed = (action.consume || contextConsumes) && (down || performed)
      snapshot.consumed[action.name] = consumed
      if (consumed) action.bindings.forEach((binding, index) => { if (values[index] !== 0) consumedBindings.add(bindingSignature(binding)) })
      this.previousDown.set(action.name, down)
      this.interactionState.set(action.name, state)
    }
    this.wheelX = 0
    this.wheelY = 0
    this.movementX = 0
    this.movementY = 0
    this.gestures.clear()
    this.current = snapshot
    if (this.recording) this.recording.frames.push({ time: Math.max(0, performance.now() - this.recording.startedAt) / 1000, snapshot: cloneSnapshot(snapshot) })
    return snapshot
  }

  snapshot(): InputSnapshot { return this.current }

  setVirtualAction(actionName: string, value: number | [number, number]): boolean {
    const name = actionName.trim().slice(0, 80); if (!name) return false
    if (Array.isArray(value)) this.virtualActions.set(name, [Math.min(1, Math.max(-1, finite(value[0], 0))), Math.min(1, Math.max(-1, finite(value[1], 0)))])
    else this.virtualActions.set(name, Math.min(1, Math.max(-1, finite(value, 0))))
    return true
  }
  releaseVirtualAction(actionName: string): void { this.virtualActions.delete(actionName.trim()) }
  releaseAllVirtualActions(): void { this.virtualActions.clear() }

  pushContext(name: string, priority = 0, consume = false): boolean { const clean = name.trim().slice(0, 80); if (!clean) return false; const existing = this.contexts.find(context => context.name === clean); if (existing) { existing.priority = Math.min(10_000, Math.max(-10_000, Math.round(finite(priority, 0)))); existing.consume = consume; return true }; if (this.contexts.length >= 32) return false; this.contexts.push({ name: clean, priority: Math.min(10_000, Math.max(-10_000, Math.round(finite(priority, 0)))), consume }); return true }
  popContext(name: string): boolean { const index = this.contexts.findIndex(context => context.name === name.trim()); if (index < 0 || (this.contexts.length === 1 && this.contexts[index].name === 'Gameplay')) return false; this.contexts.splice(index, 1); return true }
  enableMap(name: string): boolean { const clean = name.trim().slice(0, 80); if (!clean || this.maps.size >= 32 && !this.maps.has(clean)) return false; this.maps.add(clean); return true }
  disableMap(name: string): boolean { const clean = name.trim(); if (!clean || clean === 'Default') return false; return this.maps.delete(clean) }
  setScheme(name: string): boolean { const clean = name.trim().slice(0, 80); if (!clean) return false; this.scheme = clean; return true }

  connectedDevices(): InputDeviceIdentity[] {
    const now = typeof performance === 'undefined' ? Date.now() : performance.now()
    if (now - this.lastGamepadInventoryAt >= 1_000) {
      this.sampledGamepads = this.readGamepads()
      this.synchronizeGamepadInventory(this.sampledGamepads)
    }
    return this.deviceSnapshot()
  }

  onDeviceChange(listener: (device: InputDeviceIdentity, event: 'connected' | 'disconnected') => void): () => void { this.deviceListeners.add(listener); return () => this.deviceListeners.delete(listener) }

  beginRecording(): void { this.recording = { startedAt: performance.now(), frames: [] }; this.replay = null }
  endRecording(): InputRecording { const frames = this.recording?.frames ?? []; this.recording = null; return { version: 1, duration: frames[frames.length - 1]?.time ?? 0, frames: frames.map(frame => ({ time: frame.time, snapshot: cloneSnapshot(frame.snapshot) })) } }
  playRecording(recording: InputRecording, loop = false): boolean { const normalized = normalizeInputRecording(recording); if (!normalized.frames.length) return false; this.recording = null; this.replay = { recording: normalized, startedAt: performance.now(), index: 0, loop }; return true }
  stopReplay(): void { this.replay = null }

  /** Releases held transient state without erasing action history, so the next sample reports releases/cancellation. */
  releaseAllInputs(): void {
    this.keyboard.clear()
    this.logicalKeys.clear()
    this.modifiers.clear()
    this.mouseButtons.clear()
    this.touches.clear()
    this.pens.clear()
    this.lastPenPointerId = null
    this.gestures.clear()
    this.virtualActions.clear()
    this.pairGesture = null
    this.lastTouchTapAt = -Infinity
    this.wheelX = 0
    this.wheelY = 0
    this.movementX = 0
    this.movementY = 0
    this.pointerDeduplicator.clear()
  }

  private bindingValue(binding: InputBinding): number {
    if (!binding.modifiers.every(modifier => this.modifiers.has(modifier)) || !binding.chord.every(code => this.keyboard.has(code) || this.logicalKeys.has(logicalKey(code)))) return 0
    let value = 0
    if (binding.device === 'keyboard') value = this.logicalKeys.has(logicalKey(binding.code)) || (looksLikePhysicalKeyCode(binding.code) && this.keyboard.has(binding.code)) ? 1 : 0
    else if (binding.device === 'physical-key') value = this.keyboard.has(binding.code) ? 1 : 0
    else if (binding.device === 'mouse-button') value = this.mouseButtons.has(Number.parseInt(binding.code, 10) || 0) ? 1 : 0
    else if (binding.device === 'mouse-wheel') {
      const wheel = binding.code.toLowerCase() === 'x' ? this.wheelX : this.wheelY
      value = wheel === 0 ? 0 : Math.sign(wheel)
    }
    else if (binding.device === 'mouse-motion') value = binding.code.toLowerCase() === 'y' ? this.movementY : this.movementX
    else if (binding.device === 'touch') { const touch = [...this.touches.values()][0]; value = binding.code === 'count' ? this.touches.size : binding.code === 'pressed' ? Number(this.touches.size > 0) : binding.code.endsWith('-y') ? touch?.y ?? 0 : touch?.x ?? 0 }
    else if (binding.device === 'gesture') value = this.gestures.get(binding.code) ?? 0
    else if (binding.device === 'sensor') value = sensorValue(binding.code)
    else if (binding.device.startsWith('pen')) value = this.penBindingValue(binding)
    else {
      const candidates = this.sampledGamepads
      const gamepad = binding.deviceId ? candidates.find(item => item.id === binding.deviceId) : candidates.find(item => item.index === binding.gamepad)
      if (!gamepad) return 0
      if (binding.device === 'gamepad-button') value = gamepad.buttons[Number.parseInt(binding.code, 10) || 0]?.value ?? 0
      else { const axis = Number.parseInt(binding.code, 10) || 0; value = applyGamepadAxisCalibration(gamepad.axes[axis] ?? 0, gamepad.id, axis) }
    }
    const sign = binding.invert ? -1 : 1, magnitude = Math.abs(value)
    if (magnitude <= binding.deadzone || magnitude < binding.threshold) return 0
    const normalized = Math.min(1, Math.max(0, (magnitude - binding.deadzone) / Math.max(1e-9, 1 - binding.deadzone)))
    const curved = binding.responseCurve === 'square' ? normalized ** 2 : binding.responseCurve === 'cubic' ? normalized ** 3 : binding.responseCurve === 'exponential' ? (Math.exp(normalized) - 1) / (Math.E - 1) : normalized
    return Math.sign(value) * sign * curved
  }

  private updateModifiers(event: KeyboardEvent): void { this.modifiers.clear(); if (event.ctrlKey) this.modifiers.add('Control'); if (event.shiftKey) this.modifiers.add('Shift'); if (event.altKey) this.modifiers.add('Alt'); if (event.metaKey) this.modifiers.add('Meta') }
  private releaseTransientInput(): void { this.releaseAllInputs() }
  private updatePen(event: PointerEvent): void {
    const previous = this.pens.get(event.pointerId)
    if (previous) { this.movementX += event.clientX - previous.x; this.movementY += event.clientY - previous.y }
    this.clientX = finite(event.clientX, this.clientX)
    this.clientY = finite(event.clientY, this.clientY)
    const buttons = Math.max(0, Math.round(finite(event.buttons, 0))), button = Math.round(finite(event.button, -1))
    const state: PenInputState = {
      pointerId: Math.max(0, Math.round(finite(event.pointerId, 0))), x: this.clientX, y: this.clientY,
      pressure: Math.min(1, Math.max(0, finite(event.pressure, buttons ? .5 : 0))),
      tiltX: Math.min(90, Math.max(-90, finite(event.tiltX, 0))), tiltY: Math.min(90, Math.max(-90, finite(event.tiltY, 0))),
      twist: Math.min(359, Math.max(0, finite(event.twist, 0))), buttons,
      eraser: button === 5 || (buttons & 32) !== 0
    }
    this.pens.set(state.pointerId, state)
    this.lastPenPointerId = state.pointerId
    this.pointerDeduplicator.recordPointer(performance.now(), state.x, state.y)
    this.devices.set('pen:0', normalizeInputDeviceIdentity({ id: 'pen:0', kind: 'pen', index: 0, connected: true, mapping: 'pointer' }))
  }
  private releasePen(pointerId: number, x: number, y: number): void {
    this.pointerDeduplicator.recordPointer(performance.now(), finite(x, this.clientX), finite(y, this.clientY))
    this.pens.delete(pointerId)
    if (this.lastPenPointerId === pointerId) this.lastPenPointerId = this.pens.keys().next().value ?? null
  }
  private penBindingValue(binding: InputBinding): number {
    const state = this.lastPenPointerId === null ? undefined : this.pens.get(this.lastPenPointerId)
    if (!state) return 0
    if (binding.device === 'pen-pressure') return state.pressure
    if (binding.device === 'pen-tilt') return (binding.code === 'y' ? state.tiltY : state.tiltX) / 90
    if (binding.device === 'pen-twist') return state.twist / 359
    if (binding.code === 'tip') return (state.buttons & 1) !== 0 && !state.eraser ? 1 : 0
    if (binding.code === 'barrel') return (state.buttons & 2) !== 0 ? 1 : 0
    if (binding.code === 'eraser') return state.eraser ? 1 : 0
    const button = Number.parseInt(binding.code.replace(/^button-/, ''), 10)
    return Number.isInteger(button) && (state.buttons & pointerButtonMask(button)) !== 0 ? 1 : 0
  }
  private readGamepads(): Gamepad[] {
    if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') return []
    try { return Array.from(navigator.getGamepads()).filter((item): item is Gamepad => Boolean(item && item.connected !== false)).slice(0, 16) }
    catch { return [] }
  }
  private synchronizeGamepadInventory(gamepads: readonly Gamepad[]): void {
    this.lastGamepadInventoryAt = typeof performance === 'undefined' ? Date.now() : performance.now()
    const signature = gamepads.map(gamepad => `${gamepad.index}:${gamepad.id}:${gamepad.mapping}:${gamepad.connected}`).sort().join('|')
    if (signature === this.gamepadInventorySignature) return
    this.gamepadInventorySignature = signature
    const connected = new Set(gamepads.map(gamepad => `gamepad:${gamepad.index}`))
    for (const gamepad of gamepads) {
      const key = `gamepad:${gamepad.index}`, previous = this.devices.get(key)
      const device = normalizeInputDeviceIdentity({ id: gamepad.id || key, kind: 'gamepad', index: gamepad.index, connected: true, mapping: gamepad.mapping || 'unknown' })
      this.devices.set(key, device)
      if (!previous?.connected) for (const listener of this.deviceListeners) listener({ ...device }, 'connected')
    }
    for (const [key, previous] of this.devices) if (previous.kind === 'gamepad' && previous.connected && !connected.has(key)) {
      const device = { ...previous, connected: false }
      this.devices.set(key, device)
      for (const listener of this.deviceListeners) listener({ ...device }, 'disconnected')
    }
  }
  private detectMeaningfulGamepadActivity(gamepads: readonly Gamepad[]): void {
    const active = gamepads.find(gamepad => gamepad.buttons.some(button => button.pressed || button.value >= .5) || gamepad.axes.some((axis, index) => Math.abs(applyGamepadAxisCalibration(axis, gamepad.id, index)) >= .35))
    if (active) setInputModality('gamepad', active.id)
  }
  private deviceSnapshot(): InputDeviceIdentity[] {
    if (this.touches.size) this.devices.set('touch:0', normalizeInputDeviceIdentity({ id: 'touch:0', kind: 'touch', index: 0, connected: true, mapping: 'direct' }))
    return [...this.devices.values()].filter(device => device.connected).sort((a, b) => a.kind.localeCompare(b.kind) || a.index - b.index).map((device, index) => normalizeInputDeviceIdentity(device, index))
  }
  private updateGamepad(gamepad: Gamepad, connected: boolean): void {
    const device = normalizeInputDeviceIdentity({ id: gamepad.id || `gamepad:${gamepad.index}`, kind: 'gamepad', index: gamepad.index, connected, mapping: gamepad.mapping || 'unknown' })
    this.devices.set(`gamepad:${gamepad.index}`, device)
    this.lastGamepadInventoryAt = -Infinity
    this.gamepadInventorySignature = ''
    for (const listener of this.deviceListeners) listener({ ...device }, connected ? 'connected' : 'disconnected')
  }
  private acceptMouse(event: MouseEvent): boolean { const capabilities = (event as MouseEvent & { sourceCapabilities?: { firesTouchEvents?: boolean } }).sourceCapabilities; return this.pointerDeduplicator.acceptMouse(performance.now(), event.clientX, event.clientY, capabilities?.firesTouchEvents === true) }
  private resetPairGesture(): void { const pair = [...this.touches.values()]; if (pair.length < 2) { this.pairGesture = null; return }; this.pairGesture = { distance: Math.hypot(pair[0].x - pair[1].x, pair[0].y - pair[1].y), angle: Math.atan2(pair[1].y - pair[0].y, pair[1].x - pair[0].x), centerX: (pair[0].x + pair[1].x) / 2, centerY: (pair[0].y + pair[1].y) / 2 } }
  private sampleReplay(): InputSnapshot | null {
    const replay = this.replay; if (!replay) return null
    let elapsed = (performance.now() - replay.startedAt) / 1000
    if (elapsed > replay.recording.duration) { if (!replay.loop) { const last = replay.recording.frames[replay.recording.frames.length - 1]; this.replay = null; return last ? cloneSnapshot(last.snapshot) : null }; replay.startedAt = performance.now(); replay.index = 0; elapsed = 0 }
    while (replay.index + 1 < replay.recording.frames.length && replay.recording.frames[replay.index + 1].time <= elapsed) replay.index++
    return cloneSnapshot(replay.recording.frames[replay.index].snapshot)
  }

  private isTypingTarget(target: EventTarget | null): boolean {
    return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || (target instanceof HTMLElement && target.isContentEditable)
  }
}

export function normalizeInputRecording(source: unknown): InputRecording {
  const item = source && typeof source === 'object' ? source as Partial<InputRecording> : {}
  const frames = (Array.isArray(item.frames) ? item.frames : []).slice(0, 100_000).flatMap(frame => {
    if (!frame || typeof frame !== 'object' || !frame.snapshot || typeof frame.snapshot !== 'object') return []
    const empty = emptySnapshot(), snapshot = frame.snapshot as Partial<InputSnapshot>
    return [{ time: Math.max(0, finite(frame.time, 0)), snapshot: cloneSnapshot({ ...empty, ...snapshot, mousePosition: Array.isArray(snapshot.mousePosition) ? [finite(snapshot.mousePosition[0], 0), finite(snapshot.mousePosition[1], 0)] : empty.mousePosition, mouseWorldPosition: Array.isArray(snapshot.mouseWorldPosition) ? [finite(snapshot.mouseWorldPosition[0], 0), finite(snapshot.mouseWorldPosition[1], 0)] : empty.mouseWorldPosition, viewBounds: Array.isArray(snapshot.viewBounds) && snapshot.viewBounds.length >= 4 ? [finite(snapshot.viewBounds[0], 0), finite(snapshot.viewBounds[1], 0), finite(snapshot.viewBounds[2], 0), finite(snapshot.viewBounds[3], 0)] : empty.viewBounds, viewportSize: Array.isArray(snapshot.viewportSize) ? [Math.max(0, finite(snapshot.viewportSize[0], 0)), Math.max(0, finite(snapshot.viewportSize[1], 0))] : empty.viewportSize, wheel: Array.isArray(snapshot.wheel) ? [finite(snapshot.wheel[0], 0), finite(snapshot.wheel[1], 0)] : empty.wheel, pointerDelta: Array.isArray(snapshot.pointerDelta) ? [finite(snapshot.pointerDelta[0], 0), finite(snapshot.pointerDelta[1], 0)] : empty.pointerDelta, touches: Math.max(0, Math.round(finite(snapshot.touches, 0))), devices: normalizeInputDeviceIdentities(snapshot.devices) }) }]
  }).sort((a, b) => a.time - b.time)
  const last = frames[frames.length - 1]
  return { version: 1, duration: Math.max(finite(item.duration, last?.time ?? 0), last?.time ?? 0), frames }
}
