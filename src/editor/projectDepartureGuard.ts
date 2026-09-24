/** 项目离开守卫：协调未保存草稿检查及确认结果，决定是否允许替换当前项目。 */
import type { PendingAuthoringDraft } from './studioDraftRetention'

/** Approval belongs to the exact drafts observed, never a later edit. */
/** 创建串行项目离开检查器，把用户决定绑定到确认时看到的精确草稿集合和项目上下文。 */ export function createProjectDepartureGuard(options: {
  pending: () => PendingAuthoringDraft[]
  context: () => string
  chooseDiscard: (drafts: readonly PendingAuthoringDraft[]) => Promise<boolean>
  stale: () => void
}) {
  let deciding = false
  return /** 阻止并发确认；无草稿时直接允许，否则等待用户决定并再次比对项目和草稿修订，过期决定失效。 */ async function mayReplaceProject(): Promise<boolean> {
    if (deciding) return false
    deciding = true
    try {
      const context = options.context(), before = options.pending()
      if (!before.length) return true
      const identity = /** 序列化草稿的资源、类别、修订和内容指纹，用于检测确认期间发生的新编辑。 */ (drafts: readonly PendingAuthoringDraft[]) => JSON.stringify(drafts.map(/** 构造并返回记录 { assetUuid, kind, revision, sourceFingerprint }，字段按当前实参及捕获状态求值。 */ ({ assetUuid, kind, revision, sourceFingerprint }) => ({ assetUuid, kind, revision, sourceFingerprint })))
      if (!await options.chooseDiscard(before)) return false
      if (context !== options.context() || identity(before) !== identity(options.pending())) { options.stale(); return false }
      return true
    } finally { deciding = false }
  }
}
