/** 26.42 P-D: pixel checks of the WebGL2 light pass itself, in a real browser.
 *
 * Builds a tiny page around the production WebGL2Renderer (no editor), draws fixed scenes with known lights,
 * casters and normal-mapped sprites, and reads the rendered pixels back:
 *  - a shadow falls on the far side of a caster (direction) and is uniform inside (no seams between edge quads);
 *  - Soft shadows have a wider penumbra than hard shadows;
 *  - a spot light lights inside its cone and not outside it;
 *  - a normal-mapped surface facing the light is brighter than one facing away, and a flat normal map keeps the
 *    brightness of an unmapped surface.
 *
 * Usage: node scripts/verify-2642-lighting-render.mjs (Edge, or NOVA_AUDIT_BROWSER naming a Chromium executable). */
import assert from 'node:assert/strict'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { build } from 'vite'
import { withBrowserAudit } from './lib/browserUserAudit.mjs'

const root = process.cwd()
const release = JSON.parse(await (await import('node:fs/promises')).readFile('package.json', 'utf8')).version.split('.').slice(0, 2).join('.')
const work = join(root, '.cache', 'lighting-render'), dist = join(work, 'dist')
await rm(work, { recursive: true, force: true }); await mkdir(dist, { recursive: true })
const entry = join(work, 'entry.ts'), src = join(root, 'src').replaceAll('\\', '/')
await writeFile(entry, `
import { WebGL2Renderer } from '${src}/renderer/WebGL2Renderer'
import { defaultRendererEnvironment } from '${src}/renderer/RendererEnvironment'
import type { GpuLight2D, GpuLightingFrame } from '${src}/renderer/lighting2dGpu'
const SIZE = 256, SCALE = 16
function solid(color: string, key: string) { const canvas = document.createElement('canvas'); canvas.width = canvas.height = 8; const context = canvas.getContext('2d')!; context.fillStyle = color; context.fillRect(0, 0, 8, 8); return { key, source: canvas, uv: { x: 0, y: 0, width: 1, height: 1 }, filter: 'Linear' as const, revision: 1 } }
function light(partial: Partial<GpuLight2D>): GpuLight2D {
  return { type: 0, x: 0, y: 0, rotation: 0, r: 1, g: 1, b: 1, range: 12, knee: .5, innerHalfAngle: 0, outerHalfAngle: Math.PI, areaWidth: 1, areaHeight: 1, shadowEdges: new Float32Array(0), unshadowed: new Float32Array(0), ...partial }
}
/** Light-facing edges of an axis-aligned square caster (counter-clockwise), opacity 1, self shadowing off. */
function squareCaster(cx: number, cy: number, half: number, lx: number, ly: number) {
  const points = [[cx - half, cy - half], [cx + half, cy - half], [cx + half, cy + half], [cx - half, cy + half]]
  const edges: number[] = [], fan: number[] = [4]
  for (let index = 0; index < 4; index++) {
    const [ax, ay] = points[index], [bx, by] = points[(index + 1) % 4], nx = by - ay, ny = -(bx - ax)
    if (nx * (lx - (ax + bx) / 2) + ny * (ly - (ay + by) / 2) > 0) edges.push(ax, ay, bx, by, 1)
    fan.push(ax, ay)
  }
  return { shadowEdges: new Float32Array(edges), unshadowed: new Float32Array(fan) }
}
export function render(scene: string): { pixels: number[]; size: number; backend: string } {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = SIZE
  const environment = defaultRendererEnvironment()
  environment.settings = { ...environment.settings, antiAliasing: 'Off', postProcessing: { ...environment.settings.postProcessing, enabled: false } }
  const renderer = new WebGL2Renderer(canvas, environment)
  if (!renderer.supportsGpuLighting()) throw new Error('GPU lighting unavailable')
  renderer.beginFrame({ width: SIZE, height: SIZE, pixelRatio: 1, clearColor: { r: 255, g: 255, b: 255, a: 1 } })
  renderer.beginCamera({ scale: SCALE, offset: { x: SIZE / 2, y: SIZE / 2 } })
  const order = { sortingLayer: 0, orderInLayer: 0, material: 'Default' }
  let frame: GpuLightingFrame = { ambient: [.1, .1, .1], lights: [] }
  if (scene === 'shadow-hard' || scene === 'shadow-soft') {
    frame = { ambient: [.1, .1, .1], lights: [light({ x: -5, y: 0, range: 14, r: 1.6, g: 1.6, b: 1.6, ...squareCaster(0, 0, 1, -5, 0) })], shadowBlur: scene === 'shadow-soft' ? 8 : 0 }
  } else if (scene === 'spot') {
    frame = { ambient: [.1, .1, .1], lights: [light({ type: 1, x: 0, y: -6, rotation: Math.PI / 2, range: 14, r: 1.6, g: 1.6, b: 1.6, innerHalfAngle: Math.PI / 12, outerHalfAngle: Math.PI / 6 })] }
  } else if (scene === 'normals') {
    const white = solid('#ffffff', 'white')
    const facing = (key: string, color: string, x: number) => renderer.submitSprite({ ...order, position: { x, y: 0 }, rotation: 0, scale: { x: 1, y: 1 }, size: { x: 3, y: 3 }, pivot: { x: .5, y: .5 }, flipX: false, flipY: false, tint: { r: 255, g: 255, b: 255, a: 1 }, texture: white, normalMap: solid(color, key) })
    facing('right', 'rgb(217,128,217)', -4); facing('left', 'rgb(38,128,217)', 0); facing('flat', 'rgb(128,128,255)', 4)
    frame = { ambient: [.1, .1, .1], lights: [light({ type: 3, rotation: Math.PI, r: 1.4, g: 1.4, b: 1.4 })] }
  }
  renderer.endCamera()
  renderer.submitLighting(frame)
  renderer.endFrame()
  const gl = canvas.getContext('webgl2')!, data = new Uint8Array(SIZE * SIZE * 4)
  gl.readPixels(0, 0, SIZE, SIZE, gl.RGBA, gl.UNSIGNED_BYTE, data)
  const pixels: number[] = []
  for (let index = 0; index < data.length; index += 4) pixels.push(Math.round(.2126 * data[index] + .7152 * data[index + 1] + .0722 * data[index + 2]))
  const backend = renderer.stats.backend
  renderer.destroy()
  return { pixels, size: SIZE, backend }
}
`)
await build({ configFile: false, root, logLevel: 'error', publicDir: false, build: { outDir: dist, emptyOutDir: false, target: 'es2022', lib: { entry, formats: ['es'], fileName: () => 'lighting.js' } } })
await writeFile(join(dist, 'index.html'), `<!doctype html><meta charset="utf-8"><title>Nova_A lighting render check</title><body><script type="module">import * as lighting from './lighting.js'; window.__lighting = lighting; document.body.dataset.ready = '1'</script></body>`)

process.env.NOVA_AUDIT_DIST_DIRECTORY = join('.cache', 'lighting-render', 'dist')
await withBrowserAudit({ release, name: 'lighting-render-2642', width: 800, height: 600, readyExpression: "document.body.dataset.ready==='1'", qualifyRelease: false }, async ({ evaluate, check, observations }) => {
  // World point → luminance (camera: 16 px per unit, origin at the centre, readPixels rows start at the bottom).
  const scene = async name => {
    const result = await evaluate(`window.__lighting.render(${JSON.stringify(name)})`)
    const at = (x, y) => result.pixels[Math.round(128 + y * 16) * result.size + Math.round(128 + x * 16)]
    return { ...result, at }
  }
  await check('A shadow falls on the far side of the caster and is uniform inside', async () => {
    const hard = await scene('shadow-hard')
    const behind = hard.at(2, 0), side = hard.at(-5, 7)
    const inside = [2.5, 3, 3.5, 4, 4.5, 5, 5.5].flatMap(x => [-.6, -.3, 0, .3, .6].map(y => hard.at(x, y)))
    observations.push({ id: 'shadow-hard', behind, side, insideMin: Math.min(...inside), insideMax: Math.max(...inside), backend: hard.backend })
    assert.equal(hard.backend, 'WebGL2')
    assert.ok(side > behind + 60, `lit point at the same distance (${side}) is brighter than the shadowed point (${behind})`)
    assert.ok(Math.max(...inside) - Math.min(...inside) <= 12, `no seams inside the shadow: ${Math.min(...inside)}..${Math.max(...inside)}`)
    assert.ok(hard.at(-2, 0) > behind + 60, 'the lit side of the caster is lit')
  })
  await check('Soft shadows have a wider penumbra than hard shadows', async () => {
    const penumbra = async name => {
      const result = await scene(name), column = []
      for (let y = -4; y <= 4; y += 1 / 16) column.push(result.at(3, y)) // lit pixels are saturated here, so only the shadow edge varies
      const low = Math.min(...column), high = Math.max(...column)
      return column.filter(value => value > low + (high - low) * .1 && value < low + (high - low) * .9).length
    }
    const hard = await penumbra('shadow-hard'), soft = await penumbra('shadow-soft')
    observations.push({ id: 'penumbra-pixels', hard, soft })
    assert.ok(soft > hard + 4, `soft ${soft} px vs hard ${hard} px of transition`)
  })
  await check('A spot light lights inside its cone and not outside it', async () => {
    const spot = await scene('spot')
    const inside = spot.at(0, 0), outside = spot.at(5, -2), behind = spot.at(0, -7.5)
    observations.push({ id: 'spot', inside, outside, behind })
    assert.ok(inside > outside + 60 && inside > behind + 60, `inside ${inside}, outside ${outside}, behind ${behind}`)
  })
  await check('Normal maps shade surfaces by the direction they face', async () => {
    const lit = await scene('normals')
    const facing = lit.at(-4, 0), away = lit.at(0, 0), flat = lit.at(4, 0), background = lit.at(0, 5)
    observations.push({ id: 'normals', facingLight: facing, facingAway: away, flat, background })
    assert.ok(facing > away + 40, `facing the light ${facing} vs facing away ${away}`)
    assert.ok(Math.abs(flat - background) <= 16, `flat normal ${flat} keeps the unmapped brightness ${background}`)
  })
})
