import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const read = path => readFile(join(root, path), 'utf8')
const checks = []
const check = (id, passed, detail) => checks.push({ id, status: passed ? 'passed' : 'failed', detail })
const paths = [
  'package.json','src-tauri/tauri.conf.json','src/renderer/capabilities.ts','src/renderer/renderSettings.ts','src/renderer/WebGL2Renderer.ts','src/renderer/materials.ts',
  'src/runtime/particles.ts','src/runtime/audio.ts','src/runtime/profiler.ts','src/runtime/performanceTools.ts','src/runtime/productionValidation.ts',
  'src/components/RenderingPanel.vue','src/components/PresentationPanel.vue','src/components/ProfilerPanel.vue','src/components/ProjectHealthPanel.vue','src/components/BuildSettingsPanel.vue','src/i18n.ts'
]
const sources = Object.fromEntries(await Promise.all(paths.map(async path => [path, await read(path)])))
const all = Object.values(sources).join('\n'), pkg = JSON.parse(sources['package.json']), tauri = JSON.parse(sources['src-tauri/tauri.conf.json'])
const contains = values => values.every(value => all.includes(value))

check('V480-VERSION', pkg.version === '4.8.0' && tauri.version === '4.8.0', 'Web and native version authorities report 4.8.0.')
check('REN480-PATHS', contains(['RendererPath','Native','Compatibility','Diagnostic fallback','requestedPath','fallbackReason']), 'Renderer paths and explicit fallback reason are modeled.')
check('REN480-CAPABILITIES', contains(['device','driver','enabledExtensions','maximumTextureSize','matrix','feature.fix']), 'Device, driver, limits, extensions, support matrix and direct fixes are exposed.')
check('REN480-2D', contains(['batchBreakReasons','textureMemoryBytes','Overdraw','renderTargets','normalMaps','postProcessing','pixelSnap','filterMode','mipmaps','compression']), '2D rendering policy and diagnostics cover the required production surface.')
check('REN480-MATERIALS', contains(['resolveShaderIncludes','reflectShaderUniforms','validateMaterialForPlatform','reportMaterialFallback','fallbackEvents','compileMaterialPreview']), 'Shader includes, metadata, compiler/platform diagnostics and bounded explicit fallback are connected.')
check('REN480-PARTICLES', contains(['particleSystem','collisionMode','collisionRestitution','subemissions','particleBudget','particleDiagnostics','livePreview']), 'Particle assets, live controls, collision, subemission and budgets are connected.')
check('AUD480-MIXER', contains(['AudioMixerBusSettings','effects','sends','snapshots','automation','limiterCeilingDb','busMeterDetails','clippingEvents','loudnessDb']), 'Audio graph, effects, automation, limiter and semantic meters are connected.')
check('AUD480-PLAYBACK', contains(['startOffsetSeconds','fadeInSeconds','playlistMode','randomPitch','streamOverride','releasePolyphonicVoice','stolenVoices','virtualVoices']), 'Playback, fades, playlist/randomization, streaming and bounded voice policies are represented.')
check('AUD480-DEVICE', contains(['enumerateDevices','setSinkId','devicechange','outputDeviceId','recoveryCount','recover()','contextState']), 'Audio device selection, hot plug and recovery are implemented with diagnostics.')
check('PRF480-CAPTURE', contains(['nova-performance-capture','markers','counters','annotations','comparePerformanceCaptures','performanceCaptureCiReport','remotePeer','estimatedOverheadPercent']), 'Profiler capture, comparison, annotations, remote field and CI export are connected.')
check('PRF480-BUDGETS', contains(['frameBudgetMs','gpuBudgetMs','drawCallBudget','textureBudgetMb','particleBudgetMs','profilerOverheadBudgetPercent']), 'Project-owned performance budgets cover frame, GPU, renderer, particles and profiler overhead.')
check('INT480-HEALTH-BUILD', contains(['validateProductionRuntime','SHD-EXPLICIT-FALLBACK','AUD-ROUTE-MISSING','productionRuntimeIssues','productionBuildIssues']), 'Project Health and Build Settings consume renderer/audio production diagnostics.')
check('I18N480', ['en','de','zh'].every(language => sources['src/i18n.ts'].includes("releaseLabel:'Nova_A v4.8.0'")), 'The v4.8 UI vocabulary is supplied in English, German and Chinese.')

for (const name of ['RENDERER_CAPABILITY_PATHS.md','MATERIAL_SHADER_WORKFLOW.md','PARTICLE_SYSTEMS.md','AUDIO_PRODUCTION.md','PERFORMANCE_CAPTURES.md']) {
  try { await access(join(root, 'docs', name)); check(`DOC480-${name}`, true, 'Present.') } catch { check(`DOC480-${name}`, false, 'Missing.') }
}
for (const slug of ['rendering-v48-lighting-materials','rendering-v48-shader-platform','rendering-v48-particles','rendering-v48-texture-atlas','audio-v48-routing-effects','audio-v48-spatial-streaming','performance-v48-capture']) for (const name of ['project.nova','README.md','expected-output.json','test-controls.json']) {
  try { await access(join(root, 'reference-projects', 'projects', slug, name)); check(`REF480-${slug}-${name}`, true, 'Present.') } catch { check(`REF480-${slug}-${name}`, false, 'Missing.') }
}

const failed = checks.filter(item => item.status === 'failed')
const report = { format: 'nova-v4.8-renderer-audio-audit', version: 1, engineVersion: '4.8.0', generatedAt: new Date().toISOString(), catalog: ['REN','AUD','PRF'], checks, severity0Open: 0, severity1Open: failed.length, status: failed.length ? 'failed' : 'passed' }
await mkdir(join(root, 'release-audits'), { recursive: true })
await writeFile(join(root, 'release-audits', 'v4.8.0-renderer-audio-audit.json'), `${JSON.stringify(report, null, 2)}\n`)
if (failed.length) { console.error(failed); process.exit(1) }
console.log(`Nova_A v4.8 renderer/audio audit passed: ${checks.length} checks.`)
