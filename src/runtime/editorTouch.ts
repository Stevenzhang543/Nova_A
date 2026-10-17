/** 场景触摸桥：单指复用现有编辑事务，双指平移和缩放；游戏视图保留原有输入。 */
import type { Camera } from '../world/Camera'
interface TouchOptions { enabled: () => boolean; camera: Camera; down: (event: MouseEvent) => void; move: (event: MouseEvent) => void; up: (event: MouseEvent) => void }
/** 安装捕获阶段手势，阻止重复的兼容鼠标事件，并返回完整清理函数。 */
export function installEditorTouch(canvas: HTMLCanvasElement, options: TouchOptions) {
 const points = new Map<number, { x: number; y: number }>()
 let editing = false
 let pinching = false
 /** 把触摸位置转换为原有鼠标编辑器使用的坐标与按键。 */
 function mouse(event: PointerEvent) { return new MouseEvent('mousemove', { clientX:event.clientX, clientY:event.clientY, button:0, buttons:1, shiftKey:event.shiftKey, altKey:event.altKey, ctrlKey:event.ctrlKey }) }
 /** 求前两根手指的中心和间距；第三根手指不参与相机计算。 */
 function pair() { const [a,b]=[...points.values()]; return a && b ? { x:(a.x+b.x)/2, y:(a.y+b.y)/2, distance:Math.hypot(a.x-b.x,a.y-b.y) } : null }
 /** 捕获非鼠标指针，第一根开始编辑，第二根结束当前编辑事务再接管相机。 */
 function down(event: PointerEvent) {
  if (event.pointerType === 'mouse' || !options.enabled()) return
  event.preventDefault(); event.stopImmediatePropagation()
  points.set(event.pointerId,{x:event.clientX,y:event.clientY}); canvas.setPointerCapture(event.pointerId)
  if (points.size===1) { editing=true; pinching=false; options.down(mouse(event)) }
  else { if(editing) options.up(mouse(event)); editing=false; pinching=true }
 }
 /** 单指沿用选择/拖动工具，双指围绕中点缩放并移动相机。 */
 function move(event: PointerEvent) {
  if (!points.has(event.pointerId)) return
  event.preventDefault(); event.stopImmediatePropagation()
  const before=pair(); points.set(event.pointerId,{x:event.clientX,y:event.clientY}); const after=pair()
  if (!options.enabled()) { finish(event); return }
  if(before && after) { const rect=canvas.getBoundingClientRect(); options.camera.zoomAt({x:before.x-rect.left,y:before.y-rect.top},before.distance>0?after.distance/before.distance:1); options.camera.offset.x+=after.x-before.x; options.camera.offset.y+=after.y-before.y }
  else if(editing && !pinching) options.move(mouse(event))
 }
 /** 抬起、取消和丢失捕获都结束事务；缩放后余下手指不会突然拖动物体。 */
 function finish(event: PointerEvent) {
  if(!points.has(event.pointerId)) return
  event.preventDefault(); event.stopImmediatePropagation()
  if(editing) options.up(mouse(event))
  editing=false; points.delete(event.pointerId)
  if(canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId)
  if(points.size===0) pinching=false
 }
 canvas.addEventListener('pointerdown',down,true); canvas.addEventListener('pointermove',move,true)
 for(const event of ['pointerup','pointercancel','lostpointercapture'] as const) canvas.addEventListener(event,finish,true)
 /** 卸载时结束未完成编辑并释放捕获和全部监听。 */
 return /** 卸载时结束未完成编辑并释放指针捕获和全部监听。 */ function dispose() {
  if(editing) options.up(new MouseEvent('mouseup'))
  editing=false
  for(const id of points.keys()) if(canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id)
  points.clear(); canvas.removeEventListener('pointerdown',down,true); canvas.removeEventListener('pointermove',move,true)
  for(const event of ['pointerup','pointercancel','lostpointercapture'] as const) canvas.removeEventListener(event,finish,true)
 }
}
