import type {GraphNode,GraphPin,GraphPoint} from './graphTypes'

export interface MeasuredGraphSize {width:number;height:number}
export interface GraphOccupiedRect extends MeasuredGraphSize {x:number;y:number}
/** Explicit comment creation finds free space without moving existing authored items. */
export function placeGraphComment(occupied:readonly GraphOccupiedRect[],desired:GraphPoint,size:MeasuredGraphSize):GraphPoint {
  const gap=24,stepX=size.width+gap,stepY=size.height+gap
  const clear=(point:GraphPoint)=>!occupied.some(rect=>point.x<rect.x+rect.width+gap&&point.x+size.width+gap>rect.x&&point.y<rect.y+rect.height+gap&&point.y+size.height+gap>rect.y)
  for(let ring=0;ring<=64;ring++){
    const candidates=ring===0?[desired]:[{x:desired.x+stepX*ring,y:desired.y},{x:desired.x-stepX*ring,y:desired.y},{x:desired.x,y:desired.y+stepY*ring},{x:desired.x,y:desired.y-stepY*ring}]
    const found=candidates.find(clear);if(found)return{...found}
  }
  return{x:occupied.reduce((right,rect)=>Math.max(right,rect.x+rect.width+gap),desired.x),y:desired.y}
}
export function graphEditorNodeSize(node:GraphNode,measured?:MeasuredGraphSize):MeasuredGraphSize {
  if(measured&&Number.isFinite(measured.width)&&Number.isFinite(measured.height)&&measured.width>0&&measured.height>0)return measured
  return {width:Math.max(1,node.size.width),height:node.collapsed?38:Math.max(64,node.size.height)}
}
export function graphEditorPinPoint(node:GraphNode,pin:GraphPin,measured?:GraphPoint,size?:MeasuredGraphSize):GraphPoint {
  if(!node.collapsed&&measured&&Number.isFinite(measured.x)&&Number.isFinite(measured.y))return{x:node.position.x+measured.x,y:node.position.y+measured.y}
  const bounds=graphEditorNodeSize(node,size)
  return{x:node.position.x+(pin.direction==='output'?bounds.width:0),y:node.position.y+(node.collapsed?bounds.height/2:58+Math.max(0,node.pins.indexOf(pin))*26)}
}
export function graphPolylinePath(points:readonly GraphPoint[]):string {
  if(points.length<2||points.some(point=>!Number.isFinite(point.x)||!Number.isFinite(point.y)))return''
  return points.map((point,index)=>`${index?'L':'M'} ${point.x} ${point.y}`).join(' ')
}
/** Spatial navigation uses measured centers and deterministic UUID tie-breaking. */
export function nearestGraphNode(nodes:readonly GraphNode[],currentUuid:string,direction:'left'|'right'|'up'|'down',bounds:Readonly<Record<string,MeasuredGraphSize>>={}):GraphNode|undefined {
  const current=nodes.find(node=>node.uuid===currentUuid);if(!current)return nodes[0]
  const size=graphEditorNodeSize(current,bounds[current.uuid]),origin={x:current.position.x+size.width/2,y:current.position.y+size.height/2}
  let chosen:GraphNode|undefined,best=Infinity
  for(const node of nodes){
    if(node.uuid===currentUuid)continue
    const size=graphEditorNodeSize(node,bounds[node.uuid]),dx=node.position.x+size.width/2-origin.x,dy=node.position.y+size.height/2-origin.y
    const forward=direction==='right'?dx:direction==='left'?-dx:direction==='down'?dy:-dy,cross=direction==='left'||direction==='right'?Math.abs(dy):Math.abs(dx)
    if(forward<=.01)continue
    const score=forward+cross*2+cross*cross/Math.max(1,forward)
    if(score<best||score===best&&node.uuid.localeCompare(chosen?.uuid??'')<0){best=score;chosen=node}
  }
  return chosen
}
