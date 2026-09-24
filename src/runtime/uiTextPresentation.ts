/** 界面文字呈现：根据控件配置测量和绘制文字内容。 */
import { resolveAsset } from '../assets/AssetDatabase'
import type { Text } from '../world/components'
import { activeFontFallbackFamilies, activeTextDirection, localize } from './localization'
import { runtimeAccessibilitySettings } from './presentation'
import { layoutUiText, type UiTextLayout } from './uiTextLayout'
import type { UiRect } from './uiLayout'
/** 合并资源与语言字体回退，应用文本缩放、本地化和方向，生成字体、行高、对齐和描边参数。 */ export function uiTextPresentation(text: Text, scale: number, locale: string, fontSize = text.fontSize, fontWeight = text.fontWeight): { value: string; font: string; size: number; lineHeight: number; direction: 'ltr' | 'rtl'; align: CanvasTextAlign; outline: number } {
  const asset = resolveAsset(text.fontAsset), imported = asset?.assetType === 'font' ? asset.settings.fontSettings.fallbackFamilies : [], fallbacks = [...new Set([...imported, ...activeFontFallbackFamilies(locale)])], size = Math.max(1, Math.min(4096, fontSize * scale * runtimeAccessibilitySettings.textScale)), direction = activeTextDirection(locale)
  const family = asset?.assetType === 'font' && asset.fontFamily ? `"${asset.fontFamily.replace(/["\\]/g, '')}"` : text.fontFamily
  return { value: localize(text.localizationKey, text.localizationVariables, text.text, locale), font: `${fontWeight} ${size}px ${family}${fallbacks.length ? ', ' + fallbacks.map(/** 按模板 `"${value.replace(/["\\]/g, '')}"` 生成并返回字符串。 */ value => `"${value.replace(/["\\]/g, '')}"`).join(', ') : ''}`, size, lineHeight: size * 1.3, direction, align: direction === 'rtl' && text.align === 'left' ? 'right' : direction === 'rtl' && text.align === 'right' ? 'left' : text.align, outline: asset?.assetType === 'font' ? asset.settings.fontSettings.outlineWidth * scale : 0 }
}
/** 按实际字体测量换行后的完整文本尺寸，缺少画布时用字数估算宽度。 */ export function measureUiText(text: Text, scale: number, locale: string, width: number, context?: CanvasRenderingContext2D | null): { width: number; height: number } {
  const style = uiTextPresentation(text, scale, locale)
  context?.save(); if (context) context.font = style.font
  const result = layoutUiText(style.value, { width, height: Number.MAX_SAFE_INTEGER, lineHeight: style.lineHeight, wrap: text.wrap, overflow: 'Visible', measure: /* 当 context?.measureText(value).width 为 null 或 undefined 时返回 [...value].length * style.size * .62，否则保留左侧值。 */ value => context?.measureText(value).width ?? [...value].length * style.size * .62 })
  context?.restore(); return result
}
/** 设置文字样式并布局，按溢出策略裁切区域，逐行绘制可选描边和填充后恢复画布。 */ export function drawUiText(context: CanvasRenderingContext2D, text: Text, rect: UiRect, scale: number, locale: string, value?: string, fontSize?: number, fontWeight?: number): UiTextLayout {
  const style = uiTextPresentation(text, scale, locale, fontSize, fontWeight)
  context.save(); context.font = style.font; context.textAlign = style.align; context.direction = style.direction; context.textBaseline = 'middle'
  const result = layoutUiText(value ?? style.value, { width: rect.width, height: rect.height, lineHeight: style.lineHeight, wrap: text.wrap, overflow: text.overflow, measure: /* 返回 context.measureText(line).width 的当前值。 */ line => context.measureText(line).width })
  if (text.overflow !== 'Visible') { context.beginPath(); context.rect(rect.x, rect.y, rect.width, rect.height); context.clip() }
  const left = style.align === 'left' || style.align === 'start' && style.direction === 'ltr' || style.align === 'end' && style.direction === 'rtl', right = style.align === 'right' || style.align === 'end' && style.direction === 'ltr' || style.align === 'start' && style.direction === 'rtl'
  const x = left ? rect.x : right ? rect.x + rect.width : rect.x + rect.width / 2, top = rect.y + Math.max(0, (rect.height - result.lines.length * result.lineHeight) / 2)
  result.lines.forEach(/** 计算当前行的垂直位置，先绘制可选黑色描边，再填充文本。 */ (line, index) => { const y = top + (index + .5) * result.lineHeight; if (style.outline > 0) { context.strokeStyle = '#000'; context.lineWidth = style.outline * 2; context.lineJoin = 'round'; context.strokeText(line, x, y) }; context.fillText(line, x, y) })
  context.restore(); return result
}
