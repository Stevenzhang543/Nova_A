export type PlatformSupportTier = 'tier-1' | 'tier-2' | 'experimental' | 'unsupported'

export interface PlatformSupportEntry {
  id: 'windows' | 'web' | 'linux' | 'macos' | 'android'
  label: string
  tier: PlatformSupportTier
  architectures: readonly ('x86_64' | 'aarch64')[]
  editor: boolean
  runtime: boolean
  referenceMatrixPassed: boolean
  availability: 'available' | 'ci-only' | 'unavailable'
  buildHosts: readonly ('windows' | 'linux' | 'macos' | 'web')[]
  minimumSystem: string
  evidence: string
  lastQualified: string
  reason: string
}
/**
 * The support table is a release contract. A platform must not be promoted
 * without changing this record and attaching the named qualification evidence.
 */
export const PLATFORM_SUPPORT_MATRIX: readonly PlatformSupportEntry[] = Object.freeze([
  Object.freeze({ id: 'windows', label: 'Windows', tier: 'tier-1', architectures: ['x86_64'] as const, editor: true, runtime: true, referenceMatrixPassed: true, availability: 'available', buildHosts: ['windows'] as const, minimumSystem: 'Windows 10 1809, WebView2, x86-64', evidence: 'release-audits/evidence-v5.0.1/platform/windows.json', lastQualified: '5.0.1-local-candidate', reason: 'Tier-1 editor, player, portable, MSI, setup and web-hosting workflows are locally qualified; signing and disposable clean-machine lifecycle remain named external gates.' }),
  Object.freeze({ id: 'web', label: 'Web', tier: 'tier-1', architectures: ['x86_64'] as const, editor: false, runtime: true, referenceMatrixPassed: true, availability: 'available', buildHosts: ['windows', 'linux', 'macos', 'web'] as const, minimumSystem: 'WebAssembly, ES2022 and WebGL2-capable browser', evidence: 'release-audits/evidence-v5.0.1/platform/web.json', lastQualified: '5.0.1-local-candidate', reason: 'Tier-1 exported player. The pinned Chromium path is local evidence; Firefox and WebKit remain explicit matrix jobs until their artifacts are attached.' }),
  Object.freeze({ id: 'linux', label: 'Linux', tier: 'experimental', architectures: ['x86_64'] as const, editor: true, runtime: true, referenceMatrixPassed: false, availability: 'ci-only', buildHosts: ['linux'] as const, minimumSystem: 'Recent x86-64 distribution with WebKitGTK 4.1', evidence: 'external/linux-clean-machine.json', lastQualified: 'pending', reason: 'Matching-host export is exposed for CI but cannot be promoted until driver, audio, input, package and clean-machine evidence passes.' }),
  Object.freeze({ id: 'macos', label: 'macOS', tier: 'experimental', architectures: ['x86_64', 'aarch64'] as const, editor: true, runtime: true, referenceMatrixPassed: false, availability: 'ci-only', buildHosts: ['macos'] as const, minimumSystem: 'macOS 12 or later on matching architecture', evidence: 'external/macos-clean-machine.json', lastQualified: 'pending', reason: 'Matching-host export is exposed for CI. Dedicated hardware, signing, notarization, audio and regression evidence are still required.' }),
  Object.freeze({ id: 'android', label: 'Android', tier: 'experimental', architectures: ['aarch64'] as const, editor: false, runtime: false, referenceMatrixPassed: false, availability: 'unavailable', buildHosts: [] as const, minimumSystem: 'Not declared', evidence: 'external/mobile-export-matrix.json', lastQualified: 'pending', reason: 'Mobile stays Experimental and explicitly unavailable until the complete SDK, template, signing, install and runtime matrix passes.' })
])

export function platformSupport(id: string): PlatformSupportEntry {
  return PLATFORM_SUPPORT_MATRIX.find(item => item.id === id) ?? PLATFORM_SUPPORT_MATRIX[4]
}

export function selectableBuildPlatforms(): PlatformSupportEntry[] {
  return PLATFORM_SUPPORT_MATRIX.filter(item => item.availability !== 'unavailable' && item.tier !== 'experimental')
}

export function platformTierLabel(tier: PlatformSupportTier): string {
  return tier === 'tier-1' ? 'Production qualified' : tier === 'tier-2' ? 'Qualified with target limitations' : tier === 'experimental' ? 'Experimental' : 'Unsupported'
}
