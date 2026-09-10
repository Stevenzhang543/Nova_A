/** Exact semantic roles supplied in app_color_palette_system.md. */
export const COLOR_PALETTES = [
  { id: 'cloud-blue', name: 'Cloud Blue', mode: 'light', background: '#F7F9FC', surface: '#FFFFFF', primary: '#4F6F8F', secondary: '#8EA9B8', accent: '#7FA6A0', text: '#263746' },
  { id: 'meadow-cream', name: 'Meadow Cream', mode: 'light', background: '#FBF7EA', surface: '#F1F3E7', primary: '#607A64', secondary: '#A5B58A', accent: '#C9AF78', text: '#38463B' },
  { id: 'blush-berry', name: 'Blush Berry', mode: 'light', background: '#FFF5F7', surface: '#F8E7EC', primary: '#9F5F75', secondary: '#D7A6B5', accent: '#A799BA', text: '#4A3941' },
  { id: 'midnight-blue', name: 'Midnight Blue', mode: 'dark', background: '#0F141A', surface: '#171E27', primary: '#527397', secondary: '#3F586F', accent: '#6D8D8A', text: '#D8E0E8' },
  { id: 'night-garden', name: 'Night Garden', mode: 'dark', background: '#171518', surface: '#211E23', primary: '#806F8D', secondary: '#5F6D78', accent: '#738778', text: '#DDD8DF' }
] as const
export type ColorPaletteId = typeof COLOR_PALETTES[number]['id']
export function colorPalette(value: unknown) { return COLOR_PALETTES.find(item => item.id === value) }
export function paletteForMode(value: unknown, mode: 'light' | 'dark'): ColorPaletteId {
  const palette = colorPalette(value)
  return palette?.mode === mode ? palette.id : mode === 'light' ? 'cloud-blue' : 'midnight-blue'
}
export const PALETTE_COPY = {
  en: { label: 'Color palette', hint: 'Editor colors only. Each light and dark selection is remembered.', names: ['Cloud Blue', 'Meadow Cream', 'Blush Berry', 'Midnight Blue', 'Night Garden'] },
  de: { label: 'Farbpalette', hint: 'Nur Editorfarben. Die Auswahl für Hell und Dunkel wird getrennt gespeichert.', names: ['Wolkenblau', 'Wiesencreme', 'Beerenrosa', 'Mitternachtsblau', 'Nachtgarten'] },
  zh: { label: '配色方案', hint: '仅影响编辑器颜色。分别记住浅色和深色方案。', names: ['云间蓝', '草甸奶油', '柔粉莓色', '午夜蓝', '夜间花园'] }
} as const
