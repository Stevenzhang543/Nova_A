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

export function openGraphAsset(uuid: string): void { graphStudioState.activeGraphUuid = uuid; graphStudioState.mode = 'graph' }
export function openEventSheetAsset(uuid: string): void { graphStudioState.activeEventSheetUuid = uuid; graphStudioState.mode = 'events' }
export function openCodeWorkspace(): void { graphStudioState.mode = 'code' }

/** A fresh code projection gets one measured arrangement. Exact live identity
 * prevents project imports or existing manual graphs from reusing the request. */
const initialMeasuredLayouts=new WeakSet<object>()
export function queueInitialGraphLayout(asset:object):void{initialMeasuredLayouts.add(asset)}
export function takeInitialGraphLayout(asset:object):boolean{const pending=initialMeasuredLayouts.has(asset);initialMeasuredLayouts.delete(asset);return pending}
