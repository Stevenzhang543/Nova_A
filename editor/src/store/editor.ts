import { reactive } from "vue";

export type EditorPage = "physics" | "renderer";

export const editorState = reactive({
  currentPage: "physics" as EditorPage,
  statusText: "Ready"
});
