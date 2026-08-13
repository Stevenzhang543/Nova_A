import { reactive } from 'vue'

export const scriptStudioState = reactive({
  activeUuid: null as string | null,
  openTabs: [] as string[]
})

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
