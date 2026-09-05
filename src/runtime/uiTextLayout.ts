/** Limits bound hostile localized text without splitting UTF-16 surrogate pairs. */
export const UI_TEXT_LIMIT = 32_768
export interface UiTextLayoutOptions { width: number; height: number; lineHeight: number; wrap: 'None' | 'Word' | 'Character'; overflow: 'Clip' | 'Ellipsis' | 'Visible'; measure: (text: string) => number }
export interface UiTextLayout { lines: string[]; width: number; height: number; clipped: boolean; limited: boolean; lineHeight: number }
export function truncateUtf16(value: string, maximum: number): string {
  const limit = Math.max(0, Math.floor(Number.isFinite(maximum) ? maximum : 0))
  const end = value.length > limit && limit > 0 && /[\uD800-\uDBFF]/.test(value[limit - 1]) ? limit - 1 : limit
  return value.slice(0, end)
}
export function truncateUiText(value: string, maximum: number): string { return truncateUtf16(value, Math.min(UI_TEXT_LIMIT, Number.isFinite(maximum) ? maximum : UI_TEXT_LIMIT)) }
export function uiTextGraphemes(value: string): string[] {
  const bounded = truncateUiText(value, UI_TEXT_LIMIT)
  // Segmenter handles combining accents, flags and ZWJ emoji; Array.from still preserves surrogate pairs on older hosts.
  const Segmenter = (Intl as typeof Intl & { Segmenter?: new (locale: string | undefined, options: { granularity: 'grapheme' }) => { segment(value: string): Iterable<{ segment: string }> } }).Segmenter
  return Segmenter ? Array.from(new Segmenter(undefined, { granularity: 'grapheme' }).segment(bounded), item => item.segment) : Array.from(bounded)
}
export function layoutUiText(value: string, options: UiTextLayoutOptions): UiTextLayout {
  const source = truncateUiText(value, UI_TEXT_LIMIT), limited = source.length !== value.length
  const width = Math.max(0, Number.isFinite(options.width) ? options.width : 0), height = Math.max(0, Number.isFinite(options.height) ? options.height : 0), lineHeight = Math.max(1, Number.isFinite(options.lineHeight) ? options.lineHeight : 1)
  const measure = (text: string) => { const measured = options.measure(text); return Number.isFinite(measured) ? Math.max(0, measured) : 0 }
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
  const fullWidth = lines.reduce((maximum, line) => Math.max(maximum, measure(line)), 0), fullHeight = lines.length * lineHeight
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
