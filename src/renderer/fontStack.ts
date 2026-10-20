/** 26.43 web: one font stack rule for game text on every platform.
 *
 * Text components store a CSS family list such as "Segoe UI Variable Text, sans-serif". The renderer
 * used to quote the whole list as one family name, which matches no font, so canvases fell back to the
 * browser default (a serif face in Safari): game text on iPad looked different from the desktop app.
 * The list is now split; names of the bundled fonts gain their registered variable-font names; and
 * the bundled faces (shipped with the editor and the Player, OFL) come before the generic sans-serif,
 * so a Windows-only family such as Segoe falls back to the same face on iPad, macOS and Linux. */
const GENERIC = /^(serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-serif|ui-sans-serif|ui-monospace|ui-rounded|emoji|math|fangsong)$/i
const BUNDLED_ALIASES: Record<string, string> = { 'nunito sans': 'Nunito Sans Variable', 'noto sans sc': 'Noto Sans SC Variable', 'jetbrains mono': 'JetBrains Mono Variable' }
export const BUNDLED_TEXT_FAMILIES = ['Nunito Sans Variable', 'Noto Sans SC Variable'] as const

type FamilyInput = string | readonly string[] | null | undefined

/** Splits CSS family lists into plain names (quotes and backslashes removed, order kept). */
export function fontFamilyNames(...inputs: FamilyInput[]): string[] {
  const names: string[] = []
  for (const input of inputs) {
    const parts = typeof input === 'string' ? input.split(',') : input ? [...input] : []
    for (const part of parts) {
      const name = String(part).replace(/["'\\]/g, '').trim()
      if (name && name.length <= 120 && !names.some(existing => existing.toLowerCase() === name.toLowerCase())) names.push(name)
    }
  }
  return names
}

/** A CSS `font-family` value for canvas and DOM game text. */
export function cssFontStack(...inputs: FamilyInput[]): string {
  const names = fontFamilyNames(...inputs)
  const generic = names.find(name => GENERIC.test(name))?.toLowerCase()
  const families: string[] = []
  for (const name of names) {
    if (GENERIC.test(name)) continue
    families.push(name)
    const alias = BUNDLED_ALIASES[name.toLowerCase()]
    if (alias && !names.some(other => other.toLowerCase() === alias.toLowerCase())) families.push(alias)
  }
  // Serif, monospace and other explicit generics are the author's choice; sans-serif text (and text
  // without a generic) gets the bundled faces first so every platform draws the same letters.
  if (!generic || generic === 'sans-serif' || generic === 'system-ui' || generic === 'ui-sans-serif') {
    for (const bundled of BUNDLED_TEXT_FAMILIES) if (!families.some(family => family.toLowerCase() === bundled.toLowerCase())) families.push(bundled)
  }
  const quoted = families.map(family => `"${family}"`)
  quoted.push(generic ?? 'sans-serif')
  return quoted.join(', ')
}
