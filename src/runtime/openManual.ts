import { reactive } from 'vue'
import { NOVA_RELEASE_NAME } from '../projects/projectFormat'

export const manualViewerState = reactive({ visible: false, reloadToken: 0, section: '' })

/** Opens the bundled same-origin manual inside Nova_A without invoking Tauri's external URL opener. */
export async function openBundledManual(section: string | Event = ''): Promise<void> {
  manualViewerState.section = (typeof section === 'string' ? section : '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 120)
  manualViewerState.reloadToken++
  manualViewerState.visible = true
}

export function closeBundledManual(): void { manualViewerState.visible = false }
export function reloadBundledManual(): void { manualViewerState.reloadToken++ }

/** Follow the active build's bundled lesson, including development builds. */
export function openProductionManual(locale: 'en' | 'de' | 'zh'): Promise<void> {
  return openBundledManual((locale === 'zh' ? 'zh-CN' : locale) + '-v' + NOVA_RELEASE_NAME.replace('.', '') + '-production')
}
