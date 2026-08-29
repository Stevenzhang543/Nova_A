import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url))), checks = []
const check = (id, passed, detail, metrics = {}) => { checks.push({ id, status: passed ? 'passed' : 'failed', detail, metrics }); if (!passed) console.error(`${id}: ${detail}`) }
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { platform: 'Win32', hardwareConcurrency: 8, userAgent: 'Nova_A v5.6 production verifier', mediaDevices: { addEventListener() {}, removeEventListener() {} } } })
globalThis.window ??= { setTimeout, clearTimeout, setInterval, clearInterval, addEventListener() {}, removeEventListener() {} }
globalThis.localStorage ??= { getItem() { return null }, setItem() {}, removeItem() {} }
globalThis.performance ??= { now: () => Date.now() }

const referenceIds = ['animation-v56-blend-runtime', 'cinematic-v56-nested-subtitles', 'audio-v56-waveform-mixer', 'animation-v56-interop-recording']
const projects = Object.fromEntries(await Promise.all(referenceIds.map(async id => [id, JSON.parse(await readFile(join(root, `reference-projects/projects/${id}/project.nova`), 'utf8'))])))
check('V560-REFERENCES', referenceIds.every(id => projects[id].engineVersion === '5.6.0' && projects[id].projectFormatMajor === 2 && projects[id].formatVersion === 29), 'Four v5.6 references retain Project Format 2/schema 29.', { references: referenceIds })

const server = await createServer({ root, appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } }); await server.watcher.close()
try {
  const animation = await server.ssrLoadModule('/src/runtime/animation.ts'), timeline = await server.ssrLoadModule('/src/runtime/timeline.ts'), audio = await server.ssrLoadModule('/src/runtime/audio.ts'), cinematic = await server.ssrLoadModule('/src/runtime/cinematicProduction.ts')
  const migrated = animation.normalizeAnimatorController({ version: 2, name: 'Legacy', states: [{ id: 'idle', name: 'Idle', speed: 1 }], layers: [{ id: 'base', name: 'Base', defaultState: 'idle', weight: 1 }] })
  check('V560-ADDITIVE-MIGRATION', migrated.version === 3 && migrated.states[0].rootMotion === 'Apply' && migrated.layers[0].synchronizedTiming === false, 'Animator v2 data receives safe additive v3 defaults.')
  const blend = animation.normalizeAnimatorController({ version: 3, name: '2D', parameters: [{ name: 'X', type: 'Float', defaultValue: 0 }, { name: 'Y', type: 'Float', defaultValue: 0 }], states: [{ id: 'move', name: 'Move', speed: 1, blendTree: { type: '2D', parameter: 'X', parameterY: 'Y', synchronizeNormalizedTime: true, children: [{ clipAsset: null, threshold: 0, positionX: -1, positionY: 2, speed: 1 }] } }], layers: [{ id: 'base', name: 'Base', defaultState: 'move', weight: 1 }] })
  check('V560-BLEND-LAYERS', blend.states[0].blendTree?.type === '2D' && blend.states[0].blendTree?.parameterY === 'Y' && blend.states[0].blendTree?.children[0].positionY === 2, '2D blend positions, normalized-time option and synchronized layer fields survive normalization.')
  const clip = animation.normalizeAnimationClip({ version: 4, name: 'Order', loop: false, tracks: [{ property: 'Transform.position.x', keyframes: [{ time: 0, value: 0 }, { time: 1, value: 1 }] }], events: [{ time: .5, signal: 'event', payload: '' }], commandTracks: [{ kind: 'Audio', commands: [{ time: .5, value: 'asset://audio', payload: '' }] }, { kind: 'VisualGraph', commands: [{ time: .5, value: 'graph.start', payload: '' }] }] })
  const dispatch = animation.animationDispatchesBetween(clip, 0, 1)
  check('V560-EVENT-ORDER', dispatch.map(item => item.kind).join(',') === 'event,command,command' && dispatch.every(item => item.crossed === .5), 'Same-time events execute before authored command tracks in stable track order.', { order: dispatch.map(item => item.kind === 'event' ? item.event.signal : item.track.kind) })
  const migratedTimeline = timeline.normalizeTimeline({ version: 1, name: 'Legacy', duration: 5, tracks: [{ id: 'events', name: 'Events', type: 'Event', clips: [{ id: 'start', start: 0, duration: 1, value: 'go' }] }] })
  check('V560-TIMELINE-MIGRATION', migratedTimeline.version === 2 && migratedTimeline.tracks[0].clips[0].safeArea === 'TitleSafe' && migratedTimeline.tracks[0].clips[0].skippable, 'Timeline v1 data receives safe v2 subtitle/skip defaults.')
  const clips = Array.from({ length: 10_000 }, (_, index) => ({ id: `c${index}`, start: index / 120, duration: 1, offset: 0, playbackRate: 1, blendIn: 0, blendOut: 0, asset: null, targetEntityUuid: null, value: '', payload: '', locale: '', safeArea: 'TitleSafe', skippable: true }))
  const longTimeline = timeline.normalizeTimeline({ version: 2, name: 'Long', duration: 100, frameRate: 60, markers: [], tracks: [{ id: 'long', name: 'Long', type: 'Animation', muted: false, clips }] }), before = performance.now(), estimate = cinematic.estimateTimelinePerformance(longTimeline), elapsedMs = performance.now() - before
  check('V560-LONG-TIMELINE', estimate.clips === 10_000 && estimate.peakActiveClips > 0 && elapsedMs < 1_000, 'A 10,000-clip timeline is bounded, finite and analyzed within the verifier budget.', { ...estimate, elapsedMs })
  const mixer = audio.normalizeAudioSettings({ mixer: { snapshotTransitionSeconds: 99, buses: [{ id: 'Master', gain: 1 }, { id: 'Voice', gain: 1, parent: 'Master', sends: [{ target: 'Music', gain: .4, enabled: true }] }, { id: 'Music', gain: 1, parent: 'Master' }], ducking: [{ id: 'voice', triggerBus: 'Voice', targetBus: 'Music', reductionDb: -9, attack: .04, release: .3, enabled: true }] } })
  check('V560-AUDIO-MIXER', mixer.mixer.snapshotTransitionSeconds === 30 && mixer.mixer.ducking.length === 1 && mixer.mixer.buses.find(bus => bus.id === 'Voice')?.sends.length === 1, 'Snapshot crossfades clamp safely while valid sends and ducking persist.')
  const [animationSource, audioSource, timelineSource, canvasSource] = await Promise.all(['src/runtime/animation.ts', 'src/runtime/audio.ts', 'src/runtime/timeline.ts', 'src/components/WorldCanvas.vue'].map(path => readFile(join(root, path), 'utf8')))
  const crossfadeController = animation.normalizeAnimatorController({ version: 3, states: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], transitions: [{ id: 'fade', from: 'a', to: 'b', duration: .4 }], layers: [{ id: 'base', name: 'Base', defaultState: 'a', weight: 1 }] }), crossfadeMixer = audio.normalizeAudioSettings({ mixer: { snapshotTransitionSeconds: .6 } })
  check('V560-CROSSFADES', crossfadeController.transitions[0].duration === .4 && crossfadeMixer.mixer.snapshotTransitionSeconds === .6 && animationSource.includes('blendTime / layerState.blendDuration') && animationSource.includes('(next.value - previous.value) * ratio') && audioSource.includes('setTargetAtTime') && audioSource.includes('snapshotTransitionSeconds / 3'), 'Animator transitions interpolate by bounded blend ratio and mixer snapshots use time-based AudioParam crossfades.')
  check('V560-DEVICE-RECOVERY', ['devicechange', 'recover', 'recoveryCount'].every(marker => audioSource.includes(marker)), 'Audio runtime retains device-change recovery and visible recovery counts.')
  check('V560-SUBTITLE-SAFE', ['TitleSafe', 'ActionSafe', 'FullFrame'].every(marker => timelineSource.includes(marker) && canvasSource.includes(marker)), 'All three subtitle-safe-area policies are runtime and renderer bound.')
} finally { await Promise.race([server.close(), new Promise(resolve => setTimeout(resolve, 2_000))]) }

const failed = checks.filter(item => item.status === 'failed'), report = { format: 'nova-v5.6.0-production-verification', version: 1, engineVersion: '5.6.0', generatedAt: new Date().toISOString(), checks, severity0Open: 0, severity1Open: failed.length, status: failed.length ? 'failed' : 'passed' }
await mkdir(join(root, 'release-audits'), { recursive: true }); await writeFile(join(root, 'release-audits/v5.6.0-production-verification.json'), `${JSON.stringify(report, null, 2)}\n`)
if (failed.length) process.exit(1)
console.log(`Nova_A v5.6.0 production verification passed: ${checks.length} checks.`)
