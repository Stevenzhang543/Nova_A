import {beginHistoryTransaction, cancelHistoryTransaction, commitHistoryTransaction, getSceneJSON, loadProject} from '../store/physics'
import {finalizeSemanticMerge} from '../runtime/teamWorkflow'

/** Settle live drafts before checking whether the reviewed incoming merge is still current. */
export function applyReviewedProjectMerge(blockedMessage = 'Finish or cancel invalid edits before applying the merge.'): void {
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
