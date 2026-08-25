import { reactive } from 'vue'

export const scriptStudioState = reactive({
  activeUuid: null as string | null,
  openTabs: [] as string[],
  layout: { detailDock: 'right' as 'right' | 'bottom', explorerVisible: true, detailVisible: true }
})

export function toggleScriptDetailDock(): void { scriptStudioState.layout.detailDock = scriptStudioState.layout.detailDock === 'right' ? 'bottom' : 'right' }
export function toggleScriptExplorer(): void { scriptStudioState.layout.explorerVisible = !scriptStudioState.layout.explorerVisible }
export function toggleScriptDetail(): void { scriptStudioState.layout.detailVisible = !scriptStudioState.layout.detailVisible }

export function openScriptAsset(uuid: string): void {
  if (!scriptStudioState.openTabs.includes(uuid)) scriptStudioState.openTabs.push(uuid)
  scriptStudioState.activeUuid = uuid
}

export function closeScriptAsset(uuid: string): void {
  const index = scriptStudioState.openTabs.indexOf(uuid)
  if (index < 0) return
  scriptStudioState.openTabs.splice(index, 1)
  if (scriptStudioState.activeUuid === uuid) scriptStudioState.activeUuid = scriptStudioState.openTabs[Math.min(index, scriptStudioState.openTabs.length - 1)] ?? null
}
