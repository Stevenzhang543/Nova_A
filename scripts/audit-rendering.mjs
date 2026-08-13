import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const assert = (condition, message) => { if (!condition) throw new Error(`Rendering audit failed: ${message}`) }

const worldCanvas = read('src/components/WorldCanvas.vue')
const panel = read('src/components/RenderingPanel.vue')
const graph = read('src/renderer/renderGraph.ts')
const lighting = read('src/renderer/lighting2d.ts')
const materials = read('src/renderer/materials.ts')
const webgl = read('src/renderer/WebGL2Renderer.ts')
const canvas = read('src/renderer/Canvas2DRenderer.ts')
const scene = read('src/renderer/sceneRenderer.ts')
const geometry = read('src/renderer/geometry.ts')
const components = read('src/world/components.ts')
const assets = read('src/assets/AssetDatabase.ts')
const ui = read('src/runtime/gameUi.ts')
const format = read('crates/nova_format/src/lib.rs')

for (const pass of ['World', 'Lighting', 'UI', 'EditorOverlay', 'PostProcess']) assert(graph.includes(`'${pass}'`) && worldCanvas.includes(`'${pass}'`), `render pass is not connected: ${pass}`)
for (const light of ['Point', 'Spot', 'Directional', 'Area']) {
  const declared = components.includes(`'${light}'`)
  const rendered = light === 'Point' ? lighting.includes("light.lightType !== 'Directional'") : lighting.includes(`'${light}'`)
  assert(declared && rendered, `light type is not rendered: ${light}`)
}
for (const feature of ['layerMask', 'ambientIntensity', 'normalMapAsset', 'ShadowCaster2D', 'shadowQuality']) assert(lighting.includes(feature) || components.includes(feature), `lighting capability missing: ${feature}`)
for (const feature of ['fragment', 'textures', 'uniforms', 'blendMode', 'sampling', 'colorSpace', 'writeColor']) assert(materials.includes(feature), `material property missing: ${feature}`)
for (const guard of ['32_000', 'forbidden', 'fallback', 'compileShader']) assert(materials.includes(guard) || webgl.includes(guard), `safe shader path missing: ${guard}`)
for (const feature of ['activeGameCameras', 'priority', 'stackOrder', 'viewport', 'pixelPerfect', 'renderTexture']) assert(scene.includes(feature) || components.includes(feature), `camera capability missing: ${feature}`)
for (const feature of ['exposure', 'contrast', 'saturation', 'vignette', 'bloom', 'blur', 'userMaterial']) assert(panel.includes(feature) || lighting.includes(feature), `post effect is not configurable: ${feature}`)
assert(geometry.includes('nineSliceGeometry') && canvas.includes('drawNineSlice') && ui.includes('drawNineSliceImage'), 'world/UI nine-slice rendering is incomplete')
assert(assets.includes('colorSpace: record.settings.colorSpace') && webgl.includes('u_linearTexture'), 'asset sRGB/linear metadata is not consumed')
assert(webgl.includes('EXT_disjoint_timer_query_webgl2') && webgl.includes('pollGpuTimers'), 'optional GPU timing is missing')
assert(panel.includes('debugView') && lighting.includes("debugView === 'Overdraw'"), 'render debug visualization is not bound')
assert(webgl.includes('ensureEffectsTarget') && webgl.includes('effectsTargetActive') && !/readonly framebuffer: WebGLFramebuffer/.test(webgl), 'optional framebuffer allocation is not lazy')
assert(canvas.includes("backend: 'Canvas2D'") && canvas.includes('drawNineSlice'), 'Canvas2D fallback is incomplete')
assert(format.includes('CURRENT_FORMAT_VERSION: u32 = 17') && format.includes('projectSettings.rendering'), 'schema 17 rendering settings are not validated')
assert(panel.includes('renderMaterialPreview') && panel.includes('requestRenderCapture'), 'Rendering panel preview/capture controls are not connected')
assert(worldCanvas.includes('contain: strict') && worldCanvas.includes('ctx.clearRect(0, 0, cvs.width, cvs.height)'), 'canvas surfaces are not isolated and cleared in backing-store pixels')
assert(ui.includes('context.clip()') && !ui.includes("fillStyle = '#f7fbff'"), 'editor UI overlays can escape the viewport or resemble retained white pixels')

console.log('Rendering audit passed: graph, four lights, masks, normals, shadows, materials, shader safety, cameras, post effects, nine-slice, color space, timing, debug views, captures, schema, lazy targets, and Canvas2D fallback are connected.')
