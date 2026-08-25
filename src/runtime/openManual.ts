import { reactive } from 'vue'

export const manualViewerState = reactive({ visible: false, reloadToken: 0, section: '' })

/** Opens the bundled same-origin manual inside Nova_A without invoking Tauri's external URL opener. */
export async function openBundledManual(section: string | Event = ''): Promise<void> {
  manualViewerState.section = (typeof section === 'string' ? section : '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 120)
  manualViewerState.reloadToken++
  manualViewerState.visible = true
}

export function closeBundledManual(): void { manualViewerState.visible = false }
export function reloadBundledManual(): void { manualViewerState.reloadToken++ }
