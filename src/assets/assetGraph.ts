import type { AssetRecord } from './types'

export interface AssetDependencyGraph {
  dependencies: Map<string, Set<string>>
  reverseDependencies: Map<string, Set<string>>
  missingReferences: Array<{ owner: string; reference: string }>
}

const ASSET_REFERENCE = /asset:\/\/([0-9a-f-]{8,})/gi

function referencedGuids(value: unknown, output = new Set<string>()): Set<string> {
  if (typeof value === 'string') {
    const candidates = [value]
    try { candidates.push(decodeURIComponent(value)) } catch { /* The value is not URL encoded. */ }
    const comma = value.indexOf(',')
    if (value.startsWith('data:') && comma >= 0 && value.slice(0, comma).includes(';base64') && typeof atob === 'function') {
      try { candidates.push(atob(value.slice(comma + 1))) } catch { /* The data URL is not valid base64. */ }
    }
    for (const candidate of candidates) for (const match of candidate.matchAll(ASSET_REFERENCE)) output.add(match[1].toLowerCase())
  } else if (Array.isArray(value)) value.forEach(item => referencedGuids(item, output))
  else if (value && typeof value === 'object') Object.values(value as Record<string, unknown>).forEach(item => referencedGuids(item, output))
  return output
}

export function buildAssetDependencyGraph(assets: AssetRecord[], project?: unknown): AssetDependencyGraph {
  const known = new Set(assets.map(asset => asset.uuid.toLowerCase()))
  const dependencies = new Map<string, Set<string>>()
  const reverseDependencies = new Map<string, Set<string>>()
  const missingReferences: Array<{ owner: string; reference: string }> = []
  for (const asset of assets) {
    const refs = referencedGuids({ source: asset.source, animationImport: asset.animationImport, unknownFields: asset.unknownFields })
    refs.delete(asset.uuid.toLowerCase())
    dependencies.set(asset.uuid, refs)
    for (const reference of refs) {
      if (!known.has(reference)) missingReferences.push({ owner: asset.uuid, reference })
      else {
        const reverse = reverseDependencies.get(reference) ?? new Set<string>()
        reverse.add(asset.uuid); reverseDependencies.set(reference, reverse)
      }
    }
  }
  for (const reference of referencedGuids(project)) if (!known.has(reference)) missingReferences.push({ owner: 'project', reference })
  return { dependencies, reverseDependencies, missingReferences }
}

export function findAssetReferences(uuid: string, assets: AssetRecord[], project?: unknown): string[] {
  const graph = buildAssetDependencyGraph(assets, project)
  const owners = [...(graph.reverseDependencies.get(uuid.toLowerCase()) ?? [])]
  if (referencedGuids(project).has(uuid.toLowerCase())) owners.unshift('project')
  return owners
}

export function unusedAssetReport(assets: AssetRecord[], project?: unknown): AssetRecord[] {
  const graph = buildAssetDependencyGraph(assets, project)
  const projectRefs = referencedGuids(project)
  return assets.filter(asset => !projectRefs.has(asset.uuid.toLowerCase()) && !(graph.reverseDependencies.get(asset.uuid.toLowerCase())?.size))
}

export function explainAssetBuildInclusion(uuid: string, assets: AssetRecord[], project?: unknown): string[] {
  const reasons = findAssetReferences(uuid, assets, project)
  return reasons.map(owner => owner === 'project' ? 'Referenced by a scene or project setting' : `Referenced by asset ${assets.find(asset => asset.uuid === owner)?.path ?? owner}`)
}

export function repairAssetPathReferences(assets: AssetRecord[], oldPath: string, newPath: string): number {
  let repaired = 0
  for (const asset of assets) {
    if (!asset.source.includes(encodeURIComponent(oldPath)) && !asset.source.includes(oldPath)) continue
    asset.source = asset.source.split(oldPath).join(newPath).split(encodeURIComponent(oldPath)).join(encodeURIComponent(newPath))
    repaired++
  }
  return repaired
}

export function repairMissingAssetReference(assets: AssetRecord[], missingUuid: string, replacementUuid: string): number {
  let repaired = 0
  const missingReference = `asset://${missingUuid}`
  const replacementReference = `asset://${replacementUuid}`
  for (const asset of assets) {
    const before = asset.source
    asset.source = asset.source
      .split(missingReference).join(replacementReference)
      .split(encodeURIComponent(missingReference)).join(encodeURIComponent(replacementReference))
    const comma = asset.source.indexOf(',')
    if (asset.source.startsWith('data:') && comma >= 0 && asset.source.slice(0, comma).includes(';base64') && typeof atob === 'function' && typeof btoa === 'function') {
      try {
        const decoded = atob(asset.source.slice(comma + 1))
        const replaced = decoded.split(missingReference).join(replacementReference)
        if (replaced !== decoded) asset.source = `${asset.source.slice(0, comma + 1)}${btoa(replaced)}`
      } catch { /* Keep an invalid data URL unchanged; the importer will report it. */ }
    }
    if (before !== asset.source) repaired++
  }
  return repaired
}
