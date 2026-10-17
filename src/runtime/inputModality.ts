/** 输入方式识别：跟踪当前键盘、鼠标或触摸交互方式。 */
import type { InputAction } from './input'
import { createInputPromptState, updateInputPromptState, inputPromptForState, formatInputPromptForState } from './inputPromptOwner'
import type { InputModality, InputPromptState, InputPromptDescriptor, InputPromptClock } from './inputPromptOwner'
export type { InputModality, InputPromptStyle, InputPromptState, InputPromptDescriptor } from './inputPromptOwner'
const legacyInputPromptClock: InputPromptClock = { nowMilliseconds: () => typeof performance === 'undefined' ? Date.now() : performance.now() }








export let inputPromptState: InputPromptState = createInputPromptState()

let inputPromptAdapterPhase: 'plain' | 'preparing' | 'installed' = 'plain'
/** Internal bootstrap preflight; production hosts use the aggregate installer. */
export function isInputPromptStateAdapterInstalled(): boolean { return inputPromptAdapterPhase !== 'plain' }
/** Reserve the existing Owner until the aggregate has validated every synchronous view. */
export function reserveInputPromptStateAdapter() {
  if (inputPromptAdapterPhase !== 'plain') throw new Error('Input prompt state has an independent module bootstrap')
  inputPromptAdapterPhase = 'preparing'
  let active = true
  return {
    target: inputPromptState,
    commit(view: InputPromptState): void {
      if (!active || inputPromptAdapterPhase !== 'preparing') throw new Error('Input prompt state bootstrap reservation expired')
      if (!view || typeof view !== 'object') throw new TypeError('Input prompt view must retain the same raw Owner')
      inputPromptState = view
      inputPromptAdapterPhase = 'installed'
      active = false
    },
    release(): void {
      if (!active) return
      active = false
      inputPromptAdapterPhase = 'plain'
    }
  }
}






/* 调用 value.trim().slice(0, 120) 并返回调用结果。 */ 

/** 根据手柄身份推断布局，输入模态变化时保存前一模态和切换时间。 */ export function setInputModality(modality: InputModality, gamepadId = ''): void { updateInputPromptState(inputPromptState, legacyInputPromptClock, modality, gamepadId) }

/** 按当前手柄布局映射常见按键符号，未知键保留通用提示。 */ 

/** 优先选择当前设备模态绑定，回退仍保留真实绑定设备，生成符号与无障碍说明。 */ export function inputPromptForAction(actionName: string, actions: InputAction[], modality = inputPromptState.modality): InputPromptDescriptor { return inputPromptForState(inputPromptState, actionName, actions, modality) }

/** 按符号、标签或组合样式格式化输入提示。 */ export function formatInputPrompt(descriptor: InputPromptDescriptor, style = inputPromptState.promptStyle): string { return formatInputPromptForState(inputPromptState, descriptor, style) }
