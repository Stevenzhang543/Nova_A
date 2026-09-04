import type { GraphCanvasScope, GraphEdge, GraphNode, GraphPoint, GraphSize, GraphViewport } from './graphTypes'

export interface GraphLayoutResult { roots: number; columns: number; visited: number; edgesIndexed: number }
export interface GraphRect extends GraphPoint, GraphSize {}

export const GRAPH_MIN_ZOOM = .1
export const GRAPH_MAX_ZOOM = 4
export const GRAPH_LAYOUT_GAP = 24

function finite(value: number, fallback = 0): number { return Number.isFinite(value) ? value : fallback }
function clampZoom(value: number, fallback = 1): number { return Math.min(GRAPH_MAX_ZOOM, Math.max(GRAPH_MIN_ZOOM, finite(value, fallback))) }

export function focalGraphZoom(viewport: GraphViewport, requestedZoom: number, focalX: number, focalY: number): GraphViewport {
  const oldZoom = clampZoom(viewport.zoom), zoom = clampZoom(requestedZoom, oldZoom), x = finite(viewport.x), y = finite(viewport.y), focusX = finite(focalX), focusY = finite(focalY)
  return { x: focusX - (focusX - x) * (zoom / oldZoom), y: focusY - (focusY - y) * (zoom / oldZoom), zoom }
}

/** Normalizes browser wheel units and preserves the graph point below the pointer. */
export function wheelGraphZoom(viewport: GraphViewport, deltaY: number, deltaMode: number, focalX: number, focalY: number): GraphViewport {
  const unit = deltaMode === 1 ? 16 : deltaMode === 2 ? 320 : 1
  const normalized = Math.min(240, Math.abs(finite(deltaY) * unit))
  const direction = deltaY < 0 ? 1 : deltaY > 0 ? -1 : 0
  return focalGraphZoom(viewport, viewport.zoom * Math.exp(direction * normalized * .0018), focalX, focalY)
}

export function stepGraphZoom(viewport: GraphViewport, step: number, focalX: number, focalY: number): GraphViewport {
  return focalGraphZoom(viewport, viewport.zoom + finite(step), focalX, focalY)
}

export function panGraphViewport(viewport: GraphViewport, deltaX: number, deltaY: number): GraphViewport {
  return { x: finite(viewport.x) + finite(deltaX), y: finite(viewport.y) + finite(deltaY), zoom: clampZoom(viewport.zoom) }
}

export function dragGraphPoint(start: GraphPoint, deltaX: number, deltaY: number, zoom: number): GraphPoint {
  const scale = clampZoom(zoom)
  return { x: finite(start.x) + finite(deltaX) / scale, y: finite(start.y) + finite(deltaY) / scale }
}

/** The serialized height is a minimum. Inline pin editors and code blocks can make a node taller. */
export function graphNodeLayoutSize(node: GraphNode): GraphSize {
  const pinHeight = 53 + node.pins.length * 28
  const selectorHeight = node.type.startsWith('variable.') || node.type.startsWith('local.') ? 42 : 0
  const sourceHeight = node.type.startsWith('code.') || typeof node.config.rhaiSourceOverride === 'string' ? 126 : 0
  return {
    width: Math.max(112, finite(node.size.width, 224)),
    height: node.collapsed ? 40 : Math.max(finite(node.size.height, 82), pinHeight + selectorHeight + sourceHeight)
  }
}

export function graphNodeRect(node: GraphNode, gap = 0): GraphRect {
  const size = graphNodeLayoutSize(node), padding = Math.max(0, finite(gap))
  return { x: finite(node.position.x) - padding, y: finite(node.position.y) - padding, width: size.width + padding * 2, height: size.height + padding * 2 }
}

export function graphRectsOverlap(a: GraphRect, b: GraphRect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
}

export function graphLayoutOverlaps(nodes: readonly GraphNode[], gap = 0): Array<[string, string]> {
  const result: Array<[string, string]> = [], rects = nodes.map(node => ({ node, rect: graphNodeRect(node, gap * .5) })).sort((a, b) => a.rect.x - b.rect.x)
  for (let index = 0; index < rects.length; index++) {
    const left = rects[index]
    for (let other = index + 1; other < rects.length && rects[other].rect.x < left.rect.x + left.rect.width; other++) if (graphRectsOverlap(left.rect, rects[other].rect)) result.push([left.node.uuid, rects[other].node.uuid])
  }
  return result
}

/** Finds a nearby grid-aligned insertion point without rewriting the user's saved layout. */
export function availableGraphPosition(nodes: readonly GraphNode[], desired: GraphPoint, size: GraphSize, gap = GRAPH_LAYOUT_GAP): GraphPoint {
  const stepX = Math.max(48, finite(size.width, 224) + gap), stepY = Math.max(48, finite(size.height, 82) + gap), origin = { x: finite(desired.x), y: finite(desired.y) }
  const occupied = nodes.map(node => graphNodeRect(node, gap * .5))
  for (let ring = 0; ring <= 64; ring++) {
    const candidates: GraphPoint[] = ring === 0 ? [origin] : [
      { x: origin.x + stepX * ring, y: origin.y }, { x: origin.x, y: origin.y + stepY * ring },
      { x: origin.x - stepX * ring, y: origin.y }, { x: origin.x, y: origin.y - stepY * ring },
      { x: origin.x + stepX * ring, y: origin.y + stepY * ring }, { x: origin.x - stepX * ring, y: origin.y + stepY * ring }
    ]
    for (const point of candidates) {
      const candidate: GraphRect = { x: point.x - gap * .5, y: point.y - gap * .5, width: size.width + gap, height: size.height + gap }
      if (!occupied.some(rect => graphRectsOverlap(candidate, rect))) return point
    }
  }
  return { x: origin.x + stepX * (nodes.length + 1), y: origin.y }
}

function executionOutputPins(nodes: readonly GraphNode[]): Set<string> { return new Set(nodes.flatMap(node => node.pins.filter(pin => pin.kind === 'execution' && pin.direction === 'output').map(pin => pin.uuid))) }

/** O(nodes + edges) Scratch-style layout. It never scans every edge per node. */
export function arrangeExecutionBlocks(scope: GraphCanvasScope): GraphLayoutResult {
  const index = new Map(scope.nodes.map(node => [node.uuid, node])), outputs = executionOutputPins(scope.nodes), incoming = new Set<string>(), outgoing = new Map<string, GraphEdge[]>()
  let edgesIndexed = 0
  for (const edge of scope.edges) {
    if (!outputs.has(edge.from.pinUuid)) continue
    edgesIndexed++
    incoming.add(edge.to.nodeUuid)
    const list = outgoing.get(edge.from.nodeUuid) ?? []
    list.push(edge)
    outgoing.set(edge.from.nodeUuid, list)
  }
  for (const list of outgoing.values()) list.sort((a, b) => a.from.pinUuid.localeCompare(b.from.pinUuid))
  const roots = scope.nodes.filter(node => node.type.startsWith('event.') || node.type.startsWith('custom.event.') || node.type === 'routine.entry' || (!incoming.has(node.uuid) && node.pins.some(pin => pin.kind === 'execution')))
  const visited = new Set<string>()
  let column = 0, columnX = 70
  const placeColumn = (root: GraphNode): void => {
    let y = 70
    const stack: GraphNode[] = [root]
    let widest = 0
    while (stack.length) {
      const node = stack.pop()!
      if (visited.has(node.uuid)) continue
      const size = graphNodeLayoutSize(node)
      visited.add(node.uuid); node.position = { x: columnX, y }; y += size.height + GRAPH_LAYOUT_GAP; widest = Math.max(widest, size.width)
      const targets = (outgoing.get(node.uuid) ?? []).flatMap(edge => index.get(edge.to.nodeUuid) ?? []).reverse()
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

export function useLowDetailGraph(nodes: number, zoom: number): boolean { return nodes > 500 || zoom < .42 }
