/** 脚本工作区共享状态：维护打开资源、活动编辑文档和细节面板显示。 */
import { reactive } from 'vue'
import { openCodeWorkspace } from '../visual/graphStudioState'

export const scriptStudioState = reactive({
  activeUuid: null as string | null,
  openTabs: [] as string[],
  activeDirty: false,
  /** Registered by ScriptStudio while mounted so a mode switch can validate,
   * save, and synchronize the exact active Rhai draft before opening blocks. */
  saveActiveDraft: null as null | (() => Promise<boolean>),
  layout: {
    detailDock: 'right' as 'right' | 'bottom', explorerVisible: true, detailVisible: true,
    explorerWidth: 224, detailWidth: 400, detailHeight: 220,
    compactToolbar: true, codeFocused: false, activePanel: 'detail' as 'explorer' | 'detail',
  }
})

/** 将 scriptStudioState.layout.detailDock === 'right' ? 'bottom' : 'right' 赋给 scriptStudioState.layout.detailDock，不显式返回值。 */ export function toggleScriptDetailDock(): void { scriptStudioState.layout.detailDock = scriptStudioState.layout.detailDock === 'right' ? 'bottom' : 'right' }
/** 将 !scriptStudioState.layout.explorerVisible 赋给 scriptStudioState.layout.explorerVisible，不显式返回值。 */ export function toggleScriptExplorer(): void { scriptStudioState.layout.explorerVisible = !scriptStudioState.layout.explorerVisible }
/** 将 !scriptStudioState.layout.detailVisible 赋给 scriptStudioState.layout.detailVisible，不显式返回值。 */ export function toggleScriptDetail(): void { scriptStudioState.layout.detailVisible = !scriptStudioState.layout.detailVisible }

/** 切换代码模式，避免重复打开标签，并将指定脚本设为当前资源。 */ export function openScriptAsset(uuid: string): void {
  openCodeWorkspace()
  if (!scriptStudioState.openTabs.includes(uuid)) scriptStudioState.openTabs.push(uuid)
  scriptStudioState.activeUuid = uuid
}

/** 移除指定脚本标签；关闭当前资源时选择相邻标签，全部关闭则清空当前标识。 */ export function closeScriptAsset(uuid: string): void {
  const index = scriptStudioState.openTabs.indexOf(uuid)
  if (index < 0) return
  scriptStudioState.openTabs.splice(index, 1)
  if (scriptStudioState.activeUuid === uuid) scriptStudioState.activeUuid = scriptStudioState.openTabs[Math.min(index, scriptStudioState.openTabs.length - 1)] ?? null
}
