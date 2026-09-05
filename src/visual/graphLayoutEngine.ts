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
  /** Pin coordinates relative to their node's top-left corner, in graph units. */
  measuredPorts?: Readonly<Record<string, LayoutPoint>>
  /** Omitted means all. An explicitly empty selection moves no nodes. */
  selectedNodeUuids?: readonly string[]
  origin?: LayoutPoint
  gap?: number
  preserveReroutes?: boolean
}
export interface GraphLayoutProgress { phase: 'index' | 'forest' | 'measure' | 'place' | 'route'; completed: number; total: number }
export interface GraphLayoutDiagnostic { code: string; message: string; nodeUuid?: string; edgeUuid?: string }
export interface GraphLayoutRegion { nodeUuid: string; parentRegionUuid: string | null; rect: LayoutRect; nodeUuids: string[] }
export interface GraphLayoutResult {
  positions: Record<string, LayoutPoint>
  /** Complete orthogonal polylines, including endpoint coordinates. Manual reroutes are retained as waypoints. */
  routes: Record<string, LayoutPoint[]>
  regions: GraphLayoutRegion[]
  diagnostics: GraphLayoutDiagnostic[]
  metrics: { nodeCount: number; edgeCount: number; movedNodes: number; fixedNodes: number; measuredNodes: number; foldedEdges: number; routeFailures: number; elapsedMs: number }
}
interface TreeNode { node: LayoutNode; size: LayoutSize; children: string[]; offsets: Map<string, LayoutPoint>; width: number; height: number; parent: string | null }
const MAX_NODES = 10_000, MAX_EDGES = 20_000, MAX_DEPTH = 32, CHUNK = 128
const REGION_KINDS = new Set(['Program', 'Block', 'FunctionDeclaration', 'Closure', 'If', 'For', 'While', 'Loop', 'DoWhile', 'Switch', 'SwitchCase', 'Try'])
const compare = (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0
const finite = (value: number): boolean => typeof value === 'number' && Number.isFinite(value)
const point = (value: LayoutPoint): LayoutPoint => { if (!value || !finite(value.x) || !finite(value.y)) throw new Error('Layout coordinates must be finite.'); return { x: value.x, y: value.y } }
function size(value: LayoutSize): LayoutSize { if (!value || !finite(value.width) || !finite(value.height) || value.width < 1 || value.height < 1 || value.width > 100_000 || value.height > 100_000) throw new Error('Measured node bounds must be positive finite sizes at most 100,000 graph units.'); return { width: value.width, height: value.height } }
function aborted(): Error { const error = new Error('Graph layout cancelled.'); error.name = 'AbortError'; return error }
const rectsOverlap = (a: LayoutRect, b: LayoutRect): boolean => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
const padded = (rect: LayoutRect, amount: number): LayoutRect => ({ x: rect.x - amount, y: rect.y - amount, width: rect.width + amount * 2, height: rect.height + amount * 2 })
class RectangleIndex {
  private buckets = new Map<string, Set<string>>()
  private large = new Set<string>()
  readonly rectangles = new Map<string, LayoutRect>()
  add(id: string, rect: LayoutRect): void {
    this.rectangles.set(id, rect)
    const keys = this.keys(rect)
    if (!keys) { this.large.add(id); return }
    for (const key of keys) { let bucket = this.buckets.get(key); if (!bucket) { bucket = new Set(); this.buckets.set(key, bucket) }; bucket.add(id) }
  }
  query(rect: LayoutRect): Array<[string, LayoutRect]> {
    const keys = this.keys(rect), ids = new Set(this.large)
    if (keys) for (const key of keys) for (const id of this.buckets.get(key) ?? []) ids.add(id)
    else for (const id of this.rectangles.keys()) ids.add(id)
    return [...ids].flatMap(id => { const value = this.rectangles.get(id)!; return rectsOverlap(rect, value) ? [[id, value] as [string, LayoutRect]] : [] })
  }
  private keys(rect: LayoutRect): string[] | null {
    const x0 = Math.floor(rect.x / 512), y0 = Math.floor(rect.y / 512), x1 = Math.floor((rect.x + rect.width) / 512), y1 = Math.floor((rect.y + rect.height) / 512)
    if ((x1 - x0 + 1) * (y1 - y0 + 1) > 4096) return null
    const keys: string[] = []; for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) keys.push(`${x}:${y}`); return keys
  }
}
function pack(items: Array<{ id: string; width: number; height: number }>, gap: number): { offsets: Map<string, LayoutPoint>; width: number; height: number } {
  const area = items.reduce((sum, item) => sum + (item.width + gap) * (item.height + gap), 0)
  const target = Math.max(800, Math.sqrt(area) * 1.3, ...items.map(item => item.width))
  const offsets = new Map<string, LayoutPoint>(); let x = 0, y = 0, rowHeight = 0, width = 0
  for (const item of items) {
    if (x > 0 && x + item.width > target) { x = 0; y += rowHeight + gap; rowHeight = 0 }
    offsets.set(item.id, { x, y }); width = Math.max(width, x + item.width); rowHeight = Math.max(rowHeight, item.height); x += item.width + gap
  }
  return { offsets, width, height: items.length ? y + rowHeight : 0 }
}
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
function segmentObstacles(a: LayoutPoint, b: LayoutPoint, index: RectangleIndex, ignored: Set<string>): Array<[string, LayoutRect]> {
  if (a.x !== b.x && a.y !== b.y) throw new Error('Wire routing requires orthogonal segments.')
  const box = { x: Math.min(a.x, b.x) - .01, y: Math.min(a.y, b.y) - .01, width: Math.abs(a.x - b.x) + .02, height: Math.abs(a.y - b.y) + .02 }
  return index.query(box).filter(([id]) => !ignored.has(id))
}
function routeBetween(start: LayoutPoint, end: LayoutPoint, index: RectangleIndex, ignored: Set<string>): LayoutPoint[] | null {
  const obstacles = new Map<string, LayoutRect>()
  const inspect = (points: LayoutPoint[]): boolean => {
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
  // Grow a small deterministic visibility grid only for obstacles intersecting attempted paths.
  for (let attempt = 0; attempt < 4 && obstacles.size <= 48; attempt++) {
    const xs = [...new Set([start.x, end.x, ...[...obstacles.values()].flatMap(rect => [rect.x - 1, rect.x + rect.width + 1])])].sort((a, b) => a - b)
    const ys = [...new Set([start.y, end.y, ...[...obstacles.values()].flatMap(rect => [rect.y - 1, rect.y + rect.height + 1])])].sort((a, b) => a - b)
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
export function layoutRouteIntersectsNode(route: readonly LayoutPoint[], rect: LayoutRect): boolean {
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1], b = route[i]
    if (a.x === b.x && a.x > rect.x && a.x < rect.x + rect.width && Math.max(a.y, b.y) > rect.y && Math.min(a.y, b.y) < rect.y + rect.height) return true
    if (a.y === b.y && a.y > rect.y && a.y < rect.y + rect.height && Math.max(a.x, b.x) > rect.x && Math.min(a.x, b.x) < rect.x + rect.width) return true
  }
  return false
}
function* steps(request: GraphLayoutRequest): Generator<GraphLayoutProgress, GraphLayoutResult> {
  const started = performance.now(), diagnostics: GraphLayoutDiagnostic[] = []
  if (request.nodes.length > MAX_NODES || request.edges.length > MAX_EDGES) throw new Error('Layout exceeds 10,000 nodes or 20,000 edges.')
  const gap = request.gap === undefined ? 36 : request.gap
  if (!finite(gap) || gap < 16 || gap > 512) throw new Error('Layout gap must be between 16 and 512 graph units.')
  const nodes = [...request.nodes].sort((a, b) => compare(a.uuid, b.uuid)), all = new Map<string, LayoutNode>(), dimensions = new Map<string, LayoutSize>(), pinOrder = new Map<string, number>()
  for (const [i, node] of nodes.entries()) {
    if (!node.uuid || all.has(node.uuid)) throw new Error('Layout node identities must be nonempty and unique.')
    point(node.position); all.set(node.uuid, node); dimensions.set(node.uuid, size(request.measuredBounds?.[node.uuid] ?? (node.collapsed ? { width: node.size.width, height: 40 } : node.size)))
    node.pins?.forEach((pin, index) => pinOrder.set(pin.uuid, index))
    if (i % CHUNK === 0) yield { phase: 'index', completed: i, total: nodes.length }
  }
  const selected = request.selectedNodeUuids === undefined ? new Set(all.keys()) : new Set(request.selectedNodeUuids)
  for (const id of selected) if (!all.has(id)) throw new Error(`Selected layout node is missing: ${id}`)
  const outgoing = new Map<string, Array<{ target: string; order: number; edgeUuid: string }>>(), incoming = new Set<string>(), edges = [...request.edges].sort((a, b) => compare(a.uuid, b.uuid)), seenEdges = new Set<string>()
  for (const edge of edges) {
    if (!edge.uuid || seenEdges.has(edge.uuid)) throw new Error('Layout edge identities must be nonempty and unique.'); seenEdges.add(edge.uuid)
    if (edge.reroutes && edge.reroutes.length > 128) throw new Error('A wire exceeds 128 retained routing waypoints.')
    if (!all.has(edge.from.nodeUuid) || !all.has(edge.to.nodeUuid)) { diagnostics.push({ code: 'MISSING_ENDPOINT', message: 'Wire endpoint is missing; this wire is excluded from layout.', edgeUuid: edge.uuid }); continue }
    if (!selected.has(edge.from.nodeUuid) || !selected.has(edge.to.nodeUuid)) continue
    const typed = all.get(edge.from.nodeUuid)!.type.startsWith('rhai.') && all.get(edge.to.nodeUuid)!.type.startsWith('rhai.')
    const parent = typed ? edge.to : edge.from, child = typed ? edge.from : edge.to
    const list = outgoing.get(parent.nodeUuid) ?? []; list.push({ target: child.nodeUuid, order: pinOrder.get(parent.pinUuid) ?? 0, edgeUuid: edge.uuid }); outgoing.set(parent.nodeUuid, list); incoming.add(child.nodeUuid)
  }
  for (const list of outgoing.values()) list.sort((a, b) => a.order - b.order || compare(a.target, b.target) || compare(a.edgeUuid, b.edgeUuid))
  const tree = new Map<string, TreeNode>(), roots: string[] = [], postorder: string[] = [], visited = new Set<string>(); let foldedEdges = 0
  const candidates = [...nodes.filter(node => selected.has(node.uuid) && !incoming.has(node.uuid)), ...nodes.filter(node => selected.has(node.uuid))]
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
    const packed = pack(item.children.map(child => ({ id: child, width: tree.get(child)!.width, height: tree.get(child)!.height })), gap)
    for (const [child, offset] of packed.offsets) item.offsets.set(child, { x: offset.x + 56, y: offset.y + item.size.height + gap })
    item.width = Math.max(item.size.width, item.children.length ? packed.width + 56 : 0); item.height = item.size.height + (item.children.length ? gap + packed.height : 0)
    if (i % CHUNK === 0) yield { phase: 'measure', completed: i, total: tree.size }
  }
  const origin = request.origin ? point(request.origin) : { x: selected.size && selected.size !== nodes.length ? Math.min(...nodes.filter(node => selected.has(node.uuid)).map(node => node.position.x)) : 70, y: selected.size && selected.size !== nodes.length ? Math.min(...nodes.filter(node => selected.has(node.uuid)).map(node => node.position.y)) : 70 }
  const packed = pack(roots.map(id => ({ id, width: tree.get(id)!.width, height: tree.get(id)!.height })), gap * 2), occupied = new RectangleIndex(), boxes = new Map<string, LayoutRect>(), positions: Record<string, LayoutPoint> = {}, regionOrigins = new Map<string, LayoutPoint>()
  let fixedRight = origin.x, placedCount = 0
  for (const node of nodes) if (!selected.has(node.uuid)) { const rect = { ...node.position, ...dimensions.get(node.uuid)! }; occupied.add(node.uuid, padded(rect, gap * .5)); boxes.set(node.uuid, rect); fixedRight = Math.max(fixedRight, rect.x + rect.width + gap) }
  for (const id of roots) {
    const item = tree.get(id)!, offset = packed.offsets.get(id)!, place = { x: origin.x + offset.x, y: origin.y + offset.y }
    let overlaps = occupied.query({ ...place, width: item.width, height: item.height })
    if (overlaps.length) { place.x = Math.max(fixedRight, ...overlaps.map(([, rect]) => rect.x + rect.width + gap)); overlaps = occupied.query({ ...place, width: item.width, height: item.height }); while (overlaps.length) { place.x = Math.max(...overlaps.map(([, rect]) => rect.x + rect.width + gap)); overlaps = occupied.query({ ...place, width: item.width, height: item.height }) } }
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
  return { positions, routes, regions, diagnostics, metrics: { nodeCount: nodes.length, edgeCount: edges.length, movedNodes: selected.size, fixedNodes: nodes.length - selected.size, measuredNodes: nodes.filter(node => request.measuredBounds?.[node.uuid]).length, foldedEdges, routeFailures, elapsedMs: performance.now() - started } }
}
export function layoutGraph(request: GraphLayoutRequest): GraphLayoutResult { const iterator = steps(request); let result = iterator.next(); while (!result.done) result = iterator.next(); return result.value }
export async function layoutGraphAsync(request: GraphLayoutRequest, options: { signal?: AbortSignal; onProgress?: (value: GraphLayoutProgress) => void; yieldControl?: () => Promise<void> } = {}): Promise<GraphLayoutResult> {
  const iterator = steps(request); let lastYield = performance.now()
  while (true) {
    if (options.signal?.aborted) throw aborted()
    const result = iterator.next(); if (result.done) return result.value
    options.onProgress?.(result.value)
    if (performance.now() - lastYield >= 8) { await (options.yieldControl?.() ?? new Promise<void>(resolve => setTimeout(resolve, 0))); lastYield = performance.now() }
  }
}
