export type InputActionKind = 'button' | 'axis' | 'vector2'
export type InputDevice = 'keyboard' | 'physical-key' | 'mouse-button' | 'mouse-wheel' | 'mouse-motion' | 'gamepad-button' | 'gamepad-axis' | 'touch' | 'gesture'
export type InputModifier = 'Control' | 'Shift' | 'Alt' | 'Meta'
export type InputResponseCurve = 'linear' | 'square' | 'cubic' | 'exponential'

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
}

export interface InputSnapshot {
  down: Record<string, boolean>
  pressed: Record<string, boolean>
  released: Record<string, boolean>
  axes: Record<string, number>
  vectors: Record<string, [number, number]>
  mousePosition: [number, number]
  wheel: [number, number]
  pointerDelta: [number, number]
  touches: number
  devices: InputDeviceIdentity[]
}

export interface InputDeviceIdentity { id: string; kind: 'keyboard' | 'mouse' | 'gamepad' | 'touch'; index: number; connected: boolean; mapping: string }
export interface InputConflict { signature: string; action: string; bindingIndex: number; conflictsWithAction: string; conflictsWithBindingIndex: number }
export interface InputRecordingFrame { time: number; snapshot: InputSnapshot }
export interface InputRecording { version: 1; duration: number; frames: InputRecordingFrame[] }

export function createInputBinding(device: InputDevice = 'keyboard', code = 'Space'): InputBinding {
  return { device, code, scale: 1, x: 1, y: 0, gamepad: 0, deviceId: '', deadzone: .18, threshold: .0001, invert: false, responseCurve: 'linear', modifiers: [], chord: [] }
}

export function defaultInputMap(): InputAction[] {
  return [
    { name: 'MoveLeft', kind: 'button', bindings: [createInputBinding('keyboard', 'KeyA'), createInputBinding('keyboard', 'ArrowLeft')] },
    { name: 'MoveRight', kind: 'button', bindings: [createInputBinding('keyboard', 'KeyD'), createInputBinding('keyboard', 'ArrowRight')] },
    { name: 'Jump', kind: 'button', bindings: [createInputBinding('keyboard', 'Space'), createInputBinding('gamepad-button', '0')] },
    {
      name: 'Horizontal', kind: 'axis', bindings: [
        { ...createInputBinding('keyboard', 'KeyA'), scale: -1 },
        { ...createInputBinding('keyboard', 'ArrowLeft'), scale: -1 },
        createInputBinding('keyboard', 'KeyD'),
        createInputBinding('keyboard', 'ArrowRight'),
        createInputBinding('gamepad-axis', '0')
      ]
    },
    {
      name: 'Move', kind: 'vector2', bindings: [
        { ...createInputBinding('keyboard', 'KeyA'), x: -1 },
        { ...createInputBinding('keyboard', 'KeyD'), x: 1 },
        { ...createInputBinding('keyboard', 'KeyW'), x: 0, y: 1 },
        { ...createInputBinding('keyboard', 'KeyS'), x: 0, y: -1 },
        { ...createInputBinding('gamepad-axis', '0'), x: 1, y: 0 },
        { ...createInputBinding('gamepad-axis', '1'), x: 0, y: -1 }
      ]
    }
  ]
}

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
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
      const devices: InputDevice[] = ['keyboard', 'physical-key', 'mouse-button', 'mouse-wheel', 'mouse-motion', 'gamepad-button', 'gamepad-axis', 'touch', 'gesture']
      const device = devices.includes(binding.device as InputDevice) ? binding.device as InputDevice : 'keyboard'
      const responseCurves: InputResponseCurve[] = ['linear', 'square', 'cubic', 'exponential']
      const allowedModifiers: InputModifier[] = ['Control', 'Shift', 'Alt', 'Meta']
      return [{
        device,
        code: typeof binding.code === 'string' ? binding.code.slice(0, 80) : device === 'keyboard' ? 'Space' : '0',
        scale: Math.min(100, Math.max(-100, finite(binding.scale, 1))),
        x: Math.min(100, Math.max(-100, finite(binding.x, 1))),
        y: Math.min(100, Math.max(-100, finite(binding.y, 0))),
        gamepad: Math.min(15, Math.max(0, Math.round(finite(binding.gamepad, 0)))),
        deviceId: typeof binding.deviceId === 'string' ? binding.deviceId.trim().slice(0, 160) : '',
        deadzone: Math.min(.99, Math.max(0, finite(binding.deadzone, .18))),
        threshold: Math.min(1, Math.max(0, finite(binding.threshold, .0001))),
        invert: binding.invert === true,
        responseCurve: responseCurves.includes(binding.responseCurve as InputResponseCurve) ? binding.responseCurve as InputResponseCurve : 'linear',
        modifiers: Array.isArray(binding.modifiers) ? [...new Set(binding.modifiers.filter((value): value is InputModifier => allowedModifiers.includes(value as InputModifier)))].slice(0, 4) : [],
        chord: Array.isArray(binding.chord) ? [...new Set(binding.chord.filter(value => typeof value === 'string').map(value => value.slice(0, 80)).filter(Boolean))].slice(0, 8) : []
      }]
    }) : []
    actions.push({ name, kind, bindings: bindings.slice(0, 32) })
  }
  return actions.length ? actions.slice(0, 128) : defaultInputMap()
}

/** Replaces one project input binding without changing the action's axis/vector semantics. */
export function rebindInputAction(actions: InputAction[], actionName: string, bindingIndex: number, value: Pick<InputBinding, 'device' | 'code'>): boolean {
  const action = actions.find(candidate => candidate.name === actionName)
  if (!action || bindingIndex < 0 || bindingIndex > 31 || !['keyboard', 'physical-key', 'mouse-button', 'mouse-wheel', 'mouse-motion', 'gamepad-button', 'gamepad-axis', 'touch', 'gesture'].includes(value.device)) return false
  while (action.bindings.length <= bindingIndex) action.bindings.push(createInputBinding(value.device, value.code))
  const previous = action.bindings[bindingIndex]
  action.bindings[bindingIndex] = { ...previous, device: value.device, code: String(value.code).slice(0, 80) }
  return true
}

function bindingSignature(binding: InputBinding): string {
  return [binding.device, binding.deviceId || binding.gamepad, binding.code, [...binding.modifiers].sort().join('+'), [...binding.chord].sort().join('+')].join(':')
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
    down: { ...snapshot.down }, pressed: { ...snapshot.pressed }, released: { ...snapshot.released }, axes: { ...snapshot.axes },
    vectors: Object.fromEntries(Object.entries(snapshot.vectors).map(([key, value]) => [key, [...value] as [number, number]])),
    mousePosition: [...snapshot.mousePosition], wheel: [...snapshot.wheel], pointerDelta: [...snapshot.pointerDelta], touches: snapshot.touches,
    devices: snapshot.devices.map(device => ({ ...device }))
  }
}

function emptySnapshot(): InputSnapshot {
  return { down: {}, pressed: {}, released: {}, axes: {}, vectors: {}, mousePosition: [0, 0], wheel: [0, 0], pointerDelta: [0, 0], touches: 0, devices: [] }
}

export class InputManager {
  private keyboard = new Set<string>()
  private logicalKeys = new Set<string>()
  private modifiers = new Set<InputModifier>()
  private mouseButtons = new Set<number>()
  private touches = new Map<number, { x: number; y: number; startX: number; startY: number; startedAt: number }>()
  private gestures = new Map<string, number>()
  private previousDown = new Map<string, boolean>()
  private wheelX = 0
  private wheelY = 0
  private clientX = 0
  private clientY = 0
  private movementX = 0
  private movementY = 0
  private attached = false
  private current = emptySnapshot()
  private devices = new Map<string, InputDeviceIdentity>()
  private deviceListeners = new Set<(device: InputDeviceIdentity, event: 'connected' | 'disconnected') => void>()
  private recording: { startedAt: number; frames: InputRecordingFrame[] } | null = null
  private replay: { recording: InputRecording; startedAt: number; index: number; loop: boolean } | null = null

  readonly onKeyDown = (event: KeyboardEvent) => {
    if (!this.isTypingTarget(event.target)) { this.keyboard.add(event.code); this.logicalKeys.add(event.key); this.updateModifiers(event) }
  }
  readonly onKeyUp = (event: KeyboardEvent) => { this.keyboard.delete(event.code); this.logicalKeys.delete(event.key); this.updateModifiers(event) }
  readonly onMouseDown = (event: MouseEvent) => { this.mouseButtons.add(event.button) }
  readonly onMouseUp = (event: MouseEvent) => { this.mouseButtons.delete(event.button) }
  readonly onMouseMove = (event: MouseEvent) => { this.clientX = event.clientX; this.clientY = event.clientY; this.movementX += event.movementX; this.movementY += event.movementY }
  readonly onWheel = (event: WheelEvent) => { this.wheelX += event.deltaX; this.wheelY += event.deltaY }
  readonly onBlur = () => { this.keyboard.clear(); this.logicalKeys.clear(); this.modifiers.clear(); this.mouseButtons.clear(); this.touches.clear(); this.gestures.clear() }
  readonly onTouchStart = (event: TouchEvent) => { for (const touch of Array.from(event.changedTouches)) this.touches.set(touch.identifier, { x: touch.clientX, y: touch.clientY, startX: touch.clientX, startY: touch.clientY, startedAt: performance.now() }) }
  readonly onTouchMove = (event: TouchEvent) => {
    for (const touch of Array.from(event.changedTouches)) { const state = this.touches.get(touch.identifier); if (state) { state.x = touch.clientX; state.y = touch.clientY } }
    const pair = [...this.touches.values()]; if (pair.length >= 2) { const distance = Math.hypot(pair[0].x - pair[1].x, pair[0].y - pair[1].y), initial = Math.hypot(pair[0].startX - pair[1].startX, pair[0].startY - pair[1].startY); this.gestures.set('pinch', initial > 1e-6 ? distance / initial - 1 : 0) }
  }
  readonly onTouchEnd = (event: TouchEvent) => {
    for (const touch of Array.from(event.changedTouches)) { const state = this.touches.get(touch.identifier); if (!state) continue; const dx = touch.clientX - state.startX, dy = touch.clientY - state.startY, elapsed = performance.now() - state.startedAt; if (elapsed <= 350 && Math.hypot(dx, dy) < 18) this.gestures.set('tap', 1); else { this.gestures.set('swipe-x', Math.max(-1, Math.min(1, dx / 120))); this.gestures.set('swipe-y', Math.max(-1, Math.min(1, dy / 120))) }; this.touches.delete(touch.identifier) }
  }
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
    window.addEventListener('touchcancel', this.onTouchEnd, { passive: true })
    window.addEventListener('gamepadconnected', this.onGamepadConnected)
    window.addEventListener('gamepaddisconnected', this.onGamepadDisconnected)
    window.addEventListener('blur', this.onBlur)
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
    window.removeEventListener('touchcancel', this.onTouchEnd)
    window.removeEventListener('gamepadconnected', this.onGamepadConnected)
    window.removeEventListener('gamepaddisconnected', this.onGamepadDisconnected)
    window.removeEventListener('blur', this.onBlur)
    this.keyboard.clear()
    this.logicalKeys.clear()
    this.modifiers.clear()
    this.mouseButtons.clear()
    this.touches.clear()
    this.gestures.clear()
    this.devices.clear()
    this.previousDown.clear()
    this.current = emptySnapshot()
    this.recording = null
    this.replay = null
  }

  sample(actions: InputAction[], viewport?: DOMRect): InputSnapshot {
    const replayed = this.sampleReplay()
    if (replayed) { this.current = replayed; return replayed }
    const snapshot = emptySnapshot()
    snapshot.mousePosition = viewport
      ? [this.clientX - viewport.left, this.clientY - viewport.top]
      : [this.clientX, this.clientY]
    snapshot.wheel = [this.wheelX, this.wheelY]
    snapshot.pointerDelta = [this.movementX, this.movementY]
    snapshot.touches = this.touches.size
    snapshot.devices = this.connectedDevices()
    for (const action of normalizeInputMap(actions)) {
      if (action.kind === 'vector2') {
        let x = 0, y = 0
        for (const binding of action.bindings) {
          const value = this.bindingValue(binding)
          x += value * binding.x
          y += value * binding.y
        }
        const length = Math.hypot(x, y)
        if (length > 1) { x /= length; y /= length }
        snapshot.vectors[action.name] = [x, y]
        snapshot.axes[action.name] = Math.hypot(x, y)
      } else {
        const value = Math.min(1, Math.max(-1, action.bindings.reduce((total, binding) => total + this.bindingValue(binding) * binding.scale, 0)))
        snapshot.axes[action.name] = value
      }
      const threshold = Math.min(...action.bindings.map(binding => binding.threshold), .0001)
      const down = Math.abs(snapshot.axes[action.name] ?? 0) > threshold
      const previous = this.previousDown.get(action.name) ?? false
      snapshot.down[action.name] = down
      snapshot.pressed[action.name] = down && !previous
      snapshot.released[action.name] = !down && previous
      this.previousDown.set(action.name, down)
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

  connectedDevices(): InputDeviceIdentity[] {
    if (typeof navigator !== 'undefined') for (const gamepad of Array.from(navigator.getGamepads?.() ?? [])) if (gamepad) this.devices.set(`gamepad:${gamepad.index}`, { id: gamepad.id || `gamepad:${gamepad.index}`, kind: 'gamepad', index: gamepad.index, connected: gamepad.connected, mapping: gamepad.mapping || 'unknown' })
    if (this.touches.size) this.devices.set('touch:0', { id: 'touch:0', kind: 'touch', index: 0, connected: true, mapping: 'direct' })
    return [...this.devices.values()].filter(device => device.connected).sort((a, b) => a.kind.localeCompare(b.kind) || a.index - b.index).map(device => ({ ...device }))
  }

  onDeviceChange(listener: (device: InputDeviceIdentity, event: 'connected' | 'disconnected') => void): () => void { this.deviceListeners.add(listener); return () => this.deviceListeners.delete(listener) }

  beginRecording(): void { this.recording = { startedAt: performance.now(), frames: [] }; this.replay = null }
  endRecording(): InputRecording { const frames = this.recording?.frames ?? []; this.recording = null; return { version: 1, duration: frames[frames.length - 1]?.time ?? 0, frames: frames.map(frame => ({ time: frame.time, snapshot: cloneSnapshot(frame.snapshot) })) } }
  playRecording(recording: InputRecording, loop = false): boolean { const normalized = normalizeInputRecording(recording); if (!normalized.frames.length) return false; this.recording = null; this.replay = { recording: normalized, startedAt: performance.now(), index: 0, loop }; return true }
  stopReplay(): void { this.replay = null }

  private bindingValue(binding: InputBinding): number {
    if (!binding.modifiers.every(modifier => this.modifiers.has(modifier)) || !binding.chord.every(code => this.keyboard.has(code) || this.logicalKeys.has(code))) return 0
    let value = 0
    if (binding.device === 'keyboard') value = this.logicalKeys.has(binding.code) || this.keyboard.has(binding.code) ? 1 : 0
    else if (binding.device === 'physical-key') value = this.keyboard.has(binding.code) ? 1 : 0
    else if (binding.device === 'mouse-button') value = this.mouseButtons.has(Number.parseInt(binding.code, 10) || 0) ? 1 : 0
    else if (binding.device === 'mouse-wheel') {
      const wheel = binding.code.toLowerCase() === 'x' ? this.wheelX : this.wheelY
      value = wheel === 0 ? 0 : Math.sign(wheel)
    }
    else if (binding.device === 'mouse-motion') value = binding.code.toLowerCase() === 'y' ? this.movementY : this.movementX
    else if (binding.device === 'touch') { const touch = [...this.touches.values()][0]; value = binding.code === 'count' ? this.touches.size : binding.code === 'pressed' ? Number(this.touches.size > 0) : binding.code.endsWith('-y') ? touch?.y ?? 0 : touch?.x ?? 0 }
    else if (binding.device === 'gesture') value = this.gestures.get(binding.code) ?? 0
    else {
      const candidates = Array.from(navigator.getGamepads?.() ?? []).filter((item): item is Gamepad => Boolean(item))
      const gamepad = binding.deviceId ? candidates.find(item => item.id === binding.deviceId) : candidates.find(item => item.index === binding.gamepad)
      if (!gamepad) return 0
      if (binding.device === 'gamepad-button') value = gamepad.buttons[Number.parseInt(binding.code, 10) || 0]?.value ?? 0
      else value = gamepad.axes[Number.parseInt(binding.code, 10) || 0] ?? 0
    }
    const sign = binding.invert ? -1 : 1, magnitude = Math.abs(value)
    if (magnitude <= binding.deadzone || magnitude < binding.threshold) return 0
    const normalized = Math.min(1, Math.max(0, (magnitude - binding.deadzone) / Math.max(1e-9, 1 - binding.deadzone)))
    const curved = binding.responseCurve === 'square' ? normalized ** 2 : binding.responseCurve === 'cubic' ? normalized ** 3 : binding.responseCurve === 'exponential' ? (Math.exp(normalized) - 1) / (Math.E - 1) : normalized
    return Math.sign(value) * sign * curved
  }

  private updateModifiers(event: KeyboardEvent): void { this.modifiers.clear(); if (event.ctrlKey) this.modifiers.add('Control'); if (event.shiftKey) this.modifiers.add('Shift'); if (event.altKey) this.modifiers.add('Alt'); if (event.metaKey) this.modifiers.add('Meta') }
  private updateGamepad(gamepad: Gamepad, connected: boolean): void { const device = { id: gamepad.id || `gamepad:${gamepad.index}`, kind: 'gamepad' as const, index: gamepad.index, connected, mapping: gamepad.mapping || 'unknown' }; this.devices.set(`gamepad:${gamepad.index}`, device); for (const listener of this.deviceListeners) listener({ ...device }, connected ? 'connected' : 'disconnected') }
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
    return [{ time: Math.max(0, finite(frame.time, 0)), snapshot: cloneSnapshot({ ...empty, ...snapshot, mousePosition: Array.isArray(snapshot.mousePosition) ? [finite(snapshot.mousePosition[0], 0), finite(snapshot.mousePosition[1], 0)] : empty.mousePosition, wheel: Array.isArray(snapshot.wheel) ? [finite(snapshot.wheel[0], 0), finite(snapshot.wheel[1], 0)] : empty.wheel, pointerDelta: Array.isArray(snapshot.pointerDelta) ? [finite(snapshot.pointerDelta[0], 0), finite(snapshot.pointerDelta[1], 0)] : empty.pointerDelta, touches: Math.max(0, Math.round(finite(snapshot.touches, 0))), devices: Array.isArray(snapshot.devices) ? snapshot.devices : [] }) }]
  }).sort((a, b) => a.time - b.time)
  const last = frames[frames.length - 1]
  return { version: 1, duration: Math.max(finite(item.duration, last?.time ?? 0), last?.time ?? 0), frames }
}
