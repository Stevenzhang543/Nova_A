import { reactive } from 'vue'

export const graphStudioState = reactive({
  mode: 'code' as 'code' | 'graph' | 'events',
  authoringMode: 'blocks' as 'blocks' | 'nodes',
  activeGraphUuid: '',
  activeEventSheetUuid: '',
  paletteOpen: true,
  detailsOpen: true,
  minimapOpen: true
})

export function openGraphAsset(uuid: string): void { graphStudioState.activeGraphUuid = uuid; graphStudioState.mode = 'graph' }
export function openEventSheetAsset(uuid: string): void { graphStudioState.activeEventSheetUuid = uuid; graphStudioState.mode = 'events' }
export function openCodeWorkspace(): void { graphStudioState.mode = 'code' }
