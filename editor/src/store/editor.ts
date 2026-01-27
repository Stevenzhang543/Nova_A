import { reactive } from 'vue'

export type EditorPage = 'renderer'

export const editorState = reactive({
  showGrid: true,
  statusText: 'Ready'
})
