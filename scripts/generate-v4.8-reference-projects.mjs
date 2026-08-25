import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url))), projects = join(root, 'reference-projects', 'projects')
const fixtures = [
  ['rendering-v48-lighting-materials','rendering-lighting-shadows','Rendering 4.8 Lighting and Materials',['lights','occluders','shadows','normal maps','typed materials','post processing']],
  ['rendering-v48-shader-platform','rendering-shader-uniforms','Rendering 4.8 Shader Platform',['valid shader','invalid shader fallback','recursive include rejection','platform validation','hot reload']],
  ['rendering-v48-particles','rendering-particles','Rendering 4.8 Particles',['particle assets','bursts','curves','gradients','collision','subemitters','budget']],
  ['rendering-v48-texture-atlas','content-v44-sprite-atlas','Rendering 4.8 Texture and Atlas',['atlas batching','filtering','mipmaps','compression','texture memory','batch breaks']],
  ['audio-v48-routing-effects','audio-bus-effects','Audio 4.8 Routing and Effects',['bus graph','effects','sends','snapshots','automation','limiter','peak/RMS/clipping']],
  ['audio-v48-spatial-streaming','audio-positional','Audio 4.8 Spatial and Streaming',['listener','attenuation','pan','streaming','preload','loop markers','fades','playlists','voice stealing']],
  ['performance-v48-capture','authoring-5000-stress','Performance 4.8 Capture',['frame timeline','flame view','markers','counters','annotations','budget CI','capture comparison','remote-player field']]
]
const json = value => `${JSON.stringify(value, null, 2)}\n`
function ensure(project, slug, title) {
  project.engineVersion = '4.8.0'; project.formatVersion = 29
  project.projectMetadata.name = title; project.projectMetadata.template = slug; project.manifest.name = title
  project.projectSettings ??= {}; project.projectSettings.rendering = { rendererPath: 'Auto', unsupportedPolicy: 'WarnAndFallback', qualityPreset: 'Balanced', lightingEnabled: true, ambientColor: { r: 255, g: 255, b: 255 }, ambientIntensity: 1, shadowQuality: 'Soft', colorSpace: 'sRGB', postProcessing: { enabled: false, exposure: 0, contrast: 1, saturation: 1, vignette: 0, bloom: 0, blur: 0, userMaterial: null }, debugView: 'None', pixelSnap: false, maximumPixelRatio: 2, particleBudget: 10000, budgets: { drawCalls: 500, textureMemoryMb: 256, overdraw: 4, gpuMs: 8, particleMs: 2 }, ...(project.projectSettings.rendering ?? {}) }
  project.projectSettings.audio ??= { masterVolume: 1, sampleRate: 48000, buses: { Master: 1, Music: 1, SFX: 1, UI: 1 }, mixer: { buses: [], snapshots: [], activeSnapshot: null, ducking: [], masterVoiceLimit: 128, outputDeviceId: 'default', limiterEnabled: true, limiterCeilingDb: -1 } }
  project.projectSettings.production ??= {}; project.projectSettings.production.performance = { traceCapacity: 600, memoryBudgetMb: 300, assetBudgetMb: 512, animationBudgetMs: 2, uiBudgetMs: 2, frameBudgetMs: 16.667, renderingBudgetMs: 8, audioBudgetMs: 2, gpuBudgetMs: 8, drawCallBudget: 500, textureBudgetMb: 256, particleBudgetMs: 2, profilerOverheadBudgetPercent: 5, leakWindowFrames: 600, lifetimeCapacity: 2000, ...(project.projectSettings.production.performance ?? {}) }
  for (const scene of project.scenes ?? []) for (const entity of scene.entities ?? []) for (const component of entity.components ?? []) {
    if (component.kind === 'ParticleEmitter2D') component.data = { collisionMode: 'Bounce', collisionRestitution: .5, collisionLayerMask: 0xffffffff, previewInEditor: true, ...(component.data ?? {}) }
    if (component.kind === 'AudioSource') component.data = { startOffsetSeconds: 0, fadeInSeconds: .05, fadeOutSeconds: .1, dopplerScale: 0, playlist: [], playlistMode: 'Single', playlistIndex: 0, ...(component.data ?? {}) }
  }
}

for (const [slug, source, title, features] of fixtures) {
  const project = JSON.parse(await readFile(join(projects, source, 'project.nova'), 'utf8')); ensure(project, slug, title)
  const directory = join(projects, slug); await mkdir(directory, { recursive: true }); await writeFile(join(directory, 'project.nova'), json(project))
  await writeFile(join(directory, 'expected-output.json'), json({ engineVersion: '4.8.0', schema: 29, projectName: title, expectedValidation: 'pass', featureMatrix: features, budgetsPass: true, unsupportedFeaturesAreActionable: true }))
  await writeFile(join(directory, 'test-controls.json'), json({ engineVersion: '4.8.0', open: 'Project Manager > Open project.nova', manage: 'Manage > Rendering / Presentation / Profiler', health: 'Manage > Project Health', build: 'Build Settings > Diagnostics', capture: 'Profiler > Capture performance > Export capture + CI result', validate: features }))
  await writeFile(join(directory, 'README.md'), `# ${title}\n\nEngine **4.8.0**, Project Format 2, schema 29.\n\nRequired packages: None; Nova_A core only.\n\nTarget platforms: Windows x86-64 Native renderer path and Chromium/WebGL2 Compatibility path.\n\n## Purpose\n\nValidates ${features.join(', ')}.\n\n## Test procedure\n\n1. Open \`project.nova\` and follow \`test-controls.json\`.\n2. Capture a frame/performance trace and compare with \`expected-output.json\`.\n3. Confirm Project Health and Build Diagnostics show no blocking 4.8 issue.\n4. Record unsupported capability, fallback, device, driver and budget diagnostics rather than accepting silent degradation.\n\n## Known limitations\n\nThis deterministic fixture is local evidence. Representative physical GPUs/audio devices, Firefox/WebKit, 24-hour soak, and clean-machine Windows installation remain explicitly recorded external gates unless their evidence is present.\n`)
}

for (const entry of await readdir(projects, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue
  const directory = join(projects, entry.name)
  try {
    const projectPath = join(directory, 'project.nova'), project = JSON.parse(await readFile(projectPath, 'utf8')); project.engineVersion = '4.8.0'; await writeFile(projectPath, json(project))
    const readmePath = join(directory, 'README.md'), readme = await readFile(readmePath, 'utf8'); await writeFile(readmePath, readme.replace(/Engine \*\*\d+\.\d+\.\d+\*\*/g, 'Engine **4.8.0**'))
    for (const name of ['expected-output.json','test-controls.json']) { try { const path = join(directory, name), document = JSON.parse(await readFile(path, 'utf8')); document.engineVersion = '4.8.0'; await writeFile(path, json(document)) } catch { /* optional */ } }
  } catch { /* helper directory */ }
}
console.log('Generated seven Nova_A v4.8 renderer/audio/performance references and refreshed all release metadata.')
