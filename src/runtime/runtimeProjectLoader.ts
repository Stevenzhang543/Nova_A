/** Detached project decoding. This module neither initializes WASM nor commits scenes, assets or Editor state. */
import { NOVA_ENGINE_VERSION, NOVA_PROJECT_FORMAT, NOVA_PROJECT_FORMAT_MAJOR, NOVA_PROJECT_SCHEMA_VERSION } from '../projects/projectFormat'
import { preflightProjectValues } from '../projects/projectPreflight'
import { assertRuntimePakActive, parseRuntimeNovaPak, projectJsonFromParsedNovaPak, validateRuntimePakJsonScalars } from './novaPakReader'
import type { NovaPakIndex, RuntimePakCapabilities, RuntimePakLimits } from './novaPakReader'

export interface InitializedProjectFormatCapabilities {
  migrateProjectJson(source: string): string
  currentFormatVersion(): number
  engineVersion(): string
}

export interface RuntimeProjectValidationCapabilities {
  storedShapeType(item: Record<string, unknown>): string | undefined
  message(key: 'invalidProjectRoot' | 'unsupportedShape', parameters?: Record<string, string | number>): string
}

export interface PreparedRuntimeProjectValues {
  source: string
  project: Record<string, unknown>
  migrationPerformed: boolean
  packageIndex?: NovaPakIndex
}

function bindProjectCapabilities(suppliedMigration: InitializedProjectFormatCapabilities, suppliedValidation: RuntimeProjectValidationCapabilities) {
  if (!suppliedMigration || typeof suppliedMigration.migrateProjectJson !== 'function' || typeof suppliedMigration.currentFormatVersion !== 'function' || typeof suppliedMigration.engineVersion !== 'function') throw new Error('RUNTIME_PROJECT_MIGRATION_REQUIRED: Supply the actual initialized matching Rust format capability.')
  if (!suppliedValidation || typeof suppliedValidation.storedShapeType !== 'function' || typeof suppliedValidation.message !== 'function') throw new Error('RUNTIME_PROJECT_VALIDATION_REQUIRED: Supply the actual shared entity shape and message capabilities.')
  const migrateProjectJson = suppliedMigration.migrateProjectJson.bind(suppliedMigration)
  const currentFormatVersion = suppliedMigration.currentFormatVersion.bind(suppliedMigration)
  const engineVersion = suppliedMigration.engineVersion.bind(suppliedMigration)
  const storedShapeType = suppliedValidation.storedShapeType.bind(suppliedValidation), message = suppliedValidation.message.bind(suppliedValidation)
  if (currentFormatVersion() !== NOVA_PROJECT_SCHEMA_VERSION || engineVersion() !== NOVA_ENGINE_VERSION) throw new Error('RUNTIME_PROJECT_FORMAT_MISMATCH: Initialized Rust format capability does not match this Runtime.')
  return { migrateProjectJson, storedShapeType, message }
}

function decodeWithBoundCapabilities(source: string, capabilities: ReturnType<typeof bindProjectCapabilities>): PreparedRuntimeProjectValues {
  const { migrateProjectJson, storedShapeType, message } = capabilities
  const preliminary: unknown = JSON.parse(source)
  validateRuntimePakJsonScalars(preliminary)
  const preliminaryRecord = !Array.isArray(preliminary) && preliminary && typeof preliminary === 'object' ? preliminary as Record<string, unknown> : null
  const sourceSchema = Number(preliminaryRecord?.formatVersion)
  if (Number.isFinite(sourceSchema) && sourceSchema > NOVA_PROJECT_SCHEMA_VERSION) throw new Error(`Project schema ${sourceSchema} is newer than supported schema ${NOVA_PROJECT_SCHEMA_VERSION}.`)
  const isCurrent = preliminaryRecord?.projectFormat === NOVA_PROJECT_FORMAT && Number(preliminaryRecord.projectFormatMajor) === NOVA_PROJECT_FORMAT_MAJOR && sourceSchema === NOVA_PROJECT_SCHEMA_VERSION
  const preparedSource = isCurrent ? source : migrateProjectJson(source)
  const parsed: unknown = isCurrent ? preliminary : JSON.parse(preparedSource)
  const root = Array.isArray(parsed) ? { entities: parsed } : parsed
  if (!root || typeof root !== 'object') throw new Error(message('invalidProjectRoot'))
  const project = root as Record<string, unknown>
  preflightProjectValues(project)
  const preflightScenes = Array.isArray(project.scenes) ? project.scenes : [project]
  for (const scene of preflightScenes) for (const entity of (scene as { entities: Array<Record<string, unknown>> }).entities) {
    const shape = storedShapeType(entity)
    if (shape !== 'Circle' && shape !== 'Box' && shape !== 'Triangle') throw new Error(message('unsupportedShape', { shape: String(shape) }))
  }
  return { source: preparedSource, project, migrationPerformed: !isCurrent }
}

export function decodeRuntimeProjectSource(source: string, suppliedMigration: InitializedProjectFormatCapabilities, suppliedValidation: RuntimeProjectValidationCapabilities): PreparedRuntimeProjectValues {
  return decodeWithBoundCapabilities(source, bindProjectCapabilities(suppliedMigration, suppliedValidation))
}

export async function loadRuntimeProjectFromNovaPak(source: ArrayBuffer | Uint8Array, capabilities: RuntimePakCapabilities, limits: RuntimePakLimits, migration: InitializedProjectFormatCapabilities, validation: RuntimeProjectValidationCapabilities, signal?: AbortSignal): Promise<PreparedRuntimeProjectValues> {
  assertRuntimePakActive(signal)
  const bound = bindProjectCapabilities(migration, validation)
  const parsed = await parseRuntimeNovaPak(source, capabilities, limits, signal)
  assertRuntimePakActive(signal)
  const result = decodeWithBoundCapabilities(projectJsonFromParsedNovaPak(parsed), bound)
  assertRuntimePakActive(signal)
  return { ...result, packageIndex: parsed.index }
}
