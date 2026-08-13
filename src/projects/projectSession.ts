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

function uuid(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, '0').slice(-12)}`
}

function now(): string { return new Date().toISOString() }

export const projectSessionState = reactive<ProjectMetadata>({
  id: uuid(),
  name: 'Untitled Project',
  createdAt: now(),
  updatedAt: now(),
  format: NOVA_PROJECT_FORMAT,
  template: 'empty'
})

export function newProjectMetadata(name: string, template = 'empty'): ProjectMetadata {
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

export function safeProjectName(value: unknown): string {
  const name = typeof value === 'string' ? value.trim().replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ') : ''
  return (name || 'Untitled Project').replace(/\s+/g, ' ').slice(0, 80)
}

export function hydrateProjectMetadata(value: unknown): void {
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

export function beginProjectSession(metadata: ProjectMetadata): void {
  Object.assign(projectSessionState, metadata, { format: NOVA_PROJECT_FORMAT })
}

export function serializeProjectMetadata(): ProjectMetadata {
  return { ...projectSessionState }
}

export function touchProjectMetadata(): void { projectSessionState.updatedAt = now() }
