import { reactive } from 'vue'

export type FeedbackKind = 'info' | 'success' | 'warning' | 'error'
export type TaskStatus = 'queued' | 'running' | 'complete' | 'failed' | 'cancelled'
export interface EditorToast { id: number; kind: FeedbackKind; message: string; actionLabel: string; action?: () => void }
export interface EditorTask { id: number; title: string; detail: string; progress: number | null; status: TaskStatus; error: string; cancel?: () => void; retry?: () => void; startedAt: number; finishedAt: number | null }

export const feedbackState = reactive({ toasts: [] as EditorToast[], tasks: [] as EditorTask[], banner: '' })
let nextToast = 1, nextTask = 1

export function notify(message: string, kind: FeedbackKind = 'info', action?: { label: string; run: () => void }): number {
  const item: EditorToast = { id: nextToast++, kind, message: message.slice(0, 500), actionLabel: action?.label ?? '', action: action?.run }
  feedbackState.toasts.push(item)
  if (feedbackState.toasts.length > 5) feedbackState.toasts.shift()
  if (kind !== 'error') window.setTimeout(() => dismissToast(item.id), kind === 'warning' ? 7000 : 4200)
  return item.id
}
export function dismissToast(id: number): void { const index = feedbackState.toasts.findIndex(item => item.id === id); if (index >= 0) feedbackState.toasts.splice(index, 1) }
export function startTask(title: string, options: { detail?: string; progress?: number | null; cancel?: () => void; retry?: () => void } = {}): number {
  const task: EditorTask = { id: nextTask++, title: title.slice(0, 160), detail: (options.detail ?? '').slice(0, 1000), progress: options.progress ?? null, status: 'running', error: '', cancel: options.cancel, retry: options.retry, startedAt: Date.now(), finishedAt: null }
  feedbackState.tasks.unshift(task); if (feedbackState.tasks.length > 100) feedbackState.tasks.splice(100); return task.id
}
export function updateTask(id: number, update: Partial<Pick<EditorTask, 'detail' | 'progress' | 'status' | 'error'>>): void { const task = feedbackState.tasks.find(item => item.id === id); if (!task) return; Object.assign(task, update); if (task.status === 'complete' || task.status === 'failed' || task.status === 'cancelled') task.finishedAt = Date.now() }
export function completeTask(id: number, detail = ''): void { updateTask(id, { status: 'complete', progress: 1, detail }); const task = feedbackState.tasks.find(item => item.id === id); if (task) notify(task.title, 'success') }
export function failTask(id: number, error: unknown): void { const message = error instanceof Error ? error.message : String(error); updateTask(id, { status: 'failed', error: message }); const task = feedbackState.tasks.find(item => item.id === id); notify(task?.title ? `${task.title}: ${message}` : message, 'error') }
export function cancelTask(id: number): void { const task = feedbackState.tasks.find(item => item.id === id); if (!task || !['queued', 'running'].includes(task.status)) return; task.cancel?.(); updateTask(id, { status: 'cancelled' }) }
export function retryTask(id: number): void { const task = feedbackState.tasks.find(item => item.id === id); if (!task?.retry) return; task.retry(); task.status = 'running'; task.error = ''; task.finishedAt = null }
export function clearFinishedTasks(): void { feedbackState.tasks.splice(0, feedbackState.tasks.length, ...feedbackState.tasks.filter(item => item.status === 'running' || item.status === 'queued')) }
export function feedbackDiagnostics(): string { return JSON.stringify({ generatedAt: new Date().toISOString(), banner: feedbackState.banner, tasks: feedbackState.tasks.map(item => ({ ...item, cancel: undefined, retry: undefined })) }, null, 2) }
