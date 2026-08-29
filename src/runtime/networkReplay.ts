import { reactive } from 'vue'
import type { Entity } from '../world/Entity'
import { finiteNumber } from '../world/geometry'
import { setWorldTransform, worldTransform } from '../world/hierarchy'
import type { InputSnapshot } from './input'
import { networkChecksum, stableNetworkJson, validateNetworkValue } from './networkProtocol'
import { productionSettings } from './production'
import { NOVA_ENGINE_VERSION } from '../projects/projectFormat'

export interface MultiplayerInputFrame { peerId: string; input: InputSnapshot }
export interface MultiplayerReplayFrame { tick: number; inputs: MultiplayerInputFrame[]; authoritativeChecksum: string; packetChecksum: string }
export interface MultiplayerReplayDocument {
  format: 'nova-multiplayer-replay'
  version: 1
  engineVersion: string
  protocolVersion: 2
  schemaVersion: number
  sessionName: string
  tickRate: number
  peers: string[]
  frames: MultiplayerReplayFrame[]
}

export interface MultiplayerSaveDocument {
  format: 'nova-multiplayer-save'
  version: 1
  engineVersion: string
  protocolVersion: 2
  schemaVersion: number
  sessionName: string
  tick: number
  savedAt: string
  checksum: string
  entities: Array<{ uuid: string; enabled: boolean; position: [number, number]; rotation: number; scale: [number, number]; velocity: [number, number]; angularVelocity: number }>
}

export interface MultiplayerReplayComparison { matching: boolean; comparedFrames: number; firstDivergenceTick: number | null; divergences: Array<{ tick: number; first: string; second: string }> }

export const multiplayerReplayState = reactive({
  recording: false,
  tick: 0,
  frames: [] as MultiplayerReplayFrame[],
  peers: [] as string[],
  lastComparison: null as MultiplayerReplayComparison | null,
  lastError: ''
})

function safeText(value: unknown, maximum: number, fallback = ''): string { return typeof value === 'string' ? (value.trim().slice(0, maximum) || fallback) : fallback }
function integer(value: unknown, fallback: number, minimum: number, maximum: number): number { const number = Number(value); return Number.isSafeInteger(number) ? Math.min(maximum, Math.max(minimum, number)) : fallback }

function cloneInput(input: InputSnapshot): InputSnapshot {
  const mouseWorld = Array.isArray(input.mouseWorldPosition) ? input.mouseWorldPosition : input.mousePosition
  const viewBounds = Array.isArray(input.viewBounds) && input.viewBounds.length >= 4 ? input.viewBounds : [0, 0, 0, 0]
  const viewportSize = Array.isArray(input.viewportSize) ? input.viewportSize : [0, 0]
  return {
    down: { ...input.down }, pressed: { ...input.pressed }, released: { ...input.released }, performed: { ...input.performed }, cancelled: { ...input.cancelled }, phases: { ...input.phases }, durations: { ...input.durations }, tapCounts: { ...input.tapCounts }, consumed: { ...input.consumed }, axes: { ...input.axes },
    vectors: Object.fromEntries(Object.entries(input.vectors).slice(0, 256).map(([key, value]) => [key.slice(0, 80), [finiteNumber(value[0]), finiteNumber(value[1])] as [number, number]])),
    mousePosition: [finiteNumber(input.mousePosition?.[0]), finiteNumber(input.mousePosition?.[1])], mouseWorldPosition: [finiteNumber(mouseWorld?.[0]), finiteNumber(mouseWorld?.[1])], viewBounds: [finiteNumber(viewBounds[0]), finiteNumber(viewBounds[1]), finiteNumber(viewBounds[2]), finiteNumber(viewBounds[3])], viewportSize: [finiteNumber(viewportSize[0]), finiteNumber(viewportSize[1])], wheel: [finiteNumber(input.wheel?.[0]), finiteNumber(input.wheel?.[1])], pointerDelta: [finiteNumber(input.pointerDelta?.[0]), finiteNumber(input.pointerDelta?.[1])],
    touches: integer(input.touches, 0, 0, 64), devices: input.devices.slice(0, 64).map(device => ({ ...device, id: safeText(device.id, 80), mapping: safeText(device.mapping, 80) })), contexts: input.contexts.slice(0, 32).map(value => safeText(value, 80)).filter(Boolean), maps: input.maps.slice(0, 32).map(value => safeText(value, 80)).filter(Boolean), scheme: safeText(input.scheme, 80, 'Any')
  }
}

function emptyInput(): InputSnapshot { return { down: {}, pressed: {}, released: {}, performed: {}, cancelled: {}, phases: {}, durations: {}, tapCounts: {}, consumed: {}, axes: {}, vectors: {}, mousePosition: [0, 0], mouseWorldPosition: [0, 0], viewBounds: [0, 0, 0, 0], viewportSize: [0, 0], wheel: [0, 0], pointerDelta: [0, 0], touches: 0, devices: [], contexts: [], maps: [], scheme: 'Any' } }

export function beginMultiplayerReplayRecording(peers: string[] = []): void {
  multiplayerReplayState.recording = true; multiplayerReplayState.tick = 0; multiplayerReplayState.frames.splice(0); multiplayerReplayState.lastError = ''
  multiplayerReplayState.peers.splice(0, multiplayerReplayState.peers.length, ...[...new Set(peers.map(peer => safeText(peer, 80)).filter(Boolean))].slice(0, 64).sort())
}

export function recordMultiplayerReplayFrame(tick: number, inputs: MultiplayerInputFrame[], authoritativeChecksum: string, packetSummary: unknown): void {
  if (!multiplayerReplayState.recording) return
  const normalizedInputs = inputs.slice(0, 64).map(item => ({ peerId: safeText(item.peerId, 80, 'peer'), input: cloneInput(item.input) })).sort((a, b) => a.peerId.localeCompare(b.peerId))
  for (const item of normalizedInputs) if (!multiplayerReplayState.peers.includes(item.peerId) && multiplayerReplayState.peers.length < 64) multiplayerReplayState.peers.push(item.peerId)
  const frame = { tick: integer(tick, multiplayerReplayState.tick, 0, 0x7fff_ffff), inputs: normalizedInputs, authoritativeChecksum: safeText(authoritativeChecksum, 64), packetChecksum: networkChecksum(packetSummary) }
  multiplayerReplayState.frames.push(frame); multiplayerReplayState.tick = frame.tick + 1
  if (multiplayerReplayState.frames.length > productionSettings.replay.capacity) multiplayerReplayState.frames.splice(0, multiplayerReplayState.frames.length - productionSettings.replay.capacity)
}

export function stopMultiplayerReplayRecording(tickRate: number): MultiplayerReplayDocument {
  multiplayerReplayState.recording = false
  return { format: 'nova-multiplayer-replay', version: 1, engineVersion: NOVA_ENGINE_VERSION, protocolVersion: 2, schemaVersion: productionSettings.networking.schemaVersion, sessionName: productionSettings.networking.sessionName, tickRate: Math.min(1_000, Math.max(1, Math.round(Number(tickRate) || 60))), peers: [...multiplayerReplayState.peers].sort(), frames: multiplayerReplayState.frames.map(frame => ({ ...frame, inputs: frame.inputs.map(item => ({ peerId: item.peerId, input: cloneInput(item.input) })) })) }
}

export function normalizeMultiplayerReplay(value: unknown): MultiplayerReplayDocument {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Multiplayer replay must be an object.')
  const source = value as Partial<MultiplayerReplayDocument>
  if (source.format !== 'nova-multiplayer-replay' || source.version !== 1 || source.protocolVersion !== 2) throw new Error('Unsupported multiplayer replay format or protocol.')
  const frames = (Array.isArray(source.frames) ? source.frames : []).slice(0, 60_000).map((raw, index) => {
    const frame = raw && typeof raw === 'object' ? raw as Partial<MultiplayerReplayFrame> : {}
    const inputs = (Array.isArray(frame.inputs) ? frame.inputs : []).slice(0, 64).map(item => ({ peerId: safeText(item?.peerId, 80, 'peer'), input: cloneInput(item?.input && typeof item.input === 'object' ? item.input : emptyInput()) })).sort((a, b) => a.peerId.localeCompare(b.peerId))
    return { tick: integer(frame.tick, index, 0, 0x7fff_ffff), inputs, authoritativeChecksum: safeText(frame.authoritativeChecksum, 64), packetChecksum: safeText(frame.packetChecksum, 64) }
  })
  return { format: 'nova-multiplayer-replay', version: 1, engineVersion: safeText(source.engineVersion, 40, NOVA_ENGINE_VERSION), protocolVersion: 2, schemaVersion: integer(source.schemaVersion, 1, 1, 65_535), sessionName: safeText(source.sessionName, 80, 'Multiplayer session'), tickRate: integer(source.tickRate, 60, 1, 1_000), peers: [...new Set((Array.isArray(source.peers) ? source.peers : []).map(peer => safeText(peer, 80)).filter(Boolean))].slice(0, 64).sort(), frames }
}

export function compareMultiplayerReplays(firstValue: unknown, secondValue: unknown): MultiplayerReplayComparison {
  const first = normalizeMultiplayerReplay(firstValue), second = normalizeMultiplayerReplay(secondValue), comparedFrames = Math.min(first.frames.length, second.frames.length), divergences: MultiplayerReplayComparison['divergences'] = []
  for (let index = 0; index < comparedFrames && divergences.length < 256; index++) {
    const firstHash = networkChecksum(first.frames[index]), secondHash = networkChecksum(second.frames[index])
    if (firstHash !== secondHash) divergences.push({ tick: Math.min(first.frames[index].tick, second.frames[index].tick), first: firstHash, second: secondHash })
  }
  if (first.frames.length !== second.frames.length && divergences.length < 256) divergences.push({ tick: comparedFrames, first: `frames:${first.frames.length}`, second: `frames:${second.frames.length}` })
  const result = { matching: divergences.length === 0, comparedFrames, firstDivergenceTick: divergences[0]?.tick ?? null, divergences }
  multiplayerReplayState.lastComparison = result; return result
}

function multiplayerSavePayload(document: Omit<MultiplayerSaveDocument, 'checksum'> | MultiplayerSaveDocument): unknown {
  return { format: document.format, version: document.version, engineVersion: document.engineVersion, protocolVersion: document.protocolVersion, schemaVersion: document.schemaVersion, sessionName: document.sessionName, tick: document.tick, savedAt: document.savedAt, entities: document.entities }
}

export function exportMultiplayerSave(entities: Entity[], tick: number): MultiplayerSaveDocument {
  const definitions = new Set(productionSettings.networking.replicatedEntities.map(item => item.entityUuid)), source = entities.filter(entity => definitions.has(entity.uuid)).slice(0, 2_000).map(entity => {
    const transform = worldTransform(entity, entities)
    return { uuid: entity.uuid, enabled: entity.enabled, position: [finiteNumber(transform.position.x), finiteNumber(transform.position.y)] as [number, number], rotation: finiteNumber(transform.rotation), scale: [finiteNumber(transform.scale.x, 1), finiteNumber(transform.scale.y, 1)] as [number, number], velocity: [finiteNumber(entity.velocity.x), finiteNumber(entity.velocity.y)] as [number, number], angularVelocity: finiteNumber(entity.angularVelocity) }
  }).sort((a, b) => a.uuid.localeCompare(b.uuid))
  const base = { format: 'nova-multiplayer-save' as const, version: 1 as const, engineVersion: NOVA_ENGINE_VERSION, protocolVersion: 2 as const, schemaVersion: productionSettings.networking.schemaVersion, sessionName: productionSettings.networking.sessionName, tick: integer(tick, 0, 0, 0x7fff_ffff), savedAt: new Date().toISOString(), entities: source }
  return { ...base, checksum: networkChecksum(multiplayerSavePayload(base)) }
}

export function importMultiplayerSave(value: unknown, entities: Entity[]): { tick: number; restored: number } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Multiplayer save must be an object.')
  const source = value as Partial<MultiplayerSaveDocument>
  if (source.format !== 'nova-multiplayer-save' || source.version !== 1 || source.protocolVersion !== 2 || typeof source.checksum !== 'string' || !Array.isArray(source.entities)) throw new Error('Unsupported multiplayer save format or protocol.')
  if (networkChecksum(multiplayerSavePayload(source as MultiplayerSaveDocument)) !== source.checksum) throw new Error('Multiplayer save checksum mismatch.')
  let restored = 0
  for (const raw of source.entities.slice(0, 2_000)) {
    if (!raw || typeof raw !== 'object' || typeof raw.uuid !== 'string') continue
    const entity = entities.find(candidate => candidate.uuid === raw.uuid); if (!entity) continue
    const position = Array.isArray(raw.position) ? raw.position : [0, 0], scale = Array.isArray(raw.scale) ? raw.scale : [1, 1], velocity = Array.isArray(raw.velocity) ? raw.velocity : [0, 0]
    setWorldTransform(entity, { position: { x: finiteNumber(position[0]), y: finiteNumber(position[1]) }, rotation: finiteNumber(raw.rotation), scale: { x: finiteNumber(scale[0], 1), y: finiteNumber(scale[1], 1) } }, entities)
    entity.enabled = raw.enabled !== false; entity.velocity = { x: finiteNumber(velocity[0]), y: finiteNumber(velocity[1]) }; entity.angularVelocity = finiteNumber(raw.angularVelocity); restored++
  }
  return { tick: integer(source.tick, 0, 0, 0x7fff_ffff), restored }
}

export function networkDiagnosticCapture(state: Record<string, unknown>, events: unknown[], packetSummaries: unknown[]): string {
  const safeState = Object.fromEntries(Object.entries(state).filter(([key]) => !/(endpoint|bindAddress|token|secret|pass|cookie|authorization)/i.test(key)).map(([key, value]) => [key, value]))
  const document = { format: 'nova-network-diagnostics', version: 1, engineVersion: NOVA_ENGINE_VERSION, protocolVersion: 2, capturedAt: new Date().toISOString(), session: { mode: productionSettings.networking.sessionMode, role: productionSettings.networking.role, schemaVersion: productionSettings.networking.schemaVersion, channelIds: productionSettings.networking.channels.map(channel => channel.id) }, state: safeState, events: events.slice(-500), packets: packetSummaries.slice(-1_000) }
  const error = validateNetworkValue(document)
  if (error) throw new Error(error)
  return `${stableNetworkJson(document)}\n`
}
