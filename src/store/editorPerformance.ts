/** 编辑器性能策略：把预设和独立覆盖转换为界面预算，不读写项目、游戏时钟或导出配置。 */
export type EditorDecorativeMotion = 'auto' | 'on' | 'off'
export type EditorPreviewPolicy = 'auto' | 'bounded' | 'full'
export interface EditorPerformanceOverrides {
 editorDecorativeMotion: EditorDecorativeMotion
 editorIdleFps: 0 | 15 | 30 | 60
 editorPreviewPolicy: EditorPreviewPolicy
}
export const DEFAULT_EDITOR_PERFORMANCE_OVERRIDES: Readonly<EditorPerformanceOverrides> = Object.freeze({editorDecorativeMotion:'auto',editorIdleFps:0,editorPreviewPolicy:'auto'})
/** 校验持久化覆盖；旧偏好、未知枚举和非有限数字均恢复跟随预设。 */
export function normalizeEditorPerformanceOverrides(value: Partial<EditorPerformanceOverrides>): EditorPerformanceOverrides {
 return {
  editorDecorativeMotion:value.editorDecorativeMotion==='on'||value.editorDecorativeMotion==='off'?value.editorDecorativeMotion:'auto',
  editorIdleFps:value.editorIdleFps===15||value.editorIdleFps===30||value.editorIdleFps===60?value.editorIdleFps:0,
  editorPreviewPolicy:value.editorPreviewPolicy==='bounded'||value.editorPreviewPolicy==='full'?value.editorPreviewPolicy:'auto'
 }
}
/** 系统或手动减少动效独立优先；仅返回编辑器预算，默认保留装饰动画和原有预览上限。 */
export function resolveEditorPerformancePreferences(value: Partial<EditorPerformanceOverrides> & {performanceProfile?:string;reduceMotion?:boolean}, systemReducedMotion=false) {
 const overrides=normalizeEditorPerformanceOverrides(value),low=value.performanceProfile==='low-end'
 const bounded=overrides.editorPreviewPolicy==='bounded'||overrides.editorPreviewPolicy==='auto'&&low
 return {
  decorativeMotion:!(systemReducedMotion||value.reduceMotion)&& (overrides.editorDecorativeMotion==='on'||overrides.editorDecorativeMotion==='auto'&&!low),
  idleFps:overrides.editorIdleFps||(low?15:60),
  previewBounded:bounded,
  previewMaxDimension:bounded?256:1024,
  previewMaxHeight:bounded?192:768,
  previewPixelRatio:bounded?1:2,
  previewRetryMs:bounded?200:33
 }
}
