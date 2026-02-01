import { reactive } from "vue"

export type EditorPage = "scene" | "render" | "settings"

export const editorState = reactive({
  currentPage: "scene" as EditorPage,
  statusText: "Ready",
  layoutVersion: 0
})

export function reconfigureLayout() {
  editorState.layoutVersion++
}
