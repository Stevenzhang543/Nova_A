/** 帮助文档入口：按运行环境选择本地或网页手册的打开路径。 */
import { reactive } from 'vue'
import { NOVA_RELEASE_NAME } from '../projects/projectFormat'

export const manualViewerState = reactive({ visible: false, reloadToken: 0, section: '' })

/** Opens the bundled same-origin manual inside Nova_A without invoking Tauri's external URL opener. */
/** 结构说明（自动提取）：openBundledManual；输入 section；直接调用 slice、replace；写入 manualViewerState.section、manualViewerState.visible。 */ export async function openBundledManual(section: string | Event = ''): Promise<void> {
  manualViewerState.section = (typeof section === 'string' ? section : '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 120)
  manualViewerState.reloadToken++
  manualViewerState.visible = true
}

/** 将 false 赋给 manualViewerState.visible，不显式返回值。 */ export function closeBundledManual(): void { manualViewerState.visible = false }
/** 执行 manualViewerState.reloadToken++ 更新对应状态；不显式返回值。 */ export function reloadBundledManual(): void { manualViewerState.reloadToken++ }

/** Follow the active build's bundled lesson, including development builds. */
/* 调用 openBundledManual((locale === 'zh' ? 'zh-CN' : locale) + '-v' + NOVA_RELEASE_NAME.replace('.', '') + '-production') 并返回调用结果。 */ export function openProductionManual(locale: 'en' | 'de' | 'zh'): Promise<void> {
  return openBundledManual((locale === 'zh' ? 'zh-CN' : locale) + '-v' + NOVA_RELEASE_NAME.replace('.', '') + '-production')
}
