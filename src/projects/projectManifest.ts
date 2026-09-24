/** 项目清单处理：规范清单路径和版本信息，维护序列化及兼容判断。 */
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

/** 统一目录分隔符，移除空段及点目录并限制长度，空结果使用默认路径。 */ function safePath(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback
  const normalized = value.replace(/\\/g, '/').split('/').filter(/* 先计算 part && part !== '.'；仅当其为真值时求右侧 part !== '..'，返回短路求值结果。 */ part => part && part !== '.' && part !== '..').join('/')
  return normalized.slice(0, 240) || fallback
}

/** 按项目身份生成当前清单，固定包锁路径、默认目录、构建配置及引擎兼容范围。 */ function currentManifest(metadata: ProjectMetadata = projectSessionState): ProjectManifest {
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

/** 按当前项目身份规范化清单，迁移旧兼容上界并清理目录和构建预设。 */ export function normalizeProjectManifest(value: unknown, metadata: ProjectMetadata = projectSessionState): ProjectManifest {
  const source = value && typeof value === 'object' ? value as Partial<ProjectManifest> : {}
  const compatibility = source.engineCompatibility && typeof source.engineCompatibility === 'object' ? source.engineCompatibility : { minimum: '3.9.0', maximumExclusive: '27.0.0' }
  const directories = source.directories && typeof source.directories === 'object' ? source.directories : DEFAULT_PROJECT_DIRECTORIES
  const buildPresets = Array.isArray(source.buildPresets)
    ? [...new Set(source.buildPresets.filter(/* 比较 typeof item 与 'string'，返回严格相等的判断结果。 */ item => typeof item === 'string').map(/* 调用 safePath(item, '') 并返回调用结果。 */ item => safePath(item, '')).filter(Boolean))].slice(0, 64)
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
    // The format validator and every folder/transaction writer use this fixed path.
    packageLockfile: 'Packages.lock',
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

/** 执行时调用 Object.assign(projectManifestState, normalizeProjectManifest(value))；不显式返回调用结果。 */ export function hydrateProjectManifest(value: unknown): void {
  Object.assign(projectManifestState, normalizeProjectManifest(value))
}

/** 执行时调用 Object.assign(projectManifestState, currentManifest())；不显式返回调用结果。 */ export function resetProjectManifest(): void { Object.assign(projectManifestState, currentManifest()) }

/** 使用当前项目会话身份规范化并导出清单状态。 */ export function serializeProjectManifest(): ProjectManifest {
  return normalizeProjectManifest({ ...projectManifestState, projectUuid: projectSessionState.id, name: projectSessionState.name })
}

/** 读取版本字符串开头的三个十进制版本分量，不匹配时返回 null。 */ function semver(value: string): [number, number, number] | null {
  const match = value.match(/^(\d+)\.(\d+)\.(\d+)/)
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null
}

/* 先计算 left[0] - right[0] || left[1] - right[1]；仅当其为假值时求右侧 left[2] - right[2]，返回短路求值结果。 */ function compare(left: [number, number, number], right: [number, number, number]): number {
  return left[0] - right[0] || left[1] - right[1] || left[2] - right[2]
}

/** 检查版本范围格式、顺序及当前引擎是否满足边界，同时拒绝更高项目模式版本。 */ export function manifestCompatibility(manifest: ProjectManifest = projectManifestState): { compatible: boolean; reasons: string[] } {
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
