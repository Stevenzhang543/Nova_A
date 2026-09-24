/** 图测量缓存归当前作用域所有；保留屏外节点的测量，删除已不存在的节点与端口。 */
import type { LayoutNode, LayoutPoint, LayoutSize } from './graphLayoutEngine'

/** 按当前图标识收缩缓存，防止反复删除和新建节点使旧测量无限累积；不修改输入。 */
export function retainGraphMeasurements(nodes: readonly LayoutNode[], bounds: Readonly<Record<string,LayoutSize>>, ports: Readonly<Record<string,LayoutPoint>>) {
  const nodeIds = new Set<string>(), pinIds = new Set<string>()
  for (const node of nodes) {
    nodeIds.add(node.uuid)
    for (const pin of node.pins ?? []) pinIds.add(pin.uuid)
  }
  const nextBounds:Record<string,LayoutSize>={},nextPorts:Record<string,LayoutPoint>={}
  let removed=0
  for (const [id,value] of Object.entries(bounds)) {
    if(nodeIds.has(id))nextBounds[id]=value
    else removed++
  }
  for (const [id,value] of Object.entries(ports)) {
    if(pinIds.has(id))nextPorts[id]=value
    else removed++
  }
  return {bounds:nextBounds,ports:nextPorts,removed}
}
