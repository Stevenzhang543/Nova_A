/** Draft owners validate together before any boundary commits a value. No engine import. */
export interface EditorDraft {
  validate(): boolean
  commit(): void
  cancel(): void
}
const drafts = new Set<EditorDraft>()
let settling = false
export function registerEditorDraft(draft: EditorDraft): () => void {
  drafts.add(draft)
  return () => { drafts.delete(draft) }
}
export function settleEditorDrafts(): boolean {
  if (settling) return true
  settling = true
  try {
    const pending = [...drafts]
    let valid = true
    for (const draft of pending) if (!draft.validate()) valid = false
    if (!valid) return false
    for (const draft of pending) if (drafts.has(draft)) draft.commit()
    return true
  } finally { settling = false }
}
export function cancelEditorDrafts(): void {
  for (const draft of [...drafts]) draft.cancel()
}
