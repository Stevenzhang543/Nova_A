import { reactive } from 'vue'

export type BuildTarget = 'windows' | 'linux' | 'macos' | 'web'
export type BuildArchitecture = 'x86_64'

export interface BuildSettings {
  gameName: string
  target: BuildTarget
  architecture: BuildArchitecture
  sceneOrder: string[]
  startupSceneUuid: string
  packageIntoExecutable: boolean
  developmentBuild: boolean
  outputDirectory: string
}

export interface BuildProgress {
  phase: 'idle' | 'validating' | 'packing' | 'exporting' | 'complete' | 'failed'
  message: string
  percent: number
  outputPath: string
}

export const buildSettings = reactive<BuildSettings>({
  gameName: 'MyGame',
  target: navigator.platform.toLowerCase().includes('win') ? 'windows' : navigator.platform.toLowerCase().includes('mac') ? 'macos' : 'linux',
  architecture: 'x86_64',
  sceneOrder: [],
  startupSceneUuid: '',
  packageIntoExecutable: false,
  developmentBuild: true,
  outputDirectory: ''
})

export const buildProgress = reactive<BuildProgress>({
  phase: 'idle', message: '', percent: 0, outputPath: ''
})

function safeName(value: unknown): string {
  const normalized = String(value ?? '').replace(/[<>:"/\\|?*\x00-\x1f]/g, '').trim().slice(0, 80)
  return normalized || 'MyGame'
}

export function normalizeBuildSettings(source: unknown, availableSceneUuids: string[]): BuildSettings {
  const item = source && typeof source === 'object' ? source as Partial<BuildSettings> : {}
  const available = new Set(availableSceneUuids)
  const ordered = Array.isArray(item.sceneOrder)
    ? item.sceneOrder.filter((uuid): uuid is string => typeof uuid === 'string' && available.has(uuid))
    : []
  for (const uuid of availableSceneUuids) if (!ordered.includes(uuid)) ordered.push(uuid)
  const startup = typeof item.startupSceneUuid === 'string' && available.has(item.startupSceneUuid)
    ? item.startupSceneUuid
    : ordered[0] ?? ''
  const target: BuildTarget = item.target === 'windows' || item.target === 'linux' || item.target === 'macos' || item.target === 'web'
    ? item.target
    : buildSettings.target
  return {
    gameName: safeName(item.gameName),
    target,
    architecture: 'x86_64',
    sceneOrder: ordered,
    startupSceneUuid: startup,
    packageIntoExecutable: item.packageIntoExecutable === true,
    developmentBuild: item.developmentBuild !== false,
    outputDirectory: typeof item.outputDirectory === 'string' ? item.outputDirectory.trim().slice(0, 1024) : ''
  }
}

export function synchronizeBuildScenes(availableSceneUuids: string[]): void {
  Object.assign(buildSettings, normalizeBuildSettings(buildSettings, availableSceneUuids))
}

export function serializeBuildSettings(): BuildSettings {
  return {
    gameName: safeName(buildSettings.gameName),
    target: buildSettings.target,
    architecture: 'x86_64',
    sceneOrder: [...buildSettings.sceneOrder],
    startupSceneUuid: buildSettings.startupSceneUuid,
    packageIntoExecutable: buildSettings.packageIntoExecutable,
    developmentBuild: buildSettings.developmentBuild,
    outputDirectory: buildSettings.outputDirectory.trim()
  }
}
