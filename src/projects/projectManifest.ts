import { reactive } from 'vue'
import { NOVA_ENGINE_VERSION, NOVA_PROJECT_SCHEMA_VERSION } from './projectFormat'
import { projectSessionState, type ProjectMetadata } from './projectSession'

export const NOVA_PROJECT_MANIFEST_VERSION = 1

export interface ProjectDirectories {
  source: string
  shared: string
  generated: string
  cache: string
  userLocal: string
}

export interface ProjectManifest {
  manifestVersion: typeof NOVA_PROJECT_MANIFEST_VERSION
  projectUuid: string
  name: string
  engineCompatibility: { minimum: string; maximumExclusive: string }
  schemaVersion: number
  packageLockfile: string
  buildPresets: string[]
  directories: ProjectDirectories
}

export const DEFAULT_PROJECT_DIRECTORIES: Readonly<ProjectDirectories> = Object.freeze({
  source: 'Assets',
  shared: 'ProjectSettings',
  generated: '.nova/imported',
  cache: '.nova/cache',
  userLocal: '.nova/user'
})

function safePath(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback
  const normalized = value.replace(/\\/g, '/').split('/').filter(part => part && part !== '.' && part !== '..').join('/')
  return normalized.slice(0, 240) || fallback
}

function currentManifest(metadata: ProjectMetadata = projectSessionState): ProjectManifest {
  return {
    manifestVersion: NOVA_PROJECT_MANIFEST_VERSION,
    projectUuid: metadata.id,
    name: metadata.name,
    engineCompatibility: { minimum: '3.9.0', maximumExclusive: '27.0.0' },
    schemaVersion: NOVA_PROJECT_SCHEMA_VERSION,
    packageLockfile: 'Packages.lock',
    buildPresets: ['ProjectSettings/build.presets.json'],
    directories: { ...DEFAULT_PROJECT_DIRECTORIES }
  }
}

export const projectManifestState = reactive<ProjectManifest>(currentManifest())

export function normalizeProjectManifest(value: unknown, metadata: ProjectMetadata = projectSessionState): ProjectManifest {
  const source = value && typeof value === 'object' ? value as Partial<ProjectManifest> : {}
  const compatibility = source.engineCompatibility && typeof source.engineCompatibility === 'object' ? source.engineCompatibility : { minimum: '3.9.0', maximumExclusive: '27.0.0' }
  const directories = source.directories && typeof source.directories === 'object' ? source.directories : DEFAULT_PROJECT_DIRECTORIES
  const buildPresets = Array.isArray(source.buildPresets)
    ? [...new Set(source.buildPresets.filter(item => typeof item === 'string').map(item => safePath(item, '')).filter(Boolean))].slice(0, 64)
    : []
  return {
    manifestVersion: NOVA_PROJECT_MANIFEST_VERSION,
    projectUuid: metadata.id,
    name: metadata.name,
    engineCompatibility: {
      minimum: typeof compatibility.minimum === 'string' ? compatibility.minimum.slice(0, 40) : '3.9.0',
      maximumExclusive: typeof compatibility.maximumExclusive === 'string' ? (['4.0.0', '5.0.0', '6.0.0', '7.0.0', '8.0.0'].includes(compatibility.maximumExclusive) ? '27.0.0' : compatibility.maximumExclusive.slice(0, 40)) : '27.0.0'
    },
    schemaVersion: NOVA_PROJECT_SCHEMA_VERSION,
    packageLockfile: safePath(source.packageLockfile, 'Packages.lock'),
    buildPresets: buildPresets.length ? buildPresets : ['ProjectSettings/build.presets.json'],
    directories: {
      source: safePath(directories.source, DEFAULT_PROJECT_DIRECTORIES.source),
      shared: safePath(directories.shared, DEFAULT_PROJECT_DIRECTORIES.shared),
      generated: safePath(directories.generated, DEFAULT_PROJECT_DIRECTORIES.generated),
      cache: safePath(directories.cache, DEFAULT_PROJECT_DIRECTORIES.cache),
      userLocal: safePath(directories.userLocal, DEFAULT_PROJECT_DIRECTORIES.userLocal)
    }
  }
}

export function hydrateProjectManifest(value: unknown): void {
  Object.assign(projectManifestState, normalizeProjectManifest(value))
}

export function resetProjectManifest(): void { Object.assign(projectManifestState, currentManifest()) }

export function serializeProjectManifest(): ProjectManifest {
  return normalizeProjectManifest({ ...projectManifestState, projectUuid: projectSessionState.id, name: projectSessionState.name })
}

function semver(value: string): [number, number, number] | null {
  const match = value.match(/^(\d+)\.(\d+)\.(\d+)/)
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null
}

function compare(left: [number, number, number], right: [number, number, number]): number {
  return left[0] - right[0] || left[1] - right[1] || left[2] - right[2]
}

export function manifestCompatibility(manifest: ProjectManifest = projectManifestState): { compatible: boolean; reasons: string[] } {
  const current = semver(NOVA_ENGINE_VERSION), minimum = semver(manifest.engineCompatibility.minimum), maximum = semver(manifest.engineCompatibility.maximumExclusive)
  const reasons: string[] = []
  if (!current || !minimum || !maximum) reasons.push('The project contains an invalid engine compatibility range.')
  else {
    if (compare(minimum, maximum) >= 0) reasons.push('The project engine compatibility range is empty or reversed.')
    if (compare(current, minimum) < 0) reasons.push(`Requires Nova_A ${manifest.engineCompatibility.minimum} or newer.`)
    if (compare(current, maximum) >= 0) reasons.push(`Requires a Nova_A version earlier than ${manifest.engineCompatibility.maximumExclusive}.`)
  }
  if (manifest.schemaVersion > NOVA_PROJECT_SCHEMA_VERSION) reasons.push(`Schema ${manifest.schemaVersion} is newer than schema ${NOVA_PROJECT_SCHEMA_VERSION}.`)
  return { compatible: reasons.length === 0, reasons }
}
