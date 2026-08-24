export type PlatformSupportTier = 'tier-1' | 'tier-2' | 'experimental' | 'unsupported'

export interface PlatformSupportEntry {
  id: 'windows' | 'web' | 'linux' | 'macos' | 'android'
  label: string
  tier: PlatformSupportTier
  architectures: readonly ('x86_64' | 'aarch64')[]
  editor: boolean
  runtime: boolean
  referenceMatrixPassed: boolean
  reason: string
}

/**
 * The support table is a release contract. A platform must not be promoted
 * without changing this record and attaching the named qualification evidence.
 */
export const PLATFORM_SUPPORT_MATRIX: readonly PlatformSupportEntry[] = Object.freeze([
  Object.freeze({ id: 'windows', label: 'Windows', tier: 'tier-1', architectures: ['x86_64'] as const, editor: true, runtime: true, referenceMatrixPassed: true, reason: 'Windows x86-64 editor/runtime and installer matrix passed for the stable 4.x contract; v4.1 evidence records current local and external gates.' }),
  Object.freeze({ id: 'web', label: 'Web', tier: 'tier-1', architectures: ['x86_64'] as const, editor: false, runtime: true, referenceMatrixPassed: true, reason: 'Chromium, Firefox and WebKit runtime reference matrix passed for the stable 4.x contract; v4.1 evidence records the current browser run.' }),
  Object.freeze({ id: 'linux', label: 'Linux', tier: 'experimental', architectures: ['x86_64'] as const, editor: true, runtime: true, referenceMatrixPassed: false, reason: 'Promotion waits for clean-machine driver, audio, input and export evidence.' }),
  Object.freeze({ id: 'macos', label: 'macOS', tier: 'experimental', architectures: ['x86_64', 'aarch64'] as const, editor: true, runtime: true, referenceMatrixPassed: false, reason: 'Promotion waits for dedicated hardware, signing, notarization and regression capacity.' }),
  Object.freeze({ id: 'android', label: 'Android', tier: 'unsupported', architectures: ['aarch64'] as const, editor: false, runtime: false, referenceMatrixPassed: false, reason: 'Mobile and console targets are deferred until after Nova_A 4.0.' })
])

export function platformSupport(id: string): PlatformSupportEntry {
  return PLATFORM_SUPPORT_MATRIX.find(item => item.id === id) ?? PLATFORM_SUPPORT_MATRIX[4]
}

export function selectableBuildPlatforms(): PlatformSupportEntry[] {
  return PLATFORM_SUPPORT_MATRIX.filter(item => item.tier !== 'unsupported')
}

export function platformTierLabel(tier: PlatformSupportTier): string {
  return tier === 'tier-1' ? 'Production qualified' : tier === 'tier-2' ? 'Qualified with target limitations' : tier === 'experimental' ? 'Experimental' : 'Unsupported'
}
