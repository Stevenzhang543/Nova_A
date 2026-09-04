import { cp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const projects = join(root, 'reference-projects/projects')
const id = 'production-media-v2605-polished'
const output = join(projects, id)
await mkdir(output, { recursive: true })
await cp(join(projects, 'rendering-v55-material-graph'), output, { recursive: true, force: true })

const projectPath = join(output, 'project.nova')
const project = JSON.parse(await readFile(projectPath, 'utf8'))
const companions = await Promise.all([
  'animation-v56-interop-recording',
  'audio-v56-waveform-mixer',
  'cinematic-v56-nested-subtitles'
].map(async name => JSON.parse(await readFile(join(projects, name, 'project.nova'), 'utf8'))))
const assets = new Map(project.assets.map(asset => [asset.uuid, asset]))
for (const companion of companions) for (const asset of companion.assets) if (!assets.has(asset.uuid)) assets.set(asset.uuid, structuredClone(asset))
project.assets = [...assets.values()]
project.assetFolders = [...new Set([...project.assetFolders, 'Assets/Animations', 'Assets/Controllers', 'Assets/Timelines'])]
project.engineVersion = '26.5.0'
project.projectMetadata.name = 'Production Media 26.05'
project.projectMetadata.template = id
project.projectMetadata.updatedAt = '2026-09-04T00:00:00.000Z'
project.manifest.name = 'Production Media 26.05'
project.manifest.engineCompatibility = { minimum: '7.0.0', maximumExclusive: '27.0.0' }
project.projectSettings.rendering = {
  ...project.projectSettings.rendering,
  qualityPreset: 'Balanced',
  lightingEnabled: true,
  ambientIntensity: .72,
  shadowQuality: 'Soft',
  maximumPixelRatio: 1.5,
  particleBudget: 10_000,
  textureStreaming: { enabled: true, memoryBudgetMb: 256, idleFrames: 600, uploadBudgetPerFrame: 16, preloadMargin: 1.5 },
  deterministicCapture: { frameRate: 60, sampleRate: 48_000, maximumFrames: 300, memoryBudgetMb: 128, includeUi: true }
}
project.projectSettings.audio = structuredClone(companions[1].projectSettings.audio)
if (project.projectSettings?.build?.releaseEngineering) project.projectSettings.build.releaseEngineering.release = '26.05'
await writeFile(projectPath, `${JSON.stringify(project, null, 2)}\n`)
await writeFile(join(output, 'README.md'), `# Production Media 26.05\n\nEngine **26.5.0**, Project Format 2/schema 29. This reference covers the complete rendering, animation, audio and cinematic production gate. It combines a layered visual material, WebGL2/Canvas2D fallback review, lighting/shadows, animation/controller assets, audio routing/snapshots, a skippable timeline, bounded texture streaming, and deterministic 60 fps / 48 kHz capture.\n\nRun the actions in \`test-controls.json\` on Balanced and Low-end. Low-end may reduce budgets and presentation quality, but it must not remove materials, animation, audio, timeline, UI, or authored behavior.\n`)
await writeFile(join(output, 'test-controls.json'), `${JSON.stringify({ engineVersion: '26.5.0', reference: 'production-media', actions: [
  { action: 'Open Rendering → Production and select Balanced', expected: 'Six subsystem checks are visible; texture and capture budgets are finite' },
  { action: 'Play the scene, animation, particles, audio mix and skippable timeline', expected: 'All authored systems remain active with no fatal error or timing divergence' },
  { action: 'Capture two frames at 60 fps / 48 kHz, stop, clear, and repeat', expected: 'Frames are numbered 0 and 1 with audio ranges 0–800 and 800–1600' },
  { action: 'Select Low-end and repeat the full flow', expected: 'Budgets decrease but the same semantic systems remain available' },
  { action: 'Switch English, German and Chinese at all release viewports', expected: 'Production cards reflow without overlap, clipping, hidden actions or a root horizontal scrollbar' },
  { action: 'Build Web and Windows player outputs', expected: 'The same production report is applied and exported behavior matches the editor' }
] }, null, 2)}\n`)
await writeFile(join(output, 'expected-output.json'), `${JSON.stringify({ engineVersion: '26.5.0', status: 'passed', projectFormat: 2, schema: 29, reference: 'production-media', profiles: ['Balanced', 'LowEnd'], semanticSystems: ['materials', 'lighting', 'animation', 'audio', 'timeline', 'ui'], deterministicCapture: { frameRate: 60, sampleRate: 48000, sampleBoundaries: [[0,800],[800,1600]] }, webgl2: 'full-supported-path', canvas2d: 'documented-safe-fallback', externalCertification: 'pending' }, null, 2)}\n`)

const readmePath = join(root, 'reference-projects/README.md')
const readme = await readFile(readmePath, 'utf8')
const marker = '## Nova_A 26.05 production-media reference'
if (!readme.includes(marker)) await writeFile(readmePath, `${readme.trimEnd()}\n\n${marker}\n\n- \`production-media-v2605-polished\`: one localized Balanced/Low-end workflow covering materials, lighting, particles, animation, audio, UI, skippable cinematics, texture budgets and deterministic frame/audio capture.\n`)
console.log('Generated the Nova_A 26.05 production-media reference project.')
