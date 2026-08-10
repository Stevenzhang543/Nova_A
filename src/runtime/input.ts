export type InputActionKind = 'button' | 'axis' | 'vector2'
export type InputDevice = 'keyboard' | 'mouse-button' | 'mouse-wheel' | 'gamepad-button' | 'gamepad-axis'

export interface InputBinding {
  device: InputDevice
  code: string
  scale: number
  x: number
  y: number
  gamepad: number
  deadzone: number
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
}

export function createInputBinding(device: InputDevice = 'keyboard', code = 'Space'): InputBinding {
  return { device, code, scale: 1, x: 1, y: 0, gamepad: 0, deadzone: .18 }
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
      const devices: InputDevice[] = ['keyboard', 'mouse-button', 'mouse-wheel', 'gamepad-button', 'gamepad-axis']
      const device = devices.includes(binding.device as InputDevice) ? binding.device as InputDevice : 'keyboard'
      return [{
        device,
        code: typeof binding.code === 'string' ? binding.code.slice(0, 80) : device === 'keyboard' ? 'Space' : '0',
        scale: Math.min(100, Math.max(-100, finite(binding.scale, 1))),
        x: Math.min(100, Math.max(-100, finite(binding.x, 1))),
        y: Math.min(100, Math.max(-100, finite(binding.y, 0))),
        gamepad: Math.min(15, Math.max(0, Math.round(finite(binding.gamepad, 0)))),
        deadzone: Math.min(.99, Math.max(0, finite(binding.deadzone, .18)))
      }]
    }) : []
    actions.push({ name, kind, bindings: bindings.slice(0, 32) })
  }
  return actions.length ? actions.slice(0, 128) : defaultInputMap()
}

function emptySnapshot(): InputSnapshot {
  return { down: {}, pressed: {}, released: {}, axes: {}, vectors: {}, mousePosition: [0, 0], wheel: [0, 0] }
}

export class InputManager {
  private keyboard = new Set<string>()
  private mouseButtons = new Set<number>()
  private previousDown = new Map<string, boolean>()
  private wheelX = 0
  private wheelY = 0
  private clientX = 0
  private clientY = 0
  private attached = false
  private current = emptySnapshot()

  readonly onKeyDown = (event: KeyboardEvent) => {
    if (!this.isTypingTarget(event.target)) this.keyboard.add(event.code)
  }
  readonly onKeyUp = (event: KeyboardEvent) => { this.keyboard.delete(event.code) }
  readonly onMouseDown = (event: MouseEvent) => { this.mouseButtons.add(event.button) }
  readonly onMouseUp = (event: MouseEvent) => { this.mouseButtons.delete(event.button) }
  readonly onMouseMove = (event: MouseEvent) => { this.clientX = event.clientX; this.clientY = event.clientY }
  readonly onWheel = (event: WheelEvent) => { this.wheelX += event.deltaX; this.wheelY += event.deltaY }
  readonly onBlur = () => { this.keyboard.clear(); this.mouseButtons.clear() }

  start(): void {
    if (this.attached) return
    this.attached = true
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('mousedown', this.onMouseDown)
    window.addEventListener('mouseup', this.onMouseUp)
    window.addEventListener('mousemove', this.onMouseMove)
    window.addEventListener('wheel', this.onWheel, { passive: true })
    window.addEventListener('blur', this.onBlur)
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
    window.removeEventListener('blur', this.onBlur)
    this.keyboard.clear()
    this.mouseButtons.clear()
    this.previousDown.clear()
    this.current = emptySnapshot()
  }

  sample(actions: InputAction[], viewport?: DOMRect): InputSnapshot {
    const snapshot = emptySnapshot()
    snapshot.mousePosition = viewport
      ? [this.clientX - viewport.left, this.clientY - viewport.top]
      : [this.clientX, this.clientY]
    snapshot.wheel = [this.wheelX, this.wheelY]
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
      const down = Math.abs(snapshot.axes[action.name] ?? 0) > .0001
      const previous = this.previousDown.get(action.name) ?? false
      snapshot.down[action.name] = down
      snapshot.pressed[action.name] = down && !previous
      snapshot.released[action.name] = !down && previous
      this.previousDown.set(action.name, down)
    }
    this.wheelX = 0
    this.wheelY = 0
    this.current = snapshot
    return snapshot
  }

  snapshot(): InputSnapshot { return this.current }

  private bindingValue(binding: InputBinding): number {
    if (binding.device === 'keyboard') return this.keyboard.has(binding.code) ? 1 : 0
    if (binding.device === 'mouse-button') return this.mouseButtons.has(Number.parseInt(binding.code, 10) || 0) ? 1 : 0
    if (binding.device === 'mouse-wheel') {
      const value = binding.code.toLowerCase() === 'x' ? this.wheelX : this.wheelY
      return value === 0 ? 0 : Math.sign(value)
    }
    const gamepad = navigator.getGamepads?.()[binding.gamepad]
    if (!gamepad) return 0
    if (binding.device === 'gamepad-button') return gamepad.buttons[Number.parseInt(binding.code, 10) || 0]?.value ?? 0
    const value = gamepad.axes[Number.parseInt(binding.code, 10) || 0] ?? 0
    const magnitude = Math.abs(value)
    return magnitude <= binding.deadzone ? 0 : Math.sign(value) * (magnitude - binding.deadzone) / (1 - binding.deadzone)
  }

  private isTypingTarget(target: EventTarget | null): boolean {
    return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || (target instanceof HTMLElement && target.isContentEditable)
  }
}
