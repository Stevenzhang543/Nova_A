/** Per-consumer input prompts. Legacy Editor bootstrap remains in inputModality; this module has no global prompt state or timer. */
import type { InputAction } from './input'

export type InputModality = 'keyboard' | 'mouse' | 'gamepad' | 'touch' | 'pen'

export type InputPromptStyle = 'symbol' | 'compact' | 'label'

export interface InputPromptState {
  modality: InputModality
  previousModality: InputModality
  changedAt: number
  gamepadLayout: 'xbox' | 'playstation' | 'nintendo' | 'generic'
  promptStyle: InputPromptStyle
}

export interface InputPromptDescriptor {
  action: string
  modality: InputModality
  bindingCode: string
  symbol: string
  label: string
  accessibleLabel: string
}

export interface InputPromptClock { nowMilliseconds(): number }
/** Original default values, created once for each independent Owner or the legacy facade. */
export function createInputPromptState(): InputPromptState { return {
  modality: 'keyboard', previousModality: 'keyboard', changedAt: 0,
  gamepadLayout: 'generic', promptStyle: 'compact'
} }

const KEYBOARD_SYMBOLS: Record<string, string> = {
  Space: 'Space', Enter: '↵', Escape: 'Esc', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
  ShiftLeft: 'Shift', ShiftRight: 'Shift', ControlLeft: 'Ctrl', ControlRight: 'Ctrl'
}
const MOUSE_SYMBOLS: Record<string, string> = { '0': 'LMB', '1': 'MMB', '2': 'RMB' }
const GAMEPAD_SYMBOLS: Record<string, string> = { '0': 'A', '1': 'B', '2': 'X', '3': 'Y', '4': 'LB', '5': 'RB', '6': 'LT', '7': 'RT', '8': 'View', '9': 'Menu', '12': 'D-pad ↑', '13': 'D-pad ↓', '14': 'D-pad ←', '15': 'D-pad →' }
const PEN_SYMBOLS: Record<string, string> = { tip: 'Pen', barrel: 'Barrel', eraser: 'Eraser', pressure: 'Pressure', x: 'Tilt X', y: 'Tilt Y', twist: 'Twist' }

function cleanAction(value: string): string { return value.trim().slice(0, 120) }

export function updateInputPromptState(inputPromptState: InputPromptState, clock: InputPromptClock, modality: InputModality, gamepadId = ''): void {
  if (modality === 'gamepad' && gamepadId) {
    const id = gamepadId.toLowerCase()
    inputPromptState.gamepadLayout = /playstation|dualshock|dualsense|sony/.test(id) ? 'playstation' : /nintendo|switch/.test(id) ? 'nintendo' : /xbox|xinput/.test(id) ? 'xbox' : 'generic'
  }
  if (inputPromptState.modality === modality) return
  inputPromptState.previousModality = inputPromptState.modality
  inputPromptState.modality = modality
  inputPromptState.changedAt = clock.nowMilliseconds()
}

function gamepadSymbol(inputPromptState: InputPromptState, code: string): string {
  const generic = GAMEPAD_SYMBOLS[code] ?? `Pad ${code}`
  if (inputPromptState.gamepadLayout === 'playstation') return ({ A: '✕', B: '○', X: '□', Y: '△' } as Record<string, string>)[generic] ?? generic
  if (inputPromptState.gamepadLayout === 'nintendo') return ({ A: 'B', B: 'A', X: 'Y', Y: 'X' } as Record<string, string>)[generic] ?? generic
  return generic
}

export function inputPromptForState(inputPromptState: InputPromptState, actionName: string, actions: InputAction[], modality = inputPromptState.modality): InputPromptDescriptor {
  const action = actions.find(/* 比较 item.name 与 actionName，返回严格相等的判断结果。 */ item => item.name === actionName)
  const preferred = action?.bindings.find(/** 筛选符合键盘、鼠标、手柄、笔或触摸模态的动作绑定。 */ binding => modality === 'keyboard' ? binding.device === 'keyboard' || binding.device === 'physical-key'
    : modality === 'mouse' ? binding.device.startsWith('mouse')
      : modality === 'gamepad' ? binding.device.startsWith('gamepad')
        : modality === 'pen' ? binding.device.startsWith('pen')
          : binding.device === 'touch' || binding.device === 'gesture') ?? action?.bindings[0]
  const code = preferred?.code ?? ''
  // A fallback binding must keep its real device. A keyboard-only Jump action
  // does not acquire a mouse binding merely because the pointer moved.
  const bindingModality: InputModality = !preferred ? modality
    : preferred.device === 'keyboard' || preferred.device === 'physical-key' ? 'keyboard'
      : preferred.device.startsWith('mouse') ? 'mouse'
        : preferred.device.startsWith('gamepad') ? 'gamepad'
          : preferred.device.startsWith('pen') ? 'pen'
            : preferred.device === 'sensor' ? modality : 'touch'
  const symbol = !preferred ? '—'
    : preferred.device === 'sensor' ? `Sensor ${code}`
      : bindingModality === 'keyboard' ? KEYBOARD_SYMBOLS[code] ?? (code === ' ' ? 'Space' : code.replace(/^Key/, '').replace(/^Digit/, ''))
        : preferred.device === 'mouse-button' ? MOUSE_SYMBOLS[code] ?? `Mouse ${code}`
          : bindingModality === 'mouse' ? `Mouse ${code}`
            : preferred.device === 'gamepad-axis' ? `Axis ${code}`
              : bindingModality === 'gamepad' ? gamepadSymbol(inputPromptState, code)
                : bindingModality === 'pen' ? PEN_SYMBOLS[code] ?? code.replace(/^button-/, 'Pen ')
                  : code || 'Touch'
  const label = cleanAction(actionName) || 'Action'
  const deviceLabel = preferred?.device === 'sensor' ? 'sensor' : bindingModality
  return { action: label, modality: bindingModality, bindingCode: code, symbol: symbol || '—', label, accessibleLabel: preferred ? `${label}: ${symbol || 'unbound'} on ${deviceLabel}` : `${label}: unbound` }
}

export function formatInputPromptForState(inputPromptState: InputPromptState, descriptor: InputPromptDescriptor, style = inputPromptState.promptStyle): string {
  if (style === 'symbol') return descriptor.symbol
  if (style === 'label') return `${descriptor.label} (${descriptor.symbol})`
  return `[${descriptor.symbol}] ${descriptor.label}`
}

/** Owns only prompt presentation. Does not collect or consume gameplay input. */
export class InputPromptOwner {
  readonly token: object = Object.freeze({})
  private readonly promptState: InputPromptState = createInputPromptState()
  private closed = false
  private stateRevision = 0
  constructor(private readonly clock: InputPromptClock) {
    if (!clock || typeof clock.nowMilliseconds !== 'function') throw new TypeError('INPUT_PROMPT_CLOCK_REQUIRED')
  }
  get isDisposed(): boolean { return this.closed }
  get revision(): number { return this.stateRevision }
  get state(): Readonly<InputPromptState> { this.assertOpen(); return this.promptState }
  private assertOpen(): void { if (this.closed) throw new Error('INPUT_PROMPT_OWNER_DISPOSED') }
  setInputModality(modality: InputModality, gamepadId = ''): void {
    this.assertOpen()
    const before = { ...this.promptState }
    try { updateInputPromptState(this.promptState, this.clock, modality, gamepadId) }
    finally { if (before.modality !== this.promptState.modality || before.previousModality !== this.promptState.previousModality || !Object.is(before.changedAt, this.promptState.changedAt) || before.gamepadLayout !== this.promptState.gamepadLayout) this.stateRevision++ }
  }
  setPromptStyle(style: InputPromptStyle): void { this.assertOpen(); if (this.promptState.promptStyle !== style) { this.promptState.promptStyle = style; this.stateRevision++ } }
  inputPromptForAction(actionName: string, actions: InputAction[], modality = this.promptState.modality): InputPromptDescriptor { this.assertOpen(); return inputPromptForState(this.promptState, actionName, actions, modality) }
  formatInputPrompt(descriptor: InputPromptDescriptor, style = this.promptState.promptStyle): string { this.assertOpen(); return formatInputPromptForState(this.promptState, descriptor, style) }
  snapshot() { return Object.freeze({ token: this.token, revision: this.stateRevision, disposed: this.closed, state: Object.freeze({ ...this.promptState }) }) }
  dispose(): void { if (this.closed) return; this.closed = true; this.stateRevision++ }
}
