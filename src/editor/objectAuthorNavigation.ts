import { shallowRef } from 'vue'
import { assetState,resolveAsset } from '../assets/AssetDatabase'
import type { AssetRecord } from '../assets/types'
import { projectSessionState } from '../projects/projectSession'
import { openScriptAsset } from './scriptStudioState'
import { applyEditorWorkspace } from './workspaces'

export const pendingObjectAuthorNavigation=shallowRef<{record:AssetRecord;projectId:string;callback:string}|null>(null)
export { objectCallbackSpan } from './objectCallbackLocation'
export function requestObjectAuthorNavigation(uuid:string,callback:string):boolean {
  const record=resolveAsset(uuid);if(!record||record.assetType!=='script')return false
  pendingObjectAuthorNavigation.value={record,projectId:projectSessionState.id,callback}
  assetState.selectedGuid=record.uuid;openScriptAsset(record.uuid);applyEditorWorkspace('script');return true
}
