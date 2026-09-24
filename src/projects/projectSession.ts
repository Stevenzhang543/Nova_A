/** 项目身份与会话元数据：生成标识及名称，初始化、恢复和更新项目时间信息。 */
import { reactive } from 'vue'
import { NOVA_PROJECT_FORMAT } from './projectFormat'

export interface ProjectMetadata {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  format: string
  template: string
}

/** 优先生成标准随机 UUID，不可用时以当前时间生成兼容形状的回退标识。 */ function uuid(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, '0').slice(-12)}`
}

/* 调用 new Date().toISOString() 并返回调用结果。 */ function now(): string { return new Date().toISOString() }

export const projectSessionState = reactive<ProjectMetadata>({
  id: uuid(),
  name: 'Untitled Project',
  createdAt: now(),
  updatedAt: now(),
  format: NOVA_PROJECT_FORMAT,
  template: 'empty'
})

/** 创建具新身份、清理名称、统一时间及模板来源的项目元信息。 */ export function newProjectMetadata(name: string, template = 'empty'): ProjectMetadata {
  const timestamp = now()
  return {
    id: uuid(),
    name: safeProjectName(name),
    createdAt: timestamp,
    updatedAt: timestamp,
    format: NOVA_PROJECT_FORMAT,
    template
  }
}

/** 移除不适合文件名的字符和控制字符，压缩空白并限制八十字符，空名称使用默认值。 */ export function safeProjectName(value: unknown): string {
  const name = typeof value === 'string' ? value.trim().replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ') : ''
  return (name || 'Untitled Project').replace(/\s+/g, ' ').slice(0, 80)
}

let sessionGeneration = 0
/** Changes even when the same project is loaded again; not project data. */
/* 返回 sessionGeneration 的当前值。 */ export function getProjectSessionGeneration(): number { return sessionGeneration }

/** 递增会话代次并规范化导入元信息，将有效字段写入当前项目会话。 */ export function hydrateProjectMetadata(value: unknown): void {
  sessionGeneration += 1
  const source = value && typeof value === 'object' ? value as Partial<ProjectMetadata> : {}
  const timestamp = now()
  Object.assign(projectSessionState, {
    id: typeof source.id === 'string' && source.id.length <= 128 ? source.id : uuid(),
    name: safeProjectName(source.name),
    createdAt: typeof source.createdAt === 'string' ? source.createdAt : timestamp,
    updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : timestamp,
    format: NOVA_PROJECT_FORMAT,
    template: typeof source.template === 'string' ? source.template.slice(0, 40) : 'imported'
  })
}

/** 递增会话代次并应用新项目元信息，同时固定当前项目格式标识。 */ export function beginProjectSession(metadata: ProjectMetadata): void {
  sessionGeneration += 1
  Object.assign(projectSessionState, metadata, { format: NOVA_PROJECT_FORMAT })
}

/* 返回具有所列字段的新对象 { ...projectSessionState }。 */ export function serializeProjectMetadata(): ProjectMetadata {
  return { ...projectSessionState }
}

/** 将 now() 赋给 projectSessionState.updatedAt，不显式返回值。 */ export function touchProjectMetadata(): void { projectSessionState.updatedAt = now() }
