import { reactive } from 'vue'

export const graphStudioState = reactive({
  mode: 'code' as 'code' | 'graph',
  authoringMode: 'blocks' as 'blocks' | 'nodes',
  activeGraphUuid: '',
  paletteOpen: true,
  detailsOpen: true,
  minimapOpen: true
})

export function openGraphAsset(uuid: string): void { graphStudioState.activeGraphUuid = uuid; graphStudioState.mode = 'graph' }
export function openCodeWorkspace(): void { graphStudioState.mode = 'code' }
