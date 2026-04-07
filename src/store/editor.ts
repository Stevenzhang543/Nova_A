import { reactive } from "vue"

export type EditorPage = "scene" | "render" | "settings"

export const editorState = reactive({
  currentPage: "scene" as EditorPage,
  statusText: "Ready",
  layoutVersion: 0,
  showGrid: true // NEW: Allows TopBar and WorldCanvas to share grid state
})

export function reconfigureLayout() {
  editorState.layoutVersion++
}
