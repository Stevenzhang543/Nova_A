export type PlatformGapStatus = 'closed' | 'intentional-scope' | 'deferred-external' | 'open-blocking'

export type PlatformGapArea =
  | 'contracts'
  | 'scripting'
  | 'debugging'
  | 'multiplayer'
  | 'extensions'
  | 'platforms'
  | 'accessibility'
  | 'performance'
  | 'release'
  | 'usability'
  | 'product-scope'

export interface PlatformGap {
  id: string
  area: PlatformGapArea
  title: string
  status: PlatformGapStatus
  currentBoundary: string
  decision: string
  evidence: readonly string[]
  owner: string
  target: string
}

function gap(entry: PlatformGap): Readonly<PlatformGap> {
  return Object.freeze({ ...entry, evidence: Object.freeze([...entry.evidence]) })
}

/**
 * The 26.10 register is a disposition ledger, not a marketing checklist.
 * `closed` means the named local boundary has executable evidence.
 * `intentional-scope` is a deliberate product or security boundary.
 * `deferred-external` is incomplete until independently attached evidence exists.
 * `open-blocking` prevents a local release candidate from being packaged.
 */
export const PLATFORM_GAP_REGISTER: readonly Readonly<PlatformGap>[] = Object.freeze([
  gap({
    id: 'contracts-seven-frozen-authorities', area: 'contracts', title: 'Seven stable contract authorities', status: 'closed',
    currentBoundary: 'Project Format 2/schema 29, Rhai API 2, Visual Graph 1, Plugin API 2, Package Manifest 1, Build CLI 1 and Workspace document 3 remain additive.',
    decision: 'Retain every contract for 26.10; a calendar release is not permission for a destructive migration.',
    evidence: ['src/runtime/stableContracts.ts', 'docs/STABLE_CREATOR_PLATFORM_26_10.md', 'scripts/verify-v26.10-readiness.mjs'],
    owner: 'Format and release engineering', target: '26.10 local qualification'
  }),
  gap({
    id: 'windows-web-local-delivery', area: 'platforms', title: 'Windows and Web local delivery', status: 'closed',
    currentBoundary: 'Windows editor/player and Web player have local build, package and smoke routes; publisher identity and independent machines are separate external gates.',
    decision: 'Keep Windows and Web as the only locally qualified Tier 1 targets.',
    evidence: ['src/runtime/platformSupport.ts', 'scripts/verify-v26.07-windows.mjs', 'docs/SUPPORT_MATRIX_26_10.md'],
    owner: 'Platform engineering', target: '26.10 local qualification'
  }),
  gap({
    id: 'package-native-execution-boundary', area: 'extensions', title: 'Package and native-code trust boundary', status: 'closed',
    currentBoundary: 'Package inspection is bounded and sandboxed; the package browser does not download or execute arbitrary native code.',
    decision: 'Keep native execution outside implicit package installation. Any future native adapter requires an explicit host installation and independent security review.',
    evidence: ['src/runtime/packages.ts', 'src/runtime/plugins.ts', 'docs/API_SDK_26_10.md'],
    owner: 'Extension security', target: 'Permanent safety boundary'
  }),
  gap({
    id: 'arbitrary-vm-suspension', area: 'debugging', title: 'Arbitrary Rhai VM suspension', status: 'intentional-scope',
    currentBoundary: 'The debugger stops and resumes at mapped lifecycle, callback and safe statement boundaries; it does not promise suspension at an arbitrary VM instruction.',
    decision: 'Prefer deterministic safe-point debugging over unsafe arbitrary interpreter suspension.',
    evidence: ['src/runtime/scriptDebug.ts', 'docs/LANGUAGE_DEBUGGING_26_03.md', 'docs/TROUBLESHOOTING_26_10.md'],
    owner: 'Language runtime', target: 'Revisit only with a deterministic VM continuation design'
  }),
  gap({
    id: 'static-rhai-type-system', area: 'scripting', title: 'Statically typed gameplay language', status: 'intentional-scope',
    currentBoundary: 'Rhai remains a dynamic language with bounded validation, generated API metadata, completion and optional inference; annotations do not turn it into a statically typed language.',
    decision: 'Retain Rhai API 2 and Visual Graph typed pins. Do not claim compile-time type guarantees that the runtime does not provide.',
    evidence: ['src/runtime/scriptContracts.ts', 'docs/RHAI_API_V2.md', 'docs/API_SDK_26_10.md'],
    owner: 'Language runtime', target: 'No contract change approved'
  }),
  gap({
    id: 'public-remote-debug-service', area: 'debugging', title: 'Public remote runtime debugging', status: 'intentional-scope',
    currentBoundary: 'External-editor and runtime inspection transports are authenticated and localhost-scoped. Nova_A does not expose a public remote debugging service.',
    decision: 'Keep the default attack surface local. A remote adapter would require transport authentication, authorization, revocation and hostile-network qualification.',
    evidence: ['src/runtime/scriptSettings.ts', 'src/runtime/scriptDebug.ts', 'docs/SUPPORT_MATRIX_26_10.md'],
    owner: 'Runtime security', target: 'Optional future adapter, not 26.10 core'
  }),
  gap({
    id: 'multi-instance-process-isolation', area: 'multiplayer', title: 'Embedded multi-player views', status: 'intentional-scope',
    currentBoundary: 'Multi-instance qualification launches isolated native player processes with distinct roles, identities, logs and lifecycles rather than embedding several players in one editor WebView.',
    decision: 'Keep process isolation because it reflects shipped-player behavior and contains faults. Label the workflow accurately as multi-instance launch, not embedded play.',
    evidence: ['src-tauri/src/lib.rs', 'scripts/verify-v26.07-process-regression.mjs', 'docs/SUPPORT_MATRIX_26_10.md'],
    owner: 'Multiplayer tooling', target: '26.10 documented boundary'
  }),
  gap({
    id: 'full-simulation-network-rollback', area: 'multiplayer', title: 'Full input/physics/script rollback', status: 'intentional-scope',
    currentBoundary: 'The current rollback path reconciles the supported replicated transform, rotation and velocity state. It does not claim arbitrary nonlinear Rhai side-effect replay.',
    decision: 'Keep unsupported side effects authoritative and explicit. A broader rollback contract requires deterministic input buffering, physics, script state and side-effect journals.',
    evidence: ['src/runtime/networkRollback.ts', 'docs/MULTIPLAYER_PRODUCTION_26_07.md', 'docs/TROUBLESHOOTING_26_10.md'],
    owner: 'Multiplayer runtime', target: 'Future protocol proposal; no 26.10 compatibility promise'
  }),
  gap({
    id: 'windowless-dedicated-server', area: 'multiplayer', title: 'Truly windowless dedicated server', status: 'intentional-scope',
    currentBoundary: 'Headless authority disables rendering inside the current WebView-backed player process; it is not a no-window native service runtime.',
    decision: 'Describe the shipped mode as renderer-disabled headless authority. Do not claim a windowless service binary.',
    evidence: ['src/runtime/networkProduction.ts', 'scripts/verify-v26.07-headless.mjs', 'docs/SUPPORT_MATRIX_26_10.md'],
    owner: 'Runtime platform', target: 'Future native service host, if justified'
  }),
  gap({
    id: 'mandatory-cloud-services', area: 'product-scope', title: 'Mandatory accounts, cloud, telemetry and managed services', status: 'intentional-scope',
    currentBoundary: 'Nova_A is local-first and offline-capable. It does not require accounts, telemetry, managed matchmaking, a hosted relay or anti-cheat.',
    decision: 'Keep optional adapters permission-gated and separately installed; never make network services a prerequisite for local authoring or play.',
    evidence: ['docs/API_SDK_26_10.md', 'docs/SUPPORT_MATRIX_26_10.md'],
    owner: 'Product and privacy', target: 'Permanent local-first default'
  }),
  gap({
    id: 'three-dimensional-production', area: 'product-scope', title: '3D, XR and ray-traced production', status: 'intentional-scope',
    currentBoundary: 'Nova_A is a focused 2D engine and editor. It does not ship a 3D scene, renderer, physics, XR or ray-tracing stack.',
    decision: 'Exclude these capabilities from 26.10 rather than dilute the lightweight 2D runtime.',
    evidence: ['docs/STABLE_CREATOR_PLATFORM_26_10.md', 'docs/SUPPORT_MATRIX_26_10.md'],
    owner: 'Product architecture', target: 'Out of scope'
  }),
  gap({
    id: 'proprietary-console-sdks', area: 'platforms', title: 'Proprietary console delivery', status: 'intentional-scope',
    currentBoundary: 'No proprietary console SDK, platform agreement, signing identity or certification kit is bundled.',
    decision: 'Console delivery requires a separately licensed adapter and cannot be represented as built-in support.',
    evidence: ['docs/SUPPORT_MATRIX_26_10.md'],
    owner: 'Platform partnerships', target: 'External licensed program only'
  }),
  gap({
    id: 'publisher-signing-identity', area: 'release', title: 'Publisher signing and identity', status: 'deferred-external',
    currentBoundary: 'Local packages can be hashed and inspected, but no private publisher key or trusted identity is available to this source-tree audit.',
    decision: 'Attach timestamped signing/notarization evidence without placing private keys in the repository.',
    evidence: ['pending-external/publisher-signing.json', 'docs/REPRODUCIBILITY_26_10.md'],
    owner: 'Release owner', target: 'Before a signed public distribution claim'
  }),
  gap({
    id: 'disposable-clean-machine-lifecycle', area: 'release', title: 'Independent clean-machine lifecycle', status: 'deferred-external',
    currentBoundary: 'The local source/build checks do not prove install, first launch, upgrade, repair and uninstall on an unrelated disposable machine.',
    decision: 'Execute the published checklist on an independent Windows machine and attach unedited logs and hashes.',
    evidence: ['pending-external/windows-clean-machine.json', 'docs/CLEAN_MACHINE_QUALIFICATION_26_10.md'],
    owner: 'Release QA', target: 'Before production-qualified installer claim'
  }),
  gap({
    id: 'second-machine-byte-reproduction', area: 'release', title: 'Second-machine byte reproduction', status: 'deferred-external',
    currentBoundary: 'Same-machine deterministic rebuilds do not prove byte identity on an independent host.',
    decision: 'Rebuild the same clean source identity and toolchain lock on a second machine, then compare every distributable SHA-256.',
    evidence: ['pending-external/second-machine-reproduction.json', 'docs/REPRODUCIBILITY_26_10.md'],
    owner: 'Release engineering', target: 'Before cross-machine reproducibility claim'
  }),
  gap({
    id: 'linux-matching-host', area: 'platforms', title: 'Linux matching-host qualification', status: 'deferred-external',
    currentBoundary: 'Source and pipeline definitions exist, but graphics, WebKitGTK, audio, input, package and lifecycle evidence is not attached from a Linux host.',
    decision: 'Keep Linux experimental until matching-host evidence passes.',
    evidence: ['pending-external/linux-clean-machine.json', 'docs/SUPPORT_MATRIX_26_10.md'],
    owner: 'Linux platform QA', target: 'Matching-host platform promotion review'
  }),
  gap({
    id: 'macos-matching-host', area: 'platforms', title: 'macOS matching-host qualification', status: 'deferred-external',
    currentBoundary: 'Xcode, hardware, architecture, signing, notarization, audio/input and lifecycle evidence is not attached.',
    decision: 'Keep macOS experimental until matching-host evidence passes.',
    evidence: ['pending-external/macos-clean-machine.json', 'docs/SUPPORT_MATRIX_26_10.md'],
    owner: 'macOS platform QA', target: 'Matching-host platform promotion review'
  }),
  gap({
    id: 'android-production-device', area: 'platforms', title: 'Android production device and store qualification', status: 'deferred-external',
    currentBoundary: 'The optional toolchain-gated export path does not prove production signing, clean-device install, sensors, input/audio hardware or store acceptance.',
    decision: 'Keep Android experimental and require the complete device/signing/store evidence set for promotion.',
    evidence: ['pending-external/android-device-matrix.json', 'docs/SUPPORT_MATRIX_26_10.md'],
    owner: 'Mobile platform QA', target: 'Optional platform promotion review'
  }),
  gap({
    id: 'ios-production-host', area: 'platforms', title: 'iOS matching-host delivery', status: 'deferred-external',
    currentBoundary: 'No current macOS/Xcode/device/signing/store evidence qualifies an iOS player.',
    decision: 'Keep iOS deferred; do not expose it as a locally buildable target.',
    evidence: ['pending-external/ios-matching-host.json', 'docs/SUPPORT_MATRIX_26_10.md'],
    owner: 'Mobile platform QA', target: 'Future matching-host program'
  }),
  gap({
    id: 'firefox-webkit-browser-matrix', area: 'platforms', title: 'Independent Firefox and WebKit player matrix', status: 'deferred-external',
    currentBoundary: 'The pinned local Chromium route does not by itself qualify Firefox or WebKit.',
    decision: 'Attach hosted-player input/audio/render/storage/lifecycle evidence from each browser before adding a Tier 1 claim.',
    evidence: ['pending-external/browser-matrix.json', 'docs/SUPPORT_MATRIX_26_10.md'],
    owner: 'Web runtime QA', target: 'Browser matrix promotion review'
  }),
  gap({
    id: 'native-assistive-technology', area: 'accessibility', title: 'Native screen-reader and assistive-technology observation', status: 'deferred-external',
    currentBoundary: 'DOM/ARIA snapshots and keyboard checks are local evidence; they do not substitute for observation with native assistive technology.',
    decision: 'Run the independent screen-reader, magnification, switch and high-contrast protocol and attach findings.',
    evidence: ['pending-external/native-accessibility-study.json', 'docs/INDEPENDENT_USABILITY_26_10.md'],
    owner: 'Accessibility QA', target: 'Before native accessibility certification'
  }),
  gap({
    id: 'independent-beginner-expert-study', area: 'usability', title: 'Independent beginner and expert usability observation', status: 'deferred-external',
    currentBoundary: 'Automated control traversal and maintainer testing cannot establish that independent users understand and complete the workflows.',
    decision: 'Observe beginners following the manual and experts using keyboard-first production workflows; preserve raw notes and task outcomes.',
    evidence: ['pending-external/independent-usability.json', 'docs/INDEPENDENT_USABILITY_26_10.md'],
    owner: 'User research', target: 'Before final usability qualification claim'
  }),
  gap({
    id: 'real-low-end-hardware', area: 'performance', title: 'Real low-end hardware performance', status: 'deferred-external',
    currentBoundary: 'Synthetic profiles and local benchmarks do not prove input-to-pixel latency, frame pacing and memory behavior on the published minimum device.',
    decision: 'Capture the published scenarios on independently identified low-end hardware without disabling features, visuals or animations.',
    evidence: ['pending-external/low-end-hardware.json', 'docs/SUPPORT_MATRIX_26_10.md'],
    owner: 'Performance QA', target: 'Before minimum-system performance certification'
  }),
  gap({
    id: 'public-relay-hostile-network', area: 'multiplayer', title: 'Public relay, NAT and hostile-network qualification', status: 'deferred-external',
    currentBoundary: 'Local transport, simulation and security hooks do not prove a hosted relay, broad NAT traversal or internet-scale hostile-network operation.',
    decision: 'Keep public relay infrastructure optional and external; attach provider-specific security, privacy, abuse and recovery evidence if offered.',
    evidence: ['pending-external/public-network-matrix.json', 'docs/SUPPORT_MATRIX_26_10.md'],
    owner: 'Networking and security QA', target: 'Optional service qualification'
  }),
  gap({
    id: 'independent-security-review', area: 'extensions', title: 'Independent package, plugin and updater security review', status: 'deferred-external',
    currentBoundary: 'Local malformed-input, permission, hash, signature and sandbox checks are not an independent security assessment.',
    decision: 'Commission an independent review and keep every finding visible until remediated or explicitly accepted.',
    evidence: ['pending-external/security-review.json', 'docs/API_SDK_26_10.md'],
    owner: 'Security review owner', target: 'Before third-party ecosystem production certification'
  }),
  gap({
    id: 'ecosystem-production-adoption', area: 'extensions', title: 'Independent ecosystem and production adoption', status: 'deferred-external',
    currentBoundary: 'Bundled package/reference fixtures prove local mechanics, not ecosystem size, maintainer quality or independent production use.',
    decision: 'Measure independently authored packages and shipped projects before claiming ecosystem parity with established engines.',
    evidence: ['pending-external/ecosystem-observation.json', 'docs/INDEPENDENT_USABILITY_26_10.md'],
    owner: 'Ecosystem program', target: 'Post-release observation window'
  }),
  gap({
    id: 'seventy-two-hour-soak', area: 'performance', title: 'Real 72-hour stability soak', status: 'deferred-external',
    currentBoundary: 'Bounded cycle and accelerated stability tests are not a wall-clock 72-hour run.',
    decision: 'Run the unchanged release candidate for 72 continuous hours with memory, faults, save/reload and recovery evidence.',
    evidence: ['pending-external/72-hour-soak.json', 'docs/REPRODUCIBILITY_26_10.md'],
    owner: 'Stability QA', target: 'Before long-duration stability certification'
  })
])

export const PLATFORM_GAP_STATUSES: readonly PlatformGapStatus[] = Object.freeze(['closed', 'intentional-scope', 'deferred-external', 'open-blocking'])

export const PLATFORM_GAP_SUMMARY = Object.freeze({
  total: PLATFORM_GAP_REGISTER.length,
  closed: PLATFORM_GAP_REGISTER.filter(item => item.status === 'closed').length,
  intentionalScope: PLATFORM_GAP_REGISTER.filter(item => item.status === 'intentional-scope').length,
  deferredExternal: PLATFORM_GAP_REGISTER.filter(item => item.status === 'deferred-external').length,
  openBlocking: PLATFORM_GAP_REGISTER.filter(item => item.status === 'open-blocking').length
})

export function platformGap(id: string): Readonly<PlatformGap> | undefined {
  return PLATFORM_GAP_REGISTER.find(item => item.id === id)
}

export function blockingPlatformGaps(): readonly Readonly<PlatformGap>[] {
  return PLATFORM_GAP_REGISTER.filter(item => item.status === 'open-blocking')
}
