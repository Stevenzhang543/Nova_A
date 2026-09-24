<!-- 物理连接编辑器：创建、选择和配置实体之间的连接。 -->
<template>
  <Teleport to="body">
    <div class="modal-scrim" @mousedown.self="emit('close')">
      <section class="builder" @focusin="form17.focus" @change="form17.change" role="dialog" aria-modal="true" v-modal-focus :aria-label="t('connectionBuilder')">
      <header>
        <div>
          <span class="eyebrow">{{ t('connections') }}</span>
          <h2>{{ t('connectionBuilder') }}</h2>
        </div>
        <div class="step-indicator" aria-hidden="true">
          <i :class="{ active: stage === 'objects' }">1</i>
          <span></span>
          <i :class="{ active: stage === 'path' }">2</i>
          <span></span>
          <i :class="{ active: stage === 'simulation' }">3</i>
        </div>
        <button class="icon-button" :aria-label="t('cancel')" @click="emit('close')">×</button>
      </header>

      <div class="builder-body">
        <p v-if="form17.error.value" class="form-error17" role="alert">{{ form17.error.value }}</p>
        <Transition name="step" mode="out-in">
          <section v-if="stage === 'objects'" key="objects" class="wizard-step">
            <div class="step-copy">
              <span class="step-number">01</span>
              <div><h3>{{ t('chooseObjects') }}</h3><p>{{ t('chooseExactlyTwo') }}</p></div>
            </div>
            <div class="chosen-object fixed">
              <span class="shape">{{ shapeGlyph(selectedEntity?.shapeType) }}</span>
              <span><small>{{ t('selectedObject') }}</small><strong>{{ entityName(props.selectedId) }}</strong></span>
              <i>✓</i>
            </div>
            <div class="object-picker">
              <button v-for="entity in availableEntities" :key="entity.id" :class="{ selected: partnerId === entity.id }" @click="selectPartner(entity.id)">
                <span class="shape">{{ shapeGlyph(entity.shapeType) }}</span>
                <span><strong>{{ entity.name }}_{{ entity.id }}</strong><small>{{ t(entity.shapeType === 'Circle' ? 'ellipse' : entity.shapeType === 'Triangle' ? 'triangle' : 'rectangle') }}</small></span>
                <i>{{ partnerId === entity.id ? '✓' : '＋' }}</i>
              </button>
            </div>
            <p v-if="availableEntities.length === 0" class="empty-state">{{ t('noConnectionCandidates') }}</p>
          </section>

          <section v-else-if="stage === 'path'" key="path" class="wizard-step">
            <div class="step-copy">
              <span class="step-number">02</span>
              <div><h3>{{ t('choosePath') }}</h3><p>{{ t('choosePathDescription') }}</p></div>
            </div>
            <div class="pair-summary">
              <span>{{ entityName(props.selectedId) }}</span><i>↔</i><span>{{ partnerId === null ? '—' : entityName(partnerId) }}</span>
            </div>
            <div v-if="overlapping" class="overlap-notice"><span>⌁</span><div><strong>{{ t('objectsOverlap') }}</strong><small>{{ t('bindAvailable') }}</small></div></div>
            <div class="path-picker">
              <button @click="choosePath('straight')"><span class="path-preview straight-preview"></span><strong>{{ t('straight') }}</strong><small>{{ t('straightDescription') }}</small></button>
              <button @click="choosePath('manual')"><span class="path-preview manual-preview"></span><strong>{{ t('manual') }}</strong><small>{{ t('manualDescription') }}</small></button>
              <button v-if="overlapping" class="bind-option" @click="saveBinding"><span class="path-preview bind-preview">◎</span><strong>{{ t('bind') }}</strong><small>{{ t('bindDescription') }}</small></button>
            </div>
          </section>

          <section v-else key="simulation" class="wizard-step simulation-step">
            <div class="step-copy compact-copy">
              <span class="step-number">03</span>
              <div><h3>{{ t('connectionPreview') }}</h3><p>{{ t(selectedStyle === 'manual' ? 'drawManualHint' : 'drawStraightHint') }}</p></div>
              <label class="center-toggle"><input v-model="displayCenters" type="checkbox"><span>{{ t('displayCenter') }}</span></label>
            </div>
            <div class="preview-shell" :class="{ complete: drawingComplete }">
              <canvas ref="previewCanvas" @pointerdown="onPreviewPointerDown" @pointermove="onPreviewPointerMove" @pointerup="onPreviewPointerUp" @pointercancel="cancelPreviewDrawing"></canvas>
              <div v-if="!drawingComplete && !isDrawing" class="preview-instruction"><span>⌁</span>{{ t('startOnObject') }}</div>
              <div v-if="drawingComplete" class="preview-success"><span>✓</span>{{ t('connectionReady') }}</div>
            </div>
            <div class="preview-footer">
              <p :class="{ error: drawMessage }">{{ drawMessage || t('anchorHint') }}</p>
              <button v-if="drawingComplete" class="redraw-button" @click="clearDrawing">↻ {{ t('redraw') }}</button>
            </div>
            <details v-if="drawingComplete" class="advanced-physics">
              <summary>{{ t('connectionPhysics') }}</summary>
              <p class="rope-units17">{{ simulationLabel17('ropeUnits') }}</p>
              <div class="physics-grid">
                <label class="collision-toggle"><span><strong>{{ t('stringCollisions') }}</strong><small>{{ t('stringCollisionsDescription') }}</small></span><input v-model="collisionEnabled" type="checkbox"></label>
                <label v-if="collisionEnabled"><span>{{ t('stringRadius') }}</span><NumericExpressionInput v-model="collisionRadius" :resource-key="'connection-draft:' + (props.connectionId ?? 'new') + ':collisionRadius'" :minimum="0.000001" :maximum="1000000" :step="0.01" /></label>
                <label v-if="collisionEnabled"><span>{{ t('stringDensity') }}</span><NumericExpressionInput v-model="linearDensity" :resource-key="'connection-draft:' + (props.connectionId ?? 'new') + ':linearDensity'" :minimum="0.000001" :maximum="1e50" :step="0.01" /></label>
                <label><span>{{ t('ropeSegments') }}</span><NumericExpressionInput v-model="segmentCount" :resource-key="'connection-draft:' + (props.connectionId ?? 'new') + ':segmentCount'" :minimum="3" :maximum="32" :step="1" /></label>
                <label><span>{{ t('collideConnected') }}</span><input v-model="collideConnected" type="checkbox"></label>
                <label><span>{{ t('stretchable') }}</span><input v-model="stretchable" type="checkbox"></label>
                <label><span>{{ t('bendable') }}</span><input v-model="bendable" type="checkbox"></label>
                <label><span>{{ t('stiffness') }}</span><NumericExpressionInput v-model="stiffness" :resource-key="'connection-draft:' + (props.connectionId ?? 'new') + ':stiffness'" :minimum="0" :maximum="1000000000000" :step="1" /></label>
                <label><span>{{ t('connectionDamping') }}</span><NumericExpressionInput v-model="connectionDamping" :resource-key="'connection-draft:' + (props.connectionId ?? 'new') + ':connectionDamping'" :minimum="0" :maximum="1000000000" :step="0.1" /></label>
                <label><span>{{ t('maxStretch') }}</span><NumericExpressionInput v-model="maxStretchPercent" :resource-key="'connection-draft:' + (props.connectionId ?? 'new') + ':maxStretchPercent'" :minimum="0" :maximum="99900" :step="1" /></label>
                <label><span>{{ t('bendTolerance') }}</span><NumericExpressionInput v-model="bendingToleranceMass" :resource-key="'connection-draft:' + (props.connectionId ?? 'new') + ':bendingToleranceMass'" :minimum="0" :maximum="1e50" :step="0.1" /></label>
                <label><span>{{ t('stretchTolerance') }}</span><NumericExpressionInput v-model="stretchingToleranceMass" :resource-key="'connection-draft:' + (props.connectionId ?? 'new') + ':stretchingToleranceMass'" :minimum="0" :maximum="1e50" :step="0.1" /></label>
              </div>
              <p v-if="segmentCount >= 28 || (collisionEnabled && segmentCount >= 20)" class="rope-warning">{{ t('ropePerformanceWarning') }}</p>
            </details>
          </section>
        </Transition>
      </div>

      <footer>
        <button class="secondary" @click="emit('close')">{{ t('cancel') }}</button>
        <button v-if="stage !== 'objects'" class="secondary" @click="goBack">← {{ t('back') }}</button>
        <button v-if="stage === 'simulation'" class="primary" :disabled="!drawingComplete" @click="saveConnection">{{ t(props.connectionId === null ? 'createConnection' : 'saveConnection') }}</button>
      </footer>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import NumericExpressionInput from './NumericExpressionInput.vue'
import { settleEditorDrafts } from '../editor/pendingDrafts'
import { useSimulationFormGuard17 } from '../editor/simulationForm17'
import { simulationLabel17 } from '../editor/simulationLabels17'
import { vModalFocus } from '../editor/modalFocus'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { t } from '../i18n'
import { editorState } from '../store/editor'
import { physicsState, pushHistory } from '../store/physics'
import type { Entity } from '../world/Entity'
import type { Vec2 } from '../world/types'
import {
  anchorAtWorldPoint,
  configureBinding,
  createConnection as createConnectionModel,
  deriveAnchor,
  entitiesOverlap,
  entityBoundaryPoints,
  initializeRopeNodes,
  normalizeConnection,
  polylineLength,
  resolveAnchor,
  routePoints,
  setManualRoute,
  smoothManualPath,
  type Connection,
  type ConnectionAnchor
} from '../world/Connection'
import { worldTransform } from '../world/hierarchy'

type Stage = 'objects' | 'path' | 'simulation'
type VisiblePath = 'straight' | 'manual'

const form17 = useSimulationFormGuard17(/** 为表单守卫提供空提交回调，实际连接提交由保存动作处理。 */ () => {})
const props = defineProps<{ selectedId: number; connectionId: number | null }>()
const emit = defineEmits<{ close: [] }>()
const world = physicsState.world
const existing = props.connectionId === null ? null : world.connections.find(/* 比较 connection.id 与 props.connectionId，返回严格相等的判断结果。 */ connection => connection.id === props.connectionId) ?? null
const selectedEntity = computed(/** 查找当前选中端点实体。 */ () => world.entities.find(/* 比较 entity.id 与 props.selectedId，返回严格相等的判断结果。 */ entity => entity.id === props.selectedId) ?? null)
const existingPartner = existing?.anchors.find(/* 比较 anchor.entityId 与 props.selectedId，返回严格不等的判断结果。 */ anchor => anchor.entityId !== props.selectedId)?.entityId ?? null
const partnerId = ref<number | null>(existingPartner)
const stage = ref<Stage>(existingPartner === null ? 'objects' : 'path')
const selectedStyle = ref<VisiblePath>(existing?.style === 'manual' ? 'manual' : 'straight')
const displayCenters = ref(true)
const previewCanvas = ref<HTMLCanvasElement | null>(null)
const drawnAnchors = ref<[ConnectionAnchor, ConnectionAnchor] | null>(null)
const drawnPoints = ref<Vec2[]>([])
const drawMessage = ref('')
const isDrawing = ref(false)
const stretchable = ref(existing?.stretchable ?? false)
const bendable = ref(existing?.bendable ?? true)
const stiffness = ref(existing?.stiffness ?? 1200)
const connectionDamping = ref(existing?.damping ?? 35)
const maxStretchPercent = ref(Math.max(0, ((existing?.maxStretchRatio ?? 1.25) - 1) * 100))
const bendingToleranceMass = ref(existing?.bendingToleranceMass ?? 1e12)
const stretchingToleranceMass = ref(existing?.stretchingToleranceMass ?? 1e12)
const collisionEnabled = ref(existing?.collisionEnabled ?? true)
const collisionRadius = ref(existing?.collisionRadius ?? 0.2)
const linearDensity = ref(existing?.linearDensity ?? 0.08)
const segmentCount = ref(existing?.segmentCount ?? 12)
const collideConnected = ref(existing?.collideConnected ?? false)
const availableEntities = computed(/** 筛选其他且物理图层相同的连接对象。 */ () => world.entities.filter(/** 判断候选不是当前实体且双方碰撞体物理层相同。 */ entity => entity.id !== props.selectedId && entity.getCollider()?.physicsLayer === selectedEntity.value?.getCollider()?.physicsLayer))
const partnerEntity = computed(/** 根据伙伴编号查找实体，未选择时返回空值。 */ () => partnerId.value === null ? null : world.entities.find(/* 比较 entity.id 与 partnerId.value，返回严格相等的判断结果。 */ entity => entity.id === partnerId.value) ?? null)
const overlapping = computed(/** 检查当前两个端点实体是否都存在且相互重叠。 */ () => Boolean(selectedEntity.value && partnerEntity.value && entitiesOverlap(selectedEntity.value, partnerEntity.value, world.entities)))
const drawingComplete = computed(/* 先计算 drawnAnchors.value !== null；仅当其为真值时求右侧 drawnPoints.value.length >= 2，返回短路求值结果。 */ () => drawnAnchors.value !== null && drawnPoints.value.length >= 2)

let resizeObserver: ResizeObserver | null = null
let previewResizeRaf = 0

/** 将多次预览尺寸请求合并为一个动画帧。 */ function schedulePreviewResize() {
  if (previewResizeRaf) return
  previewResizeRaf = requestAnimationFrame(/** 清除尺寸帧标识并调整预览画布。 */ () => {
    previewResizeRaf = 0
    resizePreview()
  })
}
let previewRatio = 1
let previewTransform = { scale: 1, offsetX: 0, offsetY: 0 }
let activePointerId: number | null = null
let startAnchor: ConnectionAnchor | null = null
let startEntityId: number | null = null
let rawPoints: Vec2[] = []

/** 显示实体名称加编号，缺失时仅显示编号。 */ function entityName(id: number) {
  const entity = world.entities.find(/* 比较 candidate.id 与 id，返回严格相等的判断结果。 */ candidate => candidate.id === id)
  return entity ? `${entity.name}_${entity.id}` : String(id)
}
/* 根据 type === 'Circle' 的真假，分别返回 '○' 或 type === 'Triangle' ? '△' : '□'。 */ function shapeGlyph(type?: string) { return type === 'Circle' ? '○' : type === 'Triangle' ? '△' : '□' }

/** 选择伙伴后清空绘制并进入路径选择阶段。 */ function selectPartner(id: number) {
  partnerId.value = id
  clearDrawing()
  stage.value = 'path'
}

/** 选择路径样式后清空绘制，进入仿真阶段并待 DOM 更新后调整画布。 */ function choosePath(style: VisiblePath) {
  selectedStyle.value = style
  clearDrawing()
  stage.value = 'simulation'
  void nextTick(resizePreview)
}

/** 清除提示并退回路径或对象选择阶段。 */ function goBack() {
  drawMessage.value = ''
  if (stage.value === 'simulation') stage.value = 'path'
  else stage.value = 'objects'
}

/** 保留现有连接未显示的字段，再用当前控件值覆盖物理参数并限制分段数。 */ function copyHiddenPhysics(target: Connection): void {
  if (existing) Object.assign(target, JSON.parse(JSON.stringify(existing)) as Connection)
  target.stretchable = stretchable.value
  target.bendable = bendable.value
  target.stiffness = stiffness.value
  target.damping = connectionDamping.value
  target.maxStretchRatio = 1 + maxStretchPercent.value / 100
  target.bendingToleranceMass = bendingToleranceMass.value
  target.stretchingToleranceMass = stretchingToleranceMass.value
  target.collisionEnabled = collisionEnabled.value
  target.collisionRadius = collisionRadius.value
  target.linearDensity = linearDensity.value
  target.segmentCount = Math.min(32, Math.max(3, Math.round(segmentCount.value)))
  target.collideConnected = collideConnected.value
}

/** 有伙伴时创建新或现有编号的连接模型，并复制保留的物理参数。 */ function createDraftConnection(): Connection | null {
  if (partnerId.value === null) return null
  const id = existing?.id ?? world.allocateConnectionId()
  const connection = createConnectionModel(id, world.entities, [props.selectedId, partnerId.value], ['surface', 'surface'])
  copyHiddenPhysics(connection)
  return connection
}

/** 插入或替换世界连接，记录历史、设置本地化状态并关闭编辑器。 */ function commitConnection(connection: Connection, statusKey: 'connectionCreated' | 'connectionUpdated' | 'bindingCreated') {
  const index = existing ? world.connections.findIndex(/* 比较 candidate.id 与 existing.id，返回严格相等的判断结果。 */ candidate => candidate.id === existing.id) : -1
  if (index === -1) world.connections.push(connection)
  else world.connections.splice(index, 1, connection)
  pushHistory()
  editorState.statusText = t(statusKey)
  emit('close')
}

/** 先提交所有编辑草稿，再配置绑定连接，必要时命名并提交。 */ function saveBinding() {
  if (!settleEditorDrafts()) return
  const connection = createDraftConnection()
  if (!connection || !configureBinding(connection, world.entities)) return
  if (!existing) connection.name = `${t('bind')} ${entityName(props.selectedId)} + ${entityName(partnerId.value!)}`
  commitConnection(connection, 'bindingCreated')
}

/** 要求已绘制有效锚点，创建连接并复制路径，重置断裂状态，按需初始化绳节点，归一化通过后提交。 */ function saveConnection() {
  if (!settleEditorDrafts()) return
  if (!drawnAnchors.value || drawnPoints.value.length < 2) return
  const connection = createDraftConnection()
  if (!connection) return
  connection.binding = false
  connection.bindOffset = { x: 0, y: 0 }
  connection.bindAngle = 0
  connection.style = selectedStyle.value
  connection.anchors = drawnAnchors.value.map(/** 复制锚点及局部位置，避免共享可变坐标对象。 */ anchor => ({ ...anchor, localPoint: { ...anchor.localPoint } }))
  const start = resolveAnchor(connection.anchors[0], world.entities)!
  const end = resolveAnchor(connection.anchors[1], world.entities)!
  connection.restLengths = [Math.max(1e-6, Math.hypot(end.x - start.x, end.y - start.y))]
  connection.manualSegments = [[{ x: 0, y: 0 }, { x: 1, y: 0 }]]
  connection.breakState = 'intact'
  connection.breakLink = -1
  connection.tension = 0
  connection.strain = 0
  if (selectedStyle.value === 'manual') {
    setManualRoute(connection, drawnPoints.value, world.entities)
    const route = routePoints(connection, world.entities)[0]
    if (route?.length >= 2) connection.restLengths = [Math.max(1e-6, polylineLength(route))]
  }
  if (connection.collisionEnabled) initializeRopeNodes(connection, world.entities)
  if (!normalizeConnection(connection, world.entities)) return
  commitConnection(connection, existing ? 'connectionUpdated' : 'connectionCreated')
}

/** 读取根元素 CSS 颜色变量，缺失时使用备用色。 */ function cssColor(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

/** 按可见画布尺寸和最高两倍像素比设置像素大小并重绘。 */ function resizePreview() {
  const canvas = previewCanvas.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return
  previewRatio = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.max(1, Math.round(rect.width * previewRatio))
  canvas.height = Math.max(1, Math.round(rect.height * previewRatio))
  renderPreview()
}

/** 根据两个实体的边界计算带内边距的居中预览变换。 */ function calculatePreviewTransform(width: number, height: number) {
  const entities = [selectedEntity.value, partnerEntity.value].filter(/* 调用 Boolean(entity) 并返回调用结果。 */ (entity): entity is Entity => Boolean(entity))
  const points = entities.flatMap(/* 调用 entityBoundaryPoints(entity, 64, world.entities) 并返回调用结果。 */ entity => entityBoundaryPoints(entity, 64, world.entities))
  if (!points.length) return { scale: 1, offsetX: width / 2, offsetY: height / 2 }
  const xs = points.map(/* 返回 point.x 的当前值。 */ point => point.x)
  const ys = points.map(/* 返回 point.y 的当前值。 */ point => point.y)
  const minimumX = Math.min(...xs), maximumX = Math.max(...xs)
  const minimumY = Math.min(...ys), maximumY = Math.max(...ys)
  const rangeX = Math.max(1e-6, maximumX - minimumX)
  const rangeY = Math.max(1e-6, maximumY - minimumY)
  const scale = Math.min((width - 72) / rangeX, (height - 72) / rangeY)
  const centerX = (minimumX + maximumX) / 2
  const centerY = (minimumY + maximumY) / 2
  return { scale, offsetX: width / 2 - centerX * scale, offsetY: height / 2 + centerY * scale }
}

/** 将世界坐标转换为预览坐标并翻转纵轴。 */ function worldToPreview(point: Vec2): Vec2 {
  return { x: previewTransform.offsetX + point.x * previewTransform.scale, y: previewTransform.offsetY - point.y * previewTransform.scale }
}

/** 将预览坐标逆变换为世界坐标。 */ function previewToWorld(point: Vec2): Vec2 {
  return { x: (point.x - previewTransform.offsetX) / previewTransform.scale, y: -(point.y - previewTransform.offsetY) / previewTransform.scale }
}

/** 绘制实体边界、选中描边及名称编号。 */ function drawEntity(context: CanvasRenderingContext2D, entity: Entity, selected: boolean) {
  const points = entityBoundaryPoints(entity, 64, world.entities).map(worldToPreview)
  if (points.length < 3) return
  context.beginPath()
  context.moveTo(points[0].x, points[0].y)
  for (let index = 1; index < points.length; index++) context.lineTo(points[index].x, points[index].y)
  context.closePath()
  context.fillStyle = `rgba(${entity.color.r}, ${entity.color.g}, ${entity.color.b}, .54)`
  context.strokeStyle = selected ? cssColor('--accent', '#4c8df6') : cssColor('--text-muted', '#7e8898')
  context.lineWidth = selected ? 2.2 : 1.5
  context.fill(); context.stroke()
  const center = worldToPreview(worldTransform(entity, world.entities).position)
  context.fillStyle = cssColor('--text-primary', '#fff')
  context.font = '600 11px "Nunito Sans Variable", "Noto Sans SC Variable", sans-serif'
  context.textAlign = 'center'; context.textBaseline = 'middle'
  context.fillText(`${entity.name}_${entity.id}`, center.x, center.y - 17)
}

/** 在指定世界点绘制预览锚点标记。 */ function drawAnchor(context: CanvasRenderingContext2D, point: Vec2) {
  const screen = worldToPreview(point)
  context.beginPath(); context.arc(screen.x, screen.y, 8, 0, Math.PI * 2)
  context.fillStyle = '#ffffff'; context.fill()
  context.lineWidth = 3; context.strokeStyle = '#2f80ff'; context.stroke()
  context.beginPath(); context.arc(screen.x, screen.y, 2.2, 0, Math.PI * 2)
  context.fillStyle = '#2f80ff'; context.fill()
}

/** 把世界路径绘为直线或平滑手绘曲线，并绘制双层描边。 */ function drawPath(context: CanvasRenderingContext2D, points: Vec2[], style: VisiblePath) {
  if (points.length < 2) return
  const screen = points.map(worldToPreview)
  context.beginPath(); context.moveTo(screen[0].x, screen[0].y)
  if (style === 'manual' && screen.length > 2) {
    for (let index = 1; index < screen.length - 1; index++) {
      const midpoint = { x: (screen[index].x + screen[index + 1].x) / 2, y: (screen[index].y + screen[index + 1].y) / 2 }
      context.quadraticCurveTo(screen[index].x, screen[index].y, midpoint.x, midpoint.y)
    }
    context.lineTo(screen[screen.length - 1].x, screen[screen.length - 1].y)
  } else context.lineTo(screen[screen.length - 1].x, screen[screen.length - 1].y)
  context.strokeStyle = '#2f80ff'; context.lineWidth = 4; context.lineCap = 'round'; context.lineJoin = 'round'; context.stroke()
  context.strokeStyle = 'rgba(255,255,255,.82)'; context.lineWidth = 1.2; context.stroke()
}

/** 清空并重建预览背景、实体、当前路径及可选中心和锚点标记。 */ function renderPreview() {
  const canvas = previewCanvas.value
  const context = canvas?.getContext('2d')
  if (!canvas || !context) return
  const width = canvas.width / previewRatio
  const height = canvas.height / previewRatio
  context.setTransform(previewRatio, 0, 0, previewRatio, 0, 0)
  context.clearRect(0, 0, width, height)
  context.fillStyle = cssColor('--bg-canvas', '#11151b'); context.fillRect(0, 0, width, height)
  previewTransform = calculatePreviewTransform(width, height)
  if (selectedEntity.value) drawEntity(context, selectedEntity.value, true)
  if (partnerEntity.value) drawEntity(context, partnerEntity.value, false)
  const previewPoints = isDrawing.value
    ? (selectedStyle.value === 'manual' ? smoothManualPath(rawPoints, 1) : rawPoints)
    : drawnPoints.value
  if (previewPoints.length >= 2) drawPath(context, previewPoints, selectedStyle.value)
  if (displayCenters.value) {
    if (selectedEntity.value) drawAnchor(context, worldTransform(selectedEntity.value, world.entities).position)
    if (partnerEntity.value) drawAnchor(context, worldTransform(partnerEntity.value, world.entities).position)
  }
  if (drawnAnchors.value) {
    for (const anchor of drawnAnchors.value) {
      const point = resolveAnchor(anchor, world.entities)
      if (point) drawAnchor(context, point)
    }
  }
}

/** 将指针客户区坐标转换为画布局部坐标。 */ function canvasPoint(event: PointerEvent): Vec2 {
  const rect = previewCanvas.value!.getBoundingClientRect()
  return { x: event.clientX - rect.left, y: event.clientY - rect.top }
}

/** 在允许的端点实体上寻找距离阈值内最近的中心或表面锚点。 */ function anchorNearPointer(screenPoint: Vec2, requiredEntityId?: number): { entity: Entity; anchor: ConnectionAnchor; point: Vec2 } | null {
  const worldPoint = previewToWorld(screenPoint)
  const candidates = [selectedEntity.value, partnerEntity.value].filter(/* 先计算 Boolean(entity)；仅当其为真值时求右侧 (requiredEntityId === undefined || entity!.id === requiredEntityId)，返回短路求值结果。 */ (entity): entity is Entity => Boolean(entity) && (requiredEntityId === undefined || entity!.id === requiredEntityId))
  let best: { entity: Entity; anchor: ConnectionAnchor; point: Vec2; distance: number } | null = null
  for (const entity of candidates) {
    if (displayCenters.value) {
      const center = worldTransform(entity, world.entities).position
      const centerScreen = worldToPreview(center)
      const centerDistance = Math.hypot(centerScreen.x - screenPoint.x, centerScreen.y - screenPoint.y)
      if (centerDistance <= 15 && (!best || centerDistance < best.distance)) {
        best = { entity, anchor: deriveAnchor(entity, 'center', 0, 0.5, center, world.entities), point: { ...center }, distance: centerDistance }
      }
    }
    const surfaceAnchor = anchorAtWorldPoint(entity, worldPoint, world.entities)
    const surfacePoint = resolveAnchor(surfaceAnchor, world.entities)!
    const surfaceScreen = worldToPreview(surfacePoint)
    const surfaceDistance = Math.hypot(surfaceScreen.x - screenPoint.x, surfaceScreen.y - screenPoint.y)
    if (surfaceDistance <= 26 && (!best || surfaceDistance < best.distance)) {
      best = { entity, anchor: surfaceAnchor, point: surfacePoint, distance: surfaceDistance }
    }
  }
  return best
}

/** 仅在仿真阶段左键命中锚点时开始捕获绘制，记录初始端点并重绘。 */ function onPreviewPointerDown(event: PointerEvent) {
  if (event.button !== 0 || stage.value !== 'simulation') return
  const picked = anchorNearPointer(canvasPoint(event))
  if (!picked) { drawMessage.value = t('startOnAnchor'); return }
  clearDrawing()
  activePointerId = event.pointerId
  startAnchor = picked.anchor
  startEntityId = picked.entity.id
  rawPoints = [picked.point]
  isDrawing.value = true
  drawMessage.value = ''
  previewCanvas.value?.setPointerCapture(event.pointerId)
  renderPreview()
}

/** 所属指针移动时更新直线路径，手绘模式仅在移动足够距离后添加采样点。 */ function onPreviewPointerMove(event: PointerEvent) {
  if (!isDrawing.value || event.pointerId !== activePointerId) return
  const point = previewToWorld(canvasPoint(event))
  if (selectedStyle.value !== 'manual') rawPoints.splice(1, rawPoints.length - 1, point)
  else {
    const previous = rawPoints[rawPoints.length - 1]
    if (!previous || Math.hypot(point.x - previous.x, point.y - previous.y) * previewTransform.scale >= 3) rawPoints.push(point)
  }
  renderPreview()
}

/** 要求在另一实体锚点结束，整理端点方向并平滑手绘路径，再清理捕获状态并重绘。 */ function onPreviewPointerUp(event: PointerEvent) {
  if (!isDrawing.value || event.pointerId !== activePointerId || startEntityId === null || !startAnchor) return
  const requiredEntityId = startEntityId === props.selectedId ? partnerId.value : props.selectedId
  const picked = requiredEntityId === null ? null : anchorNearPointer(canvasPoint(event), requiredEntityId)
  if (!picked) {
    drawMessage.value = t('endOnOtherObject')
    cancelPreviewDrawing()
    return
  }
  const startPoint = resolveAnchor(startAnchor, world.entities)!
  let points = selectedStyle.value === 'straight' ? [startPoint, picked.point] : [...rawPoints, picked.point]
  let anchors: [ConnectionAnchor, ConnectionAnchor]
  if (startEntityId === props.selectedId) anchors = [startAnchor, picked.anchor]
  else { anchors = [picked.anchor, startAnchor]; points = points.reverse() }
  const resolvedStart = resolveAnchor(anchors[0], world.entities)!
  const resolvedEnd = resolveAnchor(anchors[1], world.entities)!
  points[0] = resolvedStart; points[points.length - 1] = resolvedEnd
  drawnAnchors.value = anchors
  drawnPoints.value = selectedStyle.value === 'manual' ? smoothManualPath(points) : [resolvedStart, resolvedEnd]
  drawMessage.value = ''
  isDrawing.value = false
  activePointerId = null
  startAnchor = null
  startEntityId = null
  rawPoints = []
  renderPreview()
}

/** 取消当前绘制指针状态和临时点并重绘。 */ function cancelPreviewDrawing() {
  isDrawing.value = false
  activePointerId = null
  startAnchor = null
  startEntityId = null
  rawPoints = []
  renderPreview()
}

/** 清除已完成锚点、路径及提示，再取消临时绘制。 */ function clearDrawing() {
  drawnAnchors.value = null
  drawnPoints.value = []
  drawMessage.value = ''
  cancelPreviewDrawing()
}

watch(displayCenters, /** 关闭中心显示且路径使用中心锚点时清空路径，否则仅重绘。 */ visible => {
  if (!visible && drawnAnchors.value?.some(/* 比较 anchor.mode 与 'center'，返回严格相等的判断结果。 */ anchor => anchor.mode === 'center')) clearDrawing()
  else renderPreview()
})
watch(/** 监听两个端点实体的位置变化。 */ () => [selectedEntity.value?.transform.position.x, selectedEntity.value?.transform.position.y, partnerEntity.value?.transform.position.x, partnerEntity.value?.transform.position.y], renderPreview)
watch(previewCanvas, /** 画布引用变化时切换尺寸观察对象，并等待 DOM 后安排尺寸更新。 */ canvas => {
  resizeObserver?.disconnect()
  if (!canvas) return
  resizeObserver ??= new ResizeObserver(schedulePreviewResize)
  resizeObserver.observe(canvas)
  void nextTick(schedulePreviewResize)
})

onMounted(/** 挂载时观察画布，并从已有非绑定连接恢复端点及正向路径进入仿真阶段。 */ () => {
  resizeObserver ??= new ResizeObserver(schedulePreviewResize)
  if (previewCanvas.value) resizeObserver.observe(previewCanvas.value)
  if (existing && !existing.binding && existing.anchors.length >= 2) {
    const selectedAnchor = existing.anchors.find(/* 比较 anchor.entityId 与 props.selectedId，返回严格相等的判断结果。 */ anchor => anchor.entityId === props.selectedId)
    const partnerAnchor = existing.anchors.find(/* 比较 anchor.entityId 与 partnerId.value，返回严格相等的判断结果。 */ anchor => anchor.entityId === partnerId.value)
    const existingRoute = routePoints(existing, world.entities)[0]
    if (selectedAnchor && partnerAnchor && existingRoute?.length >= 2) {
      const selectedFirst = existing.anchors[0].entityId === props.selectedId
      drawnAnchors.value = [{ ...selectedAnchor, localPoint: { ...selectedAnchor.localPoint } }, { ...partnerAnchor, localPoint: { ...partnerAnchor.localPoint } }]
      drawnPoints.value = selectedFirst ? existingRoute.map(/** 复制现有路径坐标，防止编辑共享原坐标对象。 */ point => ({ ...point })) : existingRoute.map(/** 复制反向路径坐标，随后由外层逆序匹配端点方向。 */ point => ({ ...point })).reverse()
      stage.value = 'simulation'
    }
  }
})
onBeforeUnmount(/** 卸载时解除尺寸观察并取消待执行尺寸帧。 */ () => {
  resizeObserver?.disconnect()
  if (previewResizeRaf) cancelAnimationFrame(previewResizeRaf)
})
</script>

<style scoped>
.modal-scrim { position: fixed; inset: 0; z-index: 1200; display: grid; place-items: center; padding: 24px; background: var(--scrim); backdrop-filter: blur(8px); }
.builder { width: min(760px, 100%); height: min(720px, calc(100vh - 48px)); display: flex; flex-direction: column; overflow: hidden; border: 1px solid var(--border-strong); border-radius: 22px; background: var(--surface-2); box-shadow: var(--shadow-lg); }
header, footer { flex: 0 0 auto; min-height: 64px; padding: 13px 18px; display: flex; align-items: center; gap: 16px; border-bottom: 1px solid var(--border-subtle); }
footer { min-height: 60px; justify-content: flex-end; border-top: 1px solid var(--border-subtle); border-bottom: 0; }
.eyebrow { color: var(--accent); font-size:11px; font-weight: 750; letter-spacing: .14em; text-transform: uppercase; }
h2 { margin: 2px 0 0; font-size: 18px; letter-spacing: -.02em; }
.icon-button { width: 32px; height: 32px; margin-left: auto; border: 1px solid var(--border-subtle); border-radius: 10px; background: var(--surface-3); color: var(--text-secondary); font-size: 20px; }
.step-indicator { margin-left: auto; display: flex; align-items: center; }.step-indicator i { width: 24px; height: 24px; display: grid; place-items: center; border: 1px solid var(--border-strong); border-radius: 50%; color: var(--text-muted); font-size:11px; font-style: normal; }.step-indicator i.active { color: var(--accent-contrast); border-color: var(--accent); background: var(--accent); }.step-indicator span { width: 28px; height: 1px; background: var(--border-strong); }
.builder-body { min-height: 0; flex: 1; overflow: auto; }.wizard-step { min-height: 100%; padding: 24px; display: flex; flex-direction: column; gap: 16px; }
.step-copy { display: flex; align-items: center; gap: 13px; }.step-number { width: 38px; height: 38px; flex: 0 0 38px; display: grid; place-items: center; border-radius: 12px; color: var(--accent); background: var(--accent-soft); font-size: 11px; font-weight: 750; }.step-copy h3 { margin: 0; font-size: 17px; }.step-copy p { margin: 3px 0 0; color: var(--text-muted); font-size: 11px; }.compact-copy { align-items: center; }.compact-copy > div { min-width: 0; flex: 1; }
.chosen-object, .object-picker button { min-height: 54px; padding: 10px 12px; display: flex; align-items: center; gap: 11px; border: 1px solid var(--border-subtle); border-radius: 13px; background: var(--surface-1); text-align: left; }.chosen-object.fixed { border-color: color-mix(in srgb, var(--accent) 48%, var(--border-subtle)); background: var(--accent-soft); }.chosen-object > span:nth-child(2), .object-picker button > span:nth-child(2) { min-width: 0; display: flex; flex: 1; flex-direction: column; }.chosen-object small, .object-picker small { color: var(--text-muted); font-size:11px; }.chosen-object strong, .object-picker strong { overflow: hidden; color: var(--text-primary); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }.chosen-object i, .object-picker i { color: var(--accent); font-style: normal; }.shape { width: 28px; color: var(--accent); font-size: 24px; line-height: 1; text-align: center; }
.object-picker { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px; }.object-picker button:hover, .object-picker button.selected { border-color: var(--accent); background: var(--accent-soft); }.empty-state { margin: auto; color: var(--text-muted); font-size: 12px; text-align: center; }
.pair-summary { display: flex; align-items: center; justify-content: center; gap: 13px; padding: 12px; border: 1px solid var(--border-subtle); border-radius: 13px; background: var(--surface-1); color: var(--text-primary); font-size: 12px; font-weight: 650; }.pair-summary i { color: var(--accent); font-style: normal; }
.overlap-notice { padding: 11px 13px; display: flex; align-items: center; gap: 10px; border: 1px solid color-mix(in srgb, var(--accent) 48%, var(--border-subtle)); border-radius: 12px; background: var(--accent-soft); }.overlap-notice > span { color: var(--accent); font-size: 22px; }.overlap-notice div { display: flex; flex-direction: column; }.overlap-notice strong { font-size: 11px; }.overlap-notice small { color: var(--text-muted); font-size:11px; }
.path-picker { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; }.path-picker button { min-height: 142px; padding: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; border: 1px solid var(--border-subtle); border-radius: 15px; background: var(--surface-1); }.path-picker button:hover { transform: translateY(-2px); border-color: var(--accent); background: var(--accent-soft); }.path-picker strong { font-size: 12px; }.path-picker small { min-height: 30px; color: var(--text-muted); font-size:11px; line-height: 1.45; text-align: center; }.path-preview { width: 76px; height: 42px; position: relative; display: block; }.straight-preview::after { content: ''; position: absolute; inset: 20px 4px auto; height: 3px; border-radius: 99px; background: var(--accent); transform: rotate(-12deg); }.straight-preview::before, .manual-preview::before { content: ''; position: absolute; inset: 14px auto auto 1px; width: 9px; height: 9px; border: 3px solid var(--accent); border-radius: 50%; background: white; box-shadow: 65px 14px 0 -3px white, 65px 14px 0 0 var(--accent); z-index: 1; }.manual-preview::after { content: ''; position: absolute; inset: 9px 5px; border-bottom: 3px solid var(--accent); border-radius: 50%; transform: rotate(10deg); }.bind-preview { display: grid; place-items: center; color: var(--accent); font-size: 38px; }.bind-option { border-color: color-mix(in srgb, var(--accent) 38%, var(--border-subtle)) !important; }
.center-toggle { flex: 0 0 auto; padding: 7px 10px; display: flex; align-items: center; gap: 7px; border: 1px solid var(--border-subtle); border-radius: 10px; background: var(--surface-1); color: var(--text-secondary); font-size:11px; }.center-toggle input { accent-color: var(--accent); }
.preview-shell { min-height: 320px; position: relative; flex: 1; overflow: hidden; border: 1px solid var(--border-strong); border-radius: 15px; background: var(--bg-canvas); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--surface-1) 40%, transparent); }.preview-shell.complete { border-color: color-mix(in srgb, var(--accent) 60%, var(--border-strong)); }.preview-shell canvas { display: block; width: 100%; height: 100%; min-height: 320px; touch-action: none; cursor: crosshair; }.preview-instruction, .preview-success { position: absolute; left: 50%; bottom: 14px; transform: translateX(-50%); padding: 7px 11px; display: flex; align-items: center; gap: 6px; border: 1px solid var(--border-strong); border-radius: 999px; background: var(--surface-1); color: var(--text-secondary); box-shadow: var(--shadow-sm); font-size:11px; pointer-events: none; white-space: nowrap; }.preview-instruction span { color: var(--accent); }.preview-success { color: var(--success); }.preview-success span { width: 16px; height: 16px; display: grid; place-items: center; border-radius: 50%; color: var(--accent-contrast); background: var(--success); }
.preview-footer { min-height: 30px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }.preview-footer p { margin: 0; color: var(--text-muted); font-size:11px; }.preview-footer p.error { color: var(--danger); }.redraw-button { padding: 6px 10px; border: 1px solid var(--border-subtle); border-radius: 8px; color: var(--text-secondary); background: var(--surface-3); font-size:11px; }
.advanced-physics { border: 1px solid var(--border-subtle); border-radius: 12px; background: var(--surface-1); overflow: hidden; }.advanced-physics summary { padding: 10px 12px; color: var(--text-secondary); cursor: pointer; font-size:11px; font-weight: 700; }.physics-grid { padding: 2px 12px 12px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 12px; }.physics-grid label { min-width: 0; display: flex; align-items: center; justify-content: space-between; gap: 8px; color: var(--text-muted); font-size:11px; }.physics-grid label.collision-toggle { grid-column: 1 / -1; padding: 8px 0; border-bottom: 1px solid var(--border-subtle); }.collision-toggle > span { display: flex; flex-direction: column; gap: 2px; }.collision-toggle strong { color: var(--text-secondary); font-size:11px; }.collision-toggle small { max-width: 470px; font-size:11px; font-weight: 400; line-height: 1.4; }.physics-grid input[type='number'] { width: 92px; min-width: 0; }.physics-grid input[type='checkbox'] { accent-color: var(--accent); }
.rope-warning { margin: 0 12px 12px; padding: 8px 10px; border: 1px solid color-mix(in srgb, var(--warning) 45%, var(--border-subtle)); border-radius: 9px; color: var(--warning); background: color-mix(in srgb, var(--warning) 8%, transparent); font-size: 11px; line-height: 1.45; }
footer button { min-height: 35px; padding: 0 14px; border: 1px solid var(--border-subtle); border-radius: 9px; background: var(--surface-3); color: var(--text-secondary); font-size: 11px; }footer button.primary { min-width: 140px; color: var(--accent-contrast); border-color: var(--accent); background: var(--accent); }
.step-enter-active, .step-leave-active { transition: opacity 180ms ease, transform 220ms cubic-bezier(.2,.8,.2,1); }.step-enter-from { opacity: 0; transform: translateX(24px); }.step-leave-to { opacity: 0; transform: translateX(-18px); }
@media (max-width: 680px) { .path-picker, .object-picker { grid-template-columns: 1fr; }.path-picker button { min-height: 108px; }.step-indicator { display: none; }.center-toggle { align-self: flex-start; }.compact-copy { flex-wrap: wrap; }.preview-shell, .preview-shell canvas { min-height: 280px; } }
.builder{container-type:inline-size}.physics-grid{grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr))}.physics-grid label{flex-wrap:wrap;align-items:stretch;flex-direction:column}.physics-grid input[type=number]{width:100%;min-width:86px;min-height:34px}.physics-grid input[type=checkbox]{align-self:flex-start}.builder h2,.builder h3,.builder strong,.builder p,.builder summary{overflow-wrap:anywhere;white-space:normal}.rope-units17,.form-error17{padding:8px 12px;line-height:1.5}.form-error17{color:var(--danger)}footer{flex-wrap:wrap}footer button{white-space:normal;overflow-wrap:anywhere}.preview-instruction,.preview-success{max-width:95%;white-space:normal}
</style>
