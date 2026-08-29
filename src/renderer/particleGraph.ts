import type { ParticleEmitter2D } from '../world/components'

export type ParticleModuleKind = 'Spawn' | 'Shape' | 'Velocity' | 'Force' | 'Color' | 'Size' | 'Rotation' | 'Collision' | 'Events' | 'SubEmitter' | 'Trail' | 'Renderer'
export interface ParticleModule2D { id: string; kind: ParticleModuleKind; enabled: boolean; order: number; values: Record<string, number | string | boolean | number[] | null> }
export interface ParticleGraphDocument { format: 'nova-particle-graph'; version: 1; name: string; simulation: 'Auto' | 'CPU' | 'GPU'; modules: ParticleModule2D[]; preview: { playing: boolean; speed: number; seed: number } }
export interface ParticleGraphDiagnostic { severity: 'error' | 'warning'; moduleId: string; message: string }

export const PARTICLE_MODULE_ORDER: readonly ParticleModuleKind[] = ['Spawn', 'Shape', 'Velocity', 'Force', 'Color', 'Size', 'Rotation', 'Collision', 'Events', 'SubEmitter', 'Trail', 'Renderer']
function finite(value: unknown, fallback: number, minimum: number, maximum: number): number { const number = typeof value === 'number' && Number.isFinite(value) ? value : fallback; return Math.min(maximum, Math.max(minimum, number)) }
function text(value: unknown, fallback: string, maximum = 120): string { const result = typeof value === 'string' ? value.trim().slice(0, maximum) : ''; return result || fallback }
function id(value: unknown, fallback: string): string { return text(value, fallback, 80).replace(/[^A-Za-z0-9_-]/g, '-').replace(/-+/g, '-') }

export function defaultParticleGraph(name = 'Particle System'): ParticleGraphDocument {
  return { format: 'nova-particle-graph', version: 1, name, simulation: 'Auto', modules: PARTICLE_MODULE_ORDER.map((kind, index) => ({ id: kind.toLocaleLowerCase(), kind, enabled: ['Spawn', 'Shape', 'Velocity', 'Color', 'Size', 'Renderer'].includes(kind), order: index, values: {} })), preview: { playing: true, speed: 1, seed: 1 } }
}

export function normalizeParticleGraph(value: unknown): ParticleGraphDocument {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}, result = defaultParticleGraph(text(source.name, 'Particle System'))
  result.simulation = source.simulation === 'CPU' || source.simulation === 'GPU' ? source.simulation : 'Auto'
  if (Array.isArray(source.modules)) {
    const modules = source.modules.slice(0, 32).flatMap((item, index) => {
      if (!item || typeof item !== 'object') return []
      const module = item as Record<string, unknown>, kind = PARTICLE_MODULE_ORDER.includes(module.kind as ParticleModuleKind) ? module.kind as ParticleModuleKind : null
      if (!kind) return []
      const values: ParticleModule2D['values'] = {}
      if (module.values && typeof module.values === 'object' && !Array.isArray(module.values)) for (const [key, raw] of Object.entries(module.values).slice(0, 32)) {
        if (typeof raw === 'number' && Number.isFinite(raw)) values[key.slice(0, 64)] = raw
        else if (typeof raw === 'string') values[key.slice(0, 64)] = raw.slice(0, 512)
        else if (typeof raw === 'boolean' || raw === null) values[key.slice(0, 64)] = raw
        else if (Array.isArray(raw) && raw.length <= 16 && raw.every(entry => typeof entry === 'number' && Number.isFinite(entry))) values[key.slice(0, 64)] = raw.slice()
      }
      return [{ id: id(module.id, `${kind.toLocaleLowerCase()}-${index + 1}`), kind, enabled: module.enabled !== false, order: Math.round(finite(module.order, index, 0, 1000)), values }]
    })
    result.modules = [...new Map(modules.map(module => [module.id, module])).values()].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
  }
  const preview = source.preview && typeof source.preview === 'object' ? source.preview as Record<string, unknown> : {}
  result.preview = { playing: preview.playing !== false, speed: finite(preview.speed, 1, 0, 8), seed: Math.round(finite(preview.seed, 1, 0, 0xffff_ffff)) >>> 0 }
  return result
}

export function validateParticleGraph(input: unknown, backend: 'WebGL2' | 'Canvas2D'): ParticleGraphDiagnostic[] {
  const graph = normalizeParticleGraph(input), diagnostics: ParticleGraphDiagnostic[] = [], enabled = graph.modules.filter(module => module.enabled)
  if (!enabled.some(module => module.kind === 'Spawn')) diagnostics.push({ severity: 'error', moduleId: '', message: 'Enable a Spawn module.' })
  if (!enabled.some(module => module.kind === 'Renderer')) diagnostics.push({ severity: 'error', moduleId: '', message: 'Enable a Renderer module.' })
  for (const kind of PARTICLE_MODULE_ORDER) if (enabled.filter(module => module.kind === kind).length > 1 && !['Force', 'Events', 'SubEmitter'].includes(kind)) diagnostics.push({ severity: 'warning', moduleId: enabled.find(module => module.kind === kind)!.id, message: `Only the first ${kind} module is evaluated.` })
  if (graph.simulation === 'GPU') diagnostics.push({ severity: 'warning', moduleId: '', message: backend === 'WebGL2' ? 'GPU rendering is available, but collision/events require deterministic CPU simulation and fall back safely.' : 'GPU simulation is unavailable on Canvas2D; deterministic CPU fallback is active.' })
  return diagnostics
}

function module(graph: ParticleGraphDocument, kind: ParticleModuleKind) { return graph.modules.find(item => item.enabled && item.kind === kind) }
function number(value: unknown, fallback: number, minimum: number, maximum: number) { return finite(value, fallback, minimum, maximum) }
function vector(value: unknown, fallback: [number, number]): { x: number; y: number } { return Array.isArray(value) ? { x: number(value[0], fallback[0], -1e9, 1e9), y: number(value[1], fallback[1], -1e9, 1e9) } : { x: fallback[0], y: fallback[1] } }

export function particleGraphValues(input: unknown): Partial<ParticleEmitter2D> {
  const graph = normalizeParticleGraph(input), spawn = module(graph, 'Spawn'), shape = module(graph, 'Shape'), velocity = module(graph, 'Velocity'), force = module(graph, 'Force'), size = module(graph, 'Size'), collision = module(graph, 'Collision'), events = module(graph, 'Events'), sub = module(graph, 'SubEmitter'), trail = module(graph, 'Trail'), renderer = module(graph, 'Renderer')
  return {
    simulationBackend: graph.simulation,
    emissionRate: number(spawn?.values.rate, 20, 0, 100_000), burst: Math.round(number(spawn?.values.burst, 0, 0, 100_000)), lifetime: number(spawn?.values.lifetime, 1, .0001, 86_400), maxParticles: Math.round(number(spawn?.values.maximum, 1000, 0, 100_000)),
    emissionShape: ['Point', 'Box', 'Circle', 'Edge'].includes(String(shape?.values.shape)) ? shape!.values.shape as ParticleEmitter2D['emissionShape'] : 'Point', shapeSize: vector(shape?.values.size, [1, 1]), shapeRadius: number(shape?.values.radius, .5, 0, 1e9),
    initialVelocityMin: vector(velocity?.values.minimum, [-1, 1]), initialVelocityMax: vector(velocity?.values.maximum, [1, 3]), gravity: vector(force?.values.gravity, [0, -9.80665]),
    startScale: number(size?.values.start, .2, 0, 1e6), endScale: number(size?.values.end, 0, 0, 1e6),
    collisionMode: ['Bounce', 'Stop'].includes(String(collision?.values.mode)) ? collision!.values.mode as ParticleEmitter2D['collisionMode'] : 'None', collisionRestitution: number(collision?.values.restitution, .5, 0, 1),
    eventSignal: text(events?.values.signal, 'particle.event'), subEmitterUuid: typeof sub?.values.emitterUuid === 'string' ? sub.values.emitterUuid : null, subEmitterCount: Math.round(number(sub?.values.count, 1, 0, 1000)),
    trailEnabled: Boolean(trail), trailLength: Math.round(number(trail?.values.length, 12, 2, 32)), trailWidth: number(trail?.values.width, .08, .001, 1e6),
    material: text(renderer?.values.material, 'Particles'), blendMode: renderer?.values.blend === 'Alpha' ? 'Alpha' : 'Additive'
  }
}

export function effectiveParticleBackend(input: unknown, backend: 'WebGL2' | 'Canvas2D'): { simulation: 'CPU'; rendering: 'CPU' | 'GPU'; reason: string } {
  const graph = normalizeParticleGraph(input), requiresCpu = graph.modules.some(item => item.enabled && ['Collision', 'Events', 'SubEmitter'].includes(item.kind))
  if (backend === 'WebGL2') return { simulation: 'CPU', rendering: 'GPU', reason: graph.simulation === 'GPU' && requiresCpu ? 'Collision/events retain deterministic CPU simulation; particle geometry remains GPU-batched.' : 'Deterministic CPU simulation with GPU-batched drawing.' }
  return { simulation: 'CPU', rendering: 'CPU', reason: 'Canvas2D compatibility fallback.' }
}

export function particleGraphCost(input: unknown) {
  const graph = normalizeParticleGraph(input), enabled = graph.modules.filter(item => item.enabled), maximum = number(module(graph, 'Spawn')?.values.maximum, 1000, 0, 100_000), collision = enabled.some(item => item.kind === 'Collision'), trail = enabled.find(item => item.kind === 'Trail'), trailLength = number(trail?.values.length, 0, 0, 32)
  const operationsPerFrame = Math.round(maximum * (8 + (collision ? 18 : 0) + trailLength * .8))
  return { maximumParticles: maximum, operationsPerFrame, estimatedCpuMs: Number((operationsPerFrame / 350_000).toFixed(3)), trailVertices: Math.round(maximum * trailLength), recommendation: operationsPerFrame > 700_000 ? 'Reduce maximum particles, collision layers, or trail length.' : 'Within the default particle budget.' }
}

export function serializeParticleGraph(input: unknown): string { return JSON.stringify(normalizeParticleGraph(input), null, 2) }
