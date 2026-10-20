/** Sine and cosine for transforms that give the same result in every browser and JavaScript engine.
 *
 * Quarter turns (0°, ±90°, 180°, …) give exact 0/±1 instead of values like cos(π/2) = 6.1e-17, so
 * rotated tile maps and hierarchies produce exactly aligned collision shapes (26.43).
 *
 * 26.44: other angles no longer use Math.sin/Math.cos, whose last bit differs between engines (V8,
 * JavaScriptCore, SpiderMonkey use different libm code). This is a direct port of the fdlibm kernels as
 * used by musl (`__sin`, `__cos`, `__rem_pio2` medium path), built only from IEEE-754 additions,
 * multiplications and divisions, which every engine rounds identically. Rust's `libm`, which the WASM
 * physics core uses for `sin`/`cos`, is the same port, so the editor, the Player and the physics agree
 * bit for bit. Arguments beyond 2^20·π/2 (about 1.6 million radians) use Math as before. */
const QUARTER = Math.PI / 2

const S1 = -1.66666666666666324348e-01, S2 = 8.33333333332248946124e-03, S3 = -1.98412698298579493134e-04
const S4 = 2.75573137070700676789e-06, S5 = -2.50507602534068634195e-08, S6 = 1.58969099521155010221e-10
const C1 = 4.16666666666666019037e-02, C2 = -1.38888888888741095749e-03, C3 = 2.48015872894767294178e-05
const C4 = -2.75573143513906633035e-07, C5 = 2.08757232129817482790e-09, C6 = -1.13596475577881948265e-11
const TO_INT = 1.5 / 2.220446049250313e-16
const PIO4 = 7.85398163397448278999e-01
const INV_PIO2 = 6.36619772367581382433e-01
const PIO2_1 = 1.57079632673412561417e+00, PIO2_1T = 6.07710050650619224932e-11
const PIO2_2 = 6.07710050630396597660e-11, PIO2_2T = 2.02226624879595063154e-21
const PIO2_3 = 2.02226624871116645580e-21, PIO2_3T = 8.47842766036889956997e-32

const float = new Float64Array(1), words = new Uint32Array(float.buffer)
const HIGH = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1 ? 1 : 0 // little-endian: high word second
function highWord(value: number): number { float[0] = value; return words[HIGH] }
function exponent(value: number): number { return (highWord(value) >>> 20) & 0x7ff }

function kernelSin(x: number, y: number, iy: 0 | 1): number {
  const z = x * x, w = z * z
  const r = S2 + z * (S3 + z * S4) + z * w * (S5 + z * S6)
  const v = z * x
  return iy === 0 ? x + v * (S1 + z * r) : x - ((z * (0.5 * y - v * r) - y) - v * S1)
}

function kernelCos(x: number, y: number): number {
  const z = x * x, w = z * z
  const r = z * (C1 + z * (C2 + z * C3)) + w * w * (C4 + z * (C5 + z * C6))
  const hz = 0.5 * z, one = 1.0 - hz
  return one + (((1.0 - one) - hz) + (z * r - x * y))
}

const reduced = [0, 0]
/** x = n·π/2 + reduced[0] + reduced[1]; returns n, or null for arguments that are too large. */
function remPio2(x: number, ix: number): number | null {
  const negative = x < 0
  const small = (k: number): number => {
    const z = negative ? x + k * PIO2_1 : x - k * PIO2_1
    reduced[0] = negative ? z + k * PIO2_1T : z - k * PIO2_1T
    reduced[1] = negative ? (z - reduced[0]) + k * PIO2_1T : (z - reduced[0]) - k * PIO2_1T
    return negative ? -k : k
  }
  if (ix <= 0x400f6a7a) {
    if ((ix & 0xfffff) !== 0x921fb) return small(ix <= 0x4002d97c ? 1 : 2)
  } else if (ix <= 0x401c463b) {
    if (ix <= 0x4015fdbc) { if (ix !== 0x4012d97c) return small(3) } else if (ix !== 0x401921fb) return small(4)
  } else if (ix >= 0x413921fb) return null
  // Medium size (also the cancellation cases near multiples of π/2 above).
  let fn = x * INV_PIO2 + TO_INT - TO_INT
  let r = x - fn * PIO2_1, w = fn * PIO2_1T
  if (r - w < -PIO4) { fn--; r = x - fn * PIO2_1; w = fn * PIO2_1T } else if (r - w > PIO4) { fn++; r = x - fn * PIO2_1; w = fn * PIO2_1T }
  reduced[0] = r - w
  const ex = ix >>> 20
  if (ex - exponent(reduced[0]) > 16) {
    let t = r
    w = fn * PIO2_2; r = t - w; w = fn * PIO2_2T - ((t - r) - w)
    reduced[0] = r - w
    if (ex - exponent(reduced[0]) > 49) {
      t = r
      w = fn * PIO2_3; r = t - w; w = fn * PIO2_3T - ((t - r) - w)
      reduced[0] = r - w
    }
  }
  reduced[1] = (r - reduced[0]) - w
  return fn
}

/** Engine-independent sine (musl/fdlibm `sin`). */
export function stableSin(x: number): number {
  const ix = highWord(x) & 0x7fffffff
  if (ix <= 0x3fe921fb) return ix < 0x3e500000 ? x : kernelSin(x, 0, 0)
  if (ix >= 0x7ff00000) return x - x
  const n = remPio2(x, ix)
  if (n === null) return Math.sin(x)
  switch (n & 3) {
    case 0: return kernelSin(reduced[0], reduced[1], 1)
    case 1: return kernelCos(reduced[0], reduced[1])
    case 2: return -kernelSin(reduced[0], reduced[1], 1)
    default: return -kernelCos(reduced[0], reduced[1])
  }
}

/** Engine-independent cosine (musl/fdlibm `cos`). */
export function stableCos(x: number): number {
  const ix = highWord(x) & 0x7fffffff
  if (ix <= 0x3fe921fb) return ix < 0x3e46a09e ? 1.0 : kernelCos(x, 0)
  if (ix >= 0x7ff00000) return x - x
  const n = remPio2(x, ix)
  if (n === null) return Math.cos(x)
  switch (n & 3) {
    case 0: return kernelCos(reduced[0], reduced[1])
    case 1: return -kernelSin(reduced[0], reduced[1], 1)
    case 2: return -kernelCos(reduced[0], reduced[1])
    default: return kernelSin(reduced[0], reduced[1], 1)
  }
}

export function stableSinCos(angle: number): { sine: number; cosine: number } {
  if (!Number.isFinite(angle)) return { sine: Number.NaN, cosine: Number.NaN }
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
  return { sine: stableSin(angle), cosine: stableCos(angle) }
}
