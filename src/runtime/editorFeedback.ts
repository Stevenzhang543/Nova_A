/** 编辑反馈协调：把操作结果和诊断转换为编辑器可显示的状态。 */
import { reactive } from 'vue'

export type FeedbackKind = 'info' | 'success' | 'warning' | 'error'
export type TaskStatus = 'queued' | 'running' | 'complete' | 'failed' | 'cancelled'
export interface EditorToast { id: number; kind: FeedbackKind; message: string; actionLabel: string; action?: () => void }
export interface TaskResourceLink { label: string; href?: string; action?: () => void }
export interface EditorTask { id: number; title: string; detail: string; progress: number | null; status: TaskStatus; error: string; logs: string[]; resources: TaskResourceLink[]; cancel?: () => void; retry?: () => void; startedAt: number; finishedAt: number | null }

export const feedbackState = reactive({ toasts: [] as EditorToast[], tasks: [] as EditorTask[], banner: '' })
let nextToast = 1, nextTask = 1

/** 追加受限长度的通知，最多保留五条，非错误通知按级别自动关闭。 */ export function notify(message: string, kind: FeedbackKind = 'info', action?: { label: string; run: () => void }): number {
  const item: EditorToast = { id: nextToast++, kind, message: message.slice(0, 500), actionLabel: action?.label ?? '', action: action?.run }
  feedbackState.toasts.push(item)
  if (feedbackState.toasts.length > 5) feedbackState.toasts.shift()
  if (kind !== 'error') globalThis.setTimeout(/* 调用 dismissToast(item.id) 并返回调用结果。 */ () => dismissToast(item.id), kind === 'warning' ? 7000 : 4200)
  return item.id
}
/** 按通知身份移除对应提示。 */ export function dismissToast(id: number): void { const index = feedbackState.toasts.findIndex(/* 比较 item.id 与 id，返回严格相等的判断结果。 */ item => item.id === id); if (index >= 0) feedbackState.toasts.splice(index, 1) }
/** 创建带进度、日志、资源和取消重试操作的任务，保留最近一百条。 */ export function startTask(title: string, options: { detail?: string; progress?: number | null; logs?: string[]; resources?: TaskResourceLink[]; cancel?: () => void; retry?: () => void } = {}): number {
  const task: EditorTask = { id: nextTask++, title: title.slice(0, 160), detail: (options.detail ?? '').slice(0, 1000), progress: options.progress ?? null, status: 'running', error: '', logs: (options.logs ?? []).slice(-500), resources: (options.resources ?? []).slice(0, 20), cancel: options.cancel, retry: options.retry, startedAt: Date.now(), finishedAt: null }
  feedbackState.tasks.unshift(task); if (feedbackState.tasks.length > 100) feedbackState.tasks.splice(100); return task.id
}
/** 更新匹配任务并限制日志数量，进入终止状态时记录完成时间。 */ export function updateTask(id: number, update: Partial<Pick<EditorTask, 'detail' | 'progress' | 'status' | 'error' | 'logs' | 'resources'>>): void { const task = feedbackState.tasks.find(/* 比较 item.id 与 id，返回严格相等的判断结果。 */ item => item.id === id); if (!task) return; Object.assign(task, update); if (task.logs.length > 500) task.logs.splice(0, task.logs.length - 500); if (task.status === 'complete' || task.status === 'failed' || task.status === 'cancelled') task.finishedAt = Date.now() }
/** 追加带时间戳且长度受限的任务日志，保留最近五百条。 */ export function appendTaskLog(id: number, line: string): void { const task = feedbackState.tasks.find(/* 比较 item.id 与 id，返回严格相等的判断结果。 */ item => item.id === id); if (!task) return; task.logs.push(`${new Date().toISOString()} ${line}`.slice(0, 2000)); if (task.logs.length > 500) task.logs.shift() }
/** 将任务标记完成、设置满进度并显示成功通知。 */ export function completeTask(id: number, detail = ''): void { updateTask(id, { status: 'complete', progress: 1, detail }); const task = feedbackState.tasks.find(/* 比较 item.id 与 id，返回严格相等的判断结果。 */ item => item.id === id); if (task) notify(task.title, 'success') }
/** 记录任务失败信息并显示含任务标题的错误通知。 */ export function failTask(id: number, error: unknown): void { const message = error instanceof Error ? error.message : String(error); updateTask(id, { status: 'failed', error: message }); const task = feedbackState.tasks.find(/* 比较 item.id 与 id，返回严格相等的判断结果。 */ item => item.id === id); notify(task?.title ? `${task.title}: ${message}` : message, 'error') }
/** 仅取消排队或运行任务，调用取消回调后标记终止。 */ export function cancelTask(id: number): void { const task = feedbackState.tasks.find(/* 比较 item.id 与 id，返回严格相等的判断结果。 */ item => item.id === id); if (!task || !['queued', 'running'].includes(task.status)) return; task.cancel?.(); updateTask(id, { status: 'cancelled' }) }
/** 调用可用重试操作并恢复运行状态，清空旧错误和结束时间。 */ export function retryTask(id: number): void { const task = feedbackState.tasks.find(/* 比较 item.id 与 id，返回严格相等的判断结果。 */ item => item.id === id); if (!task?.retry) return; task.retry(); task.status = 'running'; task.error = ''; task.finishedAt = null }
/** 原位移除已终止任务，只保留排队和运行中的条目。 */ export function clearFinishedTasks(): void { feedbackState.tasks.splice(0, feedbackState.tasks.length, ...feedbackState.tasks.filter(/* 先计算 item.status === 'running'；仅当其为假值时求右侧 item.status === 'queued'，返回短路求值结果。 */ item => item.status === 'running' || item.status === 'queued')) }
/** 导出横幅和任务诊断，剔除不可序列化的取消与重试回调。 */ export function feedbackDiagnostics(): string { return JSON.stringify({ generatedAt: new Date().toISOString(), banner: feedbackState.banner, tasks: feedbackState.tasks.map(/** 构造并返回记录 { ...item, cancel: undefined, retry: undefined }，字段按当前实参及捕获状态求值。 */ item => ({ ...item, cancel: undefined, retry: undefined })) }, null, 2) }
