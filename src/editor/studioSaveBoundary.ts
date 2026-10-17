/** 工作区保存边界：检查所有受保护草稿已保存，避免导出或切换漏掉编辑。 */
import { assetState } from '../assets/AssetDatabase'
import { projectSessionState } from '../projects/projectSession'
import { preferencesState } from '../store/preferences'
import { listPendingAuthoringDrafts } from './studioDraftRetention'
const instructions = {
  en: 'Save or discard these drafts in their asset editors before saving, exporting or playing the project. Your drafts are retained.',
  de: 'Speichern oder verwerfen Sie diese Entwürfe in ihren Asset-Editoren, bevor Sie das Projekt speichern, exportieren oder abspielen. Ihre Entwürfe bleiben erhalten.',
  zh: '请先在对应资源编辑器中保存或放弃以下草稿，再保存、导出或运行项目。草稿已保留。'
} as const
/** Recovery payloads are not necessarily asset source (materials include raw JSON).
 * Asset owners validate and commit them; never silently publish older sources. */
/** 检查当前项目所有保留草稿；仍有未保存资源时抛出包含资源名的本地化提示。 */ export function assertStudioDraftsSaved(): void {
  const pending = listPendingAuthoringDrafts(projectSessionState.id, assetState.records)
  if (pending.length) throw new Error(`${instructions[preferencesState.locale]}\n\n${pending.map(/* 返回 draft.name 的当前值。 */ draft => draft.name).join('\n')}`)
}
