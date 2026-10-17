/** 编辑器草稿边界：集中登记、校验、提交或取消尚未写入项目的控件输入。 */
/** Draft owners validate together before any boundary commits a value. No engine import. */
export interface EditorDraft {
  validate(): boolean
  commit(): void
  cancel(): void
}
const drafts = new Set<EditorDraft>()
let settling = false
/** 登记草稿并返回注销函数，供所属控件卸载时移除登记。 */ export function registerEditorDraft(draft: EditorDraft): () => void {
  drafts.add(draft)
  return /** 注销当前草稿；重复调用不会影响其他草稿。 */ () => { drafts.delete(draft) }
}
/** 防止重入；先校验全部草稿，再提交仍登记的草稿，任一校验失败即不提交。 */ export function settleEditorDrafts(): boolean {
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
/** 按登记快照取消全部草稿，允许取消过程中修改登记集合。 */ export function cancelEditorDrafts(): void {
  for (const draft of [...drafts]) draft.cancel()
}
