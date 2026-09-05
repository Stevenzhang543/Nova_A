/** Width/height edits share finite bounds across pointer, keyboard and persisted layout. */
export function clampPanelSize(value: number, minimum: number, maximum: number): number {
  const low = Number.isFinite(minimum) ? Math.max(0, minimum) : 0
  const high = Number.isFinite(maximum) ? Math.max(low, maximum) : low
  return Math.min(high, Math.max(low, Number.isFinite(value) ? value : low))
}

export function draggedPanelSize(initial: number, distance: number, scale: number, reverse: boolean, minimum: number, maximum: number): number {
  const factor = Number.isFinite(scale) && scale > 0 ? scale : 1
  return clampPanelSize(initial + (reverse ? -1 : 1) * (Number.isFinite(distance) ? distance : 0) / factor, minimum, maximum)
}

/** CSS viewport caps can make the visible panel smaller than its saved preference. */
export function visiblePanelSize(preferred: number, measured: number | undefined, minimum: number, maximum: number): number {
  return clampPanelSize(typeof measured === 'number' && Number.isFinite(measured) && measured > 0 ? measured : preferred, minimum, maximum)
}

export function keyedPanelSize(value: number, key: string, orientation: 'vertical' | 'horizontal', reverse: boolean, large: boolean, minimum: number, maximum: number): number | null {
  if (key === 'Home') return clampPanelSize(minimum, minimum, maximum)
  if (key === 'End') return clampPanelSize(maximum, minimum, maximum)
  const direction = orientation === 'vertical' ? key === 'ArrowRight' ? 1 : key === 'ArrowLeft' ? -1 : 0 : key === 'ArrowDown' ? 1 : key === 'ArrowUp' ? -1 : 0
  return direction ? draggedPanelSize(value, direction * (large ? 40 : 8), 1, reverse, minimum, maximum) : null
}
