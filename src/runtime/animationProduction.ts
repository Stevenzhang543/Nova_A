/** 动画生产工具：处理动画资源编辑、引用和验证所需的数据操作。 */
import { readTextAsset, resolveAsset } from '../assets/AssetDatabase'
import type { AssetRecord } from '../assets/types'
import type { Entity } from '../world/Entity'
import { animationClipLength, normalizeAnimationClip, normalizeAnimatorController, readAnimationClip, readAnimatorController, sampleAnimationTrack, type AnimationClipDocument } from './animation'

export type AnimationValidationSeverity = 'error' | 'warning' | 'info'
export interface AnimationValidationIssue { code: string; severity: AnimationValidationSeverity; assetUuid: string; source: string; message: string; targetEntityUuid: string | null }
export interface AnimationSamplingResult { assetUuid: string; sampleRate: number; samples: number; nonFinite: number; maximumError: number; events: number; status: 'passed' | 'failed' }

/* 返回具有所列字段的新对象 { code, severity, assetUuid: asset.uuid, source: `${asset.path}/${path}`, message, targetEntityUuid }。 */ function issue(asset: AssetRecord, code: string, severity: AnimationValidationSeverity, path: string, message: string, targetEntityUuid: string | null = null): AnimationValidationIssue {
  return { code, severity, assetUuid: asset.uuid, source: `${asset.path}/${path}`, message, targetEntityUuid }
}
/** 结构说明（自动提取）：scriptSymbols；输入 assets；直接调用 Set、matchAll、readTextAsset、symbols.add；返回路径包含 symbols；包含循环处理。 */ function scriptSymbols(assets: AssetRecord[]): Set<string> {
  const symbols = new Set<string>()
  for (const asset of assets) if (asset.assetType === 'script') for (const match of (readTextAsset(asset.uuid) ?? '').matchAll(/\bfn\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/g)) symbols.add(match[1])
  return symbols
}

/** 结构说明（自动提取）：validateAnimationProject；输入 assets、entities；直接调用 Set、entities.map、scriptSymbols、readAnimationClip、issues.push 等；包含循环处理。 */ export function validateAnimationProject(assets: AssetRecord[], entities: Entity[]): AnimationValidationIssue[] {
  const issues: AnimationValidationIssue[] = [], entityUuids = new Set(entities.map(/* 返回 entity.uuid 的当前值。 */ entity => entity.uuid)), functions = scriptSymbols(assets)
  for (const asset of assets) {
    if (asset.assetType === 'animation') {
      const clip = readAnimationClip(asset.uuid)
      if (!clip) { issues.push(issue(asset, 'NOVA-ANM-PARSE', 'error', '', 'Animation clip cannot be parsed.')); continue }
      clip.tracks.forEach(/** 结构说明（自动提取）：clip.tracks.forEach 回调；输入 track、index；直接调用 entityUuids.has、issues.push、issue；包含循环处理。 */ (track, index) => {
        if (track.targetEntityUuid && !entityUuids.has(track.targetEntityUuid)) issues.push(issue(asset, 'NOVA-ANM-TARGET', 'error', `tracks[${index}]`, 'Animation track target no longer exists.', track.targetEntityUuid))
        for (let key = 1; key < track.keyframes.length; key++) if (track.keyframes[key].time <= track.keyframes[key - 1].time) issues.push(issue(asset, 'NOVA-ANM-KEY-ORDER', 'error', `tracks[${index}].keyframes[${key}]`, 'Key times must increase strictly.'))
      })
      clip.events.forEach(/** 结构说明（自动提取）：clip.events.forEach 回调；输入 event、index；直接调用 event.signal.split、test、functions.has、issues.push、issue。 */ (event, index) => { const parts = event.signal.split('.'), callback = parts[parts.length - 1] || event.signal; if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(callback) && !functions.has(callback)) issues.push(issue(asset, 'NOVA-ANM-EVENT-SYMBOL', 'warning', `events[${index}]`, `No Script Studio symbol matches ${callback}.`)) })
      clip.commandTracks.forEach(/** 结构说明（自动提取）：clip.commandTracks.forEach 回调；输入 track、trackIndex；直接调用 track.commands.forEach；返回表达式求值结果。 */ (track, trackIndex) => track.commands.forEach(/** 结构说明（自动提取）：track.commands.forEach 回调；输入 command、commandIndex；直接调用 functions.has、issues.push、issue、resolveAsset、command.value.trim。 */ (command, commandIndex) => {
        const path = `commandTracks[${trackIndex}].commands[${commandIndex}]`
        if (track.kind === 'Method' && !functions.has(command.value)) issues.push(issue(asset, 'NOVA-ANM-METHOD-SYMBOL', 'error', path, `Method ${command.value} is not defined by a project script.`))
        if (track.kind === 'Audio' && resolveAsset(command.value)?.assetType !== 'audio') issues.push(issue(asset, 'NOVA-ANM-AUDIO-REFERENCE', 'error', path, 'Audio track reference is missing or not audio.'))
        if (track.kind === 'NestedAnimation' && resolveAsset(command.value)?.assetType !== 'animation') issues.push(issue(asset, 'NOVA-ANM-NESTED-REFERENCE', 'error', path, 'Nested track reference is missing or not an animation.'))
        if (track.kind === 'Timeline' && resolveAsset(command.value)?.assetType !== 'timeline') issues.push(issue(asset, 'NOVA-ANM-TIMELINE-REFERENCE', 'error', path, 'Timeline command reference is missing or not a timeline.'))
        if (track.kind === 'VisualGraph' && !command.value.trim()) issues.push(issue(asset, 'NOVA-ANM-GRAPH-SIGNAL', 'error', path, 'Visual Graph command requires a signal name.'))
      }))
      const sampling = validateAnimationSampling(asset.uuid, clip)
      if (sampling.status === 'failed') issues.push(issue(asset, 'NOVA-ANM-SAMPLING', 'error', 'tracks', `${sampling.nonFinite} non-finite runtime samples detected.`))
    } else if (asset.assetType === 'controller') {
      const controller = readAnimatorController(asset.uuid)
      if (!controller) { issues.push(issue(asset, 'NOVA-ANM-CONTROLLER-PARSE', 'error', '', 'Animator controller cannot be parsed.')); continue }
      controller.states.forEach(/** 结构说明（自动提取）：controller.states.forEach 回调；输入 state、index；直接调用 readAnimationClip、issues.push、issue、controller.parameters.some、state.blendTree.children.forEach。 */ (state, index) => {
        if (state.clipAsset && !readAnimationClip(state.clipAsset)) issues.push(issue(asset, 'NOVA-ANM-STATE-CLIP', 'error', `states[${index}].clipAsset`, `State ${state.name} has a missing clip.`))
        if (state.blendTree && !controller.parameters.some(/* 先计算 parameter.name === state.blendTree!.parameter；仅当其为真值时求右侧 (parameter.type === 'Float' || parameter.type === 'Integer')，返回短路求值结果。 */ parameter => parameter.name === state.blendTree!.parameter && (parameter.type === 'Float' || parameter.type === 'Integer'))) issues.push(issue(asset, 'NOVA-ANM-BLEND-PARAMETER', 'error', `states[${index}].blendTree`, 'Blend tree requires a numeric parameter.'))
        if (state.blendTree?.type === '2D' && !controller.parameters.some(/* 先计算 parameter.name === state.blendTree!.parameterY；仅当其为真值时求右侧 (parameter.type === 'Float' || parameter.type === 'Integer')，返回短路求值结果。 */ parameter => parameter.name === state.blendTree!.parameterY && (parameter.type === 'Float' || parameter.type === 'Integer'))) issues.push(issue(asset, 'NOVA-ANM-BLEND-PARAMETER-Y', 'error', `states[${index}].blendTree.parameterY`, 'A 2D blend tree requires a second numeric parameter.'))
        state.blendTree?.children.forEach(/** 结构说明（自动提取）：state.blendTree.children.forEach 回调；输入 child、childIndex；直接调用 readAnimationClip、issues.push、issue。 */ (child, childIndex) => { if (child.clipAsset && !readAnimationClip(child.clipAsset)) issues.push(issue(asset, 'NOVA-ANM-BLEND-CLIP', 'error', `states[${index}].blendTree.children[${childIndex}]`, 'Blend-tree child clip is missing.')) })
      })
      controller.transitions.forEach(/** 结构说明（自动提取）：controller.transitions.forEach 回调；输入 transition、index；直接调用 issues.push、issue、controller.states.find、readAnimationClip、sourceClip.markers.some 等。 */ (transition, index) => {
        if (transition.from === transition.to && !transition.conditions.length && !transition.hasExitTime) issues.push(issue(asset, 'NOVA-ANM-TRANSITION-LOOP', 'warning', `transitions[${index}]`, 'Unconditional self-transition can restart every frame.'))
        if (transition.syncMode === 'Marker') { const source = controller.states.find(/* 比较 state.id 与 transition.from，返回严格相等的判断结果。 */ state => state.id === transition.from), destination = controller.states.find(/* 比较 state.id 与 transition.to，返回严格相等的判断结果。 */ state => state.id === transition.to), sourceClip = source ? readAnimationClip(source.clipAsset) : null, destinationClip = destination ? readAnimationClip(destination.clipAsset) : null; if (!transition.syncMarker || !sourceClip?.markers.some(/* 比较 marker.name 与 transition.syncMarker，返回严格相等的判断结果。 */ marker => marker.name === transition.syncMarker) || !destinationClip?.markers.some(/* 比较 marker.name 与 transition.syncMarker，返回严格相等的判断结果。 */ marker => marker.name === transition.syncMarker)) issues.push(issue(asset, 'NOVA-ANM-SYNC-MARKER', 'warning', `transitions[${index}]`, 'Marker synchronization requires the named marker in both source and destination clips.')) }
      })
    }
  }
  return issues.sort(/* 先计算 a.source.localeCompare(b.source)；仅当其为假值时求右侧 a.code.localeCompare(b.code)，返回短路求值结果。 */ (a, b) => a.source.localeCompare(b.source) || a.code.localeCompare(b.code))
}

/** 结构说明（自动提取）：validateAnimationSampling；输入 assetUuid、clip、sampleRate；直接调用 Math.min、Math.max、Number.isFinite、animationClipLength、Math.ceil 等；写入 maximumError；包含循环处理。 */ export function validateAnimationSampling(assetUuid: string, clip: AnimationClipDocument, sampleRate = clip.frameRate): AnimationSamplingResult {
  const rate = Math.min(1_000, Math.max(1, Number.isFinite(sampleRate) ? sampleRate : clip.frameRate)), length = animationClipLength(clip), count = Math.min(1_000_000, Math.ceil(length * rate) + 1)
  let nonFinite = 0, maximumError = 0
  for (const track of clip.tracks) for (let index = 0; index < count; index++) {
    const time = Math.min(length, index / rate), value = sampleAnimationTrack(track.keyframes, time)
    if (value !== null && !Number.isFinite(value)) nonFinite++
    if (value !== null && track.keyframes.length) maximumError = Math.max(maximumError, Math.min(...track.keyframes.map(/* 调用 Math.abs(key.value - value) 并返回调用结果。 */ key => Math.abs(key.value - value))))
  }
  return { assetUuid, sampleRate: rate, samples: count * clip.tracks.length, nonFinite, maximumError, events: clip.events.length, status: nonFinite ? 'failed' : 'passed' }
}

/** 结构说明（自动提取）：animationGoldenSamples；输入 clip、times；直接调用 normalizeAnimationClip、times.map。 */ export function animationGoldenSamples(clip: AnimationClipDocument, times: number[]): Array<{ time: number; values: Record<string, number | null> }> {
  const normalized = normalizeAnimationClip(clip)
  return times.map(/** 结构说明（自动提取）：times.map 回调；输入 time；直接调用 Object.fromEntries、normalized.tracks.map；返回表达式求值结果。 */ time => ({ time, values: Object.fromEntries(normalized.tracks.map(/* 返回按声明顺序构造的数组 [`${index}:${track.targetEntityUuid ?? 'owner'}:${track.property}`, sampleAnimationTrack(track.keyframes, time)]。 */ (track, index) => [`${index}:${track.targetEntityUuid ?? 'owner'}:${track.property}`, sampleAnimationTrack(track.keyframes, time)])) }))
}

/** 结构说明（自动提取）：animationPerformanceSnapshot；输入 assets、entities；直接调用 assets.flatMap、clips.reduce、controllers.reduce、entities.filter。 */ export function animationPerformanceSnapshot(assets: AssetRecord[], entities: Entity[]): { clips: number; controllers: number; tracks: number; keys: number; states: number; transitions: number; animatedEntities: number; estimatedSamplesPerSecond: number } {
  const clips = assets.flatMap(/** 结构说明（自动提取）：assets.flatMap 回调；输入 asset；直接调用 filter、readAnimationClip；返回表达式求值结果。 */ asset => asset.assetType === 'animation' ? [readAnimationClip(asset.uuid)].filter(/* 比较 value 与 null，返回严格不等的判断结果。 */ (value): value is AnimationClipDocument => value !== null) : [])
  const controllers = assets.flatMap(/** 结构说明（自动提取）：assets.flatMap 回调；输入 asset；直接调用 readTextAsset、normalizeAnimatorController、JSON.parse。 */ asset => {
    if (asset.assetType !== 'controller') return []
    const source = readTextAsset(asset.uuid); if (!source) return []
    try { return [normalizeAnimatorController(JSON.parse(source))] } catch { return [] }
  })
  return { clips: clips.length, controllers: controllers.length, tracks: clips.reduce(/* 计算表达式 sum + clip.tracks.length + clip.commandTracks.length 并返回结果，沿用操作数的原有类型规则。 */ (sum, clip) => sum + clip.tracks.length + clip.commandTracks.length, 0), keys: clips.reduce(/* 计算表达式 sum + clip.tracks.reduce((keys, track) => keys + track.keyframes.length, 0) 并返回结果，沿用操作数的原有类型规则。 */ (sum, clip) => sum + clip.tracks.reduce(/* 计算表达式 keys + track.keyframes.length 并返回结果，沿用操作数的原有类型规则。 */ (keys, track) => keys + track.keyframes.length, 0), 0), states: controllers.reduce(/* 计算表达式 sum + controller.states.length 并返回结果，沿用操作数的原有类型规则。 */ (sum, controller) => sum + controller.states.length, 0), transitions: controllers.reduce(/* 计算表达式 sum + controller.transitions.length 并返回结果，沿用操作数的原有类型规则。 */ (sum, controller) => sum + controller.transitions.length, 0), animatedEntities: entities.filter(/* 调用 entity.hasComponent('Animator') 并返回调用结果。 */ entity => entity.hasComponent('Animator')).length, estimatedSamplesPerSecond: clips.reduce(/* 计算表达式 sum + clip.tracks.length * clip.frameRate 并返回结果，沿用操作数的原有类型规则。 */ (sum, clip) => sum + clip.tracks.length * clip.frameRate, 0) }
}
