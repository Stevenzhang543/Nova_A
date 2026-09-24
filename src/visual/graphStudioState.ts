/** 图工作区共享状态：保存当前图、事件表及面板设置，并用资源对象身份登记仅消费一次的初始实测布局请求。 */
import { reactive } from 'vue'

export const graphStudioState = reactive({
  mode: 'code' as 'code' | 'graph' | 'events',
  authoringMode: 'blocks' as 'blocks' | 'nodes',
  activeGraphUuid: '',
  activeGraphDirty: false,
  /** Registered while the graph editor is mounted so switching back to Rhai
   * validates, saves, and regenerates the exact linked script first. */
  saveActiveGraph: null as null | (() => boolean | Promise<boolean>),
  activeEventSheetUuid: '',
  paletteOpen: true,
  detailsOpen: true,
  minimapOpen: true,
  layout: {
    paletteWidth: 264,
    detailsWidth: 344,
    activePanel: 'details' as 'palette' | 'details',
    canvasFocused: false,
    compactNodes: false,
  }
})

/** 选中指定图资源，并切换到图编辑模式。 */ export function openGraphAsset(uuid: string): void { graphStudioState.activeGraphUuid = uuid; graphStudioState.mode = 'graph' }
/** 选中指定事件表资源，并切换到事件编辑模式。 */ export function openEventSheetAsset(uuid: string): void { graphStudioState.activeEventSheetUuid = uuid; graphStudioState.mode = 'events' }
/** 将 'code' 赋给 graphStudioState.mode，不显式返回值。 */ export function openCodeWorkspace(): void { graphStudioState.mode = 'code' }

/** A fresh code projection gets one measured arrangement. Exact live identity
 * prevents project imports or existing manual graphs from reusing the request. */
const initialMeasuredLayouts=new WeakSet<object>()
/** 执行时调用 initialMeasuredLayouts.add(asset)；不显式返回调用结果。 */ export function queueInitialGraphLayout(asset:object):void{initialMeasuredLayouts.add(asset)}
/** 读取并消费该资源对象的一次性初始布局请求，避免重复整理用户已编辑的布局。 */ export function takeInitialGraphLayout(asset:object):boolean{const pending=initialMeasuredLayouts.has(asset);initialMeasuredLayouts.delete(asset);return pending}
