/** Single HUD text implementation; required font/locale/accessibility reads retain the original layout/metrics. */
import type {Text} from '../world/components'
import type {RuntimeAccessibilitySettings} from './presentationOwner'
import type {UiReadPorts} from './uiReadPorts'
import {layoutUiText,type UiTextLayout} from './uiTextLayout'
import type {UiRect} from './uiLayout'
import {cssFontStack} from '../renderer/fontStack'
export function createUiTextPresenter(ports:Pick<UiReadPorts,'fontMetadata'|'activeFontFallbackFamilies'|'activeTextDirection'|'localize'>,readAccessibility:()=>RuntimeAccessibilitySettings) {
 if(!ports||typeof readAccessibility!=='function'||[ports.fontMetadata,ports.activeFontFallbackFamilies,ports.activeTextDirection,ports.localize].some(value=>typeof value!=='function'))throw new Error('UI_TEXT_READ_PORTS_REQUIRED')
 const fontMetadata=ports.fontMetadata.bind(ports),activeFontFallbackFamilies=ports.activeFontFallbackFamilies.bind(ports),activeTextDirection=ports.activeTextDirection.bind(ports),localize=ports.localize.bind(ports)

/** 合并资源与语言字体回退，应用文本缩放、本地化和方向，生成字体、行高、对齐和描边参数。 */ function uiTextPresentation(text: Text, scale: number, locale: string, fontSize = text.fontSize, fontWeight = text.fontWeight, accessibility:RuntimeAccessibilitySettings=readAccessibility()): { value: string; font: string; size: number; lineHeight: number; direction: 'ltr' | 'rtl'; align: CanvasTextAlign; outline: number } {
  const asset = fontMetadata(text.fontAsset), imported = asset?.fallbackFamilies ?? [], fallbacks = [...new Set([...imported, ...activeFontFallbackFamilies(locale)])], size = Math.max(1, Math.min(4096, fontSize * scale * accessibility.textScale)), direction = activeTextDirection(locale)
  // 26.43: one portable stack (see renderer/fontStack.ts): author list, imported and locale fallbacks, bundled faces.
  const family = cssFontStack(asset?.family || text.fontFamily, fallbacks)
  return { value: localize(text.localizationKey, text.localizationVariables, text.text, locale), font: `${fontWeight} ${size}px ${family}`, size, lineHeight: size * 1.3, direction, align: direction === 'rtl' && text.align === 'left' ? 'right' : direction === 'rtl' && text.align === 'right' ? 'left' : text.align, outline: asset ? asset.outlineWidth * scale : 0 }
}

/** 按实际字体测量换行后的完整文本尺寸，缺少画布时用字数估算宽度。 */ function measureUiText(text: Text, scale: number, locale: string, width: number, context?: CanvasRenderingContext2D | null, accessibility:RuntimeAccessibilitySettings=readAccessibility()): { width: number; height: number } {
  const style = uiTextPresentation(text, scale, locale, undefined, undefined, accessibility)
  context?.save(); if (context) context.font = style.font
  const result = layoutUiText(style.value, { width, height: Number.MAX_SAFE_INTEGER, lineHeight: style.lineHeight, wrap: text.wrap, overflow: 'Visible', measure: /* 当 context?.measureText(value).width 为 null 或 undefined 时返回 [...value].length * style.size * .62，否则保留左侧值。 */ value => context?.measureText(value).width ?? [...value].length * style.size * .62 })
  context?.restore(); return result
}

/** 设置文字样式并布局，按溢出策略裁切区域，逐行绘制可选描边和填充后恢复画布。 */ function drawUiText(context: CanvasRenderingContext2D, text: Text, rect: UiRect, scale: number, locale: string, value?: string, fontSize?: number, fontWeight?: number, accessibility:RuntimeAccessibilitySettings=readAccessibility()): UiTextLayout {
  const style = uiTextPresentation(text, scale, locale, fontSize, fontWeight, accessibility)
  context.save(); context.font = style.font; context.textAlign = style.align; context.direction = style.direction; context.textBaseline = 'middle'
  const result = layoutUiText(value ?? style.value, { width: rect.width, height: rect.height, lineHeight: style.lineHeight, wrap: text.wrap, overflow: text.overflow, measure: /* 返回 context.measureText(line).width 的当前值。 */ line => context.measureText(line).width })
  if (text.overflow !== 'Visible') { context.beginPath(); context.rect(rect.x, rect.y, rect.width, rect.height); context.clip() }
  const left = style.align === 'left' || style.align === 'start' && style.direction === 'ltr' || style.align === 'end' && style.direction === 'rtl', right = style.align === 'right' || style.align === 'end' && style.direction === 'ltr' || style.align === 'start' && style.direction === 'rtl'
  const x = left ? rect.x : right ? rect.x + rect.width : rect.x + rect.width / 2, top = rect.y + Math.max(0, (rect.height - result.lines.length * result.lineHeight) / 2)
  result.lines.forEach(/** 计算当前行的垂直位置，先绘制可选黑色描边，再填充文本。 */ (line, index) => { const y = top + (index + .5) * result.lineHeight; if (style.outline > 0) { context.strokeStyle = '#000'; context.lineWidth = style.outline * 2; context.lineJoin = 'round'; context.strokeText(line, x, y) }; context.fillText(line, x, y) })
  context.restore(); return result
}
 return Object.freeze({uiTextPresentation,measureUiText,drawUiText})
}
