/** 项目预检：在加载前检查实体元数据与持久化字段值，阻止非法输入进入编辑状态。 */
import { validateComponentValues } from '../world/componentValidation'


/** Match full-project enum validation before direct entity construction mutates owners. */
/** 校验实体所有权与运行持久化策略枚举，非法值抛出含字段路径的错误。 */ export function validateEntityMetadataValues(entity: {ownership?: unknown; runtimePersistence?: unknown}, path = 'entity'): void {
  for (const [field, values] of [['ownership', ['Scene', 'Prefab', 'Runtime']], ['runtimePersistence', ['Scene', 'Session', 'SaveGame', 'Transient']]] as const) {
    const value = entity[field]
    if (value != null && !values.some(/* 比较 allowed 与 value，返回严格相等的判断结果。 */ allowed => allowed === value)) throw new Error(path + '.' + field + ': unsupported value ' + String(value))
  }
}

/** Reject structural/non-finite authoring errors before any project owner is hydrated. */
/** 遍历数据拒绝非有限数值，再检查场景、实体及组件结构并复用组件字段校验。 */ export function preflightProjectValues(project: Record<string, unknown>): void {
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
