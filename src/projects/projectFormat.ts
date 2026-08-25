export const NOVA_ENGINE_VERSION = '5.0.1'
export const NOVA_PROJECT_FORMAT = 'Nova_A Project Format 2'
export const NOVA_PROJECT_FORMAT_MAJOR = 2
export const NOVA_PROJECT_SCHEMA_VERSION = 29
export const NOVA_MINIMUM_SCHEMA_VERSION = 5

export interface ProjectCompatibility {
  format: typeof NOVA_PROJECT_FORMAT
  major: typeof NOVA_PROJECT_FORMAT_MAJOR
  schemaVersion: number
  minimumSchemaVersion: number
}

export function projectCompatibility(): ProjectCompatibility {
  return {
    format: NOVA_PROJECT_FORMAT,
    major: NOVA_PROJECT_FORMAT_MAJOR,
    schemaVersion: NOVA_PROJECT_SCHEMA_VERSION,
    minimumSchemaVersion: NOVA_MINIMUM_SCHEMA_VERSION
  }
}
