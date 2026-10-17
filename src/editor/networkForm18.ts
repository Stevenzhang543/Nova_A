/** 网络表单草稿约束：管理字段校验与提交反馈，供网络编辑面板复用。 */
import { ref } from 'vue'
import { networkLabel18 } from './networkLabels18'
/** Capture before lazy v-model's change listener; invalid drafts never reach authoring/history/runtime. */
/** 创建网络数值表单的错误状态与捕获阶段校验处理器，使用修订号避免旧任务清除新错误。 */ export function useNetworkForm18() {
  const error = ref('')
  let revision = 0
  const change = /** 只检查数值输入；无效时阻止后续处理并恢复已提交文本，有效时延迟清错避免打断 v-model 读取。 */ (event: Event): void => {
    const input = event.target
    if (!(input instanceof HTMLInputElement) || input.type !== 'number') return
    const current = ++revision
    if (!Number.isFinite(input.valueAsNumber) || input.validity.rangeUnderflow || input.validity.rangeOverflow || input.validity.stepMismatch) {
      event.stopImmediatePropagation()
      input.value = input.dataset.networkCommitted ?? ''
      error.value = networkLabel18('bounds')
      return
    }
    // A reactive render during capture can reset the draft before v-model reads it.
    setTimeout(/** 仅当没有更新的数值编辑发生时清除当前错误提示。 */ () => { if (revision === current) error.value = '' }, 0)
  }
  return { error, change }
}
