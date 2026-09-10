export type AntiAliasing2D = 'Auto' | 'Off' | 'MSAA2' | 'MSAA4' | 'MSAA8'
export function normalizeAntiAliasing(value: unknown): AntiAliasing2D { return ['Auto', 'Off', 'MSAA2', 'MSAA4', 'MSAA8'].includes(String(value)) ? value as AntiAliasing2D : 'Auto' }
/** Preserve logical dimensions; bound the total color + sample allocation to 256 MiB. */
export function multisampleCount(requested: number, supported: readonly number[], width: number, height: number): number {
  if (![requested, width, height].every(Number.isFinite) || width < 1 || height < 1) return 0
  return supported.filter(n => Number.isInteger(n) && n > 1 && n <= requested && width * height * 4 * (n + 1) <= 256 * 1024 * 1024).sort((a, b) => b - a)[0] ?? 0
}
export const OUTPUT_QUALITY_COPY = {
 en: { aa: 'Anti-aliasing', scale: 'Resolution scale', actual: 'Actual backing / MSAA samples', hint: 'Resolution scale also applies to exported games. Higher values use more GPU memory and time. MSAA is device- and memory-limited; Auto preserves pixel-art sampling. Canvas2D uses browser smoothing.', auto: 'Automatic', off: 'Off' },
 de: { aa: 'Kantenglättung', scale: 'Auflösungsskalierung', actual: 'Tatsächliche Pixel / MSAA-Samples', hint: 'Die Auflösungsskalierung gilt auch für exportierte Spiele. Höhere Werte benötigen mehr GPU-Speicher und Zeit. MSAA ist durch Gerät und Speicher begrenzt; Automatisch erhält Pixelgrafik. Canvas2D nutzt Browserglättung.', auto: 'Automatisch', off: 'Aus' },
 zh: { aa: '抗锯齿', scale: '渲染分辨率倍率', actual: '实际像素尺寸 / MSAA 采样数', hint: '分辨率倍率同样应用于导出游戏。更高倍率需要更多显存和时间。MSAA 受设备与内存限制；自动模式保留像素画采样。Canvas2D 使用浏览器平滑处理。', auto: '自动', off: '关闭' }
} as const
