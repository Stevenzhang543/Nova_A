import { reactive, watch } from 'vue'
import { editorState, reconfigureLayout, type BottomPanelTab, type EditorPage, type EditorWorkspace, type ManageSection } from '../store/editor'
import { preferencesState } from '../store/preferences'
import { projectSessionState } from '../projects/projectSession'

export interface WorkspaceLayout {
  page: EditorPage
  hierarchyVisible: boolean
  inspectorVisible: boolean
  bottomPanelVisible: boolean
  bottomPanelOpen: boolean
  bottomPanelTab: BottomPanelTab
  bottomPanelHeight: number
  hierarchyWidth: number
  inspectorWidth: number
  hierarchyDock: 'left' | 'right'
  inspectorDock: 'left' | 'right'
  hierarchyPinned: boolean
  inspectorPinned: boolean
  bottomPanelPinned: boolean
  panelOrder: Array<'hierarchy' | 'inspector'>
  bottomTabOrder: BottomPanelTab[]
  floatingPanels: Array<'hierarchy' | 'inspector'>
  splitDocking: boolean
}

export interface WorkspacePreset extends WorkspaceLayout {
  id: EditorWorkspace
  label: string
  builtIn: boolean
}

export interface CustomWorkspace extends WorkspaceLayout {
  id: string
  name: string
}

const safeDesignLayout: WorkspaceLayout = {
  page: 'scene', hierarchyVisible: true, inspectorVisible: true, bottomPanelVisible: true,
  bottomPanelOpen: false, bottomPanelTab: 'assets', bottomPanelHeight: 240,
  hierarchyWidth: 236, inspectorWidth: 292, hierarchyDock: 'left', inspectorDock: 'right',
  hierarchyPinned: true, inspectorPinned: true, bottomPanelPinned: true,
  panelOrder: ['hierarchy', 'inspector'], bottomTabOrder: ['assets', 'console', 'animation', 'audio', 'profiler', 'tilemap'],
  floatingPanels: [], splitDocking: false
}

export const WORKSPACE_PRESETS: readonly WorkspacePreset[] = [
  { id: 'design', label: 'workspaceDesign', builtIn: true, ...safeDesignLayout },
  { id: 'script', label: 'workspaceScript', builtIn: true, ...safeDesignLayout, page: 'script', hierarchyVisible: false, inspectorVisible: false, bottomPanelVisible: false, bottomPanelHeight: 320 },
  { id: 'animation', label: 'workspaceAnimation', builtIn: true, ...safeDesignLayout, bottomPanelOpen: true, bottomPanelTab: 'animation', bottomPanelHeight: 360 },
  { id: 'ui', label: 'workspaceUi', builtIn: true, ...safeDesignLayout, bottomPanelOpen: true, bottomPanelTab: 'assets', bottomPanelHeight: 250 },
  { id: 'debug', label: 'workspaceDebug', builtIn: true, ...safeDesignLayout, page: 'game', hierarchyVisible: false, inspectorVisible: false, bottomPanelOpen: true, bottomPanelTab: 'profiler', bottomPanelHeight: 320 },
  { id: 'manage', label: 'workspaceManage', builtIn: true, ...safeDesignLayout, page: 'manage', hierarchyVisible: false, inspectorVisible: false, bottomPanelVisible: false },
  { id: 'custom', label: 'workspaceCustom', builtIn: true, ...safeDesignLayout }
]

export const WORKSPACE_PROFILE_PRESETS = Object.freeze([
  { id: 'beginner', label: 'profileBeginner', workspace: 'design' as EditorWorkspace, layout: { ...safeDesignLayout, bottomPanelOpen: false } },
  { id: 'designer', label: 'profileDesigner', workspace: 'design' as EditorWorkspace, layout: { ...safeDesignLayout, bottomPanelOpen: true, bottomPanelTab: 'assets' as BottomPanelTab } },
  { id: 'programmer', label: 'profileProgrammer', workspace: 'script' as EditorWorkspace, layout: { ...safeDesignLayout, page: 'script' as EditorPage, hierarchyVisible: false, inspectorVisible: false, bottomPanelVisible: false } },
  { id: 'ui-designer', label: 'profileUiDesigner', workspace: 'ui' as EditorWorkspace, layout: { ...safeDesignLayout, bottomPanelOpen: true, bottomPanelTab: 'assets' as BottomPanelTab } },
  { id: 'profiler', label: 'profileProfiler', workspace: 'debug' as EditorWorkspace, layout: { ...safeDesignLayout, page: 'game' as EditorPage, hierarchyVisible: false, inspectorVisible: false, bottomPanelOpen: true, bottomPanelTab: 'profiler' as BottomPanelTab } },
  { id: 'release-engineer', label: 'profileReleaseEngineer', workspace: 'manage' as EditorWorkspace, layout: { ...safeDesignLayout, page: 'manage' as EditorPage, hierarchyVisible: false, inspectorVisible: false, bottomPanelVisible: false } }
])

export const workspaceState = reactive({
  custom: [] as CustomWorkspace[],
  selectedCustomId: '',
  safeLayout: false,
  navigationBack: [] as Array<{ page: EditorPage; workspace: EditorWorkspace }>,
  navigationForward: [] as Array<{ page: EditorPage; workspace: EditorWorkspace }>,
  restoringNavigation: false,
  hierarchyPinned: true,
  inspectorPinned: true,
  panelOrder: ['hierarchy', 'inspector'] as Array<'hierarchy' | 'inspector'>,
  bottomTabOrder: ['assets', 'console', 'animation', 'audio', 'profiler', 'tilemap'] as BottomPanelTab[],
  floatingPanels: [] as Array<'hierarchy' | 'inspector'>,
  splitDocking: false
})

type PanelName = 'hierarchy' | 'inspector' | 'bottom'
const USER_STORAGE_KEY = 'nova-a-editor-workspaces-v2'
const LEGACY_STORAGE_KEY = 'nova-a-editor-layout-v1'
const PAGES = new Set<EditorPage>(['scene', 'game', 'script', 'settings', 'manage'])
const BOTTOM_TABS = new Set<BottomPanelTab>(['assets', 'packages', 'console', 'animation', 'audio', 'tilemap', 'presentation', 'profiler', 'rendering', 'project', 'build'])
let initialized = false

function storageKey(): string {
  return preferencesState.workspaceLayoutScope === 'project'
    ? `${USER_STORAGE_KEY}:project:${projectSessionState.id}`
    : USER_STORAGE_KEY
}

function flags(): URLSearchParams { return typeof location === 'undefined' ? new URLSearchParams() : new URLSearchParams(location.search) }
function clamp(value: unknown, fallback: number, minimum: number, maximum: number): number { return typeof value === 'number' && Number.isFinite(value) ? Math.min(maximum, Math.max(minimum, value)) : fallback }

function normalizeLayout(value: unknown, fallback: WorkspaceLayout = safeDesignLayout): WorkspaceLayout {
  const source = value && typeof value === 'object' ? value as Partial<WorkspaceLayout> : {}
  const page = typeof source.page === 'string' && PAGES.has(source.page as EditorPage) ? source.page as EditorPage : fallback.page
  const legacyTab = (source as { bottomPanelTab?: string }).bottomPanelTab
  let tab = legacyTab === 'world' ? 'project' : typeof source.bottomPanelTab === 'string' && BOTTOM_TABS.has(source.bottomPanelTab as BottomPanelTab) ? source.bottomPanelTab as BottomPanelTab : fallback.bottomPanelTab
  if (['presentation', 'packages', 'rendering', 'project', 'build'].includes(tab)) tab = 'assets'
  const panelOrder = Array.isArray(source.panelOrder)
    ? [...new Set(source.panelOrder.filter(value => value === 'hierarchy' || value === 'inspector'))] as Array<'hierarchy' | 'inspector'>
    : []
  for (const panel of fallback.panelOrder) if (!panelOrder.includes(panel)) panelOrder.push(panel)
  const bottomTabOrder = Array.isArray(source.bottomTabOrder)
    ? [...new Set(source.bottomTabOrder.filter(value => BOTTOM_TABS.has(value as BottomPanelTab) && !['packages', 'rendering', 'project', 'build', 'presentation'].includes(value as string)) as BottomPanelTab[])]
    : []
  for (const bottomTab of fallback.bottomTabOrder) if (!bottomTabOrder.includes(bottomTab)) bottomTabOrder.push(bottomTab)
  return {
    page,
    hierarchyVisible: typeof source.hierarchyVisible === 'boolean' ? source.hierarchyVisible : fallback.hierarchyVisible,
    inspectorVisible: typeof source.inspectorVisible === 'boolean' ? source.inspectorVisible : fallback.inspectorVisible,
    bottomPanelVisible: typeof source.bottomPanelVisible === 'boolean' ? source.bottomPanelVisible : fallback.bottomPanelVisible,
    bottomPanelOpen: typeof source.bottomPanelOpen === 'boolean' ? source.bottomPanelOpen : fallback.bottomPanelOpen,
    bottomPanelTab: tab,
    bottomPanelHeight: clamp(source.bottomPanelHeight, fallback.bottomPanelHeight, 120, 520),
    hierarchyWidth: clamp(source.hierarchyWidth, fallback.hierarchyWidth, 160, 500),
    inspectorWidth: clamp(source.inspectorWidth, fallback.inspectorWidth, 252, 480),
    hierarchyDock: source.hierarchyDock === 'right' ? 'right' : fallback.hierarchyDock,
    inspectorDock: source.inspectorDock === 'left' ? 'left' : fallback.inspectorDock,
    hierarchyPinned: typeof source.hierarchyPinned === 'boolean' ? source.hierarchyPinned : fallback.hierarchyPinned,
    inspectorPinned: typeof source.inspectorPinned === 'boolean' ? source.inspectorPinned : fallback.inspectorPinned,
    bottomPanelPinned: typeof source.bottomPanelPinned === 'boolean' ? source.bottomPanelPinned : fallback.bottomPanelPinned,
    panelOrder,
    bottomTabOrder,
    floatingPanels: Array.isArray(source.floatingPanels) ? [...new Set(source.floatingPanels.filter(value => value === 'hierarchy' || value === 'inspector') as Array<'hierarchy' | 'inspector'>)] : [...fallback.floatingPanels],
    splitDocking: typeof source.splitDocking === 'boolean' ? source.splitDocking : fallback.splitDocking
  }
}

export function captureWorkspaceLayout(): WorkspaceLayout {
  return normalizeLayout({
    page: editorState.currentPage, hierarchyVisible: editorState.hierarchyVisible, inspectorVisible: editorState.inspectorVisible,
    bottomPanelVisible: editorState.bottomPanelVisible, bottomPanelOpen: editorState.bottomPanelOpen,
    bottomPanelTab: editorState.bottomPanelTab, bottomPanelHeight: editorState.bottomPanelHeight,
    hierarchyWidth: editorState.hierarchyWidth, inspectorWidth: editorState.inspectorWidth,
    hierarchyDock: editorState.hierarchyDock, inspectorDock: editorState.inspectorDock,
    hierarchyPinned: workspaceState.hierarchyPinned, inspectorPinned: workspaceState.inspectorPinned,
    bottomPanelPinned: editorState.bottomPanelPinned, panelOrder: workspaceState.panelOrder,
    bottomTabOrder: workspaceState.bottomTabOrder, floatingPanels: workspaceState.floatingPanels,
    splitDocking: workspaceState.splitDocking
  })
}

function notifyLayoutChanged(): void {
  reconfigureLayout()
  if (typeof window !== 'undefined') window.requestAnimationFrame(() => window.dispatchEvent(new Event('resize')))
}

function applyLayout(layout: WorkspaceLayout): void {
  const value = normalizeLayout(layout)
  Object.assign(editorState, {
    currentPage: value.page, hierarchyVisible: value.hierarchyVisible, inspectorVisible: value.inspectorVisible,
    bottomPanelVisible: value.bottomPanelVisible, bottomPanelOpen: value.bottomPanelOpen,
    bottomPanelTab: value.bottomPanelTab, bottomPanelHeight: value.bottomPanelHeight,
    hierarchyWidth: value.hierarchyWidth, inspectorWidth: value.inspectorWidth,
    hierarchyDock: value.hierarchyDock, inspectorDock: value.inspectorDock,
    bottomPanelPinned: value.bottomPanelPinned,
    distractionFree: false
  })
  workspaceState.hierarchyPinned = value.hierarchyPinned
  workspaceState.inspectorPinned = value.inspectorPinned
  workspaceState.panelOrder.splice(0, workspaceState.panelOrder.length, ...value.panelOrder)
  workspaceState.bottomTabOrder.splice(0, workspaceState.bottomTabOrder.length, ...value.bottomTabOrder)
  workspaceState.floatingPanels.splice(0, workspaceState.floatingPanels.length, ...value.floatingPanels)
  workspaceState.splitDocking = value.splitDocking
  notifyLayoutChanged()
}

function normalizeCustomList(value: unknown): CustomWorkspace[] {
  if (!Array.isArray(value)) return []
  return value.slice(0, 24).flatMap((item, index) => {
    if (!item || typeof item !== 'object') return []
    const source = item as Partial<CustomWorkspace>
    const name = typeof source.name === 'string' ? source.name.trim().slice(0, 48) : ''
    return name ? [{ id: typeof source.id === 'string' ? source.id.slice(0, 80) : `custom-${index}`, name, ...normalizeLayout(source) }] : []
  })
}

function readStored(): void {
  if (typeof localStorage === 'undefined') return
  workspaceState.safeLayout = flags().get('safe-layout') === '1' || flags().get('safe-mode') === '1'
  if (workspaceState.safeLayout) { editorState.activeWorkspace = 'design'; applyLayout(safeDesignLayout); return }
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey()) ?? 'null') as Record<string, unknown> | null
    if (parsed?.layout) {
      const rawWorkspace = parsed.activeWorkspace === 'interface' ? 'ui' : parsed.activeWorkspace
      if (WORKSPACE_PRESETS.some(item => item.id === rawWorkspace)) editorState.activeWorkspace = rawWorkspace as EditorWorkspace
      workspaceState.selectedCustomId = typeof parsed.selectedCustomId === 'string' ? parsed.selectedCustomId : ''
      workspaceState.custom.splice(0, workspaceState.custom.length, ...normalizeCustomList(parsed.custom))
      applyLayout(normalizeLayout(parsed.layout))
      return
    }
    const legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) ?? 'null') as Record<string, unknown> | null
    if (legacy) {
      editorState.activeWorkspace = legacy.activeWorkspace === 'interface' ? 'ui' : 'design'
      applyLayout(normalizeLayout({ ...legacy, bottomPanelTab: legacy.bottomPanelTab === 'presentation' ? 'assets' : legacy.bottomPanelTab }))
    }
  } catch { applyLayout(safeDesignLayout) }
}

function persist(): void {
  if (typeof localStorage === 'undefined' || workspaceState.safeLayout) return
  try {
    localStorage.setItem(storageKey(), JSON.stringify({ version: 2, activeWorkspace: editorState.activeWorkspace, selectedCustomId: workspaceState.selectedCustomId, layout: captureWorkspaceLayout(), custom: workspaceState.custom }))
  } catch { /* Layout persistence is optional; editor operation is not. */ }
}

export function initializeEditorWorkspaces(): void {
  if (initialized) return
  initialized = true
  readStored()
  let last = { page: editorState.currentPage, workspace: editorState.activeWorkspace }
  watch(() => ({ page: editorState.currentPage, workspace: editorState.activeWorkspace }), current => {
    if (!workspaceState.restoringNavigation && (current.page !== last.page || current.workspace !== last.workspace)) {
      workspaceState.navigationBack.push(last)
      if (workspaceState.navigationBack.length > 50) workspaceState.navigationBack.shift()
      workspaceState.navigationForward.splice(0)
    }
    last = current
  })
  watch(() => ({ ...captureWorkspaceLayout(), workspace: editorState.activeWorkspace, custom: workspaceState.custom.map(item => ({ ...item })), selected: workspaceState.selectedCustomId, scope: preferencesState.workspaceLayoutScope }), persist, { deep: true })
}

export function applyEditorWorkspace(workspace: EditorWorkspace): void {
  let preset = WORKSPACE_PRESETS.find(candidate => candidate.id === workspace)
  if (workspace === 'custom') {
    const custom = workspaceState.custom.find(item => item.id === workspaceState.selectedCustomId) ?? workspaceState.custom[0]
    if (custom) { editorState.activeWorkspace = 'custom'; workspaceState.selectedCustomId = custom.id; applyLayout(custom); return }
    preset = WORKSPACE_PRESETS.find(candidate => candidate.id === 'custom')
  }
  if (!preset) return
  editorState.activeWorkspace = preset.id
  applyLayout(preset)
}

export function applyWorkspaceProfile(id: string): boolean {
  const profile = WORKSPACE_PROFILE_PRESETS.find(item => item.id === id)
  if (!profile) return false
  editorState.activeWorkspace = profile.workspace
  applyLayout(normalizeLayout(profile.layout, safeDesignLayout))
  return true
}

export function saveCurrentWorkspace(name?: string): CustomWorkspace {
  const existing = workspaceState.custom.find(item => item.id === workspaceState.selectedCustomId)
  if (existing && !name) { Object.assign(existing, captureWorkspaceLayout()); editorState.activeWorkspace = 'custom'; return existing }
  const workspace: CustomWorkspace = { id: crypto.randomUUID?.() ?? `custom-${Date.now()}`, name: (name?.trim() || `Custom ${workspaceState.custom.length + 1}`).slice(0, 48), ...captureWorkspaceLayout() }
  workspaceState.custom.push(workspace); workspaceState.selectedCustomId = workspace.id; editorState.activeWorkspace = 'custom'; return workspace
}

export function duplicateWorkspace(id: string, name?: string): CustomWorkspace | null {
  const source = workspaceState.custom.find(item => item.id === id) ?? WORKSPACE_PRESETS.find(item => item.id === id)
  if (!source) return null
  const sourceName = 'name' in source ? source.name : source.label
  const duplicate: CustomWorkspace = { id: crypto.randomUUID?.() ?? `custom-${Date.now()}`, name: (name?.trim() || `${sourceName} Copy`).slice(0, 48), ...normalizeLayout(source) }
  workspaceState.custom.push(duplicate); workspaceState.selectedCustomId = duplicate.id; editorState.activeWorkspace = 'custom'; applyLayout(duplicate); return duplicate
}

export function renameWorkspace(id: string, name: string): boolean { const item = workspaceState.custom.find(candidate => candidate.id === id); const safe = name.trim().slice(0, 48); if (!item || !safe) return false; item.name = safe; return true }
export function removeWorkspace(id: string): boolean { const index = workspaceState.custom.findIndex(item => item.id === id); if (index < 0) return false; workspaceState.custom.splice(index, 1); workspaceState.selectedCustomId = workspaceState.custom[0]?.id ?? ''; if (!workspaceState.selectedCustomId) applyEditorWorkspace('design'); return true }
export function exportWorkspaces(): string { return JSON.stringify({ format: 'nova-workspaces', version: 2, workspaces: workspaceState.custom }, null, 2) }
export function importWorkspaces(source: string): number { const parsed = JSON.parse(source) as Record<string, unknown>; if (parsed.format !== 'nova-workspaces' || parsed.version !== 2) throw new Error('Unsupported Nova_A workspace document.'); const imported = normalizeCustomList(parsed.workspaces); const ids = new Set(workspaceState.custom.map(item => item.id)); for (const item of imported) { if (ids.has(item.id)) item.id = crypto.randomUUID?.() ?? `custom-${Date.now()}-${ids.size}`; ids.add(item.id); workspaceState.custom.push(item) } return imported.length }

export function navigateHistory(direction: 'back' | 'forward'): boolean {
  const source = direction === 'back' ? workspaceState.navigationBack : workspaceState.navigationForward
  const destination = direction === 'back' ? workspaceState.navigationForward : workspaceState.navigationBack
  const target = source.pop(); if (!target) return false
  destination.push({ page: editorState.currentPage, workspace: editorState.activeWorkspace })
  workspaceState.restoringNavigation = true
  editorState.activeWorkspace = target.workspace; editorState.currentPage = target.page
  queueMicrotask(() => { workspaceState.restoringNavigation = false })
  notifyLayoutChanged(); return true
}

export function toggleEditorPanel(panel: PanelName): void { if (panel === 'hierarchy') editorState.hierarchyVisible = !editorState.hierarchyVisible; else if (panel === 'inspector') editorState.inspectorVisible = !editorState.inspectorVisible; else editorState.bottomPanelVisible = !editorState.bottomPanelVisible; notifyLayoutChanged() }
export function dockEditorPanel(panel: 'hierarchy' | 'inspector', destination: 'left' | 'right' | 'floating'): void {
  const floating = workspaceState.floatingPanels
  const index = floating.indexOf(panel)
  if (destination === 'floating') { if (index < 0) floating.push(panel) }
  else {
    if (index >= 0) floating.splice(index, 1)
    if (panel === 'hierarchy') editorState.hierarchyDock = destination
    else editorState.inspectorDock = destination
  }
  notifyLayoutChanged()
}
export function setPanelPinned(panel: 'hierarchy' | 'inspector' | 'bottom', pinned: boolean): void {
  if (panel === 'hierarchy') workspaceState.hierarchyPinned = pinned
  else if (panel === 'inspector') workspaceState.inspectorPinned = pinned
  else editorState.bottomPanelPinned = pinned
  notifyLayoutChanged()
}
export function toggleFocusMode(): void { editorState.distractionFree = !editorState.distractionFree; notifyLayoutChanged() }
const MANAGE_TABS: Partial<Record<BottomPanelTab, ManageSection>> = { packages: 'packages', project: 'project', rendering: 'rendering', build: 'build' }
export function openManageSection(section: ManageSection): void { editorState.activeWorkspace = 'manage'; editorState.currentPage = 'manage'; editorState.manageSection = section; editorState.bottomPanelOpen = false; notifyLayoutChanged() }
export function openEditorTool(tab: BottomPanelTab): void {
  const manage = MANAGE_TABS[tab]
  if (manage) { openManageSection(manage); return }
  if (editorState.currentPage === 'settings' || editorState.currentPage === 'manage') editorState.currentPage = editorState.activeWorkspace === 'debug' ? 'game' : 'scene'
  editorState.bottomPanelVisible = true; editorState.bottomPanelOpen = true; editorState.bottomPanelTab = tab === 'presentation' ? 'assets' : tab; notifyLayoutChanged()
}
export function reorderBottomTab(source: BottomPanelTab, target: BottomPanelTab): void { const order = workspaceState.bottomTabOrder; const from = order.indexOf(source), to = order.indexOf(target); if (from < 0 || to < 0 || from === to) return; order.splice(to, 0, order.splice(from, 1)[0]); notifyLayoutChanged() }
export function resetEditorLayout(): void { if (typeof localStorage !== 'undefined') { localStorage.removeItem(storageKey()); localStorage.removeItem(LEGACY_STORAGE_KEY) }; workspaceState.safeLayout = false; applyEditorWorkspace('design') }
export function enableSafeLayout(): void { workspaceState.safeLayout = true; editorState.activeWorkspace = 'design'; applyLayout(safeDesignLayout) }
