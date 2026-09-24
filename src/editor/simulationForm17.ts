/** 仿真表单守卫：校验编辑中的数值与状态，并协调草稿提交反馈。 */
import { ref } from 'vue'
import { simulationLabel17 } from './simulationLabels17'
/** Number drafts commit on change. Invalid drafts restore synchronously before the next simulation tick. */
/** 创建仿真表单错误状态与原数值弱缓存，并用重入标记保护非法输入的恢复事件。 */ export function useSimulationFormGuard17(commit: () => void) {
  const error = ref(''); const previous = new WeakMap<HTMLInputElement, string>(); let restoring = false
  const focus = /** 在数值输入获得焦点时记住原始文本，供校验失败恢复。 */ (event: FocusEvent): void => { if (event.target instanceof HTMLInputElement && event.target.type === 'number') previous.set(event.target, event.target.value) }
  const change = /** 拒绝非法或越界数值并恢复原文本，避免恢复事件重入；有效编辑清错并提交。 */ (event: Event): void => {
    if (restoring) return
    const target = event.target
    if (target instanceof HTMLInputElement && target.type === 'number') {
      if (!Number.isFinite(target.valueAsNumber) || target.validity.rangeUnderflow || target.validity.rangeOverflow) {
        const value = previous.get(target)
        if (value !== undefined) { restoring = true; target.value = value; target.dispatchEvent(new Event('change', { bubbles: true })); restoring = false }
        error.value = simulationLabel17('bounds'); return
      }
      previous.set(target, target.value)
    }
    error.value = ''; commit()
  }
  return { error, focus, change }
}
