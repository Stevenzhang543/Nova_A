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

export function requestConfirmation(request: ConfirmRequest): Promise<boolean> {
  if (resolver) resolver(false)
  Object.assign(confirmDialogState, request, { visible: true })
  return new Promise<boolean>(resolve => { resolver = resolve })
}

export function resolveConfirmation(confirmed: boolean): void {
  confirmDialogState.visible = false
  const pending = resolver
  resolver = null
  pending?.(confirmed)
}
