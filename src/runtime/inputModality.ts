/** 输入方式识别：跟踪当前键盘、鼠标或触摸交互方式。 */
import { reactive } from 'vue'
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
const PEN_SYMBOLS: Record<string, string> = { tip: 'Pen', barrel: 'Barrel', eraser: 'Eraser', pressure: 'Pressure', x: 'Tilt X', y: 'Tilt Y', twist: 'Twist' }

/* 调用 value.trim().slice(0, 120) 并返回调用结果。 */ function cleanAction(value: string): string { return value.trim().slice(0, 120) }

/** 根据手柄身份推断布局，输入模态变化时保存前一模态和切换时间。 */ export function setInputModality(modality: InputModality, gamepadId = ''): void {
  if (modality === 'gamepad' && gamepadId) {
    const id = gamepadId.toLowerCase()
    inputPromptState.gamepadLayout = /playstation|dualshock|dualsense|sony/.test(id) ? 'playstation' : /nintendo|switch/.test(id) ? 'nintendo' : /xbox|xinput/.test(id) ? 'xbox' : 'generic'
  }
  if (inputPromptState.modality === modality) return
  inputPromptState.previousModality = inputPromptState.modality
  inputPromptState.modality = modality
  inputPromptState.changedAt = typeof performance === 'undefined' ? Date.now() : performance.now()
}

/** 按当前手柄布局映射常见按键符号，未知键保留通用提示。 */ function gamepadSymbol(code: string): string {
  const generic = GAMEPAD_SYMBOLS[code] ?? `Pad ${code}`
  if (inputPromptState.gamepadLayout === 'playstation') return ({ A: '✕', B: '○', X: '□', Y: '△' } as Record<string, string>)[generic] ?? generic
  if (inputPromptState.gamepadLayout === 'nintendo') return ({ A: 'B', B: 'A', X: 'Y', Y: 'X' } as Record<string, string>)[generic] ?? generic
  return generic
}

/** 优先选择当前设备模态绑定，回退仍保留真实绑定设备，生成符号与无障碍说明。 */ export function inputPromptForAction(actionName: string, actions: InputAction[], modality = inputPromptState.modality): InputPromptDescriptor {
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
              : bindingModality === 'gamepad' ? gamepadSymbol(code)
                : bindingModality === 'pen' ? PEN_SYMBOLS[code] ?? code.replace(/^button-/, 'Pen ')
                  : code || 'Touch'
  const label = cleanAction(actionName) || 'Action'
  const deviceLabel = preferred?.device === 'sensor' ? 'sensor' : bindingModality
  return { action: label, modality: bindingModality, bindingCode: code, symbol: symbol || '—', label, accessibleLabel: preferred ? `${label}: ${symbol || 'unbound'} on ${deviceLabel}` : `${label}: unbound` }
}

/** 按符号、标签或组合样式格式化输入提示。 */ export function formatInputPrompt(descriptor: InputPromptDescriptor, style = inputPromptState.promptStyle): string {
  if (style === 'symbol') return descriptor.symbol
  if (style === 'label') return `${descriptor.label} (${descriptor.symbol})`
  return `[${descriptor.symbol}] ${descriptor.label}`
}
