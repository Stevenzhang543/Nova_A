/** 平台支持信息：描述运行目标的能力、约束及可用交付方式。 */
export type PlatformSupportTier = 'tier-1' | 'tier-2' | 'experimental' | 'unsupported'

export interface PlatformSupportEntry {
  id: 'windows' | 'web' | 'linux' | 'macos' | 'android' | 'unknown'
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
  Object.freeze({ id: 'windows', label: 'Windows', tier: 'tier-1', architectures: ['x86_64'] as const, editor: true, runtime: true, referenceMatrixPassed: true, availability: 'available', buildHosts: ['windows'] as const, minimumSystem: 'x86-64; maintained Windows 10/11 and Evergreen WebView2. Historical binary floor: Windows 10 1809; oldest-machine qualification pending.', evidence: 'release-audits/evidence-v5.7.0/platform/windows.json', lastQualified: '5.7.0-local-candidate', reason: 'Tier-1 editor, player, single-file portable, MSI, setup and web-hosting workflows are locally qualified; signing and disposable clean-machine lifecycle remain named external gates.' }),
  Object.freeze({ id: 'web', label: 'Web', tier: 'tier-1', architectures: ['x86_64', 'aarch64'] as const, editor: true, runtime: true, referenceMatrixPassed: true, availability: 'available', buildHosts: ['windows', 'linux', 'macos', 'web'] as const, minimumSystem: 'WebAssembly + ES2022 browser; WebGL2 for accelerated effects, Canvas fallback with feature limits; HTTPS for PWA; mobile landscape.', evidence: 'release-audits/evidence-v5.7.0/platform/web.json', lastQualified: '5.7.0-local-candidate', reason: 'Static editor and exported player use architecture-neutral WebAssembly. Pinned Chromium is local evidence; Firefox/WebKit and ARM/mobile devices still require actual target qualification.' }),
  Object.freeze({ id: 'linux', label: 'Linux', tier: 'experimental', architectures: ['x86_64'] as const, editor: true, runtime: true, referenceMatrixPassed: false, availability: 'ci-only', buildHosts: ['linux'] as const, minimumSystem: 'Recent x86-64 distribution with WebKitGTK 4.1', evidence: 'external/linux-clean-machine.json', lastQualified: 'pending', reason: 'Matching-host export is exposed for CI but cannot be promoted until driver, audio, input, package and clean-machine evidence passes.' }),
  Object.freeze({ id: 'macos', label: 'macOS', tier: 'experimental', architectures: ['x86_64', 'aarch64'] as const, editor: true, runtime: true, referenceMatrixPassed: false, availability: 'ci-only', buildHosts: ['macos'] as const, minimumSystem: 'macOS 12 or later on matching architecture', evidence: 'external/macos-clean-machine.json', lastQualified: 'pending', reason: 'Matching-host export is exposed for CI. Dedicated hardware, signing, notarization, audio and regression evidence are still required.' }),
  Object.freeze({ id: 'android', label: 'Android', tier: 'experimental', architectures: ['aarch64'] as const, editor: false, runtime: true, referenceMatrixPassed: false, availability: 'available', buildHosts: ['windows', 'linux', 'macos'] as const, minimumSystem: 'Android 10+, aarch64; local JDK 17, SDK 35, build-tools, NDK 27 and validated template', evidence: 'external/mobile-export-matrix.json', lastQualified: '6.7.0-local-toolchain-gated', reason: 'Optional Android authoring/build/deploy is exposed with live toolchain gates. Production signing, clean-device lifecycle, input/audio hardware and store review remain explicit external qualification gates.' })
])

const UNKNOWN_PLATFORM: PlatformSupportEntry = Object.freeze({ id: 'unknown', label: 'Unknown platform', tier: 'unsupported', architectures: [] as const, editor: false, runtime: false, referenceMatrixPassed: false, availability: 'unavailable', buildHosts: [] as const, minimumSystem: 'No supported target selected', evidence: '', lastQualified: 'never', reason: 'Select an explicitly registered export target; unknown identifiers cannot inherit Android capabilities.' })

/** 查询已登记的平台，未知标识使用不可构建的明确记录而非借用 Android。 */ export function platformSupport(id: string): PlatformSupportEntry {
  return PLATFORM_SUPPORT_MATRIX.find(/* 比较 item.id 与 id，返回严格相等的判断结果。 */ item => item.id === id) ?? UNKNOWN_PLATFORM
}

/** 结构说明（自动提取）：selectableBuildPlatforms；无显式参数；直接调用 PLATFORM_SUPPORT_MATRIX.filter。 */ export function selectableBuildPlatforms(host?: string): PlatformSupportEntry[] {
  return PLATFORM_SUPPORT_MATRIX.filter(/* 比较 item.availability 与 'available'，返回严格相等的判断结果。 */ item => item.availability === 'available' || item.availability === 'ci-only' && item.buildHosts.some(/** 只在匹配宿主展示尚待外部验收的桌面目标。 */ buildHost => buildHost === host))
}

/** 结构说明（自动提取）：platformTierLabel；输入 tier。 */ export function platformTierLabel(tier: PlatformSupportTier): string {
  return tier === 'tier-1' ? 'Production qualified' : tier === 'tier-2' ? 'Qualified with target limitations' : tier === 'experimental' ? 'Experimental' : 'Unsupported'
}
