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
  minimapOpen: true
})

export function openGraphAsset(uuid: string): void { graphStudioState.activeGraphUuid = uuid; graphStudioState.mode = 'graph' }
export function openEventSheetAsset(uuid: string): void { graphStudioState.activeEventSheetUuid = uuid; graphStudioState.mode = 'events' }
export function openCodeWorkspace(): void { graphStudioState.mode = 'code' }
