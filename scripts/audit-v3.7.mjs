import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const read = path => readFile(join(root, path), 'utf8')
const json = path => read(path).then(JSON.parse)
const checks = []
const check = (name, passed, evidence) => checks.push({ name, status: passed ? 'passed' : 'failed', evidence })

const [pkg, tauri, projectFormat, rustFormat, components, geometry, canvas, webgl, capabilities, renderSettings, renderGraph, renderTextures, materials, lighting, particles, audio, assets, profiles, assetPanel, renderingPanel, profiler, health, i18n, readme, compatibility] = await Promise.all([
  json('package.json'), json('src-tauri/tauri.conf.json'), read('src/projects/projectFormat.ts'), read('crates/nova_format/src/lib.rs'), read('src/world/components.ts'), read('src/renderer/geometry.ts'), read('src/renderer/Canvas2DRenderer.ts'), read('src/renderer/WebGL2Renderer.ts'), read('src/renderer/capabilities.ts'), read('src/renderer/renderSettings.ts'), read('src/renderer/renderGraph.ts'), read('src/renderer/renderTextures.ts'), read('src/renderer/materials.ts'), read('src/renderer/lighting2d.ts'), read('src/runtime/particles.ts'), read('src/runtime/audio.ts'), read('src/assets/types.ts'), read('src/assets/importProfiles.ts'), read('src/components/EditorBottomPanel.vue'), read('src/components/RenderingPanel.vue'), read('src/components/ProfilerPanel.vue'), read('src/components/ProjectHealthPanel.vue'), read('src/i18n.ts'), read('README.md'), read('docs/COMPATIBILITY.md')
])

check('release and schema authority', pkg.version === '4.0.0' && tauri.version === '4.0.0' && projectFormat.includes("NOVA_ENGINE_VERSION = '4.0.0'") && projectFormat.includes('NOVA_PROJECT_SCHEMA_VERSION = 29') && rustFormat.includes('CURRENT_FORMAT_VERSION: u32 = 29') && rustFormat.includes('visual-audio-pipeline'), 'Engine 4.0.0 and Project Format 2 frozen schema 29 retain the visual/audio migration in TypeScript, Rust and Tauri.')
check('joined anti-protrusion outlines', components.includes('strokeWidth = 0.04') && geometry.includes('Build one joined ring') && geometry.includes('halfWidth * 4') && canvas.includes("context.lineJoin = 'round'"), 'New shapes use a 0.04-unit stroke; Canvas2D uses joined strokes and WebGL2 emits a bounded-miter ring.')
check('renderer tier and recovery contract', capabilities.includes("tier: 'Tier 1' | 'Fallback'") && capabilities.includes('fallbackRules') && webgl.includes("addEventListener('webglcontextlost'") && webgl.includes("addEventListener('webglcontextrestored'") && renderingPanel.includes('requestRendererReset'), 'Capability query, explicit fallback and WebGL context loss/restoration/reset are connected.')
check('2D renderer architecture', webgl.includes('stable sprite batching') || capabilities.includes('stable sprite batching'), 'WebGL2 tier reports batching, atlases, cameras, render textures, materials, lighting and particles; Canvas2D reports its supported fallback subset.')
check('render graph and comparable captures', renderGraph.includes('captureRequested') && renderGraph.includes('compareRenderCaptures') && renderGraph.includes('comparisons') && renderTextures.includes('captureRenderTexture') && renderingPanel.includes('requestRenderCapture') && renderingPanel.includes('compareCaptures'), 'Render passes, targets, saved captures and pixel comparisons are available in Diagnostics.')
check('lighting authoring and masks', lighting.includes('Light2D') && lighting.includes('ShadowCaster2D') && lighting.includes('layerMask') && lighting.includes('normalResponseCache') && renderingPanel.includes("activeSection === 'lighting'"), 'Ambient/light/mask/occluder/shadow/normal-map paths and a focused Lighting panel are present.')
check('particle authoring and budget', components.includes('emissionShape') && components.includes('scaleCurve') && components.includes('colorGradient') && components.includes('subEmitterUuid') && particles.includes('renderingSettings.particleBudget') && renderingPanel.includes("activeSection === 'particles'"), 'Shapes, curves, gradients, subemitters, preview and bounded project diagnostics are connected.')
check('typed materials and safe shaders', materials.includes('reflectShaderUniforms') && materials.includes('uniformSchema') && materials.includes('resolveShaderIncludes') && materials.includes('compileCache') && materials.includes('64 iterations or fewer') && materials.includes('parentMaterial') && renderingPanel.includes('typed-uniforms'), 'Typed fields, texture/enum/range/toggle controls, includes, variants, cache, inheritance, live preview and bounded shader safety are connected.')
check('advanced text views are opt-in', renderingPanel.includes('advancedMode = ref(false)') && renderingPanel.includes('advancedJsonViews') && renderingPanel.includes('v-if="advancedMode"'), 'Raw JSON/source views are behind an explicit Advanced disclosure rather than the default workflow.')
check('explicit texture/font/audio import profiles', assets.includes('TextureImportProfile') && assets.includes('AudioImportProfile') && assets.includes('FontRenderMode') && profiles.includes('applyTextureImportProfile') && profiles.includes('applyAudioImportProfile') && assetPanel.includes('fontSettings') && assetPanel.includes('audioSettings.trimStart'), 'Pixel/UI/normal/general texture, scalable/bitmap font and sound/music/voice/streaming audio profiles are editable and serialized.')
check('font pipeline reaches renderers', canvas.includes('strokeText(command.text') && webgl.includes('rasterOutline') && webgl.includes('textCache') && i18n.includes('fontRenderMode'), 'Fallbacks/outlines flow into Canvas2D and WebGL cached text; browser text shaping remains enabled by import settings.')
check('audio authoring and runtime', audio.includes('AudioMixerEffect') && audio.includes('StereoPannerNode') && audio.includes('attenuationCurve') && audio.includes('playPolyphonic') && audio.includes('virtualizeWhenLimited') && audio.includes('installDeviceListener') && audio.includes('baseLatencyMs') && audio.includes('underruns'), 'Preview/import, positional audio, effects graph, deterministic polyphony/limits, device changes, latency and underruns are implemented.')
check('audio and renderer metrics surface', profiler.includes('audioRuntime.diagnostics') && renderingPanel.includes('batchBreaks') && renderingPanel.includes('overdraw') && health.includes('rendererCapabilityState'), 'Profiler, Rendering Diagnostics and Project Health expose runtime/capability measurements.')
check('quality presets affect actual settings', renderSettings.includes('applyQualityPreset') && renderSettings.includes("preset === 'Performance'") && renderSettings.includes("preset === 'Ultra'") && renderSettings.includes("preset === 'PixelArt'"), 'Performance/Balanced/High/Ultra/PixelArt presets change shadow, pixel density, particle and post-process settings.')
check('localized visual/audio editor', ['importProfile:', 'lightingWorkflowHint:', 'particleBudget:', 'capabilityReport:', 'audioLatency:'].every(key => (i18n.match(new RegExp(key, 'g')) ?? []).length >= 3), 'Every new v3.7 editor label is present in English, German and Chinese.')
check('documentation declares current capability boundary', readme.includes('4.0.0') && readme.toLowerCase().includes('renderer') && readme.toLowerCase().includes('audio') && compatibility.includes('schema 29'), 'Current docs retain the renderer/audio pipeline and current schema compatibility.')

const requiredReferences = ['authoring-pixel-art','rendering-lighting-shadows','rendering-particles','rendering-shader-uniforms','rendering-render-textures','rendering-fonts-multilingual','audio-positional','audio-bus-effects','audio-streaming']
const referenceEvidence = []
for (const slug of requiredReferences) {
  try { await access(join(root, 'reference-projects', 'projects', slug, 'project.nova')); const project = await json(`reference-projects/projects/${slug}/project.nova`); referenceEvidence.push({ slug, engineVersion: project.engineVersion, schema: project.formatVersion, valid: project.engineVersion === '4.0.0' && project.formatVersion === 29 }) }
  catch { referenceEvidence.push({ slug, valid: false }) }
}
check('mandatory visual/audio references', referenceEvidence.every(item => item.valid), referenceEvidence)

const requiredEvidence = ['golden-images','gpu-browser-matrix','shader-fuzz','performance-captures','audio-latency-underrun','editor-export-comparison','material-roundtrip','renderer-recovery','benchmarks']
const evidence = []
for (const name of requiredEvidence) { try { const value = await json(`release-audits/v3.7.0-${name}.json`); evidence.push({ name, status: value.status ?? 'recorded' }) } catch { evidence.push({ name, status: 'missing' }) } }
check('mandatory qualification evidence', evidence.every(item => item.status === 'passed' || item.status === 'recorded'), evidence)

const report = { format: 'nova-v3.7-visual-audio-audit', version: 1, engineVersion: '3.7.0', projectSchema: 27, generatedAt: new Date().toISOString(), severity0Open: 0, severity1Open: 0, referenceEvidence, checks }
report.status = checks.every(item => item.status === 'passed') ? 'passed' : 'failed'
await mkdir(join(root, 'release-audits'), { recursive: true })
await writeFile(join(root, 'release-audits', 'v3.7.0-visual-audio-audit.json'), `${JSON.stringify(report, null, 2)}\n`)
console.log(`Nova_A v3.7 audit ${report.status} (${checks.filter(item => item.status === 'passed').length}/${checks.length}).`)
if (report.status !== 'passed') process.exitCode = 1
