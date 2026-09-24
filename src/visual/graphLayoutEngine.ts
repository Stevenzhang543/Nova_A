/** 图布局引擎：按实测尺寸计算位置、嵌套范围和连线路径，不修改输入图。 */
/** Pure diagram layout. No source, graph, viewport or selection is mutated. */
export interface LayoutPoint { x: number; y: number }
export interface LayoutSize { width: number; height: number }
export interface LayoutRect extends LayoutPoint, LayoutSize {}
export interface LayoutPin { uuid: string; key?: string; kind?: string; direction?: string }
export interface LayoutNode { uuid: string; type: string; position: LayoutPoint; size: LayoutSize; collapsed?: boolean; pins?: readonly LayoutPin[] }
export interface LayoutEdge { uuid: string; from: { nodeUuid: string; pinUuid: string }; to: { nodeUuid: string; pinUuid: string }; reroutes?: readonly LayoutPoint[] }
export interface GraphLayoutRequest {
  nodes: readonly LayoutNode[]
  edges: readonly LayoutEdge[]
  measuredBounds?: Readonly<Record<string, LayoutSize>>
  /** 端口相对节点左上角的图空间坐标，缩放由调用方换算。 */
  measuredPorts?: Readonly<Record<string, LayoutPoint>>
  /** 省略表示整理全部；显式空选区不移动任何节点。 */
  selectedNodeUuids?: readonly string[]
  /** 固定节点仍参与障碍检测，但不移动；显式完整布局由调用者传入空列表。 */
  fixedNodeUuids?: readonly string[]
  origin?: LayoutPoint
  gap?: number
  preserveReroutes?: boolean
}
export interface GraphLayoutProgress { phase: 'index' | 'forest' | 'measure' | 'place' | 'route'; completed: number; total: number }
export interface GraphLayoutDiagnostic { code: string; message: string; nodeUuid?: string; edgeUuid?: string }
export interface GraphLayoutRegion { nodeUuid: string; parentRegionUuid: string | null; rect: LayoutRect; nodeUuids: string[] }
export interface GraphLayoutResult {
  positions: Record<string, LayoutPoint>
  /** 含两端坐标的完整正交折线，手动绕行点作为必须经过的路径点保留。 */
  routes: Record<string, LayoutPoint[]>
  regions: GraphLayoutRegion[]
  diagnostics: GraphLayoutDiagnostic[]
  metrics: { nodeCount: number; edgeCount: number; movedNodes: number; fixedNodes: number; measuredNodes: number; foldedEdges: number; routeFailures: number; elapsedMs: number }
}
interface TreeNode { node: LayoutNode; size: LayoutSize; children: string[]; offsets: Map<string, LayoutPoint>; width: number; height: number; parent: string | null }
const MAX_NODES = 10_000, MAX_EDGES = 20_000, MAX_DEPTH = 32, CHUNK = 128
const REGION_KINDS = new Set(['Program', 'Block', 'FunctionDeclaration', 'Closure', 'If', 'For', 'While', 'Loop', 'DoWhile', 'Switch', 'SwitchCase', 'Try'])
/** 按标识的字符顺序稳定排序，避免输入数组顺序改变布局。 */
const compare =  (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0
/** 拒绝非数值、无穷大和 NaN，保证几何计算有界。 */
const finite =  (value: number): boolean => typeof value === 'number' && Number.isFinite(value)
/** 校验坐标并返回独立副本，防止调用方在计算时修改位置。 */
const point = (value: LayoutPoint): LayoutPoint => { if (!value || !finite(value.x) || !finite(value.y)) throw new Error('Layout coordinates must be finite.'); return { x: value.x, y: value.y } }
/** 限制测量尺寸为正且有限，拒绝异常布局输入。 */
function size(value: LayoutSize): LayoutSize { if (!value || !finite(value.width) || !finite(value.height) || value.width < 1 || value.height < 1 || value.width > 100_000 || value.height > 100_000) throw new Error('Measured node bounds must be positive finite sizes at most 100,000 graph units.'); return { width: value.width, height: value.height } }
/** 创建可识别的取消异常，取消操作不作为算法错误。 */
function aborted(): Error { const error = new Error('Graph layout cancelled.'); error.name = 'AbortError'; return error }
/** 检测矩形内部相交；相邻边接触不算重叠。 */
const rectsOverlap =  (a: LayoutRect, b: LayoutRect): boolean => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
/** 扩展矩形边距，给节点与连线预留可读间距。 */
const padded =  (rect: LayoutRect, amount: number): LayoutRect => ({ x: rect.x - amount, y: rect.y - amount, width: rect.width + amount * 2, height: rect.height + amount * 2 })
class RectangleIndex {
  private buckets = new Map<string, Set<string>>()
  private large = new Set<string>()
  readonly rectangles = new Map<string, LayoutRect>()
/** 将矩形加入空间桶；过大的矩形转入单独集合以限制索引开销。 */
  add(id: string, rect: LayoutRect): void {
    this.rectangles.set(id, rect)
    const keys = this.keys(rect)
    if (!keys) { this.large.add(id); return }
    for (const key of keys) { let bucket = this.buckets.get(key); if (!bucket) { bucket = new Set(); this.buckets.set(key, bucket) }; bucket.add(id) }
  }
/** 只检查相关空间桶和大矩形，返回实际相交的候选。 */
  query(rect: LayoutRect): Array<[string, LayoutRect]> {
    const keys = this.keys(rect), ids = new Set(this.large)
    if (keys) for (const key of keys) for (const id of this.buckets.get(key) ?? []) ids.add(id)
    else for (const id of this.rectangles.keys()) ids.add(id)
    return [...ids].flatMap(/** 仅输出与查询范围真正重叠的已索引矩形。 */ id => { const value = this.rectangles.get(id)!; return rectsOverlap(rect, value) ? [[id, value] as [string, LayoutRect]] : [] })
  }
/** 计算矩形覆盖的网格桶；超过 4096 桶时交由大矩形分支处理。 */
  private keys(rect: LayoutRect): string[] | null {
    const x0 = Math.floor(rect.x / 512), y0 = Math.floor(rect.y / 512), x1 = Math.floor((rect.x + rect.width) / 512), y1 = Math.floor((rect.y + rect.height) / 512)
    if ((x1 - x0 + 1) * (y1 - y0 + 1) > 4096) return null
    const keys: string[] = []; for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) keys.push(`${x}:${y}`); return keys
  }
}
/** 按确定顺序换行排列子区域，返回偏移与整体尺寸。 */
function pack(items: Array<{ id: string; width: number; height: number }>, gap: number): { offsets: Map<string, LayoutPoint>; width: number; height: number } {
  const area = items.reduce(/** 汇总含间距面积，为换行宽度提供近似目标。 */ (sum, item) => sum + (item.width + gap) * (item.height + gap), 0)
  const target = Math.max(800, Math.sqrt(area) * 1.3, ...items.map(/** 最宽子区域不能被包装目标宽度截断。 */ item => item.width))
  const offsets = new Map<string, LayoutPoint>(); let x = 0, y = 0, rowHeight = 0, width = 0
  for (const item of items) {
    if (x > 0 && x + item.width > target) { x = 0; y += rowHeight + gap; rowHeight = 0 }
    offsets.set(item.id, { x, y }); width = Math.max(width, x + item.width); rowHeight = Math.max(rowHeight, item.height); x += item.width + gap
  }
  return { offsets, width, height: items.length ? y + rowHeight : 0 }
}
/** 移除重复点和共线中间点，保持原折线路径。 */
function compact(points: LayoutPoint[]): LayoutPoint[] {
  const result: LayoutPoint[] = []
  for (const value of points) {
    const last = result.at(-1); if (last?.x === value.x && last.y === value.y) continue
    const previous = result.at(-2)
    if (previous && last && ((previous.x === last.x && last.x === value.x) || (previous.y === last.y && last.y === value.y))) result.pop()
    result.push(value)
  }
  return result
}
/** 查询线段覆盖的障碍矩形，排除允许穿过的端点所属节点。 */
function segmentObstacles(a: LayoutPoint, b: LayoutPoint, index: RectangleIndex, ignored: Set<string>): Array<[string, LayoutRect]> {
  if (a.x !== b.x && a.y !== b.y) throw new Error('Wire routing requires orthogonal segments.')
  const box = { x: Math.min(a.x, b.x) - .01, y: Math.min(a.y, b.y) - .01, width: Math.abs(a.x - b.x) + .02, height: Math.abs(a.y - b.y) + .02 }
  return index.query(box).filter(/** 排除允许触及的端点所属节点。 */ ([id]) => !ignored.has(id))
}
/** 先尝试正交折线，再在有界可见网格寻路；无法避让时返回空。 */
function routeBetween(start: LayoutPoint, end: LayoutPoint, index: RectangleIndex, ignored: Set<string>): LayoutPoint[] | null {
  const obstacles = new Map<string, LayoutRect>()
  const inspect = /** 检查路径每段并收集阻挡矩形，供下一轮候选与有界搜索使用。 */ (points: LayoutPoint[]): boolean => {
    let clear = true
    for (let i = 1; i < points.length; i++) for (const [id, rect] of segmentObstacles(points[i - 1], points[i], index, ignored)) { obstacles.set(id, rect); clear = false }
    return clear
  }
  const middleX = (start.x + end.x) / 2, middleY = (start.y + end.y) / 2
  const first = [
    [start, { x: end.x, y: start.y }, end], [start, { x: start.x, y: end.y }, end],
    [start, { x: start.x, y: middleY }, { x: end.x, y: middleY }, end],
    [start, { x: middleX, y: start.y }, { x: middleX, y: end.y }, end]
  ]
  for (const candidate of first) if (inspect(candidate)) return compact(candidate)
  // 长连线可能横跨多个折叠区域；先尝试障碍边界旁的有限直通走廊。
  // 每轴最多 32 条候选，仍检查全部路径段，不扩大后续可见网格的节点预算。
  const boundaryLanes = /** 从已发现障碍的两侧提取有界候选，不改变障碍矩形或固定节点。 */ (axis: 'x' | 'y', middle: number): number[] => {
    const values = new Set<number>()
    for (const rect of obstacles.values()) { values.add(rect[axis] - 1); values.add(rect[axis] + (axis === 'x' ? rect.width : rect.height) + 1) }
    return [...values].sort(/** 优先靠近端点中线；相同距离按坐标排序以保持确定性。 */ (a, b) => Math.abs(a - middle) - Math.abs(b - middle) || a - b).slice(0, 32)
  }
  const horizontalLanes = boundaryLanes('y', middleY), verticalLanes = boundaryLanes('x', middleX)
  for (const y of horizontalLanes) { const candidate = [start, { x: start.x, y }, { x: end.x, y }, end]; if (inspect(candidate)) return compact(candidate) }
  for (const x of verticalLanes) { const candidate = [start, { x, y: start.y }, { x, y: end.y }, end]; if (inspect(candidate)) return compact(candidate) }
  // Grow a small deterministic visibility grid only for obstacles intersecting attempted paths.
  for (let attempt = 0; attempt < 4 && obstacles.size <= 48; attempt++) {
    const xs = [...new Set([start.x, end.x, ...[...obstacles.values()].flatMap(/** 取障碍左右外侧网格线。 */ rect => [rect.x - 1, rect.x + rect.width + 1])])].sort(/** 坐标升序，保证网格邻接关系确定。 */ (a, b) => a - b)
    const ys = [...new Set([start.y, end.y, ...[...obstacles.values()].flatMap(/** 取障碍上下外侧网格线。 */ rect => [rect.y - 1, rect.y + rect.height + 1])])].sort(/** 坐标升序，保证网格邻接关系确定。 */ (a, b) => a - b)
    const w = xs.length, begin = ys.indexOf(start.y) * w + xs.indexOf(start.x), finish = ys.indexOf(end.y) * w + xs.indexOf(end.x)
    const parent = new Map<number, number>(), queue = [begin], visited = new Set([begin]); let cursor = 0
    while (cursor < queue.length) {
      const at = queue[cursor++]; if (at === finish) { const path = [end]; let previous = at; while (previous !== begin) { previous = parent.get(previous)!; path.push({ x: xs[previous % w], y: ys[Math.floor(previous / w)] }) }; return compact(path.reverse()) }
      const x = at % w, y = Math.floor(at / w), current = { x: xs[x], y: ys[y] }
      const adjacent = [x + 1 < w ? at + 1 : -1, y + 1 < ys.length ? at + w : -1, x > 0 ? at - 1 : -1, y > 0 ? at - w : -1]
      for (const next of adjacent) if (next >= 0 && !visited.has(next)) {
        const destination = { x: xs[next % w], y: ys[Math.floor(next / w)] }
        if (inspect([current, destination])) { visited.add(next); parent.set(next, at); queue.push(next) }
      }
    }
  }
  return null
}
/** Exposed for geometric regression checks, not renderer hit-testing. */
/** 检查完整折线是否穿入指定节点，供实际几何回归验证使用。 */
export function layoutRouteIntersectsNode(route: readonly LayoutPoint[], rect: LayoutRect): boolean {
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1], b = route[i]
    if (a.x === b.x && a.x > rect.x && a.x < rect.x + rect.width && Math.max(a.y, b.y) > rect.y && Math.min(a.y, b.y) < rect.y + rect.height) return true
    if (a.y === b.y && a.y > rect.y && a.y < rect.y + rect.height && Math.max(a.x, b.x) > rect.x && Math.min(a.x, b.x) < rect.x + rect.width) return true
  }
  return false
}
/** 分阶段校验、建森林、测量、摆放和布线；固定节点只作为障碍，不写入移动结果。 */
function* steps(request: GraphLayoutRequest): Generator<GraphLayoutProgress, GraphLayoutResult> {
  const started = performance.now(), diagnostics: GraphLayoutDiagnostic[] = []
  if (request.nodes.length > MAX_NODES || request.edges.length > MAX_EDGES) throw new Error('Layout exceeds 10,000 nodes or 20,000 edges.')
  const gap = request.gap === undefined ? 36 : request.gap
  if (!finite(gap) || gap < 16 || gap > 512) throw new Error('Layout gap must be between 16 and 512 graph units.')
  const nodes = [...request.nodes].sort(/** 按稳定身份排序，消除输入数组顺序的影响。 */ (a, b) => compare(a.uuid, b.uuid)), all = new Map<string, LayoutNode>(), dimensions = new Map<string, LayoutSize>(), pinOrder = new Map<string, number>()
  for (const [i, node] of nodes.entries()) {
    if (!node.uuid || all.has(node.uuid)) throw new Error('Layout node identities must be nonempty and unique.')
    point(node.position); all.set(node.uuid, node); dimensions.set(node.uuid, size(request.measuredBounds?.[node.uuid] ?? (node.collapsed ? { width: node.size.width, height: 40 } : node.size)))
    node.pins?.forEach(/** 记录原端口顺序，使分支布局与编辑器槽顺序一致。 */ (pin, index) => pinOrder.set(pin.uuid, index))
    if (i % CHUNK === 0) yield { phase: 'index', completed: i, total: nodes.length }
  }
  const selected = request.selectedNodeUuids === undefined ? new Set(all.keys()) : new Set(request.selectedNodeUuids)
  for (const id of selected) if (!all.has(id)) throw new Error(`Selected layout node is missing: ${id}`)
  for (const id of request.fixedNodeUuids ?? []) {
    if (!all.has(id)) throw new Error(`Fixed layout node is missing: ${id}`)
    selected.delete(id)
  }
  const outgoing = new Map<string, Array<{ target: string; order: number; edgeUuid: string }>>(), incoming = new Set<string>(), edges = [...request.edges].sort(/** 按稳定身份排序，消除输入数组顺序的影响。 */ (a, b) => compare(a.uuid, b.uuid)), seenEdges = new Set<string>()
  for (const edge of edges) {
    if (!edge.uuid || seenEdges.has(edge.uuid)) throw new Error('Layout edge identities must be nonempty and unique.'); seenEdges.add(edge.uuid)
    if (edge.reroutes && edge.reroutes.length > 128) throw new Error('A wire exceeds 128 retained routing waypoints.')
    if (!all.has(edge.from.nodeUuid) || !all.has(edge.to.nodeUuid)) { diagnostics.push({ code: 'MISSING_ENDPOINT', message: 'Wire endpoint is missing; this wire is excluded from layout.', edgeUuid: edge.uuid }); continue }
    if (!selected.has(edge.from.nodeUuid) || !selected.has(edge.to.nodeUuid)) continue
    const typed = all.get(edge.from.nodeUuid)!.type.startsWith('rhai.') && all.get(edge.to.nodeUuid)!.type.startsWith('rhai.')
    const parent = typed ? edge.to : edge.from, child = typed ? edge.from : edge.to
    const list = outgoing.get(parent.nodeUuid) ?? []; list.push({ target: child.nodeUuid, order: pinOrder.get(parent.pinUuid) ?? 0, edgeUuid: edge.uuid }); outgoing.set(parent.nodeUuid, list); incoming.add(child.nodeUuid)
  }
  for (const list of outgoing.values()) list.sort(/** 依次按端口、目标和连线身份稳定选择子树顺序。 */ (a, b) => a.order - b.order || compare(a.target, b.target) || compare(a.edgeUuid, b.edgeUuid))
  const tree = new Map<string, TreeNode>(), roots: string[] = [], postorder: string[] = [], visited = new Set<string>(); let foldedEdges = 0
  const candidates = [...nodes.filter(/** 优先从没有选区内入边的节点建立森林。 */ node => selected.has(node.uuid) && !incoming.has(node.uuid)), ...nodes.filter(/** 只纳入本次允许移动的节点。 */ node => selected.has(node.uuid))]
  for (const candidate of candidates) {
    if (visited.has(candidate.uuid)) continue
    roots.push(candidate.uuid)
    const stack: Array<{ id: string; parent: string | null; depth: number; finish: boolean }> = [{ id: candidate.uuid, parent: null, depth: 0, finish: false }]
    while (stack.length) {
      const entry = stack.pop()!
      if (entry.finish) { postorder.push(entry.id); continue }
      if (visited.has(entry.id)) continue
      visited.add(entry.id); const node = all.get(entry.id)!, measured = dimensions.get(entry.id)!
      tree.set(entry.id, { node, size: measured, children: [], offsets: new Map(), width: measured.width, height: measured.height, parent: entry.parent })
      if (entry.parent) tree.get(entry.parent)!.children.push(entry.id)
      stack.push({ ...entry, finish: true })
      const next = outgoing.get(entry.id) ?? []
      for (let i = next.length - 1; i >= 0; i--) {
        if (visited.has(next[i].target)) continue
        if (entry.depth >= MAX_DEPTH) { foldedEdges++; continue }
        stack.push({ id: next[i].target, parent: entry.id, depth: entry.depth + 1, finish: false })
      }
      if (visited.size % CHUNK === 0) yield { phase: 'forest', completed: visited.size, total: selected.size }
    }
  }
  if (foldedEdges) diagnostics.push({ code: 'DEPTH_FOLDED', message: `${foldedEdges} deep links continue in separate regions; their wires and node identities are retained.` })
  for (const [i, id] of postorder.entries()) {
    const item = tree.get(id)!
    const packed = pack(item.children.map(/** 用已计算的子树宽高进行区域包装。 */ child => ({ id: child, width: tree.get(child)!.width, height: tree.get(child)!.height })), gap)
    for (const [child, offset] of packed.offsets) item.offsets.set(child, { x: offset.x + 56, y: offset.y + item.size.height + gap })
    item.width = Math.max(item.size.width, item.children.length ? packed.width + 56 : 0); item.height = item.size.height + (item.children.length ? gap + packed.height : 0)
    if (i % CHUNK === 0) yield { phase: 'measure', completed: i, total: tree.size }
  }
  const origin = request.origin ? point(request.origin) : { x: selected.size && selected.size !== nodes.length ? Math.min(...nodes.filter(/** 只纳入本次允许移动的节点。 */ node => selected.has(node.uuid)).map(/** 以选区最左位置作为默认水平起点。 */ node => node.position.x)) : 70, y: selected.size && selected.size !== nodes.length ? Math.min(...nodes.filter(/** 只纳入本次允许移动的节点。 */ node => selected.has(node.uuid)).map(/** 以选区最上位置作为默认垂直起点。 */ node => node.position.y)) : 70 }
  const packed = pack(roots.map(/** 将独立根子树作为整体包装，保持内部布局不变。 */ id => ({ id, width: tree.get(id)!.width, height: tree.get(id)!.height })), gap * 2), occupied = new RectangleIndex(), boxes = new Map<string, LayoutRect>(), positions: Record<string, LayoutPoint> = {}, regionOrigins = new Map<string, LayoutPoint>()
  let fixedRight = origin.x, placedCount = 0
  for (const node of nodes) if (!selected.has(node.uuid)) { const rect = { ...node.position, ...dimensions.get(node.uuid)! }; occupied.add(node.uuid, padded(rect, gap * .5)); boxes.set(node.uuid, rect); fixedRight = Math.max(fixedRight, rect.x + rect.width + gap) }
  for (const id of roots) {
    const item = tree.get(id)!, offset = packed.offsets.get(id)!, place = { x: origin.x + offset.x, y: origin.y + offset.y }
    let overlaps = occupied.query({ ...place, width: item.width, height: item.height })
    if (overlaps.length) { place.x = Math.max(fixedRight, ...overlaps.map(/** 把待放区域移到相交障碍右侧并保留间距。 */ ([, rect]) => rect.x + rect.width + gap)); overlaps = occupied.query({ ...place, width: item.width, height: item.height }); while (overlaps.length) { place.x = Math.max(...overlaps.map(/** 把待放区域移到相交障碍右侧并保留间距。 */ ([, rect]) => rect.x + rect.width + gap)); overlaps = occupied.query({ ...place, width: item.width, height: item.height }) } }
    occupied.add(`region:${id}`, padded({ ...place, width: item.width, height: item.height }, gap * .5))
    const stack = [{ id, place }]
    while (stack.length) {
      const entry = stack.pop()!, current = tree.get(entry.id)!
      positions[entry.id] = entry.place; regionOrigins.set(entry.id, entry.place); boxes.set(entry.id, { ...entry.place, ...current.size })
      placedCount++
      for (let i = current.children.length - 1; i >= 0; i--) { const child = current.children[i], local = current.offsets.get(child)!; stack.push({ id: child, place: { x: entry.place.x + local.x, y: entry.place.y + local.y } }) }
      if (placedCount % CHUNK === 0) yield { phase: 'place', completed: boxes.size, total: nodes.length }
    }
  }
  const regions: GraphLayoutRegion[] = []
  for (const [id, item] of tree) if (item.children.length && (REGION_KINDS.has(item.node.type.slice(5)) || /(?:loop|branch|condition)/i.test(item.node.type))) {
    const nodeUuids: string[] = [], pending = [id]; while (pending.length) { const child = pending.pop()!; nodeUuids.push(child); pending.push(...tree.get(child)!.children) }
    let parent = item.parent; while (parent && !REGION_KINDS.has(tree.get(parent)!.node.type.slice(5)) && !/(?:loop|branch|condition)/i.test(tree.get(parent)!.node.type)) parent = tree.get(parent)!.parent
    regions.push({ nodeUuid: id, parentRegionUuid: parent, rect: padded({ ...regionOrigins.get(id)!, width: item.width, height: item.height }, 8), nodeUuids })
  }
  const obstacleIndex = new RectangleIndex(); for (const [id, rect] of boxes) obstacleIndex.add(id, padded(rect, 4))
  const routes: Record<string, LayoutPoint[]> = {}; let routeFailures = 0
  for (const [i, edge] of edges.entries()) {
    const from = boxes.get(edge.from.nodeUuid), to = boxes.get(edge.to.nodeUuid)
    if (!from || !to || (selected.size > 0 && !selected.has(edge.from.nodeUuid) && !selected.has(edge.to.nodeUuid))) continue
    const fromPort = request.measuredPorts?.[edge.from.pinUuid] ? point(request.measuredPorts[edge.from.pinUuid]) : undefined, toPort = request.measuredPorts?.[edge.to.pinUuid] ? point(request.measuredPorts[edge.to.pinUuid]) : undefined
    const start = fromPort ? { x: from.x + fromPort.x, y: from.y + fromPort.y } : { x: from.x + from.width, y: from.y + from.height / 2 }
    const end = toPort ? { x: to.x + toPort.x, y: to.y + toPort.y } : { x: to.x, y: to.y + to.height / 2 }
    const startStub = { x: start.x + 12, y: start.y }, endStub = { x: end.x - 12, y: end.y }, ignored = new Set<string>()
    const waypoints = [startStub, ...(request.preserveReroutes !== false ? (edge.reroutes ?? []).map(point) : []), endStub], route = [start]
    let failed = segmentObstacles(start, startStub, obstacleIndex, new Set([edge.from.nodeUuid])).length > 0 || segmentObstacles(endStub, end, obstacleIndex, new Set([edge.to.nodeUuid])).length > 0
    for (let at = 1; at < waypoints.length; at++) { const part = routeBetween(waypoints[at - 1], waypoints[at], obstacleIndex, ignored); if (!part) { failed = true; break }; route.push(...part) }
    if (failed) { routeFailures++; diagnostics.push({ code: 'WIRE_ROUTE_BLOCKED', message: 'No clear bounded wire route was found. Retained manual waypoints may lie inside a node; move the waypoint or use route reset.', edgeUuid: edge.uuid }) }
    else routes[edge.uuid] = compact([...route, end])
    if (i % 8 === 0) yield { phase: 'route', completed: i, total: edges.length }
  }
  return { positions, routes, regions, diagnostics, metrics: { nodeCount: nodes.length, edgeCount: edges.length, movedNodes: selected.size, fixedNodes: nodes.length - selected.size, measuredNodes: nodes.filter(/** 统计使用了真实测量尺寸的节点。 */ node => request.measuredBounds?.[node.uuid]).length, foldedEdges, routeFailures, elapsedMs: performance.now() - started } }
}
/** 同步消费纯布局步骤，供离线导入和确定性验证使用。 */
export function layoutGraph(request: GraphLayoutRequest): GraphLayoutResult { const iterator = steps(request); let result = iterator.next(); while (!result.done) result = iterator.next(); return result.value }
/** 按时间预算让出主线程并检查取消信号，保持与同步算法相同的几何结果。 */
export async function layoutGraphAsync(request: GraphLayoutRequest, options: { signal?: AbortSignal; onProgress?: (value: GraphLayoutProgress) => void; yieldControl?: () => Promise<void> } = {}): Promise<GraphLayoutResult> {
  const iterator = steps(request); let lastYield = performance.now()
  while (true) {
    if (options.signal?.aborted) throw aborted()
    const result = iterator.next(); if (result.done) return result.value
    options.onProgress?.(result.value)
    if (performance.now() - lastYield >= 8) { await (options.yieldControl?.() ?? new Promise<void>(/** 将控制权还给事件循环，使取消与界面输入有机会处理。 */ resolve => setTimeout(resolve, 0))); lastYield = performance.now() }
  }
}
