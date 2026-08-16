import { NOVA_ENGINE_VERSION, NOVA_MINIMUM_SCHEMA_VERSION, NOVA_PROJECT_SCHEMA_VERSION } from '../projects/projectFormat'
import { normalizePackageManifest, packageCompatibility } from './packages'

export interface UpgradePreview {
  sourceSchema: number
  targetSchema: number
  sourceEngine: string
  targetEngine: string
  requiresMigration: boolean
  supported: boolean
  sceneCount: number
  entityCount: number
  assetCount: number
  packageProblems: string[]
  warnings: string[]
}

const ROLLBACK_KEY = 'nova_a.project_upgrade_rollback.v1'
const MAX_ROLLBACK_BYTES = 4_000_000

export function analyzeProjectUpgrade(source: string): UpgradePreview {
  const project = JSON.parse(source) as Record<string, unknown>
  const sourceSchema = Number(project.formatVersion ?? 1)
  const scenes = Array.isArray(project.scenes) ? project.scenes as Array<Record<string, unknown>> : []
  const legacyEntities = Array.isArray(project.entities) ? project.entities : []
  const packageProblems: string[] = []
  const packages = project.packages && typeof project.packages === 'object' && Array.isArray((project.packages as Record<string, unknown>).installed)
    ? (project.packages as { installed: Array<Record<string, unknown>> }).installed : []
  const previewPackages = packages.slice(0, 512).flatMap(raw => {
    try {
      const manifest = normalizePackageManifest(raw.manifest)
      return [{ manifest, source: { kind: 'local' as const, location: 'upgrade preview' }, enabled: raw.enabled !== false, project: raw.project !== false, installedAt: 0 }]
    } catch (error) { packageProblems.push(error instanceof Error ? error.message : String(error)); return [] }
  })
  for (const item of previewPackages) {
    try {
      const problems = packageCompatibility(item, NOVA_ENGINE_VERSION, previewPackages)
      packageProblems.push(...problems.map(problem => `${item.manifest.name}: ${problem}`))
    } catch (error) { packageProblems.push(error instanceof Error ? error.message : String(error)) }
  }
  const warnings: string[] = []
  if (sourceSchema < NOVA_MINIMUM_SCHEMA_VERSION) warnings.push(`Schema ${sourceSchema} predates the guaranteed migration range; the legacy importer will validate every recovered record.`)
  if (sourceSchema > NOVA_PROJECT_SCHEMA_VERSION) warnings.push('This project is newer than this Nova_A build and cannot be downgraded safely.')
  if (packageProblems.length) warnings.push('One or more packages require attention after migration.')
  return {
    sourceSchema, targetSchema: NOVA_PROJECT_SCHEMA_VERSION, sourceEngine: String(project.engineVersion ?? 'legacy'), targetEngine: NOVA_ENGINE_VERSION,
    requiresMigration: sourceSchema !== NOVA_PROJECT_SCHEMA_VERSION,
    supported: Number.isFinite(sourceSchema) && sourceSchema >= 1 && sourceSchema <= NOVA_PROJECT_SCHEMA_VERSION,
    sceneCount: scenes.length || (legacyEntities.length ? 1 : 0),
    entityCount: scenes.reduce((count, scene) => count + (Array.isArray(scene.entities) ? scene.entities.length : 0), legacyEntities.length),
    assetCount: Array.isArray(project.assets) ? project.assets.length : 0,
    packageProblems: packageProblems.slice(0, 256), warnings
  }
}

export function downloadProjectBackup(source: string, fileName = 'project'): void {
  const safeName = fileName.replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '') || 'project'
  const url = URL.createObjectURL(new Blob([source], { type: 'application/json' }))
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${safeName}.pre-upgrade.nova`; anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function storeUpgradeRollback(source: string, fileName: string): boolean {
  if (typeof localStorage === 'undefined' || source.length > MAX_ROLLBACK_BYTES) return false
  try { localStorage.setItem(ROLLBACK_KEY, JSON.stringify({ savedAt: new Date().toISOString(), fileName: fileName.slice(0, 180), source })); return true } catch { return false }
}

export function readUpgradeRollback(): { savedAt: string; fileName: string; source: string } | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const value = JSON.parse(localStorage.getItem(ROLLBACK_KEY) ?? 'null') as Record<string, unknown> | null
    return value && typeof value.source === 'string' && typeof value.savedAt === 'string' && typeof value.fileName === 'string'
      ? { savedAt: value.savedAt, fileName: value.fileName, source: value.source } : null
  } catch { return null }
}

export function clearUpgradeRollback(): void { if (typeof localStorage !== 'undefined') localStorage.removeItem(ROLLBACK_KEY) }
