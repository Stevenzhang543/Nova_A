/** 移动端方向与可视区域计算；软件键盘不被误认为设备旋转。 */
export interface MobileViewportInput { touch: boolean; orientation?: string; width: number; height: number; visualWidth?: number; visualHeight?: number; offsetTop?: number; offsetLeft?: number }
/** 优先采用屏幕方向；回退布局视口，不使用键盘收缩后的可视方向。 */
export function mobileViewport(input: MobileViewportInput) {
 return { portrait: input.touch && (input.orientation ? input.orientation.startsWith('portrait') : input.height > input.width), width: Math.max(1,input.visualWidth ?? input.width), height: Math.max(1,input.visualHeight ?? input.height), top: Math.max(0,input.offsetTop ?? 0), left: Math.max(0,input.offsetLeft ?? 0) }
}
