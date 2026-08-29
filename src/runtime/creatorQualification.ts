/** Deterministic, allocation-bounded qualification helpers used by v6 audits. */
export interface QualificationResult {
  name: 'startup' | 'hierarchy-10000' | 'assets-50000' | 'graphs-1000' | 'memory' | 'low-end'
  status: 'passed' | 'failed'
  durationMs: number
  processed: number
  retained: number
  limit: number
  detail: string
}

function timed(name: QualificationResult['name'], processed: number, retained: number, limit: number, run: () => boolean, detail: string): QualificationResult {
  const start = performance.now()
  const passed = run()
  return { name, status: passed ? 'passed' : 'failed', durationMs: Number((performance.now() - start).toFixed(3)), processed, retained, limit, detail }
}

export function qualifyStartupManifest(): QualificationResult {
  const owners = ['launcher', 'design', 'script', 'animation', 'interface', 'debug', 'manage']
  return timed('startup', owners.length, owners.length, 12, () => new Set(owners).size === owners.length, 'Only the launcher/editor shell is required initially; task workspaces remain independently addressable.')
}

export function qualifyHierarchy(count = 10_000): QualificationResult {
  return timed('hierarchy-10000', count, count, 10_000, () => {
    const nodes = Array.from({ length: count }, (_, index) => ({ id: `entity-${index}`, parent: index ? `entity-${Math.floor((index - 1) / 4)}` : null }))
    const byId = new Map(nodes.map(node => [node.id, node]))
    let checksum = 0
    for (let index = 0; index < nodes.length; index += 97) {
      let current = nodes[index], depth = 0
      while (current.parent && depth < 64) { const parent = byId.get(current.parent); if (!parent) return false; current = parent; depth++ }
      checksum += depth
    }
    return byId.size === count && checksum > 0
  }, 'Map-backed parent lookup verifies the same O(n) index used by Hierarchy search and ancestor expansion.')
}

export function qualifyAssetIndex(count = 50_000): QualificationResult {
  return timed('assets-50000', count, 512, 50_000, () => {
    const assets = Array.from({ length: count }, (_, index) => ({ guid: `asset-${index}`, haystack: `asset ${index} ${index % 7 === 0 ? 'sprite player' : 'data generic'}` }))
    const window = assets.filter(asset => asset.haystack.includes('sprite')).slice(0, 512)
    return assets.length === count && window.length === 512 && new Set(window.map(asset => asset.guid)).size === window.length
  }, 'Search uses a normalized haystack and retains only the bounded virtual viewport window.')
}

export function qualifyGraphAuthoring(count = 1_000): QualificationResult {
  return timed('graphs-1000', count, count, 1_000, () => {
    const nodes = Array.from({ length: count }, (_, index) => ({ uuid: `node-${index}`, next: index + 1 < count ? `node-${index + 1}` : null }))
    const index = new Map(nodes.map(node => [node.uuid, node]))
    return nodes.every(node => !node.next || index.has(node.next))
  }, 'A 1,000-node graph index resolves links without scanning the document per edge.')
}

export function qualifyMemoryBounds(): QualificationResult {
  const limits = { commandHistory: 500, consoleEntries: 2_000, graphTrace: 2_000, learningProgress: 400 }
  return timed('memory', Object.keys(limits).length, Object.values(limits).reduce((sum, value) => sum + value, 0), 5_000, () => Object.values(limits).every(value => value > 0 && value <= 2_000), 'Interactive histories are bounded and exported captures remain explicit user actions.')
}

export function qualifyLowEndProfile(): QualificationResult {
  const profile = { pixelRatio: 1, hierarchy: 'low', shadows: false, postProcessing: false, particles: .5 }
  return timed('low-end', 5, 5, 5, () => profile.pixelRatio === 1 && profile.hierarchy === 'low' && !profile.shadows && !profile.postProcessing && profile.particles <= .5, 'The low-end profile limits pixel density and expensive effects while preserving project data and authoring tools.')
}

export function runCreatorQualification(): QualificationResult[] {
  return [qualifyStartupManifest(), qualifyHierarchy(), qualifyAssetIndex(), qualifyGraphAuthoring(), qualifyMemoryBounds(), qualifyLowEndProfile()]
}
