/** 二维场景编辑工具：创建常用对象，处理对齐、分布、镜像、分组及视口辅助信息。 */
import { reactive } from 'vue'
import { editorState } from '../store/editor'
import { physicsState, pushHistory, selectEntities } from '../store/physics'
import { Animator, AudioSource, Camera2D, Light2D, NavigationRegion2D, Script2D, SpriteRenderer2D, TextRenderer2D } from '../world/components'
import type { Entity, AuthoringObjectKind } from '../world/Entity'
import { syncMassFromDensity } from '../world/geometry'
import { setParent, setWorldTransform, worldTransform } from '../world/hierarchy'
import type { Vec2 } from '../world/types'
import { applyRotation, captureTransforms } from './gizmo'
import { selectionCenter, selectionRoots } from './selection'

export type AuthoringCategory = 'Core' | '2D' | 'Physics' | 'UI' | 'Audio' | 'Camera' | 'Navigation' | 'Script' | 'Packages'
export interface AuthoringObjectDescriptor {
  kind: AuthoringObjectKind
  label: string
  category: AuthoringCategory
  glyph: string
  summary: string
  required: string[]
  compatibility: 'Stable' | 'Experimental' | 'Package'
}

export const AUTHORING_OBJECTS: readonly AuthoringObjectDescriptor[] = [
  { kind: 'Empty', label: 'Empty Object', category: 'Core', glyph: '◇', summary: 'Hierarchy and transform host.', required: ['Transform2D'], compatibility: 'Stable' },
  { kind: 'Sprite', label: 'Sprite', category: '2D', glyph: '▧', summary: 'Imported image rendered in world space.', required: ['SpriteRenderer2D'], compatibility: 'Stable' },
  { kind: 'AnimatedSprite', label: 'Animated Sprite', category: '2D', glyph: '▶', summary: 'Sprite with an animation controller.', required: ['SpriteRenderer2D', 'Animator'], compatibility: 'Stable' },
  { kind: 'WorldText', label: 'Text', category: '2D', glyph: 'T', summary: 'Resolution-independent world text.', required: ['TextRenderer2D'], compatibility: 'Stable' },
  { kind: 'Polygon', label: 'Polygon', category: '2D', glyph: '⬡', summary: 'Editable filled polygon.', required: ['ShapeRenderer2D'], compatibility: 'Stable' },
  { kind: 'Line', label: 'Line', category: '2D', glyph: '╱', summary: 'Editable open polyline.', required: ['ShapeRenderer2D'], compatibility: 'Stable' },
  { kind: 'Path', label: 'Path', category: '2D', glyph: '⌁', summary: 'Smoothed authoring path with point handles.', required: ['ShapeRenderer2D'], compatibility: 'Stable' },
  { kind: 'Rectangle', label: 'Rectangle', category: '2D', glyph: '□', summary: 'Basic rectangular shape.', required: ['ShapeRenderer2D'], compatibility: 'Stable' },
  { kind: 'Circle', label: 'Circle', category: '2D', glyph: '○', summary: 'Basic elliptical shape.', required: ['ShapeRenderer2D'], compatibility: 'Stable' },
  { kind: 'Triangle', label: 'Triangle', category: '2D', glyph: '△', summary: 'Basic triangular shape.', required: ['ShapeRenderer2D'], compatibility: 'Stable' },
  { kind: 'Collider', label: 'Collider Body', category: 'Physics', glyph: '◎', summary: 'Visible authoring body with collider.', required: ['RigidBody2D', 'BoxCollider2D'], compatibility: 'Stable' },
  { kind: 'CanvasLayer', label: 'Canvas Layer', category: 'UI', glyph: '▣', summary: 'Camera-aware 2D composition layer.', required: ['Transform2D'], compatibility: 'Stable' },
  { kind: 'ParallaxLayer', label: 'Parallax Layer', category: '2D', glyph: '≋', summary: 'Layer with configurable camera motion scale.', required: ['Transform2D'], compatibility: 'Stable' },
  { kind: 'Camera', label: 'Camera', category: 'Camera', glyph: '▰', summary: 'Orthographic game camera.', required: ['Camera2D'], compatibility: 'Stable' },
  { kind: 'AudioEmitter', label: 'Audio Emitter', category: 'Audio', glyph: '♪', summary: 'Spatial or non-spatial audio source.', required: ['AudioSource'], compatibility: 'Stable' },
  { kind: 'Light', label: '2D Light', category: '2D', glyph: '✦', summary: 'Layer-masked 2D light.', required: ['Light2D'], compatibility: 'Stable' },
  { kind: 'NavigationRegion', label: 'Navigation Region', category: 'Navigation', glyph: '⌗', summary: 'Optional walkable navigation region.', required: ['NavigationRegion2D'], compatibility: 'Experimental' },
  { kind: 'ScriptHost', label: 'Script Object', category: 'Script', glyph: '{}', summary: 'Transform host for a Rhai script.', required: ['Script2D'], compatibility: 'Stable' },
  { kind: 'PackageObject', label: 'Package Object', category: 'Packages', glyph: '⬢', summary: 'Placeholder populated by compatible packages.', required: [], compatibility: 'Package' }
] as const

const STORAGE_KEY = 'nova-a-authoring-palette-v1'
interface SavedHierarchyFilter { id: string; name: string; query: string; tagFilter: string; selectionFilter: 'All' | 'Visible' | 'Unlocked' | 'Sprites' | 'Cameras' | 'Physics' }
/** 读取对象收藏、最近使用、固定实体及层级筛选偏好，校验结构和数量，失败时返回空偏好。 */ function loadPreferences(): { favorites: AuthoringObjectKind[]; recent: AuthoringObjectKind[]; pinnedEntityUuids: string[]; savedFilters: SavedHierarchyFilter[] } {
  try {
    if (typeof localStorage === 'undefined') return { favorites: [], recent: [], pinnedEntityUuids: [], savedFilters: [] }
    const source = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as { favorites?: unknown; recent?: unknown; pinnedEntityUuids?: unknown; savedFilters?: unknown }
    const known = new Set(AUTHORING_OBJECTS.map(/* 返回 item.kind 的当前值。 */ item => item.kind))
    const clean = /** 保留已登记的对象类型并限制十二项，非法输入返回空列表。 */ (value: unknown) => Array.isArray(value) ? value.filter(/* 先计算 typeof item === 'string'；仅当其为真值时求右侧 known.has(item as AuthoringObjectKind)，返回短路求值结果。 */ (item): item is AuthoringObjectKind => typeof item === 'string' && known.has(item as AuthoringObjectKind)).slice(0, 12) : []
    const pinnedEntityUuids = Array.isArray(source.pinnedEntityUuids) ? source.pinnedEntityUuids.filter(/* 比较 typeof item 与 'string'，返回严格相等的判断结果。 */ (item): item is string => typeof item === 'string').slice(0, 500) : []
    const savedFilters = Array.isArray(source.savedFilters) ? source.savedFilters.flatMap(/** 校验筛选预设的标识和文本字段，限制长度并为未知选择范围恢复 All。 */ (raw): SavedHierarchyFilter[] => { if (!raw || typeof raw !== 'object') return []; const filter = raw as Partial<SavedHierarchyFilter>; if (typeof filter.id !== 'string' || typeof filter.name !== 'string' || typeof filter.query !== 'string') return []; const selectionFilter = ['All', 'Visible', 'Unlocked', 'Sprites', 'Cameras', 'Physics'].includes(String(filter.selectionFilter)) ? filter.selectionFilter as SavedHierarchyFilter['selectionFilter'] : 'All'; return [{ id: filter.id, name: filter.name.slice(0, 80), query: filter.query.slice(0, 200), tagFilter: typeof filter.tagFilter === 'string' ? filter.tagFilter.slice(0, 80) : '', selectionFilter }] }).slice(0, 30) : []
    return { favorites: clean(source.favorites), recent: clean(source.recent), pinnedEntityUuids, savedFilters }
  } catch { return { favorites: [], recent: [], pinnedEntityUuids: [], savedFilters: [] } }
}
const loaded = loadPreferences()
export const authoringState = reactive({
  favorites: loaded.favorites,
  recent: loaded.recent,
  pinnedEntityUuids: loaded.pinnedEntityUuids,
  savedFilters: loaded.savedFilters,
  category: 'All' as AuthoringCategory | 'All',
  query: '',
  snap: { grid: true, pixel: false, vertex: true, edge: true, center: true, object: true, angle: true },
  cameraOverlay: '16:9' as 'Off' | '16:9' | '16:10' | '4:3' | '9:16' | 'Custom',
  cameraResolution: { width: 1920, height: 1080 },
  measurement: { active: false, start: null as Vec2 | null, end: null as Vec2 | null },
  rulersVisible: true,
  guidesVisible: true,
  guidesLocked: false,
  guides: { horizontal: [] as number[], vertical: [] as number[] },
  isolateActive: false,
  isolatedVisibility: new Map<number, boolean>(),
  performanceMode: false,
  selectionFilter: 'All' as 'All' | 'Visible' | 'Unlocked' | 'Sprites' | 'Cameras' | 'Physics',
  tagFilter: '',
  viewportRequest: null as null | { id: number; action: 'frame' | 'focus-camera' },
  nextRequestId: 1
})

/** 保存二维作者面板偏好，存储失败不影响内存中的编辑状态。 */ function persistPreferences(): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ favorites: authoringState.favorites, recent: authoringState.recent, pinnedEntityUuids: authoringState.pinnedEntityUuids, savedFilters: authoringState.savedFilters })) } catch { /* Optional editor preference. */ }
}
/** 切换对象类型收藏并置顶新收藏，限制十二项后保存。 */ export function toggleAuthoringFavorite(kind: AuthoringObjectKind): void {
  const index = authoringState.favorites.indexOf(kind)
  if (index >= 0) authoringState.favorites.splice(index, 1)
  else authoringState.favorites.unshift(kind)
  authoringState.favorites.splice(12); persistPreferences()
}
/** 将对象类型移至最近使用列表首位，限制八项并持久化。 */ function markRecent(kind: AuthoringObjectKind): void {
  const index = authoringState.recent.indexOf(kind)
  if (index >= 0) authoringState.recent.splice(index, 1)
  authoringState.recent.unshift(kind); authoringState.recent.splice(8); persistPreferences()
}

/** 移除实体刚体及当前选定的碰撞器组件。 */ function removePhysics(entity: Entity): void {
  entity.removeComponent('RigidBody2D')
  const collider = entity.getCollider()
  if (collider) entity.removeComponent(collider.kind)
}
/** 移除基础形状渲染器，并清理默认物理组件。 */ function removeShape(entity: Entity): void { entity.removeComponent('ShapeRenderer2D'); removePhysics(entity) }
/** 按层编号计算确定性的色相，再以余弦通道生成对象默认颜色。 */ function layerColor(layer: number): { r: number; g: number; b: number } {
  const hue = ((Math.max(1, layer) - 1) * 67 + 198) % 360
  const channel = /* 调用 Math.round(128 + 105 * Math.cos((hue + offset) * Math.PI / 180)) 并返回调用结果。 */ (offset: number) => Math.round(128 + 105 * Math.cos((hue + offset) * Math.PI / 180))
  return { r: channel(0), g: channel(-120), b: channel(120) }
}

/** 按对象种类组合默认组件和作者元信息，应用活动层及唯一化名称，更新最近使用和选择并按需记录历史。 */ export function createAuthoringObject(kind: AuthoringObjectKind, position: Vec2 = { x: 0, y: 0 }, recordHistory = true): Entity {
  const world = physicsState.world
  let entity = kind === 'Circle' ? world.addCircle(position, 1, 1) : kind === 'Triangle' ? world.addTriangle(position, { x: 2, y: 2 }) : world.addBox(position, { x: 2, y: 2 })
  entity.authoring.kind = kind
  entity.authoring.renderLayer = editorState.activeLayer
  entity.layer = editorState.activeLayer
  entity.color = layerColor(entity.layer)
  entity.name = AUTHORING_OBJECTS.find(/* 比较 item.kind 与 kind，返回严格相等的判断结果。 */ item => item.kind === kind)?.label ?? kind

  if (kind === 'Empty' || kind === 'CanvasLayer' || kind === 'ParallaxLayer' || kind === 'Camera' || kind === 'AudioEmitter' || kind === 'ScriptHost' || kind === 'PackageObject' || kind === 'NavigationRegion' || kind === 'Light') removeShape(entity)
  if (kind === 'Sprite' || kind === 'AnimatedSprite') {
    removeShape(entity)
    const sprite = entity.addComponent(new SpriteRenderer2D()); sprite.sortingLayer = entity.layer
    entity.authoring.origin = { ...sprite.pivot }
    if (kind === 'AnimatedSprite') entity.addComponent(new Animator())
  } else if (kind === 'WorldText') {
    removeShape(entity)
    const text = entity.addComponent(new TextRenderer2D()); text.sortingLayer = entity.layer; text.text = 'Text'; text.fontSize = 1
  } else if (kind === 'Polygon') {
    entity.renderer.shape = 'Polygon'; entity.renderer.vertices = Array.from({ length: 6 }, /** 构造并返回记录 { x: Math.cos(index * Math.PI / 3), y: Math.sin(index * Math.PI / 3) }，字段按当前实参及捕获状态求值。 */ (_, index) => ({ x: Math.cos(index * Math.PI / 3), y: Math.sin(index * Math.PI / 3) })); removePhysics(entity)
  } else if (kind === 'Line' || kind === 'Path') {
    entity.renderer.shape = 'Line'; entity.renderer.vertices = [{ x: -1, y: 0 }, { x: 0, y: kind === 'Path' ? .7 : 0 }, { x: 1, y: 0 }]
    entity.renderer.opacity = 0; entity.renderer.strokeWidth = .08; removePhysics(entity)
    entity.authoring.path.points = entity.renderer.vertices.map(/** 构造并返回记录 { ...point }，字段按当前实参及捕获状态求值。 */ point => ({ ...point }))
    entity.authoring.path.smoothing = kind === 'Path' ? .65 : 0
  } else if (kind === 'Camera') entity.addComponent(new Camera2D())
  else if (kind === 'AudioEmitter') entity.addComponent(new AudioSource())
  else if (kind === 'ScriptHost') entity.addComponent(new Script2D())
  else if (kind === 'Light') entity.addComponent(new Light2D())
  else if (kind === 'NavigationRegion') entity.addComponent(new NavigationRegion2D())
  else if (kind === 'CanvasLayer') entity.authoring.canvasLayer = { screenSpace: false, followCamera: true }
  else if (kind === 'ParallaxLayer') entity.authoring.parallax = { motionScale: { x: .5, y: .5 }, repeat: { x: 0, y: 0 }, mirror: false, depth: 0 }
  else if (kind === 'Collider') { entity.renderer.opacity = 12; entity.rigidBody.bodyType = 'Static'; syncMassFromDensity(entity) }

  const duplicates = world.entities.filter(/* 先计算 candidate !== entity；仅当其为真值时求右侧 (candidate.name === entity.name || candidate.name.startsWith(`${entity.name} `))，返回短路求值结果。 */ candidate => candidate !== entity && (candidate.name === entity.name || candidate.name.startsWith(`${entity.name} `))).length
  if (duplicates) entity.name = `${entity.name} ${duplicates + 1}`

  markRecent(kind)
  selectEntities([entity.id], 'replace', entity.id)
  if (recordHistory) pushHistory(`Create ${entity.name}`)
  return entity
}

/** 返回选择集合中未被祖先重复包含且未锁定的根实体。 */ function editableSelection(): Entity[] { return selectionRoots(physicsState.selectedEntityIds, physicsState.world.entities).filter(/* 返回 entity.editorLocked 的逻辑取反结果。 */ entity => !entity.editorLocked) }
/** 按选中根实体的世界原点范围计算对齐坐标，保持另一轴位置并记录历史。 */ export function alignSelection(axis: 'left' | 'center-x' | 'right' | 'bottom' | 'center-y' | 'top'): boolean {
  const entities = editableSelection(); if (entities.length < 2) return false
  const transforms = entities.map(/** 构造并返回记录 { entity, transform: worldTransform(entity, physicsState.world.entities) }，字段按当前实参及捕获状态求值。 */ entity => ({ entity, transform: worldTransform(entity, physicsState.world.entities) }))
  const xs = transforms.map(/* 返回 item.transform.position.x 的当前值。 */ item => item.transform.position.x), ys = transforms.map(/* 返回 item.transform.position.y 的当前值。 */ item => item.transform.position.y)
  const target = axis === 'left' ? Math.min(...xs) : axis === 'right' ? Math.max(...xs) : axis === 'bottom' ? Math.min(...ys) : axis === 'top' ? Math.max(...ys) : axis === 'center-x' ? (Math.min(...xs) + Math.max(...xs)) / 2 : (Math.min(...ys) + Math.max(...ys)) / 2
  for (const item of transforms) setWorldTransform(item.entity, { ...item.transform, position: { x: axis.includes('x') || axis === 'left' || axis === 'right' ? target : item.transform.position.x, y: axis.includes('y') || axis === 'bottom' || axis === 'top' ? target : item.transform.position.y } }, physicsState.world.entities)
  pushHistory('Align entities'); return true
}
/** 按选定轴排序至少三个根实体，在首尾世界原点间均匀分布并记录历史。 */ export function distributeSelection(axis: 'x' | 'y'): boolean {
  const entities = editableSelection(); if (entities.length < 3) return false
  const ordered = entities.map(/** 构造并返回记录 { entity, transform: worldTransform(entity, physicsState.world.entities) }，字段按当前实参及捕获状态求值。 */ entity => ({ entity, transform: worldTransform(entity, physicsState.world.entities) })).sort(/* 计算表达式 a.transform.position[axis] - b.transform.position[axis] 并返回结果，沿用操作数的原有类型规则。 */ (a, b) => a.transform.position[axis] - b.transform.position[axis])
  const start = ordered[0].transform.position[axis], end = ordered[ordered.length - 1].transform.position[axis]
  ordered.forEach(/** 按实体排序位置计算等间距世界坐标，保留其余变换并同步层级局部值。 */ (item, index) => setWorldTransform(item.entity, { ...item.transform, position: { ...item.transform.position, [axis]: start + (end - start) * index / (ordered.length - 1) } }, physicsState.world.entities))
  pushHistory('Distribute entities'); return true
}
/** 围绕选择中心反射实体位置，同时切换精灵翻转或反射形状局部顶点，并记录历史。 */ export function mirrorSelection(axis: 'x' | 'y'): boolean {
  const entities = editableSelection(); if (!entities.length) return false
  const center = selectionCenter(entities.map(/* 返回 entity.id 的当前值。 */ entity => entity.id), physicsState.world.entities)
  for (const entity of entities) {
    const transform = worldTransform(entity, physicsState.world.entities)
    setWorldTransform(entity, { ...transform, position: { x: axis === 'x' ? center.x - (transform.position.x - center.x) : transform.position.x, y: axis === 'y' ? center.y - (transform.position.y - center.y) : transform.position.y } }, physicsState.world.entities)
    if (entity.spriteRenderer) { if (axis === 'x') entity.spriteRenderer.flipX = !entity.spriteRenderer.flipX; else entity.spriteRenderer.flipY = !entity.spriteRenderer.flipY }
    else if (entity.renderer.vertices.length) entity.renderer.vertices = entity.renderer.vertices.map(/** 构造并返回记录 { x: axis === 'x' ? -point.x : point.x, y: axis === 'y' ? -point.y : point.y }，字段按当前实参及捕获状态求值。 */ point => ({ x: axis === 'x' ? -point.x : point.x, y: axis === 'y' ? -point.y : point.y }))
  }
  pushHistory('Mirror entities'); return true
}
/** 捕获选择根实体变换，围绕选择中心旋转正负九十度并记录历史。 */ export function rotateSelection90(clockwise = true): boolean {
  const entities = editableSelection(); if (!entities.length) return false
  const ids = entities.map(/* 返回 entity.id 的当前值。 */ entity => entity.id), pivot = selectionCenter(ids, physicsState.world.entities)
  applyRotation(captureTransforms(ids, physicsState.world.entities), pivot, clockwise ? -Math.PI / 2 : Math.PI / 2, physicsState.world.entities)
  pushHistory('Rotate entities 90 degrees'); return true
}
/** 在选择中心创建空分组，保持世界姿态重设所选根实体父级并记录为一次历史修改。 */ export function groupSelection(): Entity | null {
  const roots = editableSelection(); if (!roots.length) return null
  const group = createAuthoringObject('Empty', selectionCenter(roots.map(/* 返回 entity.id 的当前值。 */ entity => entity.id), physicsState.world.entities), false); group.name = 'Group'
  for (const entity of roots) if (entity !== group) setParent(entity, group.uuid, physicsState.world.entities, true)
  selectEntities([group.id], 'replace', group.id); pushHistory('Group entities'); return group
}
/** 首次隔离时保存可见性并只显示所选实体，再次调用时恢复保存的可见性。 */ export function toggleIsolateSelection(): void {
  if (!authoringState.isolateActive) {
    const selected = new Set(physicsState.selectedEntityIds)
    authoringState.isolatedVisibility.clear()
    for (const entity of physicsState.world.entities) { authoringState.isolatedVisibility.set(entity.id, entity.editorVisible); entity.editorVisible = selected.has(entity.id) }
    authoringState.isolateActive = true
  } else {
    for (const entity of physicsState.world.entities) entity.editorVisible = authoringState.isolatedVisibility.get(entity.id) ?? entity.editorVisible
    authoringState.isolatedVisibility.clear(); authoringState.isolateActive = false
  }
}
/** 将 { id: authoringState.nextRequestId++, action } 赋给 authoringState.viewportRequest，不显式返回值。 */ export function requestViewport(action: 'frame' | 'focus-camera'): void { authoringState.viewportRequest = { id: authoringState.nextRequestId++, action } }

/** 参考线未锁定时接受有限坐标，按六位小数去重并排序后返回成功。 */ export function addViewportGuide(axis: 'horizontal' | 'vertical', value: number): boolean {
  if (!Number.isFinite(value) || authoringState.guidesLocked) return false
  const guides = authoringState.guides[axis]
  const normalized = Math.round(value * 1_000_000) / 1_000_000
  if (!guides.includes(normalized)) guides.push(normalized)
  guides.sort(/* 计算表达式 left - right 并返回结果，沿用操作数的原有类型规则。 */ (left, right) => left - right)
  return true
}

/** 参考线未锁定时清空水平和垂直参考线列表。 */ export function clearViewportGuides(): void {
  if (authoringState.guidesLocked) return
  authoringState.guides.horizontal.splice(0)
  authoringState.guides.vertical.splice(0)
}
/** 切换实体在层级固定列表中的状态，限制五百项并保存。 */ export function toggleHierarchyPin(uuid: string): void { const index = authoringState.pinnedEntityUuids.indexOf(uuid); if (index >= 0) authoringState.pinnedEntityUuids.splice(index, 1); else authoringState.pinnedEntityUuids.unshift(uuid); authoringState.pinnedEntityUuids.splice(500); persistPreferences() }
/** 保存当前查询、标签及选择范围为具唯一标识的筛选预设，限制三十项并持久化。 */ export function saveHierarchyFilter(name: string, query: string): string { const id = crypto.randomUUID(); authoringState.savedFilters.unshift({ id, name: name.trim().slice(0, 80) || query.trim().slice(0, 80) || authoringState.tagFilter || 'Filter', query: query.slice(0, 200), tagFilter: authoringState.tagFilter.slice(0, 80), selectionFilter: authoringState.selectionFilter }); authoringState.savedFilters.splice(30); persistPreferences(); return id }
/** 删除指定标识的已保存层级筛选，存在时保存并返回成功。 */ export function removeHierarchyFilter(id: string): boolean { const index = authoringState.savedFilters.findIndex(/* 比较 filter.id 与 id，返回严格相等的判断结果。 */ filter => filter.id === id); if (index < 0) return false; authoringState.savedFilters.splice(index, 1); persistPreferences(); return true }
