/** 编辑器异常报告：捕获未处理错误，整理诊断并协调恢复界面的展示。 */
import { reportFatalError } from './faultCenter'

interface CrashPayload {
  message: string
  stack: string
  project: string
  scene: string
  renderer: string
}

let installed = false

/** 识别浏览器 ResizeObserver 通知交付警告，防止误报为应用致命错误。 */ function isBrowserLayoutDeliveryWarning(reason: unknown): boolean {
  const message = reason instanceof Error ? reason.message : String(reason)
  return /ResizeObserver loop (?:limit exceeded|completed with undelivered notifications)/i.test(message)
}

/** 记录受限崩溃遥测，按播放器设置决定是否在原生宿主写入崩溃日志。 */ async function persistCrash(payload: CrashPayload): Promise<void> {
  const [{ recordTelemetry }, { buildSettings }] = await Promise.all([import('./shipping'), import('./buildSettings')])
  recordTelemetry('runtime.crash', { renderer: payload.renderer, scene: payload.scene, message: payload.message.slice(0, 160) })
  if (payload.renderer !== 'Nova_A Editor' && !buildSettings.delivery.crashReports) return
  if (!('__TAURI_INTERNALS__' in window)) return
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('write_crash_log', { payload })
  } catch (error) {
    console.error('Could not write Nova_A crash log', error)
  }
}

/** 只安装一次全局异常及未处理拒绝监听，过滤布局通知并交给恢复和故障报告流程。 */ export function installCrashReporter(renderer = 'Editor'): void {
  if (installed) return
  installed = true
  const report = /** 将异常汇入故障中心，尽力保存编辑器恢复快照并持久化崩溃诊断。 */ async (reason: unknown) => {
    // Browsers dispatch this platform notification through `window.error` even
    // though it is not an application exception. Canvas resizing is coalesced
    // separately; never turn the delivery warning itself into a fatal report.
    if (isBrowserLayoutDeliveryWarning(reason)) return
    const error = reason instanceof Error ? reason : new Error(String(reason))
    reportFatalError(error, renderer === 'Nova_A Editor' ? 'Uncaught editor error' : 'Uncaught player error')
    let project = 'Unknown', scene = 'Unknown'
    try {
      const [{ physicsState, sceneManager, getSceneJSON }, { markRecoverySessionCrashed, storeRecoverySnapshot }] = await Promise.all([import('../store/physics'), import('./recovery')])
      project = physicsState.world.projectEngineVersion
      scene = sceneManager.activeScene?.name ?? 'Unknown'
      markRecoverySessionCrashed()
      if (renderer === 'Nova_A Editor') storeRecoverySnapshot(getSceneJSON(), 'crash')
    } catch { /* The last valid autosave remains available. */ }
    const payload: CrashPayload = {
      message: error.message || 'Unknown runtime failure', stack: error.stack ?? '',
      project, scene, renderer
    }
    await persistCrash(payload).catch(/* 调用 console.error('Could not persist Nova_A crash', persistError) 并返回调用结果。 */ persistError => console.error('Could not persist Nova_A crash', persistError))
  }
  window.addEventListener('error', /** 过滤布局交付警告，其他窗口错误异步报告并阻止浏览器默认错误处理。 */ event => {
    const reason = event.error ?? event.message
    if (isBrowserLayoutDeliveryWarning(reason)) {
      event.preventDefault()
      return
    }
    void report(reason)
    event.preventDefault()
  })
  window.addEventListener('unhandledrejection', /** 报告未处理 Promise 拒绝并阻止默认拒绝提示。 */ event => { void report(event.reason); event.preventDefault() })
}
