/** 移动端方向与可视区域计算；软件键盘不被误认为设备旋转。 */
export interface MobileViewportInput { touch: boolean; orientation?: string; width: number; height: number; visualWidth?: number; visualHeight?: number; offsetTop?: number; offsetLeft?: number; screenWidth?: number; screenHeight?: number }
/** 26.43: touch form factor. Phones (shortest screen side under 600 CSS px) get 44 px targets and the
 * landscape guard; tablets (iPad, iPad mini, Android tablets) edit in both orientations with a
 * slightly larger touch geometry; everything else is a desktop. */
export type TouchForm = 'phone' | 'tablet' | 'desktop'
export function touchForm(input: Pick<MobileViewportInput, 'touch' | 'width' | 'height' | 'screenWidth' | 'screenHeight'>): TouchForm {
 if (!input.touch) return 'desktop'
 const shortest = Math.min(input.screenWidth ?? input.width, input.screenHeight ?? input.height, Math.max(input.width, input.height))
 return shortest < 600 ? 'phone' : 'tablet'
}
/** 优先采用屏幕方向；回退布局视口，不使用键盘收缩后的可视方向。只有手机需要旋转到横屏。 */
export function mobileViewport(input: MobileViewportInput) {
 const form = touchForm(input)
 const portraitOrientation = input.orientation ? input.orientation.startsWith('portrait') : input.height > input.width
 return { form, portrait: form === 'phone' && portraitOrientation, width: Math.max(1,input.visualWidth ?? input.width), height: Math.max(1,input.visualHeight ?? input.height), top: Math.max(0,input.offsetTop ?? 0), left: Math.max(0,input.offsetLeft ?? 0) }
}
