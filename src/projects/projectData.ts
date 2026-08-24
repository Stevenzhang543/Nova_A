import { NOVA_ENGINE_VERSION, NOVA_PROJECT_FORMAT, NOVA_PROJECT_FORMAT_MAJOR, NOVA_PROJECT_SCHEMA_VERSION } from './projectFormat'
import { manifestCompatibility, normalizeProjectManifest } from './projectManifest'
import { assetSourceBytes, sha256Bytes } from '../assets/contentHash'
import { componentAuthoringRule, normalizeSceneAuthoringSettings } from '../editor/sceneAuthoring'
import { STABLE_COMPONENT_KINDS } from '../world/componentRegistry'
import type { ComponentKind } from '../world/components'

export type ProjectIssueSeverity = 'error' | 'warning' | 'info'
export interface ProjectIssue { severity: ProjectIssueSeverity; code: string; path: string; message: string; repairable: boolean }
export interface ProjectValidationReport { valid: boolean; generatedAt: string; issues: ProjectIssue[]; sceneCount: number; entityCount: number; assetCount: number }
export interface ProjectRepairReport { source: Record<string, unknown>; changes: string[]; remaining: ProjectIssue[] }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const CONTENT_HASH = /^(?:[0-9a-f]{64}|legacy-unverified:[0-9a-f-]{36})$/i
const ASSET_REFERENCE = /asset:\/\/([0-9a-f-]{36})/gi

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T }
function normalizedNumber(value: number): number { return Object.is(value, -0) ? 0 : value }

const UUID_FIELD = /(?:^uuid$|Uuid$|UUID$|^projectUuid$)/
const UUID_VALUE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function canonicalString(value: string, key: string): string {
  if (UUID_FIELD.test(key) && UUID_VALUE.test(value)) return value.toLowerCase()
  if (/^(?:asset|scene|prefab|resource):\/\/[0-9a-f-]{36}$/i.test(value)) {
    const [scheme, identity] = value.split('://')
    return `${scheme.toLowerCase()}://${identity.toLowerCase()}`
  }
  return value
}

function canonicalValue(value: unknown, path: string, key = ''): unknown {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`Non-finite number at ${path || '<root>'}`)
    return normalizedNumber(value)
  }
  if (Array.isArray(value)) {
    const items = value.map((item, index) => canonicalValue(item, `${path}[${index}]`))
    if (path === 'assets') return items.sort((a, b) => String((a as Record<string, unknown>)?.path ?? '').localeCompare(String((b as Record<string, unknown>)?.path ?? '')) || String((a as Record<string, unknown>)?.uuid ?? '').localeCompare(String((b as Record<string, unknown>)?.uuid ?? '')))
    if (path === 'assetFolders' || path.endsWith('.buildPresets')) return [...new Set(items.map(String))].sort((a, b) => a.localeCompare(b))
    if (path.endsWith('.dependencies') || path.endsWith('.reverseDependencies')) return [...new Set(items.map(String))].sort((a, b) => a.localeCompare(b))
    return items
  }
  if (typeof value === 'string') return canonicalString(value, key)
  if (!value || typeof value !== 'object') return value
  const source = value as Record<string, unknown>, output: Record<string, unknown> = {}
  for (const childKey of Object.keys(source).sort((a, b) => a.localeCompare(b))) output[childKey] = canonicalValue(source[childKey], path ? `${path}.${childKey}` : childKey, childKey)
  return output
}

/** Canonical project JSON is UTF-8 text, LF terminated, two-space indented, and lexicographically keyed. */
export function canonicalProjectText(source: string | unknown): string {
  const value = typeof source === 'string' ? JSON.parse(source) : source
  return `${JSON.stringify(canonicalValue(value, ''), null, 2)}\n`
}

export interface ProjectDataSeparation {
  authored: Record<string, unknown>
  generated: {
    format: 'nova-generated-import-data'
    version: 1
    assets: Array<{ uuid: string; path: string; pipeline: Record<string, unknown> }>
  }
}

/**
 * Separates authoritative authored values from disposable import/cache state.
 * The portable project document remains self-contained, while transaction and
 * folder exporters can write `generated` below `.nova/imported/` and rebuild it.
 */
export function separateAuthoredAndGeneratedProjectData(source: string | unknown): ProjectDataSeparation {
  const project = (typeof source === 'string' ? JSON.parse(source) : clone(source)) as Record<string, unknown>
  const authored = clone(project)
  const authoredAssets = Array.isArray(authored.assets) ? authored.assets as Array<Record<string, unknown>> : []
  const generatedAssets: ProjectDataSeparation['generated']['assets'] = []
  for (const asset of authoredAssets) {
    if (!asset.pipeline || typeof asset.pipeline !== 'object') continue
    const pipeline = asset.pipeline as Record<string, unknown>
    generatedAssets.push({
      uuid: String(asset.uuid ?? '').toLowerCase(),
      path: String(asset.path ?? ''),
      pipeline: {
        artifactHash: pipeline.artifactHash ?? '', cacheHit: pipeline.cacheHit === true,
        cacheKey: pipeline.cacheKey ?? '', error: pipeline.error ?? '', lastValidSource: pipeline.lastValidSource ?? '',
        status: pipeline.status ?? 'ready'
      }
    })
    asset.pipeline = Object.fromEntries(Object.entries(pipeline).filter(([field]) => !['cacheHit', 'error', 'lastValidSource', 'status'].includes(field)))
  }
  return {
    authored: canonicalValue(authored, '') as Record<string, unknown>,
    generated: { format: 'nova-generated-import-data', version: 1, assets: generatedAssets.sort((a, b) => a.path.localeCompare(b.path) || a.uuid.localeCompare(b.uuid)) }
  }
}

export type SemanticChangeKind = 'added' | 'removed' | 'modified'
export interface SemanticProjectChange { kind: SemanticChangeKind; resourceType: 'scene' | 'prefab' | 'resource'; uuid: string; path: string; beforeChecksum: string; afterChecksum: string }

function semanticChecksum(value: unknown): string {
  const source = JSON.stringify(canonicalValue(value, ''))
  let first = 0x811c9dc5, second = 0x9e3779b9
  for (let index = 0; index < source.length; index++) {
    const code = source.charCodeAt(index)
    first = Math.imul(first ^ code, 0x01000193) >>> 0
    second = Math.imul(second ^ (code + index), 0x85ebca6b) >>> 0
  }
  return `${first.toString(16).padStart(8, '0')}${second.toString(16).padStart(8, '0')}`
}

function semanticResources(project: Record<string, unknown>): Map<string, { resourceType: SemanticProjectChange['resourceType']; uuid: string; path: string; value: unknown }> {
  const output = new Map<string, { resourceType: SemanticProjectChange['resourceType']; uuid: string; path: string; value: unknown }>()
  for (const raw of Array.isArray(project.scenes) ? project.scenes : []) {
    if (!raw || typeof raw !== 'object') continue
    const scene = raw as Record<string, unknown>, uuid = String(scene.uuid ?? '').toLowerCase()
    if (uuid) output.set(`scene:${uuid}`, { resourceType: 'scene', uuid, path: `Assets/Scenes/${String(scene.name ?? uuid)}.nova-scene`, value: scene })
  }
  for (const raw of Array.isArray(project.assets) ? project.assets : []) {
    if (!raw || typeof raw !== 'object') continue
    const asset = raw as Record<string, unknown>, uuid = String(asset.uuid ?? '').toLowerCase(), assetType = String(asset.assetType ?? '')
    if (!uuid || !['prefab', 'material', 'animation', 'controller', 'dataSchema', 'dataTable', 'localization', 'uiTheme', 'tileset'].includes(assetType)) continue
    const resourceType = assetType === 'prefab' ? 'prefab' : 'resource'
    output.set(`${resourceType}:${uuid}`, { resourceType, uuid, path: String(asset.path ?? uuid), value: asset })
  }
  return output
}

/** Stable, identity-based metadata for scene/prefab/resource review and recovery previews. */
export function semanticProjectDiff(before: string | unknown, after: string | unknown): SemanticProjectChange[] {
  const left = semanticResources((typeof before === 'string' ? JSON.parse(before) : before) as Record<string, unknown>)
  const right = semanticResources((typeof after === 'string' ? JSON.parse(after) : after) as Record<string, unknown>)
  const changes: SemanticProjectChange[] = []
  for (const [key, current] of right) {
    const previous = left.get(key), beforeChecksum = previous ? semanticChecksum(previous.value) : '', afterChecksum = semanticChecksum(current.value)
    if (!previous || beforeChecksum !== afterChecksum) changes.push({ kind: previous ? 'modified' : 'added', resourceType: current.resourceType, uuid: current.uuid, path: current.path, beforeChecksum, afterChecksum })
  }
  for (const [key, previous] of left) if (!right.has(key)) changes.push({ kind: 'removed', resourceType: previous.resourceType, uuid: previous.uuid, path: previous.path, beforeChecksum: semanticChecksum(previous.value), afterChecksum: '' })
  return changes.sort((a, b) => a.path.localeCompare(b.path) || a.kind.localeCompare(b.kind))
}

function references(value: unknown, output = new Set<string>()): Set<string> {
  if (typeof value === 'string') for (const match of value.matchAll(ASSET_REFERENCE)) output.add(match[1].toLowerCase())
  else if (Array.isArray(value)) value.forEach(item => references(item, output))
  else if (value && typeof value === 'object') Object.values(value as Record<string, unknown>).forEach(item => references(item, output))
  return output
}

export function validateProjectDocument(source: string | unknown): ProjectValidationReport {
  let project: Record<string, unknown>
  const issues: ProjectIssue[] = []
  try { project = (typeof source === 'string' ? JSON.parse(source) : clone(source)) as Record<string, unknown> }
  catch (error) {
    return { valid: false, generatedAt: new Date().toISOString(), issues: [{ severity: 'error', code: 'invalid-json', path: '', message: error instanceof Error ? error.message : String(error), repairable: false }], sceneCount: 0, entityCount: 0, assetCount: 0 }
  }
  const add = (severity: ProjectIssueSeverity, code: string, path: string, message: string, repairable = false) => issues.push({ severity, code, path, message, repairable })
  if (project.projectFormat !== NOVA_PROJECT_FORMAT || Number(project.projectFormatMajor) !== NOVA_PROJECT_FORMAT_MAJOR) add('error', 'format', 'projectFormat', 'Project format identity is missing or unsupported.', true)
  if (Number(project.formatVersion) !== NOVA_PROJECT_SCHEMA_VERSION) add(Number(project.formatVersion) > NOVA_PROJECT_SCHEMA_VERSION ? 'error' : 'warning', 'schema', 'formatVersion', `Expected schema ${NOVA_PROJECT_SCHEMA_VERSION}.`, Number(project.formatVersion) <= NOVA_PROJECT_SCHEMA_VERSION)
  const metadata = project.projectMetadata && typeof project.projectMetadata === 'object' ? project.projectMetadata as Record<string, unknown> : {}
  const metadataId = String(metadata.id ?? '').toLowerCase()
  const rawManifest = project.manifest && typeof project.manifest === 'object' ? project.manifest as Record<string, unknown> : null
  if (!rawManifest) add('error', 'manifest', 'manifest', 'Project manifest is missing.', true)
  else {
    if (Number(rawManifest.manifestVersion) !== 1) add('error', 'manifest-version', 'manifest.manifestVersion', 'Project manifest version must be 1.', true)
    if (String(rawManifest.projectUuid ?? '').toLowerCase() !== metadataId) add('error', 'manifest-project-uuid', 'manifest.projectUuid', 'Manifest UUID must match project metadata.', true)
    if (Number(rawManifest.schemaVersion) !== NOVA_PROJECT_SCHEMA_VERSION) add('error', 'manifest-schema', 'manifest.schemaVersion', 'Manifest schema does not match the project schema.', true)
    if (String(rawManifest.packageLockfile ?? '') !== 'Packages.lock') add('error', 'manifest-lockfile', 'manifest.packageLockfile', 'Package lockfile must be Packages.lock.', true)
    const directories = rawManifest.directories && typeof rawManifest.directories === 'object' ? rawManifest.directories as Record<string, unknown> : null
    for (const key of ['source', 'shared', 'generated', 'cache', 'userLocal']) {
      const value = String(directories?.[key] ?? '')
      if (!value || value.split(/[\\/]/).some(part => part === '..')) add('error', 'manifest-directory', `manifest.directories.${key}`, 'Manifest directory is empty or unsafe.', true)
    }
  }
  const manifest = normalizeProjectManifest(project.manifest, { id: metadataId, name: String(metadata.name ?? 'Untitled Project'), createdAt: String(metadata.createdAt ?? ''), updatedAt: String(metadata.updatedAt ?? ''), format: NOVA_PROJECT_FORMAT, template: String(metadata.template ?? 'imported') })
  if (!UUID.test(manifest.projectUuid)) add('error', 'project-uuid', 'manifest.projectUuid', 'Project UUID is invalid.', true)
  for (const reason of manifestCompatibility(manifest).reasons) add('error', 'engine-compatibility', 'manifest.engineCompatibility', reason, false)
  const assets = Array.isArray(project.assets) ? project.assets.filter(item => item && typeof item === 'object') as Array<Record<string, unknown>> : []
  const scenes = Array.isArray(project.scenes) ? project.scenes.filter(item => item && typeof item === 'object') as Array<Record<string, unknown>> : []
  const knownAssets = new Set<string>(), identities = new Set<string>(UUID.test(metadataId) ? [metadataId] : [])
  for (const [index, asset] of assets.entries()) {
    const id = String(asset.uuid ?? '').toLowerCase(), path = `assets[${index}]`
    if (!UUID.test(id)) add('error', 'asset-uuid', `${path}.uuid`, 'Asset UUID is invalid.', true)
    else if (identities.has(id)) add('error', 'duplicate-uuid', `${path}.uuid`, `Duplicate UUID ${id}.`, true)
    else { identities.add(id); knownAssets.add(id) }
    const assetPath = String(asset.path ?? '')
    if (!assetPath || assetPath.split(/[\\/]/).includes('..')) add('error', 'asset-path', `${path}.path`, 'Asset path is empty or unsafe.', true)
    const pipeline = asset.pipeline && typeof asset.pipeline === 'object' ? asset.pipeline as Record<string, unknown> : null
    if (!pipeline?.importerVersion) add('error', 'asset-metadata', `${path}.pipeline.importerVersion`, 'Asset importer version is missing.', true)
    if (!CONTENT_HASH.test(String(pipeline?.sourceHash ?? pipeline?.contentHash ?? ''))) add('error', 'asset-metadata', `${path}.pipeline.sourceHash`, 'Asset source SHA-256 is missing or invalid.', true)
    if (!CONTENT_HASH.test(String(pipeline?.artifactHash ?? pipeline?.cacheKey ?? ''))) add('error', 'asset-metadata', `${path}.pipeline.artifactHash`, 'Imported artifact SHA-256 is missing or invalid.', true)
  }
  const stableComponentKinds = new Set<string>(STABLE_COMPONENT_KINDS)
  const sceneIds = new Set(scenes.map(scene => String(scene.uuid ?? '').toLowerCase()).filter(value => UUID.test(value)))
  const inheritance = new Map<string, string>()
  let entityCount = 0
  for (const [sceneIndex, scene] of scenes.entries()) {
    const sceneId = String(scene.uuid ?? '').toLowerCase(), path = `scenes[${sceneIndex}]`
    if (!UUID.test(sceneId) || identities.has(sceneId)) add('error', 'scene-uuid', `${path}.uuid`, 'Scene UUID is invalid or duplicated.', true)
    else identities.add(sceneId)
    const settings = normalizeSceneAuthoringSettings(scene.authoringSettings, sceneIndex)
    if (!scene.authoringSettings || Number((scene.authoringSettings as Record<string, unknown>)?.sceneVersion) !== 2) add('warning', 'scene-authoring-version', `${path}.authoringSettings`, 'Scene authoring settings will be upgraded to version 2.', true)
    if (settings.inheritanceSourceUuid) {
      if (!sceneIds.has(settings.inheritanceSourceUuid)) add('error', 'scene-inheritance-source', `${path}.authoringSettings.inheritanceSourceUuid`, 'Inherited scene source does not exist.', true)
      else inheritance.set(sceneId, settings.inheritanceSourceUuid)
    }
    if (new Set(settings.namedLayers.map(layer => layer.id)).size !== settings.namedLayers.length) add('error', 'named-layer-identity', `${path}.authoringSettings.namedLayers`, 'Named scene layer IDs must be unique.', true)
    const entities = Array.isArray(scene.entities) ? scene.entities.filter(item => item && typeof item === 'object') as Array<Record<string, unknown>> : []
    const sceneEntityIds = new Set(entities.map(entity => String(entity.uuid ?? '').toLowerCase()).filter(value => UUID.test(value)))
    entityCount += entities.length
    for (const [entityIndex, entity] of entities.entries()) {
      const entityPath = `${path}.entities[${entityIndex}]`, entityId = String(entity.uuid ?? '').toLowerCase()
      if (!UUID.test(entityId) || identities.has(entityId)) add('error', 'entity-uuid', `${entityPath}.uuid`, 'Object-local UUID is invalid or duplicated.', true)
      else identities.add(entityId)
      if (!Array.isArray(entity.tags) || entity.tags.some(item => typeof item !== 'string')) add('warning', 'entity-tags', `${entityPath}.tags`, 'Tags must be a string list.', true)
      if (!Array.isArray(entity.groups) || entity.groups.some(item => typeof item !== 'string')) add('warning', 'entity-groups', `${entityPath}.groups`, 'Groups must be a string list.', true)
      if (!['Scene', 'Prefab', 'Runtime'].includes(String(entity.ownership ?? 'Scene'))) add('error', 'entity-ownership', `${entityPath}.ownership`, 'Ownership policy is invalid.', true)
      if (!['Scene', 'Session', 'SaveGame', 'Transient'].includes(String(entity.runtimePersistence ?? 'Scene'))) add('error', 'runtime-persistence', `${entityPath}.runtimePersistence`, 'Runtime persistence policy is invalid.', true)
      if (entity.editorOnly === true && entity.runtimePersistence === 'SaveGame') add('warning', 'editor-only-persistence', `${entityPath}.runtimePersistence`, 'Editor-only objects cannot be written to player saves.', true)
      if (typeof entity.ownerUuid === 'string' && !sceneEntityIds.has(entity.ownerUuid.toLowerCase())) add('error', 'missing-owner', `${entityPath}.ownerUuid`, 'Owner entity does not exist in this scene.', true)
      const components = Array.isArray(entity.components) ? entity.components.filter(item => item && typeof item === 'object') as Array<Record<string, unknown>> : []
      const kinds = new Set(components.map(component => String(component.kind ?? '')))
      if (!kinds.has('Transform2D')) add('error', 'component-dependency', `${entityPath}.components`, 'Every entity requires Transform2D.', true)
      for (const [componentIndex, component] of components.entries()) {
        const componentPath = `${entityPath}.components[${componentIndex}]`, componentUuid = String(component.uuid ?? '').toLowerCase(), kind = String(component.kind ?? '')
        if (!UUID.test(componentUuid) || identities.has(componentUuid)) add('error', 'component-uuid', `${componentPath}.uuid`, 'Component UUID is invalid or duplicated.', true)
        else identities.add(componentUuid)
        if (!stableComponentKinds.has(kind)) add('warning', 'unknown-component', `${componentPath}.kind`, `Component ${kind || '<empty>'} is unavailable in this editor.`, false)
        if (stableComponentKinds.has(kind)) {
          const rule = componentAuthoringRule(kind as ComponentKind)
          for (const dependency of rule.required) if (!kinds.has(dependency)) add('error', 'component-dependency', `${componentPath}.kind`, `${kind} requires ${dependency}.`, true)
          for (const conflict of rule.conflicts) if (kinds.has(conflict)) add('error', 'component-conflict', `${componentPath}.kind`, `${kind} conflicts with ${conflict}.`, true)
        }
        if (component.enabled !== undefined && typeof component.enabled !== 'boolean') add('warning', 'component-enabled', `${componentPath}.enabled`, 'Component enabled state must be boolean.', true)
      }
      if (kinds.has('Area2D') && ![...kinds].some(kind => kind.endsWith('Collider2D'))) add('error', 'component-dependency', `${entityPath}.components`, 'Area2D requires a Collider2D component.', true)
      const transform = components.find(component => component.kind === 'Transform2D')?.data as Record<string, unknown> | undefined
      if (typeof transform?.parentUuid === 'string' && !sceneEntityIds.has(transform.parentUuid.toLowerCase())) add('error', 'missing-parent', `${entityPath}.components.Transform2D.parentUuid`, 'Hierarchy parent does not exist in this scene.', true)
      if (entity.ownership === 'Prefab' && typeof entity.prefabAsset !== 'string') add('error', 'prefab-ownership', `${entityPath}.prefabAsset`, 'Prefab-owned object has no prefab source.', true)
    }
    const parents = new Map<string, string>()
    for (const entity of entities) {
      const components = Array.isArray(entity.components) ? entity.components as Array<Record<string, unknown>> : []
      const transform = components.find(component => component.kind === 'Transform2D')?.data as Record<string, unknown> | undefined
      if (typeof entity.uuid === 'string' && typeof transform?.parentUuid === 'string') parents.set(entity.uuid.toLowerCase(), transform.parentUuid.toLowerCase())
    }
    for (const entityId of parents.keys()) {
      const visited = new Set<string>(), chain: string[] = []
      let current: string | undefined = entityId
      while (current && parents.has(current)) {
        if (visited.has(current)) { add('error', 'hierarchy-cycle', `${path}.entities`, `Hierarchy cycle: ${[...chain, current].join(' -> ')}.`, true); break }
        visited.add(current); chain.push(current); current = parents.get(current)
      }
    }
  }
  for (const sceneId of inheritance.keys()) {
    const visited = new Set<string>(), chain: string[] = []
    let current: string | undefined = sceneId
    while (current && inheritance.has(current)) {
      if (visited.has(current)) { add('error', 'scene-inheritance-cycle', 'scenes[].authoringSettings.inheritanceSourceUuid', `Scene inheritance cycle: ${[...chain, current].join(' -> ')}.`, true); break }
      visited.add(current); chain.push(current); current = inheritance.get(current)
    }
  }
  for (const [assetIndex, asset] of assets.entries()) {
    if (asset.assetType !== 'prefab') continue
    try {
      const document = JSON.parse(String(asset.source ?? '')) as Record<string, unknown>
      if (![1, 2].includes(Number(document.prefabVersion))) add('error', 'prefab-version', `assets[${assetIndex}].source`, 'Prefab source version is unsupported.', false)
      const bundle = document.bundle as Record<string, unknown> | undefined
      if (!bundle || !Array.isArray(bundle.entities) || !Array.isArray(bundle.rootUuids)) add('error', 'prefab-bundle', `assets[${assetIndex}].source`, 'Prefab source bundle is malformed.', false)
      if (document.prefabVersion === 2 && typeof document.sourceChecksum !== 'string') add('error', 'prefab-checksum', `assets[${assetIndex}].sourceChecksum`, 'Prefab v2 checksum is missing.', true)
      if (typeof document.variantOf === 'string' && !references(document.variantOf).has(document.variantOf.slice(document.variantOf.indexOf('://') + 3).toLowerCase())) add('warning', 'prefab-variant-source', `assets[${assetIndex}].variantOf`, 'Prefab variant source reference is malformed.', true)
    } catch { add('error', 'prefab-json', `assets[${assetIndex}].source`, 'Prefab source is not valid JSON.', false) }
  }
  for (const reference of references(project)) if (!knownAssets.has(reference)) add('error', 'missing-reference', 'asset://', `Missing asset ${reference}.`, false)
  return { valid: !issues.some(issue => issue.severity === 'error'), generatedAt: new Date().toISOString(), issues: issues.slice(0, 10_000), sceneCount: scenes.length, entityCount, assetCount: assets.length }
}

export function repairProjectDocument(source: string | unknown): ProjectRepairReport {
  const project = (typeof source === 'string' ? JSON.parse(source) : clone(source)) as Record<string, unknown>
  const changes: string[] = []
  const metadata = project.projectMetadata && typeof project.projectMetadata === 'object' ? project.projectMetadata as Record<string, unknown> : {}
  const projectUuid = UUID.test(String(metadata.id ?? '')) ? String(metadata.id) : crypto.randomUUID()
  metadata.id = projectUuid
  project.projectMetadata = metadata
  project.projectFormat = NOVA_PROJECT_FORMAT; project.projectFormatMajor = NOVA_PROJECT_FORMAT_MAJOR
  project.formatVersion = NOVA_PROJECT_SCHEMA_VERSION; project.engineVersion = NOVA_ENGINE_VERSION
  project.manifest = normalizeProjectManifest(project.manifest, { id: projectUuid, name: String(metadata.name ?? 'Untitled Project'), createdAt: String(metadata.createdAt ?? new Date().toISOString()), updatedAt: String(metadata.updatedAt ?? new Date().toISOString()), format: NOVA_PROJECT_FORMAT, template: String(metadata.template ?? 'imported') })
  changes.push('Normalized project identity, schema, engine metadata, and manifest.')
  for (const asset of Array.isArray(project.assets) ? project.assets as Array<Record<string, unknown>> : []) {
    asset.path = String(asset.path ?? 'Assets/Recovered.asset').replace(/\\/g, '/').split('/').filter(part => part && part !== '.' && part !== '..').join('/') || 'Assets/Recovered.asset'
    const source = String(asset.source ?? ''), hash = sha256Bytes(assetSourceBytes(source))
    const previous = asset.pipeline && typeof asset.pipeline === 'object' ? asset.pipeline as Record<string, unknown> : {}
    asset.pipeline = {
      ...previous,
      importerVersion: String(previous.importerVersion ?? 'repair-1'),
      platform: ['windows', 'linux', 'macos', 'web'].includes(String(previous.platform)) ? previous.platform : 'web',
      sourceHash: hash,
      artifactHash: hash,
      contentHash: hash,
      cacheKey: String(previous.cacheKey ?? hash),
      status: 'ready',
      lastValidSource: source,
      error: '',
      dependencies: Array.isArray(previous.dependencies) ? previous.dependencies : [],
      reverseDependencies: Array.isArray(previous.reverseDependencies) ? previous.reverseDependencies : [],
      cacheHit: previous.cacheHit === true
    }
  }
  for (const scene of Array.isArray(project.scenes) ? project.scenes as Array<Record<string, unknown>> : []) {
    scene.authoringSettings = normalizeSceneAuthoringSettings(scene.authoringSettings)
    for (const entity of Array.isArray(scene.entities) ? scene.entities as Array<Record<string, unknown>> : []) {
      entity.tags = Array.isArray(entity.tags) ? [...new Set(entity.tags.filter(item => typeof item === 'string').map(item => String(item).trim()).filter(Boolean))].slice(0, 64) : []
      entity.groups = Array.isArray(entity.groups) ? [...new Set(entity.groups.filter(item => typeof item === 'string').map(item => String(item).trim()).filter(Boolean))].slice(0, 64) : []
      entity.ownership = ['Scene', 'Prefab', 'Runtime'].includes(String(entity.ownership)) ? entity.ownership : 'Scene'
      entity.runtimePersistence = ['Scene', 'Session', 'SaveGame', 'Transient'].includes(String(entity.runtimePersistence)) ? entity.runtimePersistence : 'Scene'
      entity.editorOnly = entity.editorOnly === true
      if (entity.editorOnly && entity.runtimePersistence === 'SaveGame') entity.runtimePersistence = 'Transient'
      const components = Array.isArray(entity.components) ? entity.components as Array<Record<string, unknown>> : (entity.components = []) as Array<Record<string, unknown>>
      if (!components.some(component => component.kind === 'Transform2D')) components.unshift({ uuid: crypto.randomUUID(), kind: 'Transform2D', enabled: true, removed: false, data: { position: { x: 0, y: 0 }, scale: { x: 1, y: 1 }, rotation: 0, parentUuid: null } })
      if (components.some(component => component.kind === 'CharacterBody2D') && !components.some(component => component.kind === 'RigidBody2D')) components.push({ uuid: crypto.randomUUID(), kind: 'RigidBody2D', enabled: true, removed: false, data: {} })
      if (components.some(component => component.kind === 'Area2D') && !components.some(component => String(component.kind ?? '').endsWith('Collider2D'))) components.push({ uuid: crypto.randomUUID(), kind: 'BoxCollider2D', enabled: true, removed: false, data: {} })
    }
  }
  changes.push('Repaired unsafe paths and mandatory Transform2D, RigidBody2D, and Collider2D dependencies. Ambiguous identity/reference problems remain explicit for manual resolution.')
  const remaining = validateProjectDocument(project).issues
  return { source: project, changes, remaining }
}

export interface SceneDependencyNode { sceneUuid: string; name: string; dependencies: string[]; reverseDependencies: string[] }

export function buildSceneDependencyGraph(source: string | unknown): SceneDependencyNode[] {
  const project = (typeof source === 'string' ? JSON.parse(source) : source) as Record<string, unknown>
  const scenes = Array.isArray(project?.scenes) ? project.scenes.filter(item => item && typeof item === 'object') as Array<Record<string, unknown>> : []
  const sceneAssets = new Map((Array.isArray(project?.assets) ? project.assets : []).flatMap(raw => raw && typeof raw === 'object' && (raw as Record<string, unknown>).assetType === 'scene' ? [[String((raw as Record<string, unknown>).uuid).toLowerCase(), raw as Record<string, unknown>] as const] : []))
  const nodes = scenes.map(scene => {
    const found = [...references(scene)].filter(id => sceneAssets.has(id))
    return { sceneUuid: String(scene.uuid ?? ''), name: String(scene.name ?? 'Scene'), dependencies: [...new Set(found)].sort(), reverseDependencies: [] as string[] }
  })
  for (const node of nodes) for (const dependency of node.dependencies) {
    const targetScene = nodes.find(candidate => candidate.sceneUuid.toLowerCase() === dependency)
    if (targetScene) targetScene.reverseDependencies.push(node.sceneUuid)
  }
  nodes.forEach(node => node.reverseDependencies.sort())
  return nodes
}
