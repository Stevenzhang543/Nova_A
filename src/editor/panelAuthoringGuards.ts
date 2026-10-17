/** 面板编辑守卫：识别可编辑键盘目标，并保护事件表切换时的草稿提交边界。 */
/** A panel shortcut must not consume ordinary editing inside a native or custom text field. */
export function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  const node = target as (EventTarget & { isContentEditable?: boolean; closest?: (selector: string) => unknown; parentElement?: Element | null }) | null
  return Boolean(node?.isContentEditable || node?.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]') || node?.parentElement?.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]'))
}

export interface EventSheetDraftSnapshot { identity: string; source: string; dirty: boolean }
export interface EventSheetTransitionHost {
  snapshot(): EventSheetDraftSnapshot
  chooseSave(): Promise<boolean>
  chooseDiscard(): Promise<boolean>
  save(): boolean | Promise<boolean>
  report(reason: 'invalid' | 'stale' | 'failed', error?: unknown): void
}

/** Serializes transitions, and never mutates a draft before a successful decision/save. */
/** 创建串行事件表切换入口，等待保存或丢弃决定期间保持原草稿。 */ export function createEventSheetTransitionGuard(host: EventSheetTransitionHost): { run(operation: () => boolean | void | Promise<boolean | void>): Promise<boolean> } {
  let pending = false
  const same = /* 先计算 first.identity === second.identity && first.source === second.source；仅当其为真值时求右侧 first.dirty === second.dirty，返回短路求值结果。 */ (first: EventSheetDraftSnapshot, second: EventSheetDraftSnapshot) => first.identity === second.identity && first.source === second.source && first.dirty === second.dirty
  return { /** 检查确认前后草稿一致性，保存成功且没有新编辑后才执行切换；异常转为面板错误并释放重入锁。 */ async run(operation) {
    if (pending) return false
    pending = true
    try {
      const before = host.snapshot()
      if (before.dirty) {
        const save = await host.chooseSave()
        if (!same(before, host.snapshot())) { host.report('stale'); return false }
        if (!save) {
          const discard = await host.chooseDiscard()
          if (!same(before, host.snapshot())) { host.report('stale'); return false }
          if (!discard) return false
        } else {
          if (!await host.save()) { host.report('invalid'); return false }
          const saved = host.snapshot()
          if (saved.identity !== before.identity || saved.source !== before.source || saved.dirty) { host.report('stale'); return false }
        }
      }
      return await operation() !== false
    } catch (error) { host.report('failed', error); return false }
    finally { pending = false }
  } }
}
