/** 文本分行与截断：按字素和测量宽度安排游戏界面文字，避免拆坏字符。 */
/** Limits bound hostile localized text without splitting UTF-16 surrogate pairs. */
export const UI_TEXT_LIMIT = 32_768
export interface UiTextLayoutOptions { width: number; height: number; lineHeight: number; wrap: 'None' | 'Word' | 'Character'; overflow: 'Clip' | 'Ellipsis' | 'Visible'; measure: (text: string) => number }
export interface UiTextLayout { lines: string[]; width: number; height: number; clipped: boolean; limited: boolean; lineHeight: number }
/** 按 UTF-16 长度截断文本，并避免把末尾代理对截成孤立高代理项。 */ export function truncateUtf16(value: string, maximum: number): string {
  const limit = Math.max(0, Math.floor(Number.isFinite(maximum) ? maximum : 0))
  const end = value.length > limit && limit > 0 && /[\uD800-\uDBFF]/.test(value[limit - 1]) ? limit - 1 : limit
  return value.slice(0, end)
}
/* 调用 truncateUtf16(value, Math.min(UI_TEXT_LIMIT, Number.isFinite(maximum) ? maximum : UI_TEXT_LIMIT)) 并返回调用结果。 */ export function truncateUiText(value: string, maximum: number): string { return truncateUtf16(value, Math.min(UI_TEXT_LIMIT, Number.isFinite(maximum) ? maximum : UI_TEXT_LIMIT)) }
/** 限制文本规模后按字素分段，旧宿主缺少分段器时回退为保留代理对的码点数组。 */ export function uiTextGraphemes(value: string): string[] {
  const bounded = truncateUiText(value, UI_TEXT_LIMIT)
  // Segmenter handles combining accents, flags and ZWJ emoji; Array.from still preserves surrogate pairs on older hosts.
  const Segmenter = (Intl as typeof Intl & { Segmenter?: new (locale: string | undefined, options: { granularity: 'grapheme' }) => { segment(value: string): Iterable<{ segment: string }> } }).Segmenter
  return Segmenter ? Array.from(new Segmenter(undefined, { granularity: 'grapheme' }).segment(bounded), /* 返回 item.segment 的当前值。 */ item => item.segment) : Array.from(bounded)
}
/** 按单词或字素换行并计算完整尺寸，报告溢出；省略模式按可见行数和二分宽度裁剪尾行。 */ export function layoutUiText(value: string, options: UiTextLayoutOptions): UiTextLayout {
  const source = truncateUiText(value, UI_TEXT_LIMIT), limited = source.length !== value.length
  const width = Math.max(0, Number.isFinite(options.width) ? options.width : 0), height = Math.max(0, Number.isFinite(options.height) ? options.height : 0), lineHeight = Math.max(1, Number.isFinite(options.lineHeight) ? options.lineHeight : 1)
  const measure = /** 调用传入的测量器，将非法宽度转换为零并禁止负宽度。 */ (text: string) => { const measured = options.measure(text); return Number.isFinite(measured) ? Math.max(0, measured) : 0 }
  const lines: string[] = []
  for (const paragraph of source.replace(/\r\n?/g, '\n').split('\n')) {
    if (options.wrap === 'None' || !paragraph) { lines.push(paragraph); continue }
    const units = options.wrap === 'Word' ? paragraph.match(/\s+|[^\s]+/gu) ?? [] : uiTextGraphemes(paragraph)
    let line = ''
    for (const unit of units) {
      if (measure(line + unit) <= width) { line += unit; continue }
      if (line) { lines.push(line.trimEnd()); line = '' }
      const token = options.wrap === 'Word' ? unit.trimStart() : unit
      if (measure(token) <= width) { line = token; continue }
      for (const glyph of uiTextGraphemes(token)) {
        if (line && measure(line + glyph) > width) { lines.push(line); line = '' }
        line += glyph
      }
    }
    lines.push(line)
  }
  const fullWidth = lines.reduce(/* 调用 Math.max(maximum, measure(line)) 并返回调用结果。 */ (maximum, line) => Math.max(maximum, measure(line)), 0), fullHeight = lines.length * lineHeight
  const clipped = limited || fullWidth > width + .01 || fullHeight > height + .01
  if (options.overflow === 'Ellipsis' && clipped) {
    const count = Math.max(0, Math.floor(height / lineHeight)); lines.splice(count)
    if (lines.length) {
      const last = lines.length - 1, glyphs = uiTextGraphemes(lines[last])
      let low = 0, high = glyphs.length
      while (low < high) { const middle = Math.ceil((low + high) / 2); if (measure(glyphs.slice(0, middle).join('') + '…') <= width) low = middle; else high = middle - 1 }
      lines[last] = measure('…') <= width ? glyphs.slice(0, low).join('').trimEnd() + '…' : ''
    }
  }
  return { lines, width: fullWidth, height: fullHeight, clipped, limited, lineHeight }
}
