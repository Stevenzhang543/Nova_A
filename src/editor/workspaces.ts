import { watch } from 'vue'
import { editorState, reconfigureLayout, type BottomPanelTab, type EditorPage, type EditorWorkspace } from '../store/editor'

export interface WorkspacePreset {
  id: EditorWorkspace
  label: 'workspaceDesign' | 'workspaceScript' | 'workspaceAnimation' | 'workspaceInterface' | 'workspaceDebug'
  page: EditorPage
  hierarchyVisible: boolean
  inspectorVisible: boolean
  bottomPanelVisible: boolean
  bottomPanelOpen: boolean
  bottomPanelTab: BottomPanelTab
  bottomPanelHeight: number
}

export const WORKSPACE_PRESETS: readonly WorkspacePreset[] = [
  { id: 'design', label: 'workspaceDesign', page: 'scene', hierarchyVisible: true, inspectorVisible: true, bottomPanelVisible: true, bottomPanelOpen: false, bottomPanelTab: 'assets', bottomPanelHeight: 240 },
  { id: 'script', label: 'workspaceScript', page: 'script', hierarchyVisible: false, inspectorVisible: false, bottomPanelVisible: false, bottomPanelOpen: false, bottomPanelTab: 'assets', bottomPanelHeight: 320 },
  { id: 'animation', label: 'workspaceAnimation', page: 'scene', hierarchyVisible: true, inspectorVisible: true, bottomPanelVisible: true, bottomPanelOpen: true, bottomPanelTab: 'animation', bottomPanelHeight: 360 },
  { id: 'interface', label: 'workspaceInterface', page: 'scene', hierarchyVisible: true, inspectorVisible: true, bottomPanelVisible: true, bottomPanelOpen: true, bottomPanelTab: 'presentation', bottomPanelHeight: 390 },
  { id: 'debug', label: 'workspaceDebug', page: 'game', hierarchyVisible: false, inspectorVisible: false, bottomPanelVisible: true, bottomPanelOpen: true, bottomPanelTab: 'console', bottomPanelHeight: 280 }
]

type PanelName = 'hierarchy' | 'inspector' | 'bottom'

const STORAGE_KEY = 'nova-a-editor-layout-v1'
const WORKSPACES = new Set<EditorWorkspace>(WORKSPACE_PRESETS.map(preset => preset.id))
const PAGES = new Set<EditorPage>(['scene', 'game', 'script', 'settings'])
const BOTTOM_TABS = new Set<BottomPanelTab>(['assets', 'packages', 'console', 'animation', 'tilemap', 'world', 'presentation', 'profiler', 'rendering', 'project', 'build'])
let initialized = false

function notifyLayoutChanged(): void {
  reconfigureLayout()
  if (typeof window !== 'undefined') window.requestAnimationFrame(() => window.dispatchEvent(new Event('resize')))
}

function restoreLayout(): void {
  if (typeof localStorage === 'undefined') return
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Record<string, unknown> | null
    if (!parsed || typeof parsed !== 'object') return
    if (typeof parsed.activeWorkspace === 'string' && WORKSPACES.has(parsed.activeWorkspace as EditorWorkspace)) editorState.activeWorkspace = parsed.activeWorkspace as EditorWorkspace
    if (typeof parsed.currentPage === 'string' && PAGES.has(parsed.currentPage as EditorPage)) editorState.currentPage = parsed.currentPage as EditorPage
    for (const key of ['hierarchyVisible', 'inspectorVisible', 'bottomPanelVisible', 'bottomPanelOpen'] as const) {
      if (typeof parsed[key] === 'boolean') editorState[key] = parsed[key]
    }
    if (typeof parsed.bottomPanelTab === 'string' && BOTTOM_TABS.has(parsed.bottomPanelTab as BottomPanelTab)) editorState.bottomPanelTab = parsed.bottomPanelTab as BottomPanelTab
    if (typeof parsed.bottomPanelHeight === 'number' && Number.isFinite(parsed.bottomPanelHeight)) editorState.bottomPanelHeight = Math.min(520, Math.max(120, parsed.bottomPanelHeight))
  } catch {
    localStorage.removeItem(STORAGE_KEY)
  }
}

function persistLayout(): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      activeWorkspace: editorState.activeWorkspace,
      currentPage: editorState.currentPage,
      hierarchyVisible: editorState.hierarchyVisible,
      inspectorVisible: editorState.inspectorVisible,
      bottomPanelVisible: editorState.bottomPanelVisible,
      bottomPanelOpen: editorState.bottomPanelOpen,
      bottomPanelTab: editorState.bottomPanelTab,
      bottomPanelHeight: editorState.bottomPanelHeight
    }))
  } catch {
    // Private browsing or a storage quota must never make the editor unusable.
  }
}

export function initializeEditorWorkspaces(): void {
  if (initialized) return
  initialized = true
  restoreLayout()
  watch(() => ({
    workspace: editorState.activeWorkspace,
    page: editorState.currentPage,
    hierarchy: editorState.hierarchyVisible,
    inspector: editorState.inspectorVisible,
    bottomVisible: editorState.bottomPanelVisible,
    bottomOpen: editorState.bottomPanelOpen,
    bottomTab: editorState.bottomPanelTab,
    bottomHeight: editorState.bottomPanelHeight
  }), persistLayout, { deep: true })
}

export function applyEditorWorkspace(workspace: EditorWorkspace): void {
  const preset = WORKSPACE_PRESETS.find(candidate => candidate.id === workspace)
  if (!preset) return
  editorState.activeWorkspace = preset.id
  editorState.currentPage = preset.page
  editorState.hierarchyVisible = preset.hierarchyVisible
  editorState.inspectorVisible = preset.inspectorVisible
  editorState.bottomPanelVisible = preset.bottomPanelVisible
  editorState.bottomPanelOpen = preset.bottomPanelOpen
  editorState.bottomPanelTab = preset.bottomPanelTab
  editorState.bottomPanelHeight = preset.bottomPanelHeight
  editorState.distractionFree = false
  notifyLayoutChanged()
}

export function toggleEditorPanel(panel: PanelName): void {
  if (panel === 'hierarchy') editorState.hierarchyVisible = !editorState.hierarchyVisible
  else if (panel === 'inspector') editorState.inspectorVisible = !editorState.inspectorVisible
  else editorState.bottomPanelVisible = !editorState.bottomPanelVisible
  notifyLayoutChanged()
}

export function toggleFocusMode(): void {
  editorState.distractionFree = !editorState.distractionFree
  notifyLayoutChanged()
}

export function openEditorTool(tab: BottomPanelTab): void {
  if (editorState.currentPage === 'settings') editorState.currentPage = 'scene'
  editorState.bottomPanelVisible = true
  editorState.bottomPanelOpen = true
  editorState.bottomPanelTab = tab
  notifyLayoutChanged()
}

export function resetEditorLayout(): void {
  if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY)
  applyEditorWorkspace('design')
}
