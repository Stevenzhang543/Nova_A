import { reactive } from 'vue'
import type { Entity } from '../world/Entity'
import { finiteNumber } from '../world/geometry'
import { setWorldTransform, worldTransform } from '../world/hierarchy'
import type { InputSnapshot } from './input'
import { cloneNetworkInput, emptyNetworkInput, normalizeNetworkInput } from './networkInput'
import { networkChecksum, stableNetworkJson, utf8Bytes, validateNetworkValue } from './networkProtocol'
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
export interface MultiplayerReplayPlayback { frames: number; firstTick: number | null; lastTick: number | null; checksum: string }

interface MultiplayerSaveStage {
  entity: Entity
  enabled: boolean
  position: [number, number]
  rotation: number
  scale: [number, number]
  velocity: [number, number]
  angularVelocity: number
}

const SAVE_POSITION_LIMIT = 1e9
const SAVE_VELOCITY_LIMIT = 1e9
const SAVE_ROTATION_LIMIT = 1e12
const SAVE_SCALE_LIMIT = 1e6
const MINIMUM_MULTIPLAYER_ENGINE_VERSION = [5, 8, 0] as const

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
function boundedNumber(value: unknown, maximum: number, positive = false): value is number { return typeof value === 'number' && Number.isFinite(value) && value <= maximum && (positive ? value > 0 : value >= -maximum) }
function boundedTuple(value: unknown, maximum: number, positive = false): value is [number, number] { return Array.isArray(value) && value.length === 2 && value.every(item => boundedNumber(item, maximum, positive)) }
function machineVersion(value: unknown): [number, number, number] | null {
  if (typeof value !== 'string') return null
  const match = /^(\d+)\.(\d+)\.(\d+)(?:[-+][0-9A-Za-z.-]+)?$/.exec(value.trim())
  if (!match) return null
  const version = match.slice(1, 4).map(Number) as [number, number, number]
  return version.every(item => Number.isSafeInteger(item) && item >= 0 && item <= 65_535) ? version : null
}
function compareMachineVersions(first: readonly number[], second: readonly number[]): number {
  for (let index = 0; index < 3; index++) if (first[index] !== second[index]) return first[index] < second[index] ? -1 : 1
  return 0
}
function requireMultiplayerCompatibility(source: Partial<MultiplayerReplayDocument | MultiplayerSaveDocument>, label: string, activeSession = false): { engineVersion: string; schemaVersion: number; sessionName: string } {
  const parsed = machineVersion(source.engineVersion), current = machineVersion(NOVA_ENGINE_VERSION)!
  if (!parsed || compareMachineVersions(parsed, MINIMUM_MULTIPLAYER_ENGINE_VERSION) < 0 || compareMachineVersions(parsed, current) > 0) throw new Error(`${label} engine version is unsupported.`)
  if (!Number.isSafeInteger(source.schemaVersion) || Number(source.schemaVersion) < 1 || Number(source.schemaVersion) > 65_535) throw new Error(`${label} schema version is invalid.`)
  const sessionName = safeText(source.sessionName, 80)
  if (!sessionName) throw new Error(`${label} session name is invalid.`)
  if (activeSession && source.schemaVersion !== productionSettings.networking.schemaVersion) throw new Error(`${label} schema version does not match the active network session.`)
  if (activeSession && sessionName !== productionSettings.networking.sessionName) throw new Error(`${label} session name does not match the active network session.`)
  return { engineVersion: String(source.engineVersion).trim(), schemaVersion: Number(source.schemaVersion), sessionName }
}

function validateMultiplayerSaveState(value: Omit<MultiplayerSaveStage, 'entity'>, label: string): void {
  if (!boundedTuple(value.position, SAVE_POSITION_LIMIT)) throw new Error(`Multiplayer save position for ${label} exceeds the ±1e9 bound.`)
  if (!boundedNumber(value.rotation, SAVE_ROTATION_LIMIT)) throw new Error(`Multiplayer save rotation for ${label} exceeds the ±1e12 bound.`)
  if (!boundedTuple(value.scale, SAVE_SCALE_LIMIT, true)) throw new Error(`Multiplayer save scale for ${label} must be positive and no larger than 1e6.`)
  if (!boundedTuple(value.velocity, SAVE_VELOCITY_LIMIT)) throw new Error(`Multiplayer save velocity for ${label} exceeds the ±1e9 bound.`)
  if (!boundedNumber(value.angularVelocity, SAVE_ROTATION_LIMIT)) throw new Error(`Multiplayer save angular velocity for ${label} exceeds the ±1e12 bound.`)
}

function parentFirstSaveStages(staged: MultiplayerSaveStage[]): MultiplayerSaveStage[] {
  const byUuid = new Map(staged.map(item => [item.entity.uuid, item])), children = new Map<string, MultiplayerSaveStage[]>(), indegree = new Map<string, number>()
  for (const item of staged) {
    const parentUuid = item.entity.parentUuid
    const hasStagedParent = Boolean(parentUuid && byUuid.has(parentUuid))
    indegree.set(item.entity.uuid, hasStagedParent ? 1 : 0)
    if (hasStagedParent) children.set(parentUuid!, [...(children.get(parentUuid!) ?? []), item])
  }
  const ready = staged.filter(item => indegree.get(item.entity.uuid) === 0).sort((a, b) => a.entity.uuid.localeCompare(b.entity.uuid)), ordered: MultiplayerSaveStage[] = []
  while (ready.length) {
    const item = ready.shift()!
    ordered.push(item)
    for (const child of (children.get(item.entity.uuid) ?? []).sort((a, b) => a.entity.uuid.localeCompare(b.entity.uuid))) {
      indegree.set(child.entity.uuid, 0)
      ready.push(child)
    }
    ready.sort((a, b) => a.entity.uuid.localeCompare(b.entity.uuid))
  }
  if (ordered.length !== staged.length) throw new Error('Multiplayer save restore cannot apply to a cyclic entity hierarchy.')
  return ordered
}

export function beginMultiplayerReplayRecording(peers: string[] = []): void {
  multiplayerReplayState.recording = true; multiplayerReplayState.tick = 0; multiplayerReplayState.frames.splice(0); multiplayerReplayState.lastError = ''
  multiplayerReplayState.peers.splice(0, multiplayerReplayState.peers.length, ...[...new Set(peers.map(peer => safeText(peer, 80)).filter(Boolean))].slice(0, 64).sort())
}

export function recordMultiplayerReplayFrame(tick: number, inputs: MultiplayerInputFrame[], authoritativeChecksum: string, packetSummary: unknown): void {
  if (!multiplayerReplayState.recording) return
  const normalizedInputs = inputs.slice(0, 64).map(item => ({ peerId: safeText(item.peerId, 80, 'peer'), input: cloneNetworkInput(item.input) })).sort((a, b) => a.peerId.localeCompare(b.peerId))
  for (const item of normalizedInputs) if (!multiplayerReplayState.peers.includes(item.peerId) && multiplayerReplayState.peers.length < 64) multiplayerReplayState.peers.push(item.peerId)
  const deterministicPackets = Array.isArray(packetSummary) ? packetSummary.slice(-256).map(item => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null
    const packet = item as Record<string, unknown>
    return { direction: packet.direction === 'in' ? 'in' : 'out', channel: safeText(packet.channel, 80), kind: safeText(packet.kind, 40), sequence: integer(packet.sequence, 0, 0, 0x7fff_ffff), bytes: integer(packet.bytes, 0, 0, 65_507), accepted: packet.accepted === true }
  }).filter(Boolean) : []
  const frame = { tick: integer(tick, multiplayerReplayState.tick, 0, 0x7fff_ffff), inputs: normalizedInputs, authoritativeChecksum: safeText(authoritativeChecksum, 64), packetChecksum: networkChecksum(deterministicPackets) }
  multiplayerReplayState.frames.push(frame); multiplayerReplayState.tick = frame.tick + 1
  if (multiplayerReplayState.frames.length > productionSettings.replay.capacity) multiplayerReplayState.frames.splice(0, multiplayerReplayState.frames.length - productionSettings.replay.capacity)
}

export function stopMultiplayerReplayRecording(tickRate: number): MultiplayerReplayDocument {
  multiplayerReplayState.recording = false
  return { format: 'nova-multiplayer-replay', version: 1, engineVersion: NOVA_ENGINE_VERSION, protocolVersion: 2, schemaVersion: productionSettings.networking.schemaVersion, sessionName: productionSettings.networking.sessionName, tickRate: Math.min(1_000, Math.max(1, Math.round(Number(tickRate) || 60))), peers: [...multiplayerReplayState.peers].sort(), frames: multiplayerReplayState.frames.map(frame => ({ ...frame, inputs: frame.inputs.map(item => ({ peerId: item.peerId, input: cloneNetworkInput(item.input) })) })) }
}

export function normalizeMultiplayerReplay(value: unknown): MultiplayerReplayDocument {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Multiplayer replay must be an object.')
  const source = value as Partial<MultiplayerReplayDocument>
  if (source.format !== 'nova-multiplayer-replay' || source.version !== 1 || source.protocolVersion !== 2) throw new Error('Unsupported multiplayer replay format or protocol.')
  const compatibility = requireMultiplayerCompatibility(source, 'Multiplayer replay')
  const frames = (Array.isArray(source.frames) ? source.frames : []).slice(0, 60_000).map((raw, index) => {
    const frame = raw && typeof raw === 'object' ? raw as Partial<MultiplayerReplayFrame> : {}
    const inputs = (Array.isArray(frame.inputs) ? frame.inputs : []).slice(0, 64).map(item => ({ peerId: safeText(item?.peerId, 80, 'peer'), input: normalizeNetworkInput(item?.input) ?? emptyNetworkInput() })).sort((a, b) => a.peerId.localeCompare(b.peerId))
    return { tick: integer(frame.tick, index, 0, 0x7fff_ffff), inputs, authoritativeChecksum: safeText(frame.authoritativeChecksum, 64), packetChecksum: safeText(frame.packetChecksum, 64) }
  })
  return { format: 'nova-multiplayer-replay', version: 1, engineVersion: compatibility.engineVersion, protocolVersion: 2, schemaVersion: compatibility.schemaVersion, sessionName: compatibility.sessionName, tickRate: integer(source.tickRate, 60, 1, 1_000), peers: [...new Set((Array.isArray(source.peers) ? source.peers : []).map(peer => safeText(peer, 80)).filter(Boolean))].slice(0, 64).sort(), frames }
}

export function compareMultiplayerReplays(firstValue: unknown, secondValue: unknown): MultiplayerReplayComparison {
  const first = normalizeMultiplayerReplay(firstValue), second = normalizeMultiplayerReplay(secondValue), comparedFrames = Math.min(first.frames.length, second.frames.length), divergences: MultiplayerReplayComparison['divergences'] = []
  if (first.schemaVersion !== second.schemaVersion || first.sessionName !== second.sessionName) throw new Error('Multiplayer replays belong to incompatible schemas or sessions.')
  for (let index = 0; index < comparedFrames && divergences.length < 256; index++) {
    const firstHash = networkChecksum(first.frames[index]), secondHash = networkChecksum(second.frames[index])
    if (firstHash !== secondHash) divergences.push({ tick: Math.min(first.frames[index].tick, second.frames[index].tick), first: firstHash, second: secondHash })
  }
  if (first.frames.length !== second.frames.length && divergences.length < 256) divergences.push({ tick: comparedFrames, first: `frames:${first.frames.length}`, second: `frames:${second.frames.length}` })
  const result = { matching: divergences.length === 0, comparedFrames, firstDivergenceTick: divergences[0]?.tick ?? null, divergences }
  multiplayerReplayState.lastComparison = result; return result
}

export function playbackMultiplayerReplay(value: unknown, applyFrame: (frame: Readonly<MultiplayerReplayFrame>) => void): MultiplayerReplayPlayback {
  const replay = normalizeMultiplayerReplay(value)
  requireMultiplayerCompatibility(replay, 'Multiplayer replay', true)
  let previousTick = -1
  for (const frame of replay.frames) {
    if (frame.tick <= previousTick) throw new Error('Multiplayer replay ticks must be strictly increasing.')
    applyFrame(Object.freeze({ ...frame, inputs: frame.inputs.map(item => ({ peerId: item.peerId, input: cloneNetworkInput(item.input) })) }))
    previousTick = frame.tick
  }
  return { frames: replay.frames.length, firstTick: replay.frames[0]?.tick ?? null, lastTick: replay.frames[replay.frames.length - 1]?.tick ?? null, checksum: networkChecksum(replay.frames) }
}

function multiplayerSavePayload(document: Omit<MultiplayerSaveDocument, 'checksum'> | MultiplayerSaveDocument): unknown {
  return { format: document.format, version: document.version, engineVersion: document.engineVersion, protocolVersion: document.protocolVersion, schemaVersion: document.schemaVersion, sessionName: document.sessionName, tick: document.tick, entities: document.entities }
}

function legacyMultiplayerSavePayload(document: MultiplayerSaveDocument): unknown {
  return { format: document.format, version: document.version, engineVersion: document.engineVersion, protocolVersion: document.protocolVersion, schemaVersion: document.schemaVersion, sessionName: document.sessionName, tick: document.tick, savedAt: document.savedAt, entities: document.entities }
}

export function exportMultiplayerSave(entities: Entity[], tick: number): MultiplayerSaveDocument {
  const definitions = new Set(productionSettings.networking.replicatedEntities.map(item => item.entityUuid)), source = entities.filter(entity => definitions.has(entity.uuid)).slice(0, 2_000).map(entity => {
    const transform = worldTransform(entity, entities)
    const state = { enabled: entity.enabled, position: [finiteNumber(transform.position.x), finiteNumber(transform.position.y)] as [number, number], rotation: finiteNumber(transform.rotation), scale: [finiteNumber(transform.scale.x, 1), finiteNumber(transform.scale.y, 1)] as [number, number], velocity: [finiteNumber(entity.velocity.x), finiteNumber(entity.velocity.y)] as [number, number], angularVelocity: finiteNumber(entity.angularVelocity) }
    validateMultiplayerSaveState(state, entity.uuid)
    return { uuid: entity.uuid, ...state }
  }).sort((a, b) => a.uuid.localeCompare(b.uuid))
  const deterministicTick = integer(tick, 0, 0, 0x7fff_ffff)
  const base = { format: 'nova-multiplayer-save' as const, version: 1 as const, engineVersion: NOVA_ENGINE_VERSION, protocolVersion: 2 as const, schemaVersion: productionSettings.networking.schemaVersion, sessionName: productionSettings.networking.sessionName, tick: deterministicTick, savedAt: new Date(deterministicTick * 1_000).toISOString(), entities: source }
  return { ...base, checksum: networkChecksum(multiplayerSavePayload(base)) }
}

export function importMultiplayerSave(value: unknown, entities: Entity[]): { tick: number; restored: number } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Multiplayer save must be an object.')
  const source = value as Partial<MultiplayerSaveDocument>
  if (source.format !== 'nova-multiplayer-save' || source.version !== 1 || source.protocolVersion !== 2 || typeof source.checksum !== 'string' || !/^[a-f0-9]{24}$/i.test(source.checksum) || !Array.isArray(source.entities)) throw new Error('Unsupported multiplayer save format or protocol.')
  requireMultiplayerCompatibility(source, 'Multiplayer save', true)
  if (!Number.isSafeInteger(source.tick) || Number(source.tick) < 0 || Number(source.tick) > 0x7fff_ffff) throw new Error('Multiplayer save tick is invalid.')
  if (typeof source.savedAt !== 'string' || !source.savedAt || Number.isNaN(Date.parse(source.savedAt))) throw new Error('Multiplayer save timestamp is invalid.')
  if (source.entities.length > 2_000) throw new Error('Multiplayer save exceeds the 2,000-entity bound.')
  const document = source as MultiplayerSaveDocument, deterministicChecksum = networkChecksum(multiplayerSavePayload(document)), legacyChecksum = networkChecksum(legacyMultiplayerSavePayload(document))
  if (deterministicChecksum !== source.checksum && legacyChecksum !== source.checksum) throw new Error('Multiplayer save checksum mismatch.')
  const staged: MultiplayerSaveStage[] = [], seen = new Set<string>()
  for (const raw of source.entities) {
    if (!raw || typeof raw !== 'object' || typeof raw.uuid !== 'string' || seen.has(raw.uuid)) throw new Error('Multiplayer save contains an invalid or duplicate entity identity.')
    seen.add(raw.uuid)
    if (typeof raw.enabled !== 'boolean') throw new Error(`Multiplayer save state for ${raw.uuid.slice(0, 128)} is invalid.`)
    validateMultiplayerSaveState(raw, raw.uuid.slice(0, 128))
    const entity = entities.find(candidate => candidate.uuid === raw.uuid); if (!entity) continue
    staged.push({ entity, enabled: raw.enabled, position: [raw.position[0], raw.position[1]], rotation: raw.rotation, scale: [raw.scale[0], raw.scale[1]], velocity: [raw.velocity[0], raw.velocity[1]], angularVelocity: raw.angularVelocity })
  }
  const ordered = parentFirstSaveStages(staged)
  const backupByUuid = new Map(staged.map(item => { const transform = worldTransform(item.entity, entities); return [item.entity.uuid, { entity: item.entity, enabled: item.entity.enabled, position: [transform.position.x, transform.position.y] as [number, number], rotation: transform.rotation, scale: [transform.scale.x, transform.scale.y] as [number, number], velocity: [item.entity.velocity.x, item.entity.velocity.y] as [number, number], angularVelocity: item.entity.angularVelocity }] as const }))
  const backup = ordered.map(item => backupByUuid.get(item.entity.uuid)!)
  try { for (const item of ordered) { setWorldTransform(item.entity, { position: { x: item.position[0], y: item.position[1] }, rotation: item.rotation, scale: { x: item.scale[0], y: item.scale[1] } }, entities); item.entity.enabled = item.enabled; item.entity.velocity = { x: item.velocity[0], y: item.velocity[1] }; item.entity.angularVelocity = item.angularVelocity } }
  catch (error) { for (const item of backup) { setWorldTransform(item.entity, { position: { x: item.position[0], y: item.position[1] }, rotation: item.rotation, scale: { x: item.scale[0], y: item.scale[1] } }, entities); item.entity.enabled = item.enabled; item.entity.velocity = { x: item.velocity[0], y: item.velocity[1] }; item.entity.angularVelocity = item.angularVelocity }; throw error }
  return { tick: integer(source.tick, 0, 0, 0x7fff_ffff), restored: staged.length }
}

export function networkDiagnosticCapture(state: Record<string, unknown>, events: unknown[], packetSummaries: unknown[]): string {
  const SENSITIVE_DIAGNOSTIC_KEY = /(?:endpoint|bind.?address|password|passphrase|secret|(?:^|[_-])token|access[_-]?token|api[_-]?key|private[_-]?key|authorization|cookie|session[_-]?key)/i
  const seen = new WeakSet<object>(), budget = { remaining: 24_000 }
  const sanitize = (value: unknown, depth = 0): unknown => {
    if (budget.remaining-- <= 0 || depth > 10) return null
    if (value === null || typeof value === 'boolean') return value
    if (typeof value === 'number') return Number.isFinite(value) ? value : null
    if (typeof value === 'string') return value.slice(0, 65_536)
    if (typeof value !== 'object') return null
    if (seen.has(value)) return null
    seen.add(value)
    if (Array.isArray(value)) return value.slice(-1_000).map(item => sanitize(item, depth + 1))
    let entries: Array<[string, unknown]> = []
    try { entries = Object.entries(value as Record<string, unknown>) } catch { return null }
    return Object.fromEntries(entries
      .filter(([key]) => key.length > 0 && utf8Bytes(key) <= 128 && !SENSITIVE_DIAGNOSTIC_KEY.test(key) && key !== 'events' && key !== 'packetSummaries')
      .slice(0, 1_000)
      .map(([key, item]) => [key, sanitize(item, depth + 1)]))
  }
  const safeState = sanitize(state) as Record<string, unknown>
  const document = { format: 'nova-network-diagnostics', version: 1, engineVersion: NOVA_ENGINE_VERSION, protocolVersion: 2, capturedAt: new Date().toISOString(), session: { mode: productionSettings.networking.sessionMode, role: productionSettings.networking.role, schemaVersion: productionSettings.networking.schemaVersion, channelIds: productionSettings.networking.channels.map(channel => channel.id) }, state: safeState, events: events.slice(-500).map(item => sanitize(item)), packets: packetSummaries.slice(-1_000).map(item => sanitize(item)) }
  const error = validateNetworkValue(document)
  if (error) throw new Error(error)
  return `${stableNetworkJson(document)}\n`
}
