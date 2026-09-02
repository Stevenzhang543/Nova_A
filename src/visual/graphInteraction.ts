import type { GraphCanvasScope, GraphEdge, GraphNode, GraphViewport } from './graphTypes'

export interface GraphLayoutResult { roots: number; columns: number; visited: number; edgesIndexed: number }

export function focalGraphZoom(viewport: GraphViewport, requestedZoom: number, focalX: number, focalY: number): GraphViewport {
  const oldZoom = Math.min(4, Math.max(.1, Number.isFinite(viewport.zoom) ? viewport.zoom : 1))
  const zoom = Math.min(4, Math.max(.1, Number.isFinite(requestedZoom) ? requestedZoom : oldZoom))
  return { x: focalX - (focalX - viewport.x) * (zoom / oldZoom), y: focalY - (focalY - viewport.y) * (zoom / oldZoom), zoom }
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
  let column = 0
  const placeColumn = (root: GraphNode, x: number): void => {
    let y = 70
    const stack: GraphNode[] = [root]
    while (stack.length) {
      const node = stack.pop()!
      if (visited.has(node.uuid)) continue
      visited.add(node.uuid); node.position = { x, y }; y += Math.max(62, node.size.height) + 10
      const targets = (outgoing.get(node.uuid) ?? []).flatMap(edge => index.get(edge.to.nodeUuid) ?? []).reverse()
      stack.push(...targets)
    }
  }
  for (const root of roots) placeColumn(root, 70 + column++ * 300)
  for (const node of scope.nodes) if (!visited.has(node.uuid)) { node.position = { x: 70 + column * 300, y: 70 }; column++ }
  scope.viewport = { x: 38, y: 42, zoom: 1 }
  return { roots: roots.length, columns: column, visited: visited.size, edgesIndexed }
}

export function useLowDetailGraph(nodes: number, zoom: number): boolean { return nodes > 500 || zoom < .42 }
