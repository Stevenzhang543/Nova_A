export interface RgbColor { r: number; g: number; b: number }

const LAYER_COLORS: readonly RgbColor[] = [
  { r: 55, g: 158, b: 255 },
  { r: 244, g: 116, b: 96 },
  { r: 59, g: 191, b: 137 },
  { r: 166, g: 115, b: 226 },
  { r: 232, g: 166, b: 54 },
  { r: 45, g: 183, b: 199 },
  { r: 224, g: 98, b: 151 },
  { r: 130, g: 174, b: 65 }
]

function hslChannel(p: number, q: number, value: number): number {
  let t = value
  if (t < 0) t += 1
  if (t > 1) t -= 1
  if (t < 1 / 6) return p + (q - p) * 6 * t
  if (t < 1 / 2) return q
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
  return p
}

export function defaultColorForLayer(layer: number): RgbColor {
  const normalized = Math.max(1, Math.round(Number.isFinite(layer) ? layer : 1))
  if (normalized <= LAYER_COLORS.length) return { ...LAYER_COLORS[normalized - 1] }
  const hue = ((normalized - 1) * 0.618033988749895) % 1
  const saturation = 0.58
  const lightness = 0.57
  const q = lightness < 0.5
    ? lightness * (1 + saturation)
    : lightness + saturation - lightness * saturation
  const p = 2 * lightness - q
  return {
    r: Math.round(hslChannel(p, q, hue + 1 / 3) * 255),
    g: Math.round(hslChannel(p, q, hue) * 255),
    b: Math.round(hslChannel(p, q, hue - 1 / 3) * 255)
  }
}

export function layerColorCss(layer: number): string {
  const color = defaultColorForLayer(layer)
  return `rgb(${color.r}, ${color.g}, ${color.b})`
}
