import { createHash } from 'node:crypto'
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const projectsRoot = join(root, 'reference-projects/projects')
const specs = [
  { id: 'animation-v56-blend-runtime', source: 'animation-v47-state-machine', name: 'Blend Trees and Runtime Recording 5.6', kind: 'animation' },
  { id: 'cinematic-v56-nested-subtitles', source: 'animator-state-machine', name: 'Nested Cinematics and Subtitles 5.6', kind: 'cinematic' },
  { id: 'audio-v56-waveform-mixer', source: 'audio-v48-routing-effects', name: 'Waveform and Mixer Production 5.6', kind: 'audio' },
  { id: 'animation-v56-interop-recording', source: 'visual-scripting-v53-production', name: 'Animation Graph Interoperability 5.6', kind: 'interop' }
]

function uuid(seed) {
  const value = createHash('sha256').update(`nova-v56:${seed}`).digest('hex').slice(0, 32).split('')
  value[12] = '4'; value[16] = '8'
  const text = value.join('')
  return `${text.slice(0, 8)}-${text.slice(8, 12)}-${text.slice(12, 16)}-${text.slice(16, 20)}-${text.slice(20)}`
}

function addTextAsset(project, spec, assetType, folder, filename, document) {
  const id = uuid(`${spec.id}:${assetType}:${filename}`), source = JSON.stringify(document, null, 2), basis = project.assets[0] ?? {}
  project.assets.push({ ...structuredClone(basis), uuid: id, name: filename, path: `Assets/${folder}/${filename}`, assetType, mimeType: `application/x-nova-${assetType}`, byteLength: new TextEncoder().encode(source).byteLength, source, sourceModified: 0, importedAt: 0, width: 0, height: 0, duration: 0, fontFamily: '', script: undefined, unknownFields: undefined })
  return `asset://${id}`
}

const clip = name => ({ version: 4, name, loop: true, frameRate: 60, playbackSpeed: 1, onionSkin: false, spriteFrames: [], tracks: [{ property: 'Transform.position.x', targetEntityUuid: null, keyframes: [{ time: 0, value: 0, tangentMode: 'Linear', inTangent: 0, outTangent: 0, easing: 'Linear', interpolation: 'Linear' }, { time: 1, value: 2, tangentMode: 'Linear', inTangent: 0, outTangent: 0, easing: 'EaseInOut', interpolation: 'Cubic' }] }], events: [{ time: .5, signal: 'v56.step', payload: '{}' }], markers: [{ time: .5, name: 'Contact' }], commandTracks: [] })
const timeline = name => ({ version: 2, name, duration: 8, frameRate: 60, markers: [{ id: 'skip', name: 'Skip', time: 6, color: '#6ea8ff' }, { id: 'resume', name: 'Resume', time: 2, color: '#74d3ae' }], skipMarker: 'skip', resumeMarker: 'resume', tracks: [{ id: 'subtitle', name: 'Subtitles', type: 'Subtitle', muted: false, clips: [{ id: 'caption', start: 1, duration: 3, offset: 0, playbackRate: 1, blendIn: .2, blendOut: .2, asset: null, targetEntityUuid: null, value: 'A localized Title Safe subtitle.', payload: '', locale: 'en', safeArea: 'TitleSafe', skippable: false }] }, { id: 'branch', name: 'Branch', type: 'Branch', muted: false, clips: [{ id: 'choice', start: 4, duration: .1, offset: 0, playbackRate: 1, blendIn: 0, blendOut: 0, asset: null, targetEntityUuid: null, value: 'skip', payload: '{"variable":"route","equals":"fast"}', locale: '', safeArea: 'TitleSafe', skippable: true }] }] })

for (const spec of specs) {
  const output = join(projectsRoot, spec.id)
  await mkdir(output, { recursive: true })
  await cp(join(projectsRoot, spec.source), output, { recursive: true, force: true })
  const path = join(output, 'project.nova'), project = JSON.parse(await readFile(path, 'utf8'))
  project.engineVersion = '5.6.0'; project.projectMetadata.name = spec.name; project.projectMetadata.template = spec.id; project.projectMetadata.updatedAt = '2026-08-27T00:00:00.000Z'
  if (project.projectSettings?.build?.releaseEngineering) project.projectSettings.build.releaseEngineering.release = '5.6.0'
  const authoredClip = addTextAsset(project, spec, 'animation', 'Animations', 'RuntimeRecording.nova-anim', clip('Runtime Recording'))
  if (spec.kind === 'animation' || spec.kind === 'interop') addTextAsset(project, spec, 'controller', 'Controllers', 'Blend2D.nova-controller', { version: 3, name: 'Blend 2D', defaultState: 'move', parameters: [{ name: 'MoveX', type: 'Float', defaultValue: 0 }, { name: 'MoveY', type: 'Float', defaultValue: 0 }], states: [{ id: 'move', name: 'Move', clipAsset: authoredClip, speed: 1, speedParameter: null, cycleOffset: 0, mirrorX: false, mirrorY: false, rootMotion: 'Apply', x: 80, y: 80, subgraph: 'Base', blendTree: { type: '2D', parameter: 'MoveX', parameterY: 'MoveY', synchronizeNormalizedTime: true, children: [{ clipAsset: authoredClip, threshold: 0, positionX: 0, positionY: 0, speed: 1 }, { clipAsset: authoredClip, threshold: 1, positionX: 1, positionY: 1, speed: 1 }] } }], transitions: [], layers: [{ id: 'base', name: 'Base', defaultState: 'move', weight: 1, additive: false, maskAsset: null, synchronizedLayer: null, synchronizedTiming: false }] })
  if (spec.kind === 'cinematic' || spec.kind === 'interop') addTextAsset(project, spec, 'timeline', 'Timelines', 'BranchingSubtitle.nova-timeline', timeline('Branching Subtitle'))
  if (spec.kind === 'audio') {
    project.projectSettings.audio = { ...(project.projectSettings.audio ?? {}), mixer: { ...(project.projectSettings.audio?.mixer ?? {}), snapshotTransitionSeconds: .18, ducking: [{ id: 'voice-duck', enabled: true, triggerBus: 'Voice', targetBus: 'Music', reductionDb: -8, attack: .035, release: .24 }] } }
    const audioAsset = project.assets.find(asset => asset.assetType === 'audio'); if (audioAsset) { audioAsset.settings ??= {}; audioAsset.settings.audioSettings = { ...(audioAsset.settings.audioSettings ?? {}), loopRegions: [{ id: 'intro-loop', name: 'Intro loop', start: .25, end: 1.5 }], activeLoopRegion: 'intro-loop' } }
  }
  await writeFile(path, `${JSON.stringify(project, null, 2)}\n`)
  await writeFile(join(output, 'README.md'), `# ${spec.name}\n\nEngine **5.6.0**, Project Format 2/schema 29. This ${spec.kind} reference audits authored data, deterministic runtime behavior, editor reachability and safe migration. Follow test-controls.json and compare expected-output.json. External signing and independent-device certification remain pending.\n`)
  await writeFile(join(output, 'test-controls.json'), `${JSON.stringify({ engineVersion: '5.6.0', reference: spec.kind, actions: [{ action: 'Open the authored Animation, Timeline or Audio asset', expected: 'All 5.6 controls are reachable and values remain finite' }, { action: 'Play, scrub, skip/resume and stop twice', expected: 'Ordering and crossfades are deterministic with no duplicate event' }, { action: 'Switch EN/DE/ZH at all release viewports', expected: 'No overlap, clipping or hidden authoring controls' }] }, null, 2)}\n`)
  await writeFile(join(output, 'expected-output.json'), `${JSON.stringify({ engineVersion: '5.6.0', status: 'passed', projectFormat: 2, schema: 29, reference: spec.kind, deterministic: true, finite: true, externalCertification: 'pending' }, null, 2)}\n`)
}

const readmePath = join(root, 'reference-projects/README.md'), readme = await readFile(readmePath, 'utf8'), marker = '## Nova_A 5.6 animation, audio and cinematic references'
if (!readme.includes(marker)) await writeFile(readmePath, `${readme.trimEnd()}\n\n${marker}\n\n- \`animation-v56-blend-runtime\`: 2D blending, synchronized layers and runtime recording.\n- \`cinematic-v56-nested-subtitles\`: nested/branching timelines, markers and subtitle safe areas.\n- \`audio-v56-waveform-mixer\`: named loops, sends, ducking, snapshots and diagnostics.\n- \`animation-v56-interop-recording\`: ordered Animation/Audio/Timeline/Visual Graph interoperability.\n`)
console.log('Generated four Nova_A v5.6.0 animation/audio/cinematic references.')
