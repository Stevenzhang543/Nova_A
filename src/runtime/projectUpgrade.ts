import { NOVA_ENGINE_VERSION, NOVA_MINIMUM_SCHEMA_VERSION, NOVA_PROJECT_SCHEMA_VERSION } from '../projects/projectFormat'
import { compareVersions, normalizePackageManifest, packageCompatibility, parseVersion, reviewPackageSecurity } from './packages'

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
  projectName: string
  projectFormat: string
  engineCompatibility: string
  migrationSteps: Array<{ fromSchema: number; toSchema: number; name: string }>
  preflight: Array<{ id: string; status: 'passed' | 'warning' | 'blocked' | 'pending'; label: string; detail: string }>
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
      return [{ manifest, source: { kind: 'local' as const, location: 'upgrade preview' }, enabled: raw.enabled !== false, project: raw.project !== false, installedAt: 0, securityStatus: reviewPackageSecurity(manifest).status, grantedPermissions: manifest.permissions, deprecations: [] }]
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
  const manifest = project.manifest && typeof project.manifest === 'object' ? project.manifest as Record<string, unknown> : {}
  const metadata = project.projectMetadata && typeof project.projectMetadata === 'object' ? project.projectMetadata as Record<string, unknown> : {}
  const engineRange = manifest.engineCompatibility && typeof manifest.engineCompatibility === 'object' ? manifest.engineCompatibility as Record<string, unknown> : {}
  const sourceEngine = String(project.engineVersion ?? 'legacy')
  const projectFormat = String(project.projectFormat ?? 'Legacy Nova_A project')
  const minimumEngine = String(engineRange.minimum ?? project.engineVersion ?? 'legacy')
  const maximumEngine = String(engineRange.maximumExclusive ?? '5.0.0')
  const hasDeclaredEngineRange = engineRange.minimum !== undefined || engineRange.maximumExclusive !== undefined
  const validEngineRange = !hasDeclaredEngineRange || Boolean(parseVersion(minimumEngine) && parseVersion(maximumEngine) && compareVersions(minimumEngine, maximumEngine) < 0)
  const currentEngineInRange = validEngineRange && (!hasDeclaredEngineRange || (compareVersions(NOVA_ENGINE_VERSION, minimumEngine) >= 0 && compareVersions(NOVA_ENGINE_VERSION, maximumEngine) < 0))
  const v39BoundarySeal = validEngineRange && parseVersion(sourceEngine) !== null && compareVersions(sourceEngine, '4.0.0') < 0 && maximumEngine === '4.0.0' && compareVersions(NOVA_ENGINE_VERSION, minimumEngine) >= 0
  const engineRangeSupported = currentEngineInRange || v39BoundarySeal
  if (v39BoundarySeal) warnings.push('This 3.x project has the archived <4.0.0 ceiling; the 4.0 migration will seal it to <5.0.0 without changing schema 29.')
  if (!engineRangeSupported) warnings.push(validEngineRange ? `This project does not declare compatibility with Nova_A ${NOVA_ENGINE_VERSION}.` : 'The project engine compatibility range is malformed.')
  const engineUpgradeRequired = sourceEngine !== NOVA_ENGINE_VERSION || v39BoundarySeal
  const migrationSteps = Array.from({ length: Math.max(0, NOVA_PROJECT_SCHEMA_VERSION - Math.max(sourceSchema, 1)) }, (_, index) => {
    const fromSchema = Math.max(sourceSchema, 1) + index
    return { fromSchema, toSchema: fromSchema + 1, name: fromSchema === 22 ? 'Authoritative project data, assets, scenes, and prefabs' : `Legacy schema ${fromSchema} projection` }
  })
  if (engineUpgradeRequired && sourceSchema === NOVA_PROJECT_SCHEMA_VERSION) migrationSteps.push({ fromSchema: sourceSchema, toSchema: sourceSchema, name: '4.0 compatibility metadata seal (schema remains frozen)' })
  const schemaSupported = Number.isFinite(sourceSchema) && sourceSchema >= 1 && sourceSchema <= NOVA_PROJECT_SCHEMA_VERSION
  const formatSupported = !project.projectFormat || projectFormat === 'Nova_A Project Format 2'
  const supported = schemaSupported && formatSupported && engineRangeSupported
  const preflight: UpgradePreview['preflight'] = [
    { id: 'document', status: 'passed', label: 'Project document', detail: 'JSON parsed without executing project content.' },
    { id: 'format', status: formatSupported ? 'passed' : 'blocked', label: 'Project format', detail: formatSupported ? `${projectFormat}; schema ${sourceSchema}` : `${projectFormat} is not supported by the 4.0 migration chain.` },
    { id: 'schema', status: schemaSupported ? 'passed' : 'blocked', label: 'Migration chain', detail: schemaSupported ? `Schemas ${sourceSchema}–${NOVA_PROJECT_SCHEMA_VERSION} have a registered forward path.` : `Schema ${sourceSchema} cannot be migrated safely.` },
    { id: 'engine', status: engineRangeSupported ? (v39BoundarySeal ? 'warning' : 'passed') : 'blocked', label: 'Engine compatibility', detail: engineRangeSupported ? (v39BoundarySeal ? `${minimumEngine} – <${maximumEngine}; the registered 4.0 boundary seal will widen only the maximum.` : `${minimumEngine} – <${maximumEngine} accepts Nova_A ${NOVA_ENGINE_VERSION}.`) : (validEngineRange ? `${minimumEngine} – <${maximumEngine} excludes Nova_A ${NOVA_ENGINE_VERSION}.` : `${minimumEngine} – <${maximumEngine} is not a valid semantic-version range.`) },
    { id: 'packages', status: packageProblems.length ? 'warning' : 'passed', label: 'Package compatibility', detail: packageProblems.length ? `${packageProblems.length} package issue(s) will remain disabled for review.` : `${previewPackages.length} package manifest(s) are compatible.` },
    { id: 'backup', status: 'passed', label: 'Recovery', detail: 'A complete source download and bounded local rollback copy are created before migration.' },
    { id: 'validation', status: supported ? 'pending' : 'blocked', label: 'Post-migration validation', detail: supported ? 'The complete migrated document will be validated and canonicalized before the editor session changes.' : 'Validation cannot run until the blocking preflight issue is resolved.' }
  ]
  return {
    sourceSchema, targetSchema: NOVA_PROJECT_SCHEMA_VERSION, sourceEngine, targetEngine: NOVA_ENGINE_VERSION,
    requiresMigration: sourceSchema !== NOVA_PROJECT_SCHEMA_VERSION || engineUpgradeRequired,
    supported,
    sceneCount: scenes.length || (legacyEntities.length ? 1 : 0),
    entityCount: scenes.reduce((count, scene) => count + (Array.isArray(scene.entities) ? scene.entities.length : 0), legacyEntities.length),
    assetCount: Array.isArray(project.assets) ? project.assets.length : 0,
    packageProblems: packageProblems.slice(0, 256), warnings,
    projectName: String(manifest.name ?? metadata.name ?? 'Unnamed project').slice(0, 80),
    projectFormat,
    engineCompatibility: `${minimumEngine} – <${maximumEngine}`,
    migrationSteps, preflight
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

export function downloadLastUpgradeRollback(): boolean {
  const rollback = readUpgradeRollback()
  if (!rollback) return false
  downloadProjectBackup(rollback.source, `${rollback.fileName}.rollback`)
  return true
}

export function clearUpgradeRollback(): void { if (typeof localStorage !== 'undefined') localStorage.removeItem(ROLLBACK_KEY) }
