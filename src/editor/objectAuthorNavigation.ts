/** 对象编辑导航请求：向对象编辑工作区传递目标及定位信息。 */
import { shallowRef } from 'vue'
import { assetState,resolveAsset } from '../assets/AssetDatabase'
import type { AssetRecord } from '../assets/types'
import { projectSessionState } from '../projects/projectSession'
import { openScriptAsset } from './scriptStudioState'
import { applyEditorWorkspace } from './workspaces'

export const pendingObjectAuthorNavigation=shallowRef<{record:AssetRecord;projectId:string;callback:string}|null>(null)
export { objectCallbackSpan } from './objectCallbackLocation'
/** 确认目标为脚本资源，登记项目和回调定位请求，选中并打开资源后切换脚本工作区。 */ export function requestObjectAuthorNavigation(uuid:string,callback:string):boolean {
  const record=resolveAsset(uuid);if(!record||record.assetType!=='script')return false
  pendingObjectAuthorNavigation.value={record,projectId:projectSessionState.id,callback}
  assetState.selectedGuid=record.uuid;openScriptAsset(record.uuid);applyEditorWorkspace('script');return true
}
