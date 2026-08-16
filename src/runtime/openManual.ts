import { reactive } from 'vue'

export const manualViewerState = reactive({ visible: false, reloadToken: 0 })

/** Opens the bundled same-origin manual inside Nova_A without invoking Tauri's external URL opener. */
export async function openBundledManual(): Promise<void> {
  manualViewerState.visible = true
}

export function closeBundledManual(): void { manualViewerState.visible = false }
export function reloadBundledManual(): void { manualViewerState.reloadToken++ }
