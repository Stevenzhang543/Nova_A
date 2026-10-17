/** 图交互数学与旧式执行布局：在缩放下换算拖动，按真实最小尺寸检测重叠并寻找不干扰手动布局的新位置。 */
import type { GraphCanvasScope, GraphEdge, GraphNode, GraphPoint, GraphSize, GraphViewport } from './graphTypes'

export interface GraphLayoutResult { roots: number; columns: number; visited: number; edgesIndexed: number }
export interface GraphRect extends GraphPoint, GraphSize {}

export const GRAPH_MIN_ZOOM = .1
export const GRAPH_MAX_ZOOM = 4
export const GRAPH_LAYOUT_GAP = 24

/* 根据 Number.isFinite(value) 的真假，分别返回 value 或 fallback。 */ function finite(value: number, fallback = 0): number { return Number.isFinite(value) ? value : fallback }
/* 调用 Math.min(GRAPH_MAX_ZOOM, Math.max(GRAPH_MIN_ZOOM, finite(value, fallback))) 并返回调用结果。 */ function clampZoom(value: number, fallback = 1): number { return Math.min(GRAPH_MAX_ZOOM, Math.max(GRAPH_MIN_ZOOM, finite(value, fallback))) }

/** 限制新旧缩放并调整视图偏移，使给定屏幕焦点下的图坐标保持不变。 */ export function focalGraphZoom(viewport: GraphViewport, requestedZoom: number, focalX: number, focalY: number): GraphViewport {
  const oldZoom = clampZoom(viewport.zoom), zoom = clampZoom(requestedZoom, oldZoom), x = finite(viewport.x), y = finite(viewport.y), focusX = finite(focalX), focusY = finite(focalY)
  return { x: focusX - (focusX - x) * (zoom / oldZoom), y: focusY - (focusY - y) * (zoom / oldZoom), zoom }
}

/** Normalizes browser wheel units and preserves the graph point below the pointer. */
/** 将滚轮像素、行及页单位统一并限制单次幅度，以指数比例执行焦点缩放。 */ export function wheelGraphZoom(viewport: GraphViewport, deltaY: number, deltaMode: number, focalX: number, focalY: number): GraphViewport {
  const unit = deltaMode === 1 ? 16 : deltaMode === 2 ? 320 : 1
  const normalized = Math.min(240, Math.abs(finite(deltaY) * unit))
  const direction = deltaY < 0 ? 1 : deltaY > 0 ? -1 : 0
  return focalGraphZoom(viewport, viewport.zoom * Math.exp(direction * normalized * .0018), focalX, focalY)
}

/* 调用 focalGraphZoom(viewport, viewport.zoom + finite(step), focalX, focalY) 并返回调用结果。 */ export function stepGraphZoom(viewport: GraphViewport, step: number, focalX: number, focalY: number): GraphViewport {
  return focalGraphZoom(viewport, viewport.zoom + finite(step), focalX, focalY)
}

/* 返回具有所列字段的新对象 { x: finite(viewport.x) + finite(deltaX), y: finite(viewport.y) + finite(deltaY), zoom: clampZoom(viewport.zoom) }。 */ export function panGraphViewport(viewport: GraphViewport, deltaX: number, deltaY: number): GraphViewport {
  return { x: finite(viewport.x) + finite(deltaX), y: finite(viewport.y) + finite(deltaY), zoom: clampZoom(viewport.zoom) }
}

/** 将屏幕拖动增量除以受限缩放，叠加到原图坐标。 */ export function dragGraphPoint(start: GraphPoint, deltaX: number, deltaY: number, zoom: number): GraphPoint {
  const scale = clampZoom(zoom)
  return { x: finite(start.x) + finite(deltaX) / scale, y: finite(start.y) + finite(deltaY) / scale }
}

/** The serialized height is a minimum. Inline pin editors and code blocks can make a node taller. */
/** 根据折叠状态、引脚行及选择器和源码区计算节点最低可读尺寸。 */ export function graphNodeLayoutSize(node: GraphNode): GraphSize {
  const pinHeight = 53 + node.pins.length * 28
  const selectorHeight = node.type.startsWith('variable.') || node.type.startsWith('local.') ? 42 : 0
  const sourceHeight = node.type.startsWith('code.') || typeof node.config.rhaiSourceOverride === 'string' ? 126 : 0
  return {
    width: Math.max(112, finite(node.size.width, 224)),
    height: node.collapsed ? 40 : Math.max(finite(node.size.height, 82), pinHeight + selectorHeight + sourceHeight)
  }
}

/** 用布局尺寸与可选间距构造节点占用矩形。 */ export function graphNodeRect(node: GraphNode, gap = 0): GraphRect {
  const size = graphNodeLayoutSize(node), padding = Math.max(0, finite(gap))
  return { x: finite(node.position.x) - padding, y: finite(node.position.y) - padding, width: size.width + padding * 2, height: size.height + padding * 2 }
}

/* 先计算 a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height；仅当其为真值时求右侧 a.y + a.height > b.y，返回短路求值结果。 */ export function graphRectsOverlap(a: GraphRect, b: GraphRect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
}

/** 按横坐标排序占用矩形，仅检测横向区间重叠的候选并返回冲突节点对。 */ export function graphLayoutOverlaps(nodes: readonly GraphNode[], gap = 0): Array<[string, string]> {
  const result: Array<[string, string]> = [], rects = nodes.map(/** 构造并返回记录 { node, rect: graphNodeRect(node, gap * .5) }，字段按当前实参及捕获状态求值。 */ node => ({ node, rect: graphNodeRect(node, gap * .5) })).sort(/* 计算表达式 a.rect.x - b.rect.x 并返回结果，沿用操作数的原有类型规则。 */ (a, b) => a.rect.x - b.rect.x)
  for (let index = 0; index < rects.length; index++) {
    const left = rects[index]
    for (let other = index + 1; other < rects.length && rects[other].rect.x < left.rect.x + left.rect.width; other++) if (graphRectsOverlap(left.rect, rects[other].rect)) result.push([left.node.uuid, rects[other].node.uuid])
  }
  return result
}

/** Finds a nearby grid-aligned insertion point without rewriting the user's saved layout. */
/** 从目标点按有限圈数搜索空闲插入位置，不改动已有节点；找不到时退到场景右侧。 */ export function availableGraphPosition(nodes: readonly GraphNode[], desired: GraphPoint, size: GraphSize, gap = GRAPH_LAYOUT_GAP): GraphPoint {
  const stepX = Math.max(48, finite(size.width, 224) + gap), stepY = Math.max(48, finite(size.height, 82) + gap), origin = { x: finite(desired.x), y: finite(desired.y) }
  const occupied = nodes.map(/* 调用 graphNodeRect(node, gap * .5) 并返回调用结果。 */ node => graphNodeRect(node, gap * .5))
  for (let ring = 0; ring <= 64; ring++) {
    const candidates: GraphPoint[] = ring === 0 ? [origin] : [
      { x: origin.x + stepX * ring, y: origin.y }, { x: origin.x, y: origin.y + stepY * ring },
      { x: origin.x - stepX * ring, y: origin.y }, { x: origin.x, y: origin.y - stepY * ring },
      { x: origin.x + stepX * ring, y: origin.y + stepY * ring }, { x: origin.x - stepX * ring, y: origin.y + stepY * ring }
    ]
    for (const point of candidates) {
      const candidate: GraphRect = { x: point.x - gap * .5, y: point.y - gap * .5, width: size.width + gap, height: size.height + gap }
      if (!occupied.some(/* 调用 graphRectsOverlap(candidate, rect) 并返回调用结果。 */ rect => graphRectsOverlap(candidate, rect))) return point
    }
  }
  return { x: origin.x + stepX * (nodes.length + 1), y: origin.y }
}

/** 收集所有执行输出引脚标识，供布局只索引执行连线。 */ function executionOutputPins(nodes: readonly GraphNode[]): Set<string> { return new Set(nodes.flatMap(/** 筛选节点的执行输出引脚并提取稳定 UUID。 */ node => node.pins.filter(/* 先计算 pin.kind === 'execution'；仅当其为真值时求右侧 pin.direction === 'output'，返回短路求值结果。 */ pin => pin.kind === 'execution' && pin.direction === 'output').map(/* 返回 pin.uuid 的当前值。 */ pin => pin.uuid))) }

/** O(nodes + edges) Scratch-style layout. It never scans every edge per node. */
/** 先索引执行边，再从事件及入口逐列遍历放置节点，最后排列未连接节点并重置视图。 */ export function arrangeExecutionBlocks(scope: GraphCanvasScope): GraphLayoutResult {
  const index = new Map(scope.nodes.map(/* 返回按声明顺序构造的数组 [node.uuid, node]。 */ node => [node.uuid, node])), outputs = executionOutputPins(scope.nodes), incoming = new Set<string>(), outgoing = new Map<string, GraphEdge[]>()
  let edgesIndexed = 0
  for (const edge of scope.edges) {
    if (!outputs.has(edge.from.pinUuid)) continue
    edgesIndexed++
    incoming.add(edge.to.nodeUuid)
    const list = outgoing.get(edge.from.nodeUuid) ?? []
    list.push(edge)
    outgoing.set(edge.from.nodeUuid, list)
  }
  for (const list of outgoing.values()) list.sort(/* 调用 a.from.pinUuid.localeCompare(b.from.pinUuid) 并返回调用结果。 */ (a, b) => a.from.pinUuid.localeCompare(b.from.pinUuid))
  const roots = scope.nodes.filter(/** 选择生命周期事件、自定义事件、例程入口和无前驱执行节点作为布局根。 */ node => node.type.startsWith('event.') || node.type.startsWith('custom.event.') || node.type === 'routine.entry' || (!incoming.has(node.uuid) && node.pins.some(/* 比较 pin.kind 与 'execution'，返回严格相等的判断结果。 */ pin => pin.kind === 'execution')))
  const visited = new Set<string>()
  let column = 0, columnX = 70
  const placeColumn = /** 迭代遍历单个执行根可达的未访问节点，根据节点高度排列一列并推进下一列横坐标。 */ (root: GraphNode): void => {
    let y = 70
    const stack: GraphNode[] = [root]
    let widest = 0
    while (stack.length) {
      const node = stack.pop()!
      if (visited.has(node.uuid)) continue
      const size = graphNodeLayoutSize(node)
      visited.add(node.uuid); node.position = { x: columnX, y }; y += size.height + GRAPH_LAYOUT_GAP; widest = Math.max(widest, size.width)
      const targets = (outgoing.get(node.uuid) ?? []).flatMap(/* 当 index.get(edge.to.nodeUuid) 为 null 或 undefined 时返回 []，否则保留左侧值。 */ edge => index.get(edge.to.nodeUuid) ?? []).reverse()
      stack.push(...targets)
    }
    columnX += Math.max(224, widest) + 76
    column++
  }
  for (const root of roots) if (!visited.has(root.uuid)) placeColumn(root)
  let looseY = 70, looseColumnWidth = 0
  for (const node of scope.nodes) if (!visited.has(node.uuid)) {
    const size = graphNodeLayoutSize(node)
    if (looseY > 70 && looseY + size.height > 1_050) { columnX += Math.max(224, looseColumnWidth) + 76; looseY = 70; looseColumnWidth = 0; column++ }
    node.position = { x: columnX, y: looseY }; looseY += size.height + GRAPH_LAYOUT_GAP; looseColumnWidth = Math.max(looseColumnWidth, size.width); visited.add(node.uuid)
  }
  if (looseColumnWidth) column++
  scope.viewport = { x: 38, y: 42, zoom: 1 }
  return { roots: roots.length, columns: column, visited: visited.size, edgesIndexed }
}

/* 先计算 nodes > 500；仅当其为假值时求右侧 zoom < .42，返回短路求值结果。 */ export function useLowDetailGraph(nodes: number, zoom: number): boolean { return nodes > 500 || zoom < .42 }
