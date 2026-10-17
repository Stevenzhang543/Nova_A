/** Seconds and logical fixed ticks; explicit project timing overrides remain supported. */
export const DEFAULT_MAX_CATCH_UP_STEPS = 4
export const MAX_FRAME_DELTA_SECONDS = .25
export function normalizeSimulationFrameDelta(seconds: number): number {
  return Number.isFinite(seconds) ? Math.min(MAX_FRAME_DELTA_SECONDS, Math.max(0, seconds)) : 0
}
