/** 确认对话框状态：把用户确认操作转换为可等待的结果，并清理已处理请求。 */
import { reactive } from 'vue'

interface ConfirmRequest {
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  destructive: boolean
}

type Resolver = (confirmed: boolean) => void

export const confirmDialogState = reactive({
  visible: false,
  title: '',
  message: '',
  confirmLabel: '',
  cancelLabel: '',
  destructive: true
})

let resolver: Resolver | null = null

/** 新确认请求到来时将旧请求视为取消，更新对话框内容并返回等待用户决定的 Promise。 */ export function requestConfirmation(request: ConfirmRequest): Promise<boolean> {
  if (resolver) resolver(false)
  Object.assign(confirmDialogState, request, { visible: true })
  return new Promise<boolean>(/** 将 resolve 赋给 resolver，不显式返回值。 */ resolve => { resolver = resolve })
}

/** 隐藏对话框并先清除当前完成函数，再把用户决定送给原等待方。 */ export function resolveConfirmation(confirmed: boolean): void {
  confirmDialogState.visible = false
  const pending = resolver
  resolver = null
  pending?.(confirmed)
}
