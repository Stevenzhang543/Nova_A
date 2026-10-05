<!-- 场景层级侧栏：搜索、选择和编辑实体层级，并维护资源关联。 -->
<template>
  <aside class="sidebar-container" :style="{ width: isCollapsed ? `${44 * preferencesState.uiScale}px` : `${panelWidth}px` }" :class="[dock, { 'jelly-slide': !isDragging, 'no-transition': isDragging, 'panel-maximized': workspaceState.maximizedPanel==='hierarchy' }]">
    <UiButton v-if="isCollapsed" class="expand" icon="forward" :label="t('expandPanel')" @click="expandPanel" />
    <div v-show="!isCollapsed" class="scene-sidebar">
      <section class="scene-manager">
        <UiPanelHeader :title="t('scenes')">
          <template #actions>
            <PanelMaximizeButton panel="hierarchy" />
            <UiButton class="scene-direct-action" :label="t('reloadScene')" :disabled="!canEdit" @click="reloadScene" icon="refresh" />
            <UiButton class="scene-direct-action" :label="t('addScene')" :disabled="!canEdit" @click="addScene" icon="add" />
            <UiButton class="compact-action scene-overflow" icon="more" :label="sidebarMenuLabels.scene" aria-haspopup="menu" :aria-expanded="sidebarMenu?.kind === 'scene'" @click.stop="openSidebarMenu($event, 'scene')" />
          </template>
        </UiPanelHeader>
        <div class="scene-list">
          <div v-for="scene in sceneManager.scenes" :key="scene.uuid" class="scene-item" :class="{ active: scene.uuid === sceneManager.activeSceneUuid, unloaded: !scene.loaded }">
            <div class="scene-main" role="button" tabindex="0" @click="activateScene(scene.uuid, scene.loaded)" @keyup.enter="activateScene(scene.uuid, scene.loaded)">
              <i></i><span v-if="editingSceneUuid !== scene.uuid" @dblclick.stop="startSceneEdit(scene.uuid, scene.name)">{{ scene.name }}</span>
              <input v-else v-model="sceneName" v-focus @click.stop @blur="finishSceneEdit(scene.uuid)" @keyup.enter="finishSceneEdit(scene.uuid)">
            </div>
            <button v-if="scene.uuid !== sceneManager.activeSceneUuid" class="load-toggle" :title="scene.loaded ? t('unloadScene') : t('loadScene')" :disabled="!canEdit" @click="toggleLoaded(scene.uuid, scene.loaded)"><EditorIcon :name="scene.loaded ? 'check' : 'add'" /></button>
          </div>
        </div>
      </section>

      <div class="hierarchy-header">
        <div><span class="hierarchy-title" :title="t('hierarchy')">{{ t('hierarchy') }}</span><span class="hierarchy-actions"><small>{{ state.world.entities.length }}</small><UiButton class="hierarchy-direct-action" :label="t('previousSelection')" :disabled="selectionHistoryIndex <= 0" @click="navigateSelection(-1)" icon="back" /><UiButton class="hierarchy-direct-action" :label="t('nextSelection')" :disabled="selectionHistoryIndex >= selectionHistory.length - 1" @click="navigateSelection(1)" icon="forward" /><UiButton class="hierarchy-direct-action" :label="t('createObject')" :disabled="!canEdit" @click="editorState.createObjectPaletteOpen = true" icon="add" /><UiButton class="compact-action hierarchy-overflow" icon="more" :label="sidebarMenuLabels.hierarchy" aria-haspopup="menu" :aria-expanded="sidebarMenu?.kind === 'hierarchy'" @click.stop="openSidebarMenu($event, 'hierarchy')" /></span></div>
        <div class="hierarchy-search-row"><label class="search"><EditorIcon name="search" /><input v-model="searchQuery" type="search" :aria-label="t('searchEntities')" :placeholder="t('searchEntities')"></label><details data-ui-motion-popover class="hierarchy-filter-menu"><summary :title="t('selectionFilter')" :aria-label="t('selectionFilter')"><EditorIcon name="filter" /></summary>
        <div class="hierarchy-filters"><select class="hierarchy-filter-wide" v-model="authoringState.selectionFilter" :aria-label="t('selectionFilter')"><option v-for="filter in selectionFilters" :key="filter" :value="filter">{{ t(`selection${filter}`) }}</option></select><select class="hierarchy-filter-wide" v-model="authoringState.tagFilter" :aria-label="t('tagFilter')"><option value="">{{ t('allTags') }}</option><option v-for="tag in availableTags" :key="tag" :value="tag"># {{ tag }}</option></select><select v-model="selectedSavedFilter" :aria-label="t('savedFilters')" @change="applySavedFilter"><option value="">{{ t('savedFilters') }}</option><option v-for="filter in authoringState.savedFilters" :key="filter.id" :value="filter.id">{{ filter.name }}</option></select><UiButton :label="t('saveFilter')" @click="saveCurrentFilter" icon="star" /><UiButton :class="{ active: authoringState.performanceMode }" :label="t('viewportPerformanceMode')" @click="authoringState.performanceMode = !authoringState.performanceMode" icon="bolt" /></div></details></div>
      </div>

      <nav class="breadcrumbs" :class="{ empty: !breadcrumbs.length }" :aria-label="t('hierarchyBreadcrumb')" :aria-hidden="!breadcrumbs.length" :inert="!breadcrumbs.length"><button v-for="(entity, index) in breadcrumbs" :key="entity.uuid" :title="entity.name" @click="selectBreadcrumb(entity)"><EditorIcon v-if="index" name="forward" />{{ entity.name }}</button></nav>

      <div ref="entityList" class="entity-list" @scroll="onHierarchyScroll" @dragover="previewRootDrop" @drop="dropOnRoot($event)">
        <div class="hierarchy-rows" :style="{ paddingTop: `${virtualPaddingTop}px`, paddingBottom: `${virtualPaddingBottom}px` }">
        <UiTreeRow
          v-for="row in virtualHierarchyRows"
          :depth="row.depth" :selected="state.selectedEntityIds.includes(row.entity.id)"
          :key="row.entity.uuid"
          class="entity-item"
          :class="{
            selected: state.selectedEntityIds.includes(row.entity.id),
            primary: state.selectedEntityId === row.entity.id,
            disabled: !row.entity.enabled,
            hidden: !row.entity.editorVisible,
            locked: row.entity.editorLocked,
            pinned: authoringState.pinnedEntityUuids.includes(row.entity.uuid),
            'search-match': matchesHierarchySearch(row.entity),
            'drop-target': dropTargetUuid === row.entity.uuid && dropValidity !== 'invalid'
          }"
          :data-ui-drop="dropTargetUuid === row.entity.uuid ? dropValidity : undefined"
          :style="{ height: `${hierarchyRowHeight}px` }"
          :draggable="canEdit && !row.entity.editorLocked"
          @click="selectEntity($event, row.entity)"
          @contextmenu.prevent="openContextMenu($event, 'sidebar-entity', row.entity.id)"
          @dragstart="startEntityDrag($event, row.entity)"
          @dragend="finishEntityDrag"
          @dragenter.stop="previewEntityDrop($event, row.entity)"
          @dragleave.stop="leaveDropTarget($event, row.entity.uuid)"
          @dragover.stop="previewEntityDrop($event, row.entity)"
          @drop.prevent.stop="dropOnEntity($event, row.entity)"
        >
          <button class="disclosure" :class="{ placeholder: !row.hasChildren }" :aria-expanded="row.hasChildren ? row.expanded : undefined" :aria-label="row.expanded ? t('collapsePanel') : t('expandPanel')" @click.stop="toggleExpanded(row.entity.uuid)"><EditorIcon v-if="row.hasChildren" name="down" data-ui-motion-chevron /></button>
          <EditorIcon class="shape-icon" :name="getIcon(row.entity.shapeType)" />
          <button v-if="editingId !== row.entity.id" type="button" class="name" :aria-pressed="state.selectedEntityIds.includes(row.entity.id)" @click.stop="selectEntity($event, row.entity)" :title="`${row.entity.name} (${row.entity.id}) — ${t('renameHint')}`" @dblclick.stop="startEdit(row.entity)"><span class="entity-name"><mark v-if="searchQuery && row.entity.name.toLocaleLowerCase().includes(searchQuery.toLocaleLowerCase())">{{ row.entity.name }}</mark><template v-else>{{ row.entity.name }}</template></span><small>{{ row.entity.id }}</small></button>
          <input v-else v-model="editName" v-focus class="edit-input" @click.stop @blur="finishEdit(row.entity)" @keyup.enter="finishEdit(row.entity)" @keyup.escape="cancelEdit">
          <span v-if="row.entity.prefabAsset" class="status-mark" :title="t('prefabInstance')">P</span><span v-if="row.entity.sceneLayers.length" class="status-mark scene" :title="t('sceneInstance')">S</span><span v-if="Object.keys(row.entity.prefabOverrides).length" class="status-mark override" :title="t('prefabOverrides')"><EditorIcon name="circle" /></span>
          <UiButton class="state-button pin" :class="{ active: authoringState.pinnedEntityUuids.includes(row.entity.uuid) }" :label="t('pinEntity')" @click.stop="toggleHierarchyPin(row.entity.uuid)" icon="pin" />
          <button class="state-button" :disabled="!canEdit" :title="row.entity.editorVisible ? t('hideEntity') : t('showEntity')" @click.stop="toggleVisibility(row.entity)"><EditorIcon :name="row.entity.editorVisible ? 'visible' : 'hidden'" /></button>
          <button class="state-button" :disabled="!canEdit" :title="row.entity.editorLocked ? t('unlockEntity') : t('lockEntity')" @click.stop="toggleLock(row.entity)"><EditorIcon :name="row.entity.editorLocked ? 'lock' : 'unlock'" /></button>
          <button class="state-button power" :disabled="!canEdit" :title="row.entity.enabled ? t('disableEntity') : t('enableEntity')" @click.stop="toggleEnabled(row.entity)"><EditorIcon name="power" /></button>
          <UiButton class="compact-action row-overflow" icon="more" :label="`${sidebarMenuLabels.entity}: ${row.entity.name}`" aria-haspopup="menu" :aria-expanded="sidebarMenu?.kind === 'entity' && sidebarMenu.entityUuid === row.entity.uuid" @click.stop="openSidebarMenu($event, 'entity', row.entity)" />
        </UiTreeRow>
        </div>
        <p v-if="!hierarchyRows.length" class="empty-state">{{ t('noEntitiesFound') }}</p>
        <button v-if="draggingIds.length" class="root-drop" data-ui-drop="valid" @dragover="previewRootDrop" @drop.prevent.stop="dropOnRoot($event)">{{ t('reparentToRoot') }}</button>
      </div>
    </div>
    <Teleport to="body"><div ref="sidebarMenuRoot" class="sidebar-action-menu" :inert="!sidebarMenu" :aria-hidden="!sidebarMenu" :style="{ left: `${sidebarMenuPosition.x}px`, top: `${sidebarMenuPosition.y}px`, pointerEvents: sidebarMenu ? 'auto' : 'none' }" @click.stop @contextmenu.prevent>
      <UiMenu :open="Boolean(sidebarMenu)" @close="closeSidebarMenu()">
        <template v-if="sidebarMenu?.kind === 'scene'">
          <UiButton class="scene-menu-reload" icon="refresh" :disabled="!canEdit" @click="runSidebarAction('reloadScene')">{{ t('reloadScene') }}</UiButton>
          <UiButton class="scene-menu-add" icon="add" :disabled="!canEdit" @click="runSidebarAction('addScene')">{{ t('addScene') }}</UiButton>
        </template>
        <template v-else-if="sidebarMenu?.kind === 'hierarchy'">
          <UiButton class="hierarchy-menu-previous" icon="back" :disabled="selectionHistoryIndex <= 0" @click="runSidebarAction('previous')">{{ t('previousSelection') }}</UiButton>
          <UiButton class="hierarchy-menu-next" icon="forward" :disabled="selectionHistoryIndex >= selectionHistory.length - 1" @click="runSidebarAction('next')">{{ t('nextSelection') }}</UiButton>
          <UiButton class="hierarchy-menu-create" icon="add" :disabled="!canEdit" @click="runSidebarAction('create')">{{ t('createObject') }}</UiButton>
        </template>
        <template v-else-if="sidebarMenuEntity">
          <strong class="sidebar-menu-title">{{ sidebarMenuEntity.name }}</strong>
          <small>{{ sidebarMenuEntity.id }} · {{ sidebarMenuEntity.shapeType }}</small>
          <p v-if="sidebarMenuEntity.prefabAsset || sidebarMenuEntity.sceneLayers.length || Object.keys(sidebarMenuEntity.prefabOverrides).length" class="sidebar-menu-status"><span v-if="sidebarMenuEntity.prefabAsset">{{ t('prefabInstance') }}</span><span v-if="sidebarMenuEntity.sceneLayers.length">{{ t('sceneInstance') }}</span><span v-if="Object.keys(sidebarMenuEntity.prefabOverrides).length">{{ t('prefabOverrides') }}</span></p>
          <UiButton class="row-menu-pin" icon="pin" @click="runSidebarAction('pin')">{{ authoringState.pinnedEntityUuids.includes(sidebarMenuEntity.uuid) ? sidebarMenuLabels.unpin : t('pinEntity') }}</UiButton>
          <UiButton class="row-menu-visibility" :icon="sidebarMenuEntity.editorVisible ? 'visible' : 'hidden'" :disabled="!canEdit" @click="runSidebarAction('visibility')">{{ sidebarMenuEntity.editorVisible ? t('hideEntity') : t('showEntity') }}</UiButton>
          <UiButton class="row-menu-lock" :icon="sidebarMenuEntity.editorLocked ? 'lock' : 'unlock'" :disabled="!canEdit" @click="runSidebarAction('lock')">{{ sidebarMenuEntity.editorLocked ? t('unlockEntity') : t('lockEntity') }}</UiButton>
          <UiButton class="row-menu-enabled" icon="power" :disabled="!canEdit" @click="runSidebarAction('enabled')">{{ sidebarMenuEntity.enabled ? t('disableEntity') : t('enableEntity') }}</UiButton>
        </template>
      </UiMenu>
    </div></Teleport>
    <PanelResizeHandle v-show="!isCollapsed" v-model="panelWidth" orientation="vertical" :minimum="0" :maximum="500" :reset-value="280" :reverse="dock==='right'" :label="t('hierarchy')" :disabled="workspaceState.maximizedPanel==='hierarchy'" @dragging="isDragging=$event" @commit="commitPanelWidth" />
  </aside>
</template>

<script setup lang="ts">
import UiButton from '../ui/components/UiButton.vue'
import UiMenu from '../ui/components/UiMenu.vue'
import UiTreeRow from '../ui/components/UiTreeRow.vue'
import UiPanelHeader from '../ui/components/UiPanelHeader.vue'
import EditorIcon from './EditorIcon.vue'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { t } from '../i18n'
import { preferencesState } from '../store/preferences'
import { recoveryState } from '../runtime/recovery'
import { addEditorLog, closeContextMenu, editorState, openContextMenu, setActiveLayer } from '../store/editor'
import { createScene, physicsState as state, pushHistory, reloadActiveScene, sceneManager, selectEntities, setActiveScene, setSceneLoaded, synchronizeHistoryBaseline } from '../store/physics'
import type { Entity } from '../world/Entity'
import { setParent, wouldCreateParentCycle } from '../world/hierarchy'
import { animateReorder, beginNativeDrag, cancelMotion, captureRects, endNativeDrag } from '../ui/motion'
import { selectionRoots } from '../editor/selection'
import { authoringState, saveHierarchyFilter, toggleHierarchyPin } from '../editor/authoring2d'
import { workspaceState } from '../editor/workspaces'
import PanelMaximizeButton from './PanelMaximizeButton.vue'
import PanelResizeHandle from './PanelResizeHandle.vue'

const props = withDefaults(defineProps<{ dock?: 'left' | 'right' }>(), { dock: 'left' })
const dock = computed(/* 返回 props.dock 的当前值。 */ () => props.dock)
const panelWidth = ref(editorState.hierarchyWidth)
watch(/* 返回 editorState.hierarchyWidth 的当前值。 */ () => editorState.hierarchyWidth, /** 非拖拽期间同步外部面板宽度并展开侧栏。 */ value => { if (!isDragging.value) { panelWidth.value=value;isCollapsed.value=false } })
watch(/* 返回 workspaceState.maximizedPanel 的当前值。 */ () => workspaceState.maximizedPanel, /** 最大化目标为层级时展开侧栏。 */ value => { if(value==='hierarchy')isCollapsed.value=false })
const isCollapsed = ref(false)
const isDragging = ref(false)
const editingId = ref<number | null>(null)
const editName = ref('')
const editingSceneUuid = ref<string | null>(null)
const sceneName = ref('')
const searchQuery = ref('')
const expandedUuids = ref(new Set<string>())
const draggingIds = ref<number[]>([])
const dropTargetUuid = ref<string | null>(null)
const dropValidity = ref<'valid' | 'before' | 'invalid'>('valid')
const selectedSavedFilter = ref('')
const selectionHistory = ref<Array<{ sceneUuid: string; uuids: string[]; primaryUuid: string | null }>>([])
const selectionHistoryIndex = ref(-1)
type SidebarMenuKind = 'scene' | 'hierarchy' | 'entity'
const sidebarMenu = ref<{ kind: SidebarMenuKind; entityUuid?: string } | null>(null)
const sidebarMenuRoot = ref<HTMLElement | null>(null)
const sidebarMenuPosition = ref({ x: 0, y: 0 })
let sidebarMenuTrigger: HTMLElement | null = null
const sidebarMenuLabels = computed(() => ({
  en: { scene: 'Scene actions', hierarchy: 'Hierarchy actions', entity: 'Object actions', unpin: 'Unpin object' },
  de: { scene: 'Szenenaktionen', hierarchy: 'Hierarchieaktionen', entity: 'Objektaktionen', unpin: 'Objekt lösen' },
  zh: { scene: '场景操作', hierarchy: '层级操作', entity: '对象操作', unpin: '取消固定对象' }
}[preferencesState.locale]))
const sidebarMenuEntity = computed(() => sidebarMenu.value?.kind === 'entity' ? state.world.entities.find(entity => entity.uuid === sidebarMenu.value?.entityUuid) ?? null : null)
watch(sidebarMenuEntity, entity => { if (sidebarMenu.value?.kind === 'entity' && !entity) closeSidebarMenu(false) })
/** Narrow-host overflow uses the shared menu and current commands without changing selection. */
async function openSidebarMenu(event: MouseEvent, kind: SidebarMenuKind, entity?: Entity) {
  const trigger = event.currentTarget as HTMLElement
  if (sidebarMenu.value && sidebarMenuTrigger === trigger) { closeSidebarMenu(); return }
  closeContextMenu()
  sidebarMenuTrigger = trigger
  const anchor = trigger.getBoundingClientRect()
  sidebarMenuPosition.value = { x: anchor.left, y: anchor.bottom }
  sidebarMenu.value = { kind, entityUuid: entity?.uuid }
  await nextTick()
  if (!sidebarMenu.value || sidebarMenuTrigger !== trigger) return
  const size = sidebarMenuRoot.value?.getBoundingClientRect()
  if (!size) return
  const inset = Number.parseFloat(getComputedStyle(trigger).getPropertyValue('--ui-space-sm')) || 0
  sidebarMenuPosition.value = { x: Math.max(inset, Math.min(anchor.left, window.innerWidth - size.width - inset)), y: Math.max(inset, Math.min(anchor.bottom, window.innerHeight - size.height - inset)) }
}
function closeSidebarMenu(restoreFocus = true) {
  const trigger = sidebarMenuTrigger
  sidebarMenu.value = null
  sidebarMenuTrigger = null
  if (restoreFocus && trigger?.isConnected) trigger.focus({ preventScroll: true })
}
function dismissSidebarMenu(event: PointerEvent) {
  if (sidebarMenu.value && !sidebarMenuRoot.value?.contains(event.target as Node) && !sidebarMenuTrigger?.contains(event.target as Node)) closeSidebarMenu(false)
}
function leaveSidebarMenu(event: KeyboardEvent) { if (event.key === 'Tab' && sidebarMenu.value) closeSidebarMenu(false) }
function resizeSidebarMenu() { closeSidebarMenu(false) }
function runSidebarAction(action: 'reloadScene' | 'addScene' | 'previous' | 'next' | 'create' | 'pin' | 'visibility' | 'lock' | 'enabled') {
  const entity = sidebarMenuEntity.value
  if (action === 'reloadScene') reloadScene()
  else if (action === 'addScene') addScene()
  else if (action === 'previous') navigateSelection(-1)
  else if (action === 'next') navigateSelection(1)
  else if (action === 'create') { if (canEdit.value) editorState.createObjectPaletteOpen = true }
  else if (entity) {
    if (action === 'pin') toggleHierarchyPin(entity.uuid)
    else if (action === 'visibility') toggleVisibility(entity)
    else if (action === 'lock') toggleLock(entity)
    else if (action === 'enabled') toggleEnabled(entity)
  }
  closeSidebarMenu()
}
// Teleported actions belong to this panel and cannot outlive a hidden or moved anchor.
watch(() => [sceneManager.activeSceneUuid, state.playMode, editorState.currentPage, editorState.activeWorkspace, editorState.hierarchyVisible, editorState.distractionFree, workspaceState.maximizedPanel, workspaceState.floatingPanels.join(','), preferencesState.uiScale, preferencesState.locale, recoveryState.readOnly, isCollapsed.value, panelWidth.value, dock.value], () => closeSidebarMenu(false))
const entityList = ref<HTMLElement | null>(null)
const hierarchyScrollTop = ref(0)
const hierarchyViewportHeight = ref(400)
const hierarchyRowHeight = computed(/* 与共享 Comfortable40 / Compact28 行高一致；缩放一次并保留小数，避免累计漂移。 */ () => (preferencesState.compactMode ? 28 : 40) * preferencesState.uiScale), hierarchyOverscan = 12
let hierarchyResizeObserver: ResizeObserver | null = null
let lastSelectedId: number | null = null
let applyingSelectionHistory = false
const canEdit = computed(/* 比较 state.playMode 与 'editing'，返回严格相等的判断结果。 */ () => state.playMode === 'editing' && !recoveryState.readOnly)
const selectionFilters = ['All', 'Visible', 'Unlocked', 'Sprites', 'Cameras', 'Physics'] as const
const availableTags = computed(/** 收集所有实体标签，去重并按本地顺序排序。 */ () => [...new Set(state.world.entities.flatMap(/* 返回 entity.tags 的当前值。 */ entity => entity.tags))].sort(/* 调用 left.localeCompare(right) 并返回调用结果。 */ (left, right) => left.localeCompare(right)))
const vFocus = { mounted: /** 重命名输入挂载后聚焦并全选文本。 */ (element: HTMLInputElement) => { element.focus(); element.select() } }

const hierarchyRows = computed(/** 建立父子映射及置顶排序，按搜索与过滤保留匹配祖先，防循环遍历生成层级行。 */ () => {
  const rows: Array<{ entity: Entity; depth: number; hasChildren: boolean; expanded: boolean }> = []
  const children = new Map<string | null, Entity[]>()
  const byUuid = new Map(state.world.entities.map(/* 返回按声明顺序构造的数组 [entity.uuid, entity]。 */ entity => [entity.uuid, entity]))
  const known = new Set(byUuid.keys())
  for (const entity of state.world.entities) {
    const parent = entity.parentUuid && known.has(entity.parentUuid) ? entity.parentUuid : null
    const siblings = children.get(parent) ?? []
    siblings.push(entity)
    children.set(parent, siblings)
  }
  for (const siblings of children.values()) siblings.sort(/** 把置顶实体排列在同级其他实体之前。 */ (left, right) => Number(authoringState.pinnedEntityUuids.includes(right.uuid)) - Number(authoringState.pinnedEntityUuids.includes(left.uuid)))

  const query = searchQuery.value.trim().toLocaleLowerCase()
  const included = new Set<string>()
  if (query) {
    for (const entity of state.world.entities) {
      const components = entity.components.map(/* 返回 component.kind 的当前值。 */ component => component.kind).join(' ')
      if (!`${entity.name} ${entity.id} ${entity.tags.join(' ')} ${components}`.toLocaleLowerCase().includes(query)) continue
      included.add(entity.uuid)
      let parentUuid = entity.parentUuid
      while (parentUuid) {
        included.add(parentUuid)
        parentUuid = byUuid.get(parentUuid)?.parentUuid ?? null
      }
    }
  }

  const filter = authoringState.selectionFilter
  const tagFilter = authoringState.tagFilter
  const filterIncluded = new Set<string>()
  if (filter !== 'All' || tagFilter) {
    const matchesFilter = /** 按可见、未锁、精灵、相机或物理筛选条件及标签判断实体是否匹配。 */ (entity: Entity) => (filter === 'Visible' ? entity.editorVisible : filter === 'Unlocked' ? !entity.editorLocked : filter === 'Sprites' ? Boolean(entity.spriteRenderer) : filter === 'Cameras' ? Boolean(entity.camera2D) : filter === 'Physics' ? entity.hasComponent('RigidBody2D') : true) && (!tagFilter || entity.tags.includes(tagFilter))
    for (const entity of state.world.entities) {
      if (!matchesFilter(entity)) continue
      filterIncluded.add(entity.uuid)
      let parentUuid = entity.parentUuid
      while (parentUuid) {
        filterIncluded.add(parentUuid)
        parentUuid = byUuid.get(parentUuid)?.parentUuid ?? null
      }
    }
  }

  const visit = /** 跳过访问过或被过滤实体，添加当前层级行并在展开时递归子实体。 */ (entity: Entity, depth: number, visited: Set<string>) => {
    if (visited.has(entity.uuid) || ((filter !== 'All' || tagFilter) && !filterIncluded.has(entity.uuid)) || (query && !included.has(entity.uuid))) return
    visited.add(entity.uuid)
    const entityChildren = children.get(entity.uuid) ?? []
    const expanded = query ? true : expandedUuids.value.has(entity.uuid)
    rows.push({ entity, depth, hasChildren: entityChildren.length > 0, expanded })
    if (expanded) for (const child of entityChildren) visit(child, depth + 1, visited)
  }
  const visited = new Set<string>()
  for (const root of children.get(null) ?? []) visit(root, 0, visited)
  for (const entity of state.world.entities) visit(entity, 0, visited)
  return rows
})
const hierarchyContentInset = computed(() => (preferencesState.compactMode ? 12 : 20) * preferencesState.uiScale)
const virtualStart = computed(() => Math.min(hierarchyRows.value.length, Math.max(0, Math.floor((hierarchyScrollTop.value - hierarchyContentInset.value) / hierarchyRowHeight.value) - hierarchyOverscan)))
const virtualEnd = computed(() => Math.max(virtualStart.value, Math.min(hierarchyRows.value.length, Math.ceil((hierarchyScrollTop.value + hierarchyViewportHeight.value - hierarchyContentInset.value) / hierarchyRowHeight.value) + hierarchyOverscan)))
const virtualHierarchyRows = computed(/* 调用 hierarchyRows.value.slice(virtualStart.value, virtualEnd.value) 并返回调用结果。 */ () => hierarchyRows.value.slice(virtualStart.value, virtualEnd.value))
const virtualPaddingTop = computed(() => virtualStart.value * hierarchyRowHeight.value + hierarchyContentInset.value)
const virtualPaddingBottom = computed(() => (hierarchyRows.value.length - virtualEnd.value) * hierarchyRowHeight.value + hierarchyContentInset.value)
/** 记录层级列表滚动位置。 */ function onHierarchyScroll(event: Event) { hierarchyScrollTop.value = (event.currentTarget as HTMLElement).scrollTop }
/** 根据名称、编号、标签和组件种类匹配非空搜索词。 */ function matchesHierarchySearch(entity: Entity) { const query = searchQuery.value.trim().toLocaleLowerCase(); if (!query) return false; return `${entity.name} ${entity.id} ${entity.tags.join(' ')} ${entity.components.map(/* 返回 component.kind 的当前值。 */ component => component.kind).join(' ')}`.toLocaleLowerCase().includes(query) }
/** 载入已保存的查询、标签和选择类型过滤设置。 */ function applySavedFilter() { const filter = authoringState.savedFilters.find(/* 比较 candidate.id 与 selectedSavedFilter.value，返回严格相等的判断结果。 */ candidate => candidate.id === selectedSavedFilter.value); if (!filter) return; searchQuery.value = filter.query; authoringState.tagFilter = filter.tagFilter; authoringState.selectionFilter = filter.selectionFilter }
/** 保存当前层级过滤条件并选中新过滤项。 */ function saveCurrentFilter() { selectedSavedFilter.value = saveHierarchyFilter(searchQuery.value || t(`selection${authoringState.selectionFilter}`), searchQuery.value) }
const breadcrumbs = computed(/** 从选中实体沿父级向上构建面包屑，防止父级循环。 */ () => {
  const selected = state.world.entities.find(/* 比较 entity.id 与 state.selectedEntityId，返回严格相等的判断结果。 */ entity => entity.id === state.selectedEntityId)
  if (!selected) return []
  const path: Entity[] = [selected], visited = new Set([selected.uuid])
  let parentUuid = selected.parentUuid
  while (parentUuid && !visited.has(parentUuid)) { const parent = state.world.entities.find(/* 比较 entity.uuid 与 parentUuid，返回严格相等的判断结果。 */ entity => entity.uuid === parentUuid); if (!parent) break; path.unshift(parent); visited.add(parent.uuid); parentUuid = parent.parentUuid }
  return path
})
/** 选择面包屑对应实体。 */ function selectBreadcrumb(entity: Entity) { selectEntities([entity.id], 'replace', entity.id) }
/** 仅在同一场景恢复历史选择，解析实体标识后临时禁止重复记录历史。 */ function navigateSelection(offset: -1 | 1) {
  const index = selectionHistoryIndex.value + offset, entry = selectionHistory.value[index]
  if (!entry || entry.sceneUuid !== sceneManager.activeSceneUuid) return
  const ids = entry.uuids.flatMap(/** 把仍存在的实体标识转换为编号，不存在则忽略。 */ uuid => { const entity = state.world.entities.find(/* 比较 candidate.uuid 与 uuid，返回严格相等的判断结果。 */ candidate => candidate.uuid === uuid); return entity ? [entity.id] : [] })
  const primary = entry.primaryUuid ? state.world.entities.find(/* 比较 entity.uuid 与 entry.primaryUuid，返回严格相等的判断结果。 */ entity => entity.uuid === entry.primaryUuid)?.id ?? null : null
  applyingSelectionHistory = true
  selectionHistoryIndex.value = index
  selectEntities(ids, 'replace', primary)
  queueMicrotask(/** 微任务后恢复选择历史记录。 */ () => { applyingSelectionHistory = false })
}

/** 编辑模式创建场景成功后记录历史并提示。 */ function addScene() { if (canEdit.value && createScene()) { pushHistory('Create scene'); editorState.statusText = t('sceneCreated') } }
/** 编辑模式重载当前场景成功后同步历史基线并提示。 */ function reloadScene() {
  if (canEdit.value && reloadActiveScene()) {
    synchronizeHistoryBaseline()
    editorState.statusText = t('sceneReloaded')
  }
}
/** 编辑模式按需加载目标场景，激活成功后同步历史基线和状态。 */ function activateScene(uuid: string, loaded: boolean) {
  if (!canEdit.value) return
  if (!loaded && !setSceneLoaded(uuid, true)) return
  if (setActiveScene(uuid)) {
    synchronizeHistoryBaseline()
    editorState.statusText = t('sceneActivated')
  }
}
/** 编辑模式切换场景载入状态，成功记录历史并提示。 */ function toggleLoaded(uuid: string, loaded: boolean) {
  if (canEdit.value && setSceneLoaded(uuid, !loaded)) {
    pushHistory(loaded ? 'Unload scene' : 'Load scene')
    editorState.statusText = t(loaded ? 'sceneUnloaded' : 'sceneLoaded')
  }
}
/** 编辑模式开始指定场景的重命名。 */ function startSceneEdit(uuid: string, name: string) { if (!canEdit.value) return; editingSceneUuid.value = uuid; sceneName.value = name }
/** 结束匹配场景的重命名，清理并限制有效名称长度，变更时记录历史。 */ function finishSceneEdit(uuid: string) { if (editingSceneUuid.value !== uuid) return; const scene = sceneManager.scenes.find(/* 比较 candidate.uuid 与 uuid，返回严格相等的判断结果。 */ candidate => candidate.uuid === uuid); const name = sceneName.value.trim(); if (scene && name && name !== scene.name) { scene.name = name.slice(0, 80); pushHistory('Rename scene') } editingSceneUuid.value = null }
/** 仅对编辑模式下未锁定实体启动重命名。 */ function startEdit(entity: Entity) {
  if (!canEdit.value || entity.editorLocked) return
  const index = hierarchyRows.value.findIndex(row => row.entity.id === entity.id), list = entityList.value
  if (list && index >= 0) {
    const top = hierarchyContentInset.value + index * hierarchyRowHeight.value, bottom = top + hierarchyRowHeight.value
    if (top < list.scrollTop) list.scrollTop = top
    else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight
    hierarchyScrollTop.value = list.scrollTop
  }
  editingId.value = entity.id; editName.value = entity.name
}
function cancelEdit() { editingId.value = null; editName.value = ''; editorState.renameRequestId = null }
/** 提交有效实体名称并记录资源范围历史，随后清除重命名请求。 */ function finishEdit(entity: Entity) { if (editingId.value !== entity.id) return; const name = editName.value.trim(); if (name && name !== entity.name) { entity.name = name.slice(0, 80); pushHistory('Rename entity', `rename:${entity.uuid}`) } editingId.value = null; editorState.renameRequestId = null }
/* 根据 type === 'Circle' 的真假，分别返回 '○' 或 type === 'Triangle' ? '△' : type === 'Box' ? '□' : '·'。 */ function getIcon(type: string) { return type === 'Circle' ? 'circle' : type === 'Triangle' ? 'triangle' : type === 'Box' ? 'rectangle' : 'design' }

/** 支持 Shift 范围选择、修饰键切换或替换选择，并同步活动图层。 */ function selectEntity(event: MouseEvent, entity: Entity) {
  if (event.shiftKey && lastSelectedId !== null) {
    const rows = hierarchyRows.value
    const start = rows.findIndex(/* 比较 row.entity.id 与 lastSelectedId，返回严格相等的判断结果。 */ row => row.entity.id === lastSelectedId)
    const end = rows.findIndex(/* 比较 row.entity.id 与 entity.id，返回严格相等的判断结果。 */ row => row.entity.id === entity.id)
    if (start !== -1 && end !== -1) selectEntities(rows.slice(Math.min(start, end), Math.max(start, end) + 1).map(/* 返回 row.entity.id 的当前值。 */ row => row.entity.id), 'add', entity.id)
  } else {
    selectEntities([entity.id], event.ctrlKey || event.metaKey ? 'toggle' : 'replace', entity.id)
  }
  lastSelectedId = entity.id
  if (entity.layer !== editorState.activeLayer) setActiveLayer(entity.layer)
}

/** 复制展开集合后切换目标实体展开状态。 */ function toggleExpanded(uuid: string) { const before = captureRects(hierarchyElements()); const next = new Set(expandedUuids.value); if (next.has(uuid)) next.delete(uuid); else next.add(uuid); expandedUuids.value = next; settleHierarchy(before) }
/** 编辑模式切换实体编辑可见性并记录历史。 */ function toggleVisibility(entity: Entity) { if (!canEdit.value) return; entity.editorVisible = !entity.editorVisible; pushHistory('Toggle editor visibility', `visibility:${entity.uuid}`) }
/** 编辑模式切换实体锁定状态并记录历史。 */ function toggleLock(entity: Entity) { if (!canEdit.value) return; entity.editorLocked = !entity.editorLocked; pushHistory('Toggle editor lock', `lock:${entity.uuid}`) }
/** 编辑模式切换实体运行启用状态并记录历史。 */ function toggleEnabled(entity: Entity) { if (!canEdit.value) return; entity.enabled = !entity.enabled; pushHistory('Toggle entity', `enabled:${entity.uuid}`) }

/** 仅可编辑且未锁实体能开始拖动，确保选中并记录选中根节点及拖拽数据。 */ function startEntityDrag(event: DragEvent, entity: Entity) {
  if (!canEdit.value || entity.editorLocked) { event.preventDefault(); return }
  if (!state.selectedEntityIds.includes(entity.id)) selectEntities([entity.id], 'replace', entity.id)
  draggingIds.value = selectionRoots(state.selectedEntityIds, state.world.entities).map(/* 返回 candidate.id 的当前值。 */ candidate => candidate.id)
  event.dataTransfer?.setData('text/plain', entity.uuid)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
  beginNativeDrag(event, entity.name)
}
/** Preview hierarchy drags, rejecting impossible parents before advertising a drop. */
function previewEntityDrop(event: DragEvent, target: Entity) {
  if (!draggingIds.value.length) return
  dropTargetUuid.value = target.uuid
  const parentUuid = event.shiftKey ? target.parentUuid : target.uuid
  const moving = selectionRoots(draggingIds.value, state.world.entities)
  const valid = canEdit.value && !target.editorLocked && moving.every(entity => entity !== target && !entity.editorLocked && !wouldCreateParentCycle(entity, parentUuid, state.world.entities))
  dropValidity.value = valid ? event.shiftKey ? 'before' : 'valid' : 'invalid'
  if (valid) event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = valid ? 'move' : 'none'
}
/** 结束拖拽并清除待放置目标。 */ function finishEntityDrag() { draggingIds.value = []; dropTargetUuid.value = null; endNativeDrag() }
function hierarchyElements() { return entityList.value?.querySelectorAll<HTMLElement>('.entity-item') ?? [] }
function settleHierarchy(before: ReturnType<typeof captureRects>) { void nextTick(() => animateReorder(before, hierarchyElements())) }
function previewRootDrop(event: DragEvent) { if (canEdit.value && draggingIds.value.length) { event.preventDefault(); if (event.dataTransfer) event.dataTransfer.dropEffect = 'move' } }
/** 指针实际离开目标元素及子元素时清除对应放置高亮。 */ function leaveDropTarget(event: DragEvent, uuid: string) { if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null) && dropTargetUuid.value === uuid) dropTargetUuid.value = null }
/** 将拖动根实体重新设父级，跳过自身与锁定项，按需保留世界坐标并记录变更。 */ function reparentDragged(parentUuid: string | null, preserveWorld = true) {
  if (!canEdit.value || !draggingIds.value.length) return
  const before = captureRects(hierarchyElements())
  let changed = false
  for (const entity of selectionRoots(draggingIds.value, state.world.entities)) {
    if (entity.uuid === parentUuid || entity.editorLocked) continue
    changed = setParent(entity, parentUuid, state.world.entities, preserveWorld) || changed
  }
  if (changed) { pushHistory('Reparent entities'); addEditorLog(parentUuid ? 'Entities reparented' : 'Entities moved to scene root'); settleHierarchy(before) }
  finishEntityDrag()
}
/** 将拖动根实体移动到目标同级并插入目标之前，记录顺序历史并结束拖拽。 */ function reorderDragged(target: Entity) {
  if (!canEdit.value || target.editorLocked) { finishEntityDrag(); return }
  const moving = selectionRoots(draggingIds.value, state.world.entities).filter(/* 比较 entity 与 target，返回严格不等的判断结果。 */ entity => entity !== target)
  if (!moving.length || moving.some(entity => entity.editorLocked || wouldCreateParentCycle(entity, target.parentUuid, state.world.entities))) { finishEntityDrag(); return }
  const before = captureRects(hierarchyElements())
  const parentUuid = target.parentUuid
  for (const entity of moving) setParent(entity, parentUuid, state.world.entities)
  const remaining = state.world.entities.filter(/* 返回 moving.includes(entity) 的逻辑取反结果。 */ entity => !moving.includes(entity)), index = remaining.indexOf(target)
  remaining.splice(Math.max(0, index), 0, ...moving); state.world.entities.splice(0, state.world.entities.length, ...remaining)
  pushHistory('Reorder entities'); finishEntityDrag(); settleHierarchy(before)
}
/** Shift 放置执行排序，否则重设父级，Alt 控制是否保留世界坐标。 */ function dropOnEntity(event: DragEvent, parent: Entity) { if (!draggingIds.value.length) return; previewEntityDrop(event, parent); if (dropValidity.value === 'invalid') { finishEntityDrag(); return } if (event.shiftKey) reorderDragged(parent); else reparentDragged(parent.uuid, !event.altKey) }
/** 放置到根时重设为空父级，Alt 控制是否保留世界坐标。 */ function dropOnRoot(event?: DragEvent) { if (!draggingIds.value.length) return; event?.preventDefault(); reparentDragged(null, !event?.altKey) }
watch(() => sceneManager.activeSceneUuid, finishEntityDrag)

watch(/* 返回 editorState.renameRequestId 的当前值。 */ () => editorState.renameRequestId, /** 收到有效重命名请求编号时查找实体并启动编辑。 */ id => { if (id === null) return; const entity = state.world.entities.find(/* 比较 candidate.id 与 id，返回严格相等的判断结果。 */ candidate => candidate.id === id); if (entity) startEdit(entity) })
watch(/** 提取当前全部实体标识作为展开初始化依赖。 */ () => state.world.entities.map(/* 返回 entity.uuid 的当前值。 */ entity => entity.uuid), /** 尚无展开项时将现有实体默认展开。 */ uuids => { if (!expandedUuids.value.size) expandedUuids.value = new Set(uuids) }, { immediate: true })
watch(/** 组合场景、选择集合及主选择为历史监听标记。 */ () => `${sceneManager.activeSceneUuid}:${state.selectedEntityIds.join(',')}:${state.selectedEntityId ?? ''}`, /** 非历史回放期间记录不同的新选择，裁剪未来记录及超过一百项的旧历史。 */ () => {
  if (applyingSelectionHistory) return
  const selected = new Set(state.selectedEntityIds)
  const uuids = state.world.entities.filter(/* 调用 selected.has(entity.id) 并返回调用结果。 */ entity => selected.has(entity.id)).map(/* 返回 entity.uuid 的当前值。 */ entity => entity.uuid)
  const primaryUuid = state.world.entities.find(/* 比较 entity.id 与 state.selectedEntityId，返回严格相等的判断结果。 */ entity => entity.id === state.selectedEntityId)?.uuid ?? null
  const entry = { sceneUuid: sceneManager.activeSceneUuid, uuids, primaryUuid }, current = selectionHistory.value[selectionHistoryIndex.value]
  if (current?.sceneUuid === entry.sceneUuid && current.primaryUuid === entry.primaryUuid && current.uuids.join(',') === entry.uuids.join(',')) return
  selectionHistory.value.splice(selectionHistoryIndex.value + 1)
  selectionHistory.value.push(entry)
  if (selectionHistory.value.length > 100) selectionHistory.value.shift()
  selectionHistoryIndex.value = selectionHistory.value.length - 1
}, { immediate: true })

const collapseThreshold = 140
/** 结束宽度拖动，低于阈值则折叠，否则限制最小宽度并保存布局。 */ function commitPanelWidth(value:number) { isDragging.value=false;if(value<collapseThreshold){isCollapsed.value=true;panelWidth.value=0}else{panelWidth.value=Math.max(260,value);editorState.hierarchyWidth=panelWidth.value} }
/** 展开面板并恢复已保存宽度或默认宽度。 */ function expandPanel() { isCollapsed.value = false; panelWidth.value = editorState.hierarchyWidth || 280 }
onMounted(/** 挂载时记录层级视口高度并注册尺寸观察器。 */ () => { document.addEventListener('pointerdown', dismissSidebarMenu, true); document.addEventListener('keydown', leaveSidebarMenu, true); window.addEventListener('resize', resizeSidebarMenu); if (entityList.value) { hierarchyViewportHeight.value = entityList.value.clientHeight; hierarchyResizeObserver = new ResizeObserver(/** 从尺寸观察结果更新虚拟列表视口高度。 */ entries => { hierarchyViewportHeight.value = entries[0]?.contentRect.height ?? hierarchyViewportHeight.value }); hierarchyResizeObserver.observe(entityList.value) } })
onBeforeUnmount(/** Release animations while the mounted row references are still available. */ () => { document.removeEventListener('pointerdown', dismissSidebarMenu, true); document.removeEventListener('keydown', leaveSidebarMenu, true); window.removeEventListener('resize', resizeSidebarMenu); closeSidebarMenu(false); hierarchyResizeObserver?.disconnect(); for (const element of hierarchyElements()) cancelMotion(element); finishEntityDrag() })
</script>

<style scoped>
.sidebar-container{position:relative;height:100%;flex:none;display:flex;min-width:0;background:var(--ui-bg-1,var(--surface-1));border-inline-end:1px solid var(--border-subtle);
 border-radius: var(--radius-panel);
}
.sidebar-container.left > .panel-resize-handle{inset-inline-end:0}
.scene-sidebar{container: hierarchy-host / inline-size;min-width:0;flex:1;display:flex;flex-direction:column;overflow:hidden;
 border-radius: var(--radius-panel);
}.scene-manager{flex:none;border-bottom:1px solid var(--border-subtle)}
.scene-list{max-height:calc(4 * var(--ui-tree-row-height));overflow:auto;padding:var(--ui-panel-inset);}.scene-item{display:flex;align-items:center}.scene-main{display:flex;align-items:center;flex:1;min-width:0;min-height:var(--ui-tree-row-height);gap:var(--ui-control-gap);padding-inline:0;}.scene-main span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.scene-main input{min-width:0;width:100%}.scene-item.active{background:var(--surface-active,var(--accent-soft))}.scene-item.unloaded{opacity:.5}
.hierarchy-header{flex:none;border-bottom:1px solid var(--border-subtle);
 padding: var(--ui-panel-inset);
}.hierarchy-header>div:first-child{display:flex;align-items:center;justify-content:space-between}.hierarchy-actions{display:flex;align-items:center;gap:var(--ui-control-gap)}.hierarchy-search-row{display:flex;position:relative;gap:var(--ui-control-gap);margin-top:var(--ui-heading-content-gap);}.search{min-width:0;flex:1;display:flex;align-items:center;gap:var(--ui-control-gap);}.search input{width:100%;min-width:0}.hierarchy-filter-menu>summary{display:grid;place-items:center;inline-size:var(--ui-control-height);block-size:var(--ui-control-height);list-style:none;cursor:pointer}.hierarchy-filter-menu>summary::-webkit-details-marker{display:none}.hierarchy-filters{position:absolute;top:100%;inset-inline-end:0;z-index:30;display:grid;grid-template-columns:minmax(0,1fr) auto auto;width:min(100%,24rem);background:var(--surface-2);border:1px solid var(--border-subtle);box-shadow:var(--shadow-float);gap:var(--ui-control-gap);padding:var(--space-3);border-radius:var(--radius-floating);}.hierarchy-filter-wide{grid-column:1/-1}
.breadcrumbs{display:flex;flex:none;align-items:flex-start;min-width:0;block-size:calc(var(--ui-control-height) + var(--ui-space-sm) + var(--ui-border-width));overflow:auto;gap:var(--ui-space-micro);border-bottom:var(--ui-border-width) solid var(--border-subtle)}.breadcrumbs.empty{visibility:hidden}.breadcrumbs button{display:flex;align-items:center;white-space:nowrap}.entity-list{min-height:0;flex:1;overflow:auto}.entity-item{position:relative;gap:var(--ui-space-micro)}.entity-item.disabled{opacity:.5}.entity-item.hidden .name{text-decoration:line-through}.entity-item.drop-target{outline:1px solid var(--accent);outline-offset:-1px}.entity-item.primary{box-shadow:inset 2px 0 var(--accent)}.name{min-width:0;flex:1;display:flex;align-items:center;gap:var(--ui-space-xs);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;background:transparent;border:0;text-align:start;padding:0;height:100%;min-height:0;font:inherit;color:inherit}.name small{color:var(--text-muted)}.name mark{color:inherit;background:var(--accent-soft)}.edit-input{min-width:0;flex:1}.disclosure,.state-button{flex:none;inline-size:var(--ui-tree-row-height);block-size:var(--ui-tree-row-height);min-inline-size:var(--ui-tree-row-height);min-height:0;padding:0;display:grid;place-items:center;border:0;background:transparent}.disclosure.placeholder{visibility:hidden}.state-button{opacity:0}.entity-item:hover .state-button,.entity-item:focus-within .state-button,.state-button.active,.entity-item.hidden .state-button,.entity-item.locked .state-button{opacity:1}.status-mark{font-size:var(--type-caption);color:var(--text-muted)}.empty-state{color:var(--text-muted);padding:var(--ui-panel-inset);}.root-drop{margin:var(--ui-space-xs);border:1px dashed var(--accent)}.expand{position:absolute;inset-inline-start:0;top:50%}.right .panel-resize-handle{inset-inline-start:0}

/* The host's font-relative breakpoint follows saved UI scale, never dock width. */
.compact-action{display:none}
.hierarchy-title{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hierarchy-header>div:first-child{gap:var(--ui-control-gap)}
.hierarchy-actions{flex:none}
.search input{flex:1;min-width:0}
.entity-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.name small{flex:none}
.row-overflow{flex:none;inline-size:var(--ui-tree-row-height);block-size:var(--ui-tree-row-height);min-inline-size:var(--ui-tree-row-height);min-height:0;padding:0}
.sidebar-action-menu{position:fixed;z-index:var(--ui-popover-layer);inline-size:min(calc(7 * var(--ui-control-height)),calc(100vw - 2 * var(--ui-space-sm)));max-inline-size:calc(100vw - 2 * var(--ui-space-sm));max-block-size:calc(100dvh - 2 * var(--ui-space-sm))}
.sidebar-action-menu :deep(.ui-menu){max-inline-size:inherit;max-block-size:inherit;overflow:auto}
.sidebar-action-menu :deep(.ui-menu>button){white-space:normal}
.sidebar-menu-title{font-size:var(--type-section);overflow-wrap:anywhere}
.sidebar-action-menu small,.sidebar-menu-status{color:var(--text-muted);font-size:var(--type-caption)}
.sidebar-menu-status{display:grid;gap:var(--ui-space-micro)}
@container hierarchy-host (max-width:24em){
  .compact-action{display:inline-flex}
  .scene-direct-action,.hierarchy-direct-action,.entity-item>.state-button,.entity-item>.status-mark,.name small,.search>.editor-icon{display:none}
  .entity-item>.disclosure.placeholder{display:none}
  .entity-item{padding-inline-start:min(calc(var(--tree-depth,0) * var(--space-3)),var(--space-3))}
  .hierarchy-filters{grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--ui-control-gap);padding:var(--space-3);border-radius:var(--radius-floating);}
  .hierarchy-filters>select{grid-column:1/-1;width:100%}
  .hierarchy-filters>.ui-button{justify-self:start}
}
/* Row-local rename geometry matches the exact virtual stride. */
.hierarchy-rows{padding-inline:var(--ui-panel-inset)}
.edit-input,.scene-main input{height:var(--ui-tree-row-height);min-height:0;min-width:0;max-width:100%;font-size:var(--type-body);line-height:var(--line-control);padding-inline:var(--space-3);padding-block:max(0px,calc((var(--ui-tree-row-height) - var(--type-body) * var(--line-control) - 2 * var(--ui-border-width)) / 2));border-width:var(--ui-border-width);border-radius:var(--radius-input)}
.edit-input{width:100%}
</style>
