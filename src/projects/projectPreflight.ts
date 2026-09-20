import { validateComponentValues } from '../world/componentValidation'


/** Match full-project enum validation before direct entity construction mutates owners. */
export function validateEntityMetadataValues(entity: {ownership?: unknown; runtimePersistence?: unknown}, path = 'entity'): void {
  for (const [field, values] of [['ownership', ['Scene', 'Prefab', 'Runtime']], ['runtimePersistence', ['Scene', 'Session', 'SaveGame', 'Transient']]] as const) {
    const value = entity[field]
    if (value != null && !values.some(allowed => allowed === value)) throw new Error(path + '.' + field + ': unsupported value ' + String(value))
  }
}

/** Reject structural/non-finite authoring errors before any project owner is hydrated. */
export function preflightProjectValues(project: Record<string, unknown>): void {
  const pending: Array<{value: unknown; path: string}> = [{value: project, path: '$'}]
  while (pending.length) {
    const {value, path} = pending.pop()!
    if (typeof value === 'number' && !Number.isFinite(value)) throw new Error(`${path}: expected a finite number.`)
    if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) pending.push({value: child, path: `${path}.${key}`})
    }
  }
  const scenes = Array.isArray(project.scenes) ? project.scenes : [project]
  for (const [index, scene] of scenes.entries()) {
    const path = `$.scenes[${index}]`
    if (!scene || typeof scene !== 'object' || Array.isArray(scene)) throw new Error(`${path}: expected a scene object.`)
    const entities = (scene as Record<string, unknown>).entities
    if (!Array.isArray(entities)) throw new Error(`${path}.entities: expected an array.`)
    for (const [entityIndex, entity] of entities.entries()) {
      const entityPath = `${path}.entities[${entityIndex}]`
      if (!entity || typeof entity !== 'object' || Array.isArray(entity)) throw new Error(`${entityPath}: expected an entity object.`)
      validateEntityMetadataValues(entity, entityPath)
      if (Array.isArray(entity.components)) for (const [componentIndex, component] of entity.components.entries()) {
        if (!component || typeof component !== 'object' || Array.isArray(component)) throw new Error(`${entityPath}.components[${componentIndex}]: expected a component object.`)
        if (component.data != null) {
          if (typeof component.data !== 'object' || Array.isArray(component.data)) throw new Error(`${entityPath}.components[${componentIndex}].data: expected an object.`)
          validateComponentValues(String(component.kind), component.data, `${entityPath}.components[${componentIndex}].data`)
        }
      }
    }
  }
}
