import type { PendingAuthoringDraft } from './studioDraftRetention'

/** Approval belongs to the exact drafts observed, never a later edit. */
export function createProjectDepartureGuard(options: {
  pending: () => PendingAuthoringDraft[]
  context: () => string
  chooseDiscard: (drafts: readonly PendingAuthoringDraft[]) => Promise<boolean>
  stale: () => void
}) {
  let deciding = false
  return async function mayReplaceProject(): Promise<boolean> {
    if (deciding) return false
    deciding = true
    try {
      const context = options.context(), before = options.pending()
      if (!before.length) return true
      const identity = (drafts: readonly PendingAuthoringDraft[]) => JSON.stringify(drafts.map(({ assetUuid, kind, revision, sourceFingerprint }) => ({ assetUuid, kind, revision, sourceFingerprint })))
      if (!await options.chooseDiscard(before)) return false
      if (context !== options.context() || identity(before) !== identity(options.pending())) { options.stale(); return false }
      return true
    } finally { deciding = false }
  }
}
