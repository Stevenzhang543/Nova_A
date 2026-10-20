/** Sine and cosine for transforms. Quarter turns (0°, ±90°, 180°, …) give exact 0/±1 instead of values
 * like cos(π/2) = 6.1e-17, so rotated tile maps and hierarchies produce exactly aligned collision shapes,
 * and the result does not depend on how a browser's libm rounds those angles. Other angles use Math. */
const QUARTER = Math.PI / 2
export function stableSinCos(angle: number): { sine: number; cosine: number } {
  if (!Number.isFinite(angle)) return { sine: Math.sin(angle), cosine: Math.cos(angle) }
  if (angle === 0) return { sine: 0, cosine: 1 }
  const turns = angle / QUARTER, nearest = Math.round(turns)
  if (Math.abs(turns - nearest) < 1e-12) {
    switch (((nearest % 4) + 4) % 4) {
      case 0: return { sine: 0, cosine: 1 }
      case 1: return { sine: 1, cosine: 0 }
      case 2: return { sine: 0, cosine: -1 }
      default: return { sine: -1, cosine: 0 }
    }
  }
  return { sine: Math.sin(angle), cosine: Math.cos(angle) }
}
