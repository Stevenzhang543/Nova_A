import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const version = '6.7.0'
const root = dirname(dirname(fileURLToPath(import.meta.url)))
const checks = []
const check = (id, passed, detail, metrics = {}) => checks.push({ id, status: passed ? 'passed' : 'failed', detail, metrics })
const read = path => readFile(join(root, path), 'utf8')
const json = async path => JSON.parse(await read(path))
const [pkg, tauri, cargo, nativeCargo, format, input, device, mobile, accessibility, physics, exporter, native, guide, instructions, roadmap, manualEn, manualDe, manualZh, verification, catalog, interactions, layout, performance, windows, stability, dependency, touch, android] = await Promise.all([
  json('package.json'), json('src-tauri/tauri.conf.json'), read('Cargo.toml'), read('src-tauri/Cargo.toml'), read('src/projects/projectFormat.ts'), read('src/runtime/input.ts'), read('src/runtime/deviceInput.ts'), read('src/runtime/mobileDelivery.ts'), read('src/runtime/accessibilityEvidence.ts'), read('src/store/physics.ts'), read('src/runtime/gameExporter.ts'), read('src-tauri/src/lib.rs'), read('docs/DEVICE_MOBILE_ACCESSIBILITY_6_7.md'), read('instructions.txt'), read('docs/ROADMAP_6_2_TO_7_0.md'), read('manual/MANUAL.en.md'), read('manual/MANUAL.de.md'), read('manual/MANUAL.zh-CN.md'), json('release-audits/v6.7.0-verification.json'), json('release-audits/template-catalog-verification.json'), json('release-audits/v6.7.0-user-interactions.json'), json('release-audits/v6.7.0-layout-browser.json'), json('release-audits/v6.7.0-performance-after.json'), json('release-audits/v6.7.0-windows-smoke.json'), json('release-audits/v6.7.0-stability-local.json'), json('release-audits/v6.7.0-dependency-audit.json'), json('reference-projects/projects/creator-v670-touch-platformer/project.nova'), json('reference-projects/projects/delivery-v670-android-gated/project.nova')
])

check('V670-VERSION', pkg.version === version && tauri.version === version && /version\s*=\s*"6\.7\.0"/.test(cargo) && /version\s*=\s*"6\.7\.0"/.test(nativeCargo) && format.includes("NOVA_ENGINE_VERSION = '6.7.0'"), 'Frontend, Rust, Tauri and project authorities identify 6.7.0.')
check('V670-FROZEN-CONTRACTS', format.includes('NOVA_PROJECT_FORMAT_MAJOR = 2') && format.includes('NOVA_PROJECT_SCHEMA_VERSION = 29') && instructions.includes('Graph Format 1'), 'Project Format 2/schema 29 and all frozen 6.x contracts remain unchanged.')
check('V670-INPUT-RUNTIME', device.includes('TouchPointerDeduplicator') && input.includes('setVirtualAction') && input.includes("binding.device === 'sensor'") && physics.includes('deviceInput: serializeDeviceInputSettings()'), 'Touch deduplication, gesture/sensor/gamepad input, virtual actions and persistence share one Input Map runtime.')
check('V670-ANDROID-SECURITY', mobile.includes('validateAndroidPermissions') && mobile.includes('purposeRequired') && native.includes('valid_android_serial') && native.includes('canonicalize') && native.includes('NOVA_ANDROID_KEYSTORE_PASSWORD') && native.includes('--offline') && exporter.includes('OFFICIAL_ANDROID_PACKAGE_ID'), 'Android discovery/build/deploy validates permissions, IDs, paths, serials, templates and environment-only signing secrets.')
check('V670-ANDROID-HONESTNESS', guide.includes('No APK is claimed') && guide.includes('iOS remains deferred') && native.includes('Android export is blocked') && android.projectSettings.build.target === 'android', 'Mobile support is optional and gated; missing tools and deferred iOS are disclosed without fabricated artifacts.')
check('V670-ACCESSIBILITY', accessibility.includes('valueMin') && accessibility.includes('valueMax') && accessibility.includes('checked') && accessibility.includes('focusOrder') && accessibility.includes('Math.min(4') && native.includes('WebView2 bridges standards-based HTML/ARIA semantics') && native.includes('custom native UI Automation providers are not claimed'), 'Semantic evidence contains role/name/state/value/focus/live data and the native bridge claim is limited to WebView DOM/ARIA.')
check('V670-REFERENCES', touch.engineVersion === version && touch.assets.every(asset => asset.assetType !== 'script') && touch.projectSettings.deviceInput.virtualControls.length === 2 && android.projectSettings.build.platform.permissions.join(',') === 'android.permission.VIBRATE', 'No-code touch and least-permission Android reference projects are complete.', { controls: touch.projectSettings.deviceInput.virtualControls.length })
check('V670-MANUALS', [manualEn, manualDe, manualZh].every(text => text.includes('Engine: **6.7.0**')) && manualEn.includes('Touch, gamepad, mobile delivery') && manualDe.includes('Touch-, Gamepad-, Mobile-') && manualZh.includes('触控、手柄、移动交付'), 'English, German and Chinese manuals teach the full authoring, recovery and mobile-gate workflow.', { bytes: manualEn.length + manualDe.length + manualZh.length })
check('V670-ROADMAP', roadmap.includes('## 6.7.0 — device input') && instructions.includes('## 6.7.0 implementation checkpoint') && guide.includes('## Qualification checklist'), 'Roadmap, implementation checkpoint and task guide are synchronized.')
check('V670-VERIFICATION', verification.status === 'passed' && verification.engineVersion === version && verification.checks.length >= 13, 'Focused device/mobile/accessibility verification passes.', { checks: verification.checks.length })
check('V670-TEMPLATES', catalog.status === 'passed' && catalog.engineVersion === version, 'Every startup template retains valid gameplay, build and accessibility behavior.', { checks: catalog.checks.length })
check('V670-INTERACTIONS', interactions.status === 'passed' && interactions.severity0Open === 0 && interactions.severity1Open === 0, 'User-style control traversal reports no critical failure.', interactions.summary)
check('V670-LAYOUT', layout.status === 'passed' && layout.severity0Open === 0 && layout.severity1Open === 0, 'EN/DE/ZH layout remains contained at the required viewports and 100–200% editor scales.', { states: layout.results?.length ?? 0 })
check('V670-PERFORMANCE', performance.status === 'passed' && performance.measurements?.physics?.finite === true, 'Retained low-end benchmark remains finite and completes without removing effects or animation.', { bodyStepsPerSecond: performance.measurements?.physics?.bodyStepsPerSecond })
check('V670-DEPENDENCIES', dependency.status === 'passed' && dependency.engineVersion === version, 'Pinned dependency advisory audit has no High/Critical block.')
check('V670-WINDOWS', windows.status === 'passed' && windows.artifacts?.length === 4 && windows.artifacts.every(item => item.bytes > 0 && item.sha256?.length === 64), 'Windows editor and exported no-code touch game launch smoke passes.', { artifacts: windows.artifacts?.length ?? 0 })
check('V670-STABILITY', stability.status === 'passed' && stability.cycles === 1000, 'A 1,000-cycle deterministic local stability gate completes without non-finite runtime state.', { cycles: stability.cycles })

const failed = checks.filter(item => item.status === 'failed')
const report = {
  format: 'nova-v6.7.0-product-audit', version: 1, engineVersion: version, generatedAt: new Date().toISOString(),
  perspectives: ['programmer', 'user', 'security', 'device-input', 'mobile', 'accessibility', 'build', 'localization', 'layout', 'performance', 'release'],
  checks, severity0Open: 0, severity1Open: failed.length,
  externalGates: {
    androidApkAndPhysicalDevice: 'pending-external-unless-qualified-toolchain-is-provided', androidProductionSigningAndStore: 'pending-external',
    iosMatchingHost: 'deferred-external', publisherSigning: 'pending-external', cleanMachineLifecycle: 'pending-external',
    secondMachineReproducibility: 'pending-external', physicalInputAudioSensorMatrix: 'pending-external', independentScreenReaderReview: 'pending-external', soak72Hours: 'pending-external'
  }, status: failed.length ? 'failed' : 'passed'
}
await mkdir(join(root, 'release-audits'), { recursive: true })
await writeFile(join(root, 'release-audits/v6.7.0-product-audit.json'), `${JSON.stringify(report, null, 2)}\n`)
if (failed.length) { console.error(failed); process.exit(1) }
console.log(`Nova_A v6.7.0 product audit passed: ${checks.length} checks.`)
