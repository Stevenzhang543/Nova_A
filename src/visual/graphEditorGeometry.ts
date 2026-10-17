/** 可视图编辑器几何：优先采用实测尺寸和引脚位置，提供注释插入、折线路径及确定性的键盘空间导航。 */
import type {GraphNode,GraphPin,GraphPoint} from './graphTypes'

export interface MeasuredGraphSize {width:number;height:number}
export interface GraphOccupiedRect extends MeasuredGraphSize {x:number;y:number}
/** Explicit comment creation finds free space without moving existing authored items. */
/** 在目标点周围按有限圈数寻找不遮挡已有项的位置，失败时放在占用范围右侧。 */ export function placeGraphComment(occupied:readonly GraphOccupiedRect[],desired:GraphPoint,size:MeasuredGraphSize):GraphPoint {
  const gap=24,stepX=size.width+gap,stepY=size.height+gap
  const clear=/** 检查候选注释矩形连同间距是否避开所有已有占用矩形。 */ (point:GraphPoint)=>!occupied.some(/** 检测候选注释与占用矩形加间距后的轴对齐重叠。 */ rect=>point.x<rect.x+rect.width+gap&&point.x+size.width+gap>rect.x&&point.y<rect.y+rect.height+gap&&point.y+size.height+gap>rect.y)
  for(let ring=0;ring<=64;ring++){
    const candidates=ring===0?[desired]:[{x:desired.x+stepX*ring,y:desired.y},{x:desired.x-stepX*ring,y:desired.y},{x:desired.x,y:desired.y+stepY*ring},{x:desired.x,y:desired.y-stepY*ring}]
    const found=candidates.find(clear);if(found)return{...found}
  }
  return{x:occupied.reduce(/* 调用 Math.max(right,rect.x+rect.width+gap) 并返回调用结果。 */ (right,rect)=>Math.max(right,rect.x+rect.width+gap),desired.x),y:desired.y}
}
/** 优先使用有效实测尺寸，否则根据序列化尺寸和折叠状态生成安全后备尺寸。 */ export function graphEditorNodeSize(node:GraphNode,measured?:MeasuredGraphSize):MeasuredGraphSize {
  if(measured&&Number.isFinite(measured.width)&&Number.isFinite(measured.height)&&measured.width>0&&measured.height>0)return measured
  return {width:Math.max(1,node.size.width),height:node.collapsed?38:Math.max(64,node.size.height)}
}
/** 展开节点优先使用实测引脚偏移；否则按节点边界、折叠状态和引脚序号估算连接点。 */ export function graphEditorPinPoint(node:GraphNode,pin:GraphPin,measured?:GraphPoint,size?:MeasuredGraphSize):GraphPoint {
  if(!node.collapsed&&measured&&Number.isFinite(measured.x)&&Number.isFinite(measured.y))return{x:node.position.x+measured.x,y:node.position.y+measured.y}
  const bounds=graphEditorNodeSize(node,size)
  return{x:node.position.x+(pin.direction==='output'?bounds.width:0),y:node.position.y+(node.collapsed?bounds.height/2:58+Math.max(0,node.pins.indexOf(pin))*26)}
}
/** 拒绝不足两点或非有限坐标，输出由移动和直线命令组成的 SVG 路径。 */ export function graphPolylinePath(points:readonly GraphPoint[]):string {
  if(points.length<2||points.some(/* 先计算 !Number.isFinite(point.x)；仅当其为假值时求右侧 !Number.isFinite(point.y)，返回短路求值结果。 */ point=>!Number.isFinite(point.x)||!Number.isFinite(point.y)))return''
  return points.map(/** 按模板 `${index?'L':'M'} ${point.x} ${point.y}` 生成并返回字符串。 */ (point,index)=>`${index?'L':'M'} ${point.x} ${point.y}`).join(' ')
}
/** Spatial navigation uses measured centers and deterministic UUID tie-breaking. */
/** 按实测中心寻找指定方向的最合适节点，以横向偏离惩罚评分并用 UUID 打破平分。 */ export function nearestGraphNode(nodes:readonly GraphNode[],currentUuid:string,direction:'left'|'right'|'up'|'down',bounds:Readonly<Record<string,MeasuredGraphSize>>={}):GraphNode|undefined {
  const current=nodes.find(/* 比较 node.uuid 与 currentUuid，返回严格相等的判断结果。 */ node=>node.uuid===currentUuid);if(!current)return nodes[0]
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
