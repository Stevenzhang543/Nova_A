import { reactive } from 'vue'
import type { InputAction } from './input'

export type InputModality = 'keyboard' | 'mouse' | 'gamepad' | 'touch'
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

export const inputPromptState = reactive<InputPromptState>({
  modality: 'keyboard', previousModality: 'keyboard', changedAt: 0,
  gamepadLayout: 'generic', promptStyle: 'compact'
})

const KEYBOARD_SYMBOLS: Record<string, string> = {
  Space: 'Space', Enter: '↵', Escape: 'Esc', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
  ShiftLeft: 'Shift', ShiftRight: 'Shift', ControlLeft: 'Ctrl', ControlRight: 'Ctrl'
}
const MOUSE_SYMBOLS: Record<string, string> = { '0': 'LMB', '1': 'MMB', '2': 'RMB' }
const GAMEPAD_SYMBOLS: Record<string, string> = { '0': 'A', '1': 'B', '2': 'X', '3': 'Y', '4': 'LB', '5': 'RB', '6': 'LT', '7': 'RT', '8': 'View', '9': 'Menu', '12': 'D-pad ↑', '13': 'D-pad ↓', '14': 'D-pad ←', '15': 'D-pad →' }

function cleanAction(value: string): string { return value.trim().slice(0, 120) }

export function setInputModality(modality: InputModality, gamepadId = ''): void {
  if (modality === 'gamepad' && gamepadId) {
    const id = gamepadId.toLowerCase()
    inputPromptState.gamepadLayout = /playstation|dualshock|dualsense|sony/.test(id) ? 'playstation' : /nintendo|switch/.test(id) ? 'nintendo' : /xbox|xinput/.test(id) ? 'xbox' : 'generic'
  }
  if (inputPromptState.modality === modality) return
  inputPromptState.previousModality = inputPromptState.modality
  inputPromptState.modality = modality
  inputPromptState.changedAt = typeof performance === 'undefined' ? Date.now() : performance.now()
}

function gamepadSymbol(code: string): string {
  const generic = GAMEPAD_SYMBOLS[code] ?? `Pad ${code}`
  if (inputPromptState.gamepadLayout === 'playstation') return ({ A: '✕', B: '○', X: '□', Y: '△' } as Record<string, string>)[generic] ?? generic
  if (inputPromptState.gamepadLayout === 'nintendo') return ({ A: 'B', B: 'A', X: 'Y', Y: 'X' } as Record<string, string>)[generic] ?? generic
  return generic
}

export function inputPromptForAction(actionName: string, actions: InputAction[], modality = inputPromptState.modality): InputPromptDescriptor {
  const action = actions.find(item => item.name === actionName)
  const preferred = action?.bindings.find(binding => modality === 'keyboard' ? binding.device === 'keyboard' || binding.device === 'physical-key'
    : modality === 'mouse' ? binding.device.startsWith('mouse')
      : modality === 'gamepad' ? binding.device.startsWith('gamepad')
        : binding.device === 'touch' || binding.device === 'gesture') ?? action?.bindings[0]
  const code = preferred?.code ?? ''
  const symbol = modality === 'keyboard' ? KEYBOARD_SYMBOLS[code] ?? code.replace(/^Key/, '').replace(/^Digit/, '')
    : modality === 'mouse' ? MOUSE_SYMBOLS[code] ?? `Mouse ${code}`
      : modality === 'gamepad' ? gamepadSymbol(code)
        : code || 'Touch'
  const label = cleanAction(actionName) || 'Action'
  return { action: label, modality, bindingCode: code, symbol: symbol || '—', label, accessibleLabel: `${label}: ${symbol || 'unbound'} on ${modality}` }
}

export function formatInputPrompt(descriptor: InputPromptDescriptor, style = inputPromptState.promptStyle): string {
  if (style === 'symbol') return descriptor.symbol
  if (style === 'label') return `${descriptor.label} (${descriptor.symbol})`
  return `[${descriptor.symbol}] ${descriptor.label}`
}
