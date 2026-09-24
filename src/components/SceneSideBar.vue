<!-- 场景层级侧栏：搜索、选择和编辑实体层级，并维护资源关联。 -->
<template>
  <aside class="sidebar-container" :style="{ width: isCollapsed ? '22px' : `${panelWidth}px` }" :class="[dock, { 'jelly-slide': !isDragging, 'no-transition': isDragging, 'panel-maximized': workspaceState.maximizedPanel==='hierarchy' }]">
    <button v-if="isCollapsed" class="expand" :title="t('expandPanel')" @click="expandPanel">›</button>
    <div v-show="!isCollapsed" class="scene-sidebar">
      <section class="scene-manager">
        <div class="list-header">
          <span>{{ t('scenes') }}</span>
          <div class="header-actions">
            <PanelMaximizeButton panel="hierarchy" />
            <button :title="t('reloadScene')" :disabled="!canEdit" @click="reloadScene">↻</button>
            <button :title="t('addScene')" :disabled="!canEdit" @click="addScene">+</button>
          </div>
        </div>
        <div class="scene-list">
          <div v-for="scene in sceneManager.scenes" :key="scene.uuid" class="scene-item" :class="{ active: scene.uuid === sceneManager.activeSceneUuid, unloaded: !scene.loaded }">
            <div class="scene-main" role="button" tabindex="0" @click="activateScene(scene.uuid, scene.loaded)" @keyup.enter="activateScene(scene.uuid, scene.loaded)">
              <i></i><span v-if="editingSceneUuid !== scene.uuid" @dblclick.stop="startSceneEdit(scene.uuid, scene.name)">{{ scene.name }}</span>
              <input v-else v-model="sceneName" v-focus @click.stop @blur="finishSceneEdit(scene.uuid)" @keyup.enter="finishSceneEdit(scene.uuid)">
            </div>
            <button v-if="scene.uuid !== sceneManager.activeSceneUuid" class="load-toggle" :title="scene.loaded ? t('unloadScene') : t('loadScene')" :disabled="!canEdit" @click="toggleLoaded(scene.uuid, scene.loaded)">{{ scene.loaded ? '●' : '○' }}</button>
          </div>
        </div>
      </section>

      <div class="hierarchy-header">
        <div><span>{{ t('hierarchy') }}</span><span class="hierarchy-actions"><small>{{ state.world.entities.length }}</small><button :title="t('previousSelection')" :disabled="selectionHistoryIndex <= 0" @click="navigateSelection(-1)">←</button><button :title="t('nextSelection')" :disabled="selectionHistoryIndex >= selectionHistory.length - 1" @click="navigateSelection(1)">→</button><button :title="t('createObject')" :disabled="!canEdit" @click="editorState.createObjectPaletteOpen = true">＋</button></span></div>
        <label class="search"><span>⌕</span><input v-model="searchQuery" type="search" :placeholder="t('searchEntities')"></label>
        <div class="hierarchy-filters"><select class="hierarchy-filter-wide" v-model="authoringState.selectionFilter" :aria-label="t('selectionFilter')"><option v-for="filter in selectionFilters" :key="filter" :value="filter">{{ t(`selection${filter}`) }}</option></select><select class="hierarchy-filter-wide" v-model="authoringState.tagFilter" :aria-label="t('tagFilter')"><option value="">{{ t('allTags') }}</option><option v-for="tag in availableTags" :key="tag" :value="tag"># {{ tag }}</option></select><select v-model="selectedSavedFilter" :aria-label="t('savedFilters')" @change="applySavedFilter"><option value="">{{ t('savedFilters') }}</option><option v-for="filter in authoringState.savedFilters" :key="filter.id" :value="filter.id">{{ filter.name }}</option></select><button :title="t('saveFilter')" @click="saveCurrentFilter">☆</button><button :class="{ active: authoringState.performanceMode }" :title="t('viewportPerformanceMode')" @click="authoringState.performanceMode = !authoringState.performanceMode">⚡</button></div>
      </div>

      <nav v-if="breadcrumbs.length" class="breadcrumbs" :aria-label="t('hierarchyBreadcrumb')"><button v-for="(entity, index) in breadcrumbs" :key="entity.uuid" @click="selectBreadcrumb(entity)">{{ index ? '› ' : '' }}{{ entity.name }}</button></nav>

      <div ref="entityList" class="entity-list" @scroll="onHierarchyScroll" @dragover.prevent @drop="dropOnRoot($event)">
        <div class="hierarchy-rows" :style="{ paddingTop: `${virtualPaddingTop}px`, paddingBottom: `${virtualPaddingBottom}px` }">
        <div
          v-for="row in virtualHierarchyRows"
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
            'drop-target': dropTargetUuid === row.entity.uuid
          }"
          :style="{ height: `${hierarchyRowHeight}px`, paddingLeft: `${6 + row.depth * 15}px` }"
          :draggable="canEdit && !row.entity.editorLocked"
          @click="selectEntity($event, row.entity)"
          @contextmenu.prevent="openContextMenu($event, 'sidebar-entity', row.entity.id)"
          @dragstart="startEntityDrag($event, row.entity)"
          @dragend="finishEntityDrag"
          @dragenter.prevent.stop="dropTargetUuid = row.entity.uuid"
          @dragleave.stop="leaveDropTarget($event, row.entity.uuid)"
          @dragover.prevent.stop
          @drop.prevent.stop="dropOnEntity($event, row.entity)"
        >
          <button class="disclosure" :class="{ placeholder: !row.hasChildren }" :aria-label="row.expanded ? t('collapsePanel') : t('expandPanel')" @click.stop="toggleExpanded(row.entity.uuid)">{{ row.hasChildren ? (row.expanded ? '⌄' : '›') : '' }}</button>
          <span class="shape-icon">{{ getIcon(row.entity.shapeType) }}</span>
          <span v-if="editingId !== row.entity.id" class="name" :title="`${row.entity.name} — ${t('renameHint')}`" @dblclick.stop="startEdit(row.entity)"><mark v-if="searchQuery && row.entity.name.toLocaleLowerCase().includes(searchQuery.toLocaleLowerCase())">{{ row.entity.name }}</mark><template v-else>{{ row.entity.name }}</template><small>{{ row.entity.id }}</small></span>
          <input v-else v-model="editName" v-focus class="edit-input" @click.stop @blur="finishEdit(row.entity)" @keyup.enter="finishEdit(row.entity)" @keyup.escape="editingId = null">
          <span v-if="row.entity.prefabAsset" class="status-mark" :title="t('prefabInstance')">P</span><span v-if="row.entity.sceneLayers.length" class="status-mark scene" :title="t('sceneInstance')">S</span><span v-if="Object.keys(row.entity.prefabOverrides).length" class="status-mark override" :title="t('prefabOverrides')">●</span>
          <button class="state-button pin" :class="{ active: authoringState.pinnedEntityUuids.includes(row.entity.uuid) }" :title="t('pinEntity')" @click.stop="toggleHierarchyPin(row.entity.uuid)">◆</button>
          <button class="state-button" :title="row.entity.editorVisible ? t('hideEntity') : t('showEntity')" @click.stop="toggleVisibility(row.entity)">{{ row.entity.editorVisible ? '◉' : '○' }}</button>
          <button class="state-button" :title="row.entity.editorLocked ? t('unlockEntity') : t('lockEntity')" @click.stop="toggleLock(row.entity)">{{ row.entity.editorLocked ? '▣' : '▢' }}</button>
          <button class="state-button power" :title="row.entity.enabled ? t('disableEntity') : t('enableEntity')" @click.stop="toggleEnabled(row.entity)">●</button>
        </div>
        </div>
        <p v-if="!hierarchyRows.length" class="empty-state">{{ t('noEntitiesFound') }}</p>
        <button v-if="draggingIds.length" class="root-drop" @dragover.prevent @drop.prevent.stop="dropOnRoot($event)">{{ t('reparentToRoot') }}</button>
      </div>
    </div>
    <PanelResizeHandle v-show="!isCollapsed" v-model="panelWidth" orientation="vertical" :minimum="0" :maximum="500" :reset-value="236" :reverse="dock==='right'" :label="t('hierarchy')" :disabled="workspaceState.maximizedPanel==='hierarchy'" @dragging="isDragging=$event" @commit="commitPanelWidth" />
  </aside>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { t } from '../i18n'
import { preferencesState } from '../store/preferences'
import { addEditorLog, editorState, openContextMenu, setActiveLayer } from '../store/editor'
import { createScene, physicsState as state, pushHistory, reloadActiveScene, sceneManager, selectEntities, setActiveScene, setSceneLoaded, synchronizeHistoryBaseline } from '../store/physics'
import type { Entity } from '../world/Entity'
import { setParent } from '../world/hierarchy'
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
const selectedSavedFilter = ref('')
const selectionHistory = ref<Array<{ sceneUuid: string; uuids: string[]; primaryUuid: string | null }>>([])
const selectionHistoryIndex = ref(-1)
const entityList = ref<HTMLElement | null>(null)
const hierarchyScrollTop = ref(0)
const hierarchyViewportHeight = ref(400)
const hierarchyRowHeight = computed(/* 调用 Math.ceil(29 * preferencesState.uiScale) 并返回调用结果。 */ () => Math.ceil(29 * preferencesState.uiScale)), hierarchyOverscan = 12
let hierarchyResizeObserver: ResizeObserver | null = null
let lastSelectedId: number | null = null
let applyingSelectionHistory = false
const canEdit = computed(/* 比较 state.playMode 与 'editing'，返回严格相等的判断结果。 */ () => state.playMode === 'editing')
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
const virtualStart = computed(/* 调用 Math.max(0, Math.floor(hierarchyScrollTop.value / hierarchyRowHeight.value) - hierarchyOverscan) 并返回调用结果。 */ () => Math.max(0, Math.floor(hierarchyScrollTop.value / hierarchyRowHeight.value) - hierarchyOverscan))
const virtualEnd = computed(/** 根据滚动位置、视口和行高计算含预留行的虚拟列表末端。 */ () => Math.min(hierarchyRows.value.length, Math.ceil((hierarchyScrollTop.value + hierarchyViewportHeight.value) / hierarchyRowHeight.value) + hierarchyOverscan))
const virtualHierarchyRows = computed(/* 调用 hierarchyRows.value.slice(virtualStart.value, virtualEnd.value) 并返回调用结果。 */ () => hierarchyRows.value.slice(virtualStart.value, virtualEnd.value))
const virtualPaddingTop = computed(/* 计算表达式 virtualStart.value * hierarchyRowHeight.value + 5 并返回结果，沿用操作数的原有类型规则。 */ () => virtualStart.value * hierarchyRowHeight.value + 5)
const virtualPaddingBottom = computed(/* 调用 Math.max(5, (hierarchyRows.value.length - virtualEnd.value) * hierarchyRowHeight.value + 5) 并返回调用结果。 */ () => Math.max(5, (hierarchyRows.value.length - virtualEnd.value) * hierarchyRowHeight.value + 5))
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
/** 仅对编辑模式下未锁定实体启动重命名。 */ function startEdit(entity: Entity) { if (!canEdit.value || entity.editorLocked) return; editingId.value = entity.id; editName.value = entity.name }
/** 提交有效实体名称并记录资源范围历史，随后清除重命名请求。 */ function finishEdit(entity: Entity) { if (editingId.value !== entity.id) return; const name = editName.value.trim(); if (name && name !== entity.name) { entity.name = name.slice(0, 80); pushHistory('Rename entity', `rename:${entity.uuid}`) } editingId.value = null; editorState.renameRequestId = null }
/* 根据 type === 'Circle' 的真假，分别返回 '○' 或 type === 'Triangle' ? '△' : type === 'Box' ? '□' : '·'。 */ function getIcon(type: string) { return type === 'Circle' ? '○' : type === 'Triangle' ? '△' : type === 'Box' ? '□' : '·' }

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

/** 复制展开集合后切换目标实体展开状态。 */ function toggleExpanded(uuid: string) { const next = new Set(expandedUuids.value); if (next.has(uuid)) next.delete(uuid); else next.add(uuid); expandedUuids.value = next }
/** 编辑模式切换实体编辑可见性并记录历史。 */ function toggleVisibility(entity: Entity) { if (!canEdit.value) return; entity.editorVisible = !entity.editorVisible; pushHistory('Toggle editor visibility', `visibility:${entity.uuid}`) }
/** 编辑模式切换实体锁定状态并记录历史。 */ function toggleLock(entity: Entity) { if (!canEdit.value) return; entity.editorLocked = !entity.editorLocked; pushHistory('Toggle editor lock', `lock:${entity.uuid}`) }
/** 编辑模式切换实体运行启用状态并记录历史。 */ function toggleEnabled(entity: Entity) { if (!canEdit.value) return; entity.enabled = !entity.enabled; pushHistory('Toggle entity', `enabled:${entity.uuid}`) }

/** 仅可编辑且未锁实体能开始拖动，确保选中并记录选中根节点及拖拽数据。 */ function startEntityDrag(event: DragEvent, entity: Entity) {
  if (!canEdit.value || entity.editorLocked) { event.preventDefault(); return }
  if (!state.selectedEntityIds.includes(entity.id)) selectEntities([entity.id], 'replace', entity.id)
  draggingIds.value = selectionRoots(state.selectedEntityIds, state.world.entities).map(/* 返回 candidate.id 的当前值。 */ candidate => candidate.id)
  event.dataTransfer?.setData('text/plain', entity.uuid)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}
/** 结束拖拽并清除待放置目标。 */ function finishEntityDrag() { draggingIds.value = []; dropTargetUuid.value = null }
/** 指针实际离开目标元素及子元素时清除对应放置高亮。 */ function leaveDropTarget(event: DragEvent, uuid: string) { if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null) && dropTargetUuid.value === uuid) dropTargetUuid.value = null }
/** 将拖动根实体重新设父级，跳过自身与锁定项，按需保留世界坐标并记录变更。 */ function reparentDragged(parentUuid: string | null, preserveWorld = true) {
  if (!canEdit.value || !draggingIds.value.length) return
  let changed = false
  for (const entity of selectionRoots(draggingIds.value, state.world.entities)) {
    if (entity.uuid === parentUuid || entity.editorLocked) continue
    changed = setParent(entity, parentUuid, state.world.entities, preserveWorld) || changed
  }
  if (changed) { pushHistory('Reparent entities'); addEditorLog(parentUuid ? 'Entities reparented' : 'Entities moved to scene root') }
  finishEntityDrag()
}
/** 将拖动根实体移动到目标同级并插入目标之前，记录顺序历史并结束拖拽。 */ function reorderDragged(target: Entity) {
  const moving = selectionRoots(draggingIds.value, state.world.entities).filter(/* 比较 entity 与 target，返回严格不等的判断结果。 */ entity => entity !== target)
  if (!moving.length) return
  const parentUuid = target.parentUuid
  for (const entity of moving) setParent(entity, parentUuid, state.world.entities)
  const remaining = state.world.entities.filter(/* 返回 moving.includes(entity) 的逻辑取反结果。 */ entity => !moving.includes(entity)), index = remaining.indexOf(target)
  remaining.splice(Math.max(0, index), 0, ...moving); state.world.entities.splice(0, state.world.entities.length, ...remaining)
  pushHistory('Reorder entities'); finishEntityDrag()
}
/** Shift 放置执行排序，否则重设父级，Alt 控制是否保留世界坐标。 */ function dropOnEntity(event: DragEvent, parent: Entity) { if (event.shiftKey) reorderDragged(parent); else reparentDragged(parent.uuid, !event.altKey) }
/** 放置到根时重设为空父级，Alt 控制是否保留世界坐标。 */ function dropOnRoot(event?: DragEvent) { reparentDragged(null, !event?.altKey) }

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

const collapseThreshold = 118
/** 结束宽度拖动，低于阈值则折叠，否则限制最小宽度并保存布局。 */ function commitPanelWidth(value:number) { isDragging.value=false;if(value<collapseThreshold){isCollapsed.value=true;panelWidth.value=0}else{panelWidth.value=Math.max(160,value);editorState.hierarchyWidth=panelWidth.value} }
/** 展开面板并恢复已保存宽度或默认宽度。 */ function expandPanel() { isCollapsed.value = false; panelWidth.value = editorState.hierarchyWidth || 236 }
onMounted(/** 挂载时记录层级视口高度并注册尺寸观察器。 */ () => { if (entityList.value) { hierarchyViewportHeight.value = entityList.value.clientHeight; hierarchyResizeObserver = new ResizeObserver(/** 从尺寸观察结果更新虚拟列表视口高度。 */ entries => { hierarchyViewportHeight.value = entries[0]?.contentRect.height ?? hierarchyViewportHeight.value }); hierarchyResizeObserver.observe(entityList.value) } })
onUnmounted(/** 卸载时解除层级尺寸观察。 */ () => { hierarchyResizeObserver?.disconnect() })
</script>

<style scoped>
.sidebar-container { position: relative; height: 100%; flex-shrink: 0; display: flex; contain: layout paint; background: var(--surface-1); z-index: 130; }.sidebar-container.left{border-right:1px solid var(--border-subtle)}.sidebar-container.right{border-left:1px solid var(--border-subtle)}
.scene-sidebar { min-width: 0; flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.scene-manager { flex: 0 0 auto; border-bottom: 1px solid var(--border-subtle); }
.list-header, .hierarchy-header > div { height: 35px; padding: 0 10px; display: flex; align-items: center; justify-content: space-between; color: var(--text-muted); font-size:11px; font-weight: 700; letter-spacing: .09em; text-transform: uppercase; }
.list-header small, .hierarchy-header small { padding: 2px 6px; border-radius: 99px; background: var(--surface-3); font-size:11px; }.hierarchy-actions{display:flex;align-items:center;gap:4px}.hierarchy-actions button{width:23px;height:23px;padding:0;border:1px solid var(--border-subtle);border-radius:6px;color:var(--accent);background:var(--surface-2)}
.header-actions { display: flex; gap: 3px; }.header-actions button, .load-toggle { width: 24px; height: 24px; padding: 0; border: 0; border-radius: 7px; color: var(--text-muted); background: transparent; }.header-actions button:hover, .load-toggle:hover { color: var(--accent); background: var(--surface-hover); }
.scene-list { max-height: 110px; padding: 4px 6px; overflow: auto; }.scene-item { display: flex; align-items: center; border-radius: 7px; }.scene-item:hover { background: var(--surface-hover); }.scene-item.active { background: var(--accent-soft); }.scene-item.unloaded { opacity: .52; }
.scene-main { min-width: 0; height: 28px; padding: 0 7px; flex: 1; display: flex; align-items: center; gap: 7px; color: var(--text-secondary); font-size: 11px; }.scene-main i { width: 7px; height: 7px; flex: 0 0 7px; border: 1px solid var(--accent); border-radius: 50%; }.scene-item.active .scene-main i { background: var(--accent); box-shadow: 0 0 6px var(--accent); }.scene-main span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.scene-main input { width: 100%; min-height: 24px; }
.hierarchy-header { flex: 0 0 auto; padding-bottom: 7px; border-bottom: 1px solid var(--border-subtle); }.search { height: 29px; margin: 0 7px; padding: 0 7px; display: flex; align-items: center; gap: 5px; border: 1px solid var(--border-subtle); border-radius: 8px; background: var(--input-bg); }.search span { color: var(--text-muted); }.search input { min-width: 0; width: 100%; min-height: 25px; padding: 0; border: 0; background: transparent; font-size:11px; }.search input:focus-visible { outline: 0; }
.hierarchy-header>.hierarchy-filters{height:auto;margin:5px 7px 0;padding:0;display:grid;grid-template-columns:minmax(0,1fr) 29px 29px;gap:4px;align-items:stretch;justify-content:normal;font-weight:400;letter-spacing:normal;text-transform:none}.hierarchy-filters select{min-width:0;min-height:27px}.hierarchy-filters .hierarchy-filter-wide{grid-column:1/-1}.hierarchy-filters button{width:29px;border:1px solid var(--border-subtle);border-radius:7px;color:var(--text-muted);background:var(--surface-2)}.hierarchy-filters button.active{color:var(--accent);border-color:var(--accent);background:var(--accent-soft)}.breadcrumbs{min-height:30px;padding:4px 7px;display:flex;overflow:auto;border-bottom:1px solid var(--border-subtle)}.breadcrumbs button{padding:0 3px;white-space:nowrap;border:0;color:var(--text-muted);background:transparent;font-size:11px}.breadcrumbs button:last-child{color:var(--text-primary)}
.entity-list { min-height: 0; flex: 1; padding: 0 5px; overflow: auto; }.entity-item { position: relative; height: 29px; display: flex; align-items: center; gap: 4px; border: 1px solid transparent; border-radius: 7px; color: var(--text-secondary); font-size:11px; }.entity-item:hover { background: var(--surface-hover); }.entity-item.search-match:not(.selected){background:color-mix(in srgb,var(--warning) 10%,transparent)}.entity-item.selected { background: var(--accent-soft); }.entity-item.primary { border-color: color-mix(in srgb, var(--accent) 42%, transparent); }.entity-item.disabled { opacity: .5; }.entity-item.hidden .name { text-decoration: line-through; opacity: .6; }.entity-item.locked .shape-icon { color: var(--warning); }.entity-item.drop-target { border-color: var(--accent); box-shadow: inset 0 0 0 1px var(--accent); }
.disclosure, .state-button { width: 19px; height: 22px; padding: 0; flex: 0 0 19px; display: grid; place-items: center; border: 0; border-radius: 5px; color: var(--text-muted); background: transparent; font-size:11px; }.disclosure:hover, .state-button:hover { color: var(--accent); background: var(--surface-3); }.disclosure.placeholder { pointer-events: none; }.shape-icon { width: 15px; flex: 0 0 15px; color: var(--accent); text-align: center; }.name { min-width: 0; flex: 1; display: flex; align-items: center; gap: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.name mark{padding:0;color:inherit;background:color-mix(in srgb,var(--warning) 28%,transparent)}.name small { color: var(--text-muted); font-size:11px; }.edit-input { min-width: 0; height: 23px; min-height: 23px; flex: 1; padding: 2px 5px; }.state-button { opacity: .25; }.state-button.pin.active,.entity-item.pinned .pin{color:var(--accent);opacity:1}.entity-item:hover .state-button, .entity-item.selected .state-button, .entity-item.hidden .state-button, .entity-item.locked .state-button, .entity-item.disabled .power { opacity: .9; }.power { color: var(--success); }
.status-mark{width:16px;height:16px;display:grid;place-items:center;border-radius:4px;color:var(--accent);background:var(--accent-soft);font-size:11px;font-weight:800}.status-mark.scene{color:var(--success)}.status-mark.override{color:var(--warning);background:transparent}
.empty-state { padding: 18px 8px; color: var(--text-muted); font-size:11px; text-align: center; }.root-drop { width: calc(100% - 8px); min-height: 31px; margin: 6px 4px; border: 1px dashed var(--accent); border-radius: 8px; color: var(--accent); background: var(--accent-soft); font-size:11px; }
.resize-handle { position: absolute; inset: 0 0 0 auto; width: 8px; cursor: ew-resize; z-index: 4; }.right .resize-handle{inset:0 auto 0 0}.expand { position: absolute; left: 0; top: 48%; z-index: 5; width: 20px; height: 54px; border: 1px solid var(--border-subtle); border-left: 0; border-radius: 0 9px 9px 0; color: var(--accent); background: var(--surface-1); }.right .expand{left:auto;right:0;transform:scaleX(-1)}
</style>
