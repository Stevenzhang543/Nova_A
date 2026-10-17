/** 语义合并提交桥接：把审核后的项目合并结果应用到编辑历史边界。 */
import {beginHistoryTransaction, cancelHistoryTransaction, commitHistoryTransaction, getSceneJSON, loadProject} from '../store/physics'
import {finalizeSemanticMerge} from '../runtime/teamWorkflow'

/** Settle live drafts before checking whether the reviewed incoming merge is still current. */
/** 在单个历史事务内最终确认并加载语义合并结果；失败则回滚，同时保留合并和回滚错误信息。 */ export function applyReviewedProjectMerge(blockedMessage = 'Finish or cancel invalid edits before applying the merge.'): void {
  if (!beginHistoryTransaction('Merge project')) throw new Error(blockedMessage)
  try {
    const source = finalizeSemanticMerge(getSceneJSON())
    if (!loadProject(source)) throw new Error('Merged project could not be loaded.')
    commitHistoryTransaction()
  } catch (error) {
    try { cancelHistoryTransaction() } catch (rollbackError) {
      throw new Error(`${error instanceof Error ? error.message : String(error)}; ${String(rollbackError)}`)
    }
    throw error
  }
}
