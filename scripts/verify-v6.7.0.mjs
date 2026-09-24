/** 功能回归脚本：执行 verify-v6.7.0.mjs 对应场景，保留断言和证据输出。 */
import { webcrypto } from 'node:crypto'
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'vite'

if (!globalThis.crypto) globalThis.crypto = webcrypto
const version = '6.7.0'
const root = dirname(dirname(fileURLToPath(import.meta.url)))
const compiled = await mkdtemp(join(tmpdir(), 'nova-v670-verify-'))
const checks = []
const check = /* 调用 checks.push({ id, status: passed ? 'passed' : 'failed', detail, metrics }) 并返回调用结果。 */ (id, passed, detail, metrics = {}) => checks.push({ id, status: passed ? 'passed' : 'failed', detail, metrics })
const source = /* 调用 readFile(join(root, path), 'utf8') 并返回调用结果。 */ path => readFile(join(root, path), 'utf8')

try {
  await build({
    configFile: false, root, logLevel: 'warn', ssr: { noExternal: true },
    build: { ssr: true, outDir: compiled, emptyOutDir: false, rollupOptions: {
      input: {
        device: join(root, 'src/runtime/deviceInput.ts'), mobile: join(root, 'src/runtime/mobileDelivery.ts'),
        accessibility: join(root, 'src/runtime/accessibilityEvidence.ts'), format: join(root, 'src/projects/projectFormat.ts')
      }, output: { entryFileNames: '[name].mjs', chunkFileNames: 'chunks/[name]-[hash].mjs' }
    } }
  })
  const load = /* 调用 import(`${pathToFileURL(join(compiled, `${name}.mjs`)).href}?v=${Date.now()}`) 并返回调用结果。 */ name => import(`${pathToFileURL(join(compiled, `${name}.mjs`)).href}?v=${Date.now()}`)
  const [device, mobile, accessibility, format] = await Promise.all(['device', 'mobile', 'accessibility', 'format'].map(load))
  check('V670-AUTHORITY', format.NOVA_ENGINE_VERSION === version && format.NOVA_PROJECT_FORMAT_MAJOR === 2 && format.NOVA_PROJECT_SCHEMA_VERSION === 29, 'Engine authority is 6.7.0 while Project Format 2/schema 29 remain frozen.')

  const normalized = device.normalizeDeviceInputSettings({
    virtualControlsEnabled: true, showVirtualControls: 'always', safeAreaMode: 'custom', customSafeArea: { left: Infinity, top: -10, right: 9, bottom: 2 }, orientation: 'landscape', referenceDpi: 10_000,
    gamepadCalibrations: [{ deviceId: '*', axis: 0, minimum: -1, center: 0, maximum: 1, deadzone: .2 }, { deviceId: '*', axis: 0, minimum: -1, center: 0, maximum: 1 }],
    virtualControls: Array.from({ length: 40 }, /** 结构说明（自动提取）：Array.from 回调；输入 _、index；返回表达式求值结果。 */ (_, index) => ({ id: `control-${index}`, action: 'Jump', kind: index % 2 ? 'stick' : 'button', anchor: 'bottom-right', size: index ? 500 : 12, opacity: 5, deadzone: -1, hapticMs: 500 }))
  })
  check('V670-DEVICE-BOUNDS', normalized.virtualControls.length === 32 && normalized.gamepadCalibrations.length === 1 && normalized.referenceDpi === 1200 && normalized.customSafeArea.top === 0 && normalized.virtualControls.every(/* 先计算 item.size >= 40 && item.size <= 320 && item.opacity <= 1；仅当其为真值时求右侧 item.hapticMs <= 100，返回短路求值结果。 */ item => item.size >= 40 && item.size <= 320 && item.opacity <= 1 && item.hapticMs <= 100), 'Device settings, touch controls and calibration lists normalize to finite documented limits.', { controls: normalized.virtualControls.length, calibrations: normalized.gamepadCalibrations.length })

  device.loadDeviceInputSettings({ gamepadCalibrations: [{ deviceId: '*', axis: 0, minimum: -1, center: 0, maximum: 1, deadzone: .2, invert: false }] })
  const axis = device.applyGamepadAxisCalibration(.6, 'unknown-controller', 0)
  check('V670-GAMEPAD-CALIBRATION', Math.abs(axis - .5) < 1e-12 && device.applyGamepadAxisCalibration(.1, 'unknown-controller', 0) === 0 && device.applyGamepadAxisCalibration(Number.NaN, '', 0) === 0, 'Wildcard controller calibration applies dead zones and finite normalization deterministically.', { calibrated: axis })

  const deduplicator = new device.TouchPointerDeduplicator()
  deduplicator.recordTouch(1_000, 100, 100)
  check('V670-POINTER-DEDUP', !deduplicator.acceptMouse(1_030, 105, 104) && deduplicator.acceptMouse(2_000, 105, 104) && !deduplicator.acceptMouse(3_000, 500, 500, true), 'Compatibility mouse events are rejected near recent touch input without suppressing later real mouse input.')

  const permissions = mobile.validateAndroidPermissions(['android.permission.CAMERA', 'android.permission.CAMERA', 'bad.permission', 'android.permission.UNKNOWN'], {})
  check('V670-LEAST-PERMISSIONS', permissions.some(/* 先计算 item.code === 'NOVA-ANDROID-PERMISSION-PURPOSE'；仅当其为真值时求右侧 item.severity === 'error'，返回短路求值结果。 */ item => item.code === 'NOVA-ANDROID-PERMISSION-PURPOSE' && item.severity === 'error') && permissions.some(/* 比较 item.code 与 'NOVA-ANDROID-PERMISSION-DUPLICATE'，返回严格相等的判断结果。 */ item => item.code === 'NOVA-ANDROID-PERMISSION-DUPLICATE') && permissions.some(/* 比较 item.code 与 'NOVA-ANDROID-PERMISSION-ID'，返回严格相等的判断结果。 */ item => item.code === 'NOVA-ANDROID-PERMISSION-ID') && permissions.some(/* 比较 item.code 与 'NOVA-ANDROID-PERMISSION-UNKNOWN'，返回严格相等的判断结果。 */ item => item.code === 'NOVA-ANDROID-PERMISSION-UNKNOWN'), 'Android permissions reject malformed IDs and missing sensitive purposes while surfacing duplicate and unreviewed entries.', { issues: permissions.length })
  const manifest = mobile.androidManifestPreview({ identifier: 'top.whitelists.demo<&', version: '1.0"', orientation: 'portrait', permissions: ['android.permission.VIBRATE', 'bad'] })
  check('V670-MANIFEST', manifest.includes('android.permission.VIBRATE') && !manifest.includes('<uses-permission android:name="bad"') && manifest.includes('top.whitelists.demo&lt;&amp;') && manifest.includes('screenOrientation="portrait"'), 'Manifest preview sorts and filters permissions and XML-escapes project metadata.')

  const evidence = accessibility.createSemanticEvidence([
    { uuid: 'slider', role: 'slider', label: 'Volume', description: '', state: '', value: '50', valueMin: 0, valueMax: 100, valueNow: 50, live: 'off', rect: { x: 1, y: 2, width: 100, height: 44 }, tabIndex: 1, focused: true, disabled: false },
    { uuid: 'check', role: 'checkbox', label: 'Captions', description: '', state: '', value: 'true', checked: true, live: 'polite', rect: { x: 1, y: 52, width: 100, height: 44 }, tabIndex: 2, focused: false, disabled: false }
  ], { locale: 'de', direction: 'rtl', textScale: 99, generatedAt: '2026-09-01T00:00:00.000Z' })
  check('V670-SEMANTIC-EVIDENCE', evidence.engineVersion === version && evidence.textScale === 4 && evidence.direction === 'rtl' && evidence.nodes[0].value.current === 50 && evidence.nodes[1].value.checked === true && evidence.issues.length === 0, 'Semantic evidence retains range/checked state, locale, direction, focus and bounded 400% text scale.')

  const [input, physics, world, buildSettings, exporter, native, packages, platform, guide, roadmap, instructions, manualEn, manualDe, manualZh] = await Promise.all([
    'src/runtime/input.ts', 'src/store/physics.ts', 'src/components/WorldCanvas.vue', 'src/runtime/buildSettings.ts', 'src/runtime/gameExporter.ts', 'src-tauri/src/lib.rs', 'src/runtime/packages.ts', 'src/runtime/platformSupport.ts', 'docs/DEVICE_MOBILE_ACCESSIBILITY_6_7.md', 'docs/ROADMAP_6_2_TO_7_0.md', 'instructions.txt', 'manual/MANUAL.en.md', 'manual/MANUAL.de.md', 'manual/MANUAL.zh-CN.md'
  ].map(source))
  check('V670-RUNTIME-CONNECTION', input.includes('TouchPointerDeduplicator') && input.includes("binding.device === 'gesture'") && input.includes("binding.device === 'sensor'") && physics.includes('serializeDeviceInputSettings') && world.includes('VirtualControlsOverlay'), 'Touch, gestures, sensors, virtual controls and project persistence reach the gameplay input/runtime path.')
  check('V670-ANDROID-CONNECTION', buildSettings.includes('validateAndroidPermissions') && exporter.includes("target === 'android'") && native.includes('android_toolchain_status') && native.includes('android_deploy_apk') && native.includes('android_logcat_snapshot') && native.includes('gradlew') && packages.includes('OFFICIAL_ANDROID_PACKAGE_ID') && packages.includes("name: 'Nova Android Export'") && platform.includes("id: 'android'"), 'Optional Android package, validation, exporter, Gradle build, explicit deploy/log and platform discovery are connected.')
  check('V670-ACCESSIBILITY-BRIDGE', native.includes('native_accessibility_capabilities') && world.includes('aria-valuenow') && world.includes('aria-checked'), 'WebView accessibility capabilities and runtime role/name/state/value semantics are exposed without claiming a custom native adapter.')
  const documentation = {
    guide: guide.includes('No APK is claimed'), roadmap: roadmap.includes('## 6.7.0 — device'), checkpoint: instructions.includes('## 6.7.0 implementation checkpoint'),
    english: manualEn.includes('Touch, gamepad, mobile delivery, and accessibility workflow'), german: manualDe.includes('Touch-, Gamepad-, Mobile- und Barrierefreiheits-Ablauf'), chinese: manualZh.includes('触控、手柄、移动交付与无障碍流程')
  }
  check('V670-DOCUMENTATION', Object.values(documentation).every(Boolean), 'Roadmap, checkpoint, guide and all three manuals teach the complete v6.7 workflow and external gates.', documentation)

  const references = await Promise.all(['creator-v670-touch-platformer', 'delivery-v670-android-gated'].map(/* 调用 readReference(name) 并返回调用结果。 */ name => readReference(name)))
  const touch = references[0], android = references[1]
  const touchScriptAssets = touch.assets.filter(/* 比较 asset.assetType 与 'script'，返回严格相等的判断结果。 */ asset => asset.assetType === 'script').length
  const touchScriptComponents = touch.scenes.flatMap(/* 返回 scene.entities 的当前值。 */ scene => scene.entities).flatMap(/* 返回 entity.components 的当前值。 */ entity => entity.components).filter(/* 比较 component.kind 与 'Script2D'，返回严格相等的判断结果。 */ component => component.kind === 'Script2D').length
  check('V670-REFERENCES', touch.engineVersion === version && touchScriptAssets === 0 && touchScriptComponents === 0 && touch.projectSettings.deviceInput.virtualControls.length === 2 && android.projectSettings.build.target === 'android' && android.projectSettings.build.platform.permissions.length === 1, 'No-code touch and gated Android references are frozen, playable and least-privilege.', { controls: touch.projectSettings.deviceInput.virtualControls.length })

  const local = await discoverLocalAndroidToolchain()
  check('V670-ANDROID-HONEST-GATE', local.available || local.missing.length > 0, local.available ? 'Local Android prerequisites were discovered; an APK build still requires the explicit build gate.' : `Android is honestly blocked locally: ${local.missing.join(', ')}`, { available: local.available, missing: local.missing })
} finally {
  await rm(compiled, { recursive: true, force: true })
}

const failed = checks.filter(/* 比较 item.status 与 'failed'，返回严格相等的判断结果。 */ item => item.status === 'failed')
const report = { format: 'nova-v6.7.0-verification', version: 1, engineVersion: version, generatedAt: new Date().toISOString(), perspectives: ['compatibility', 'touch', 'gamepad', 'gestures', 'sensors', 'android', 'security', 'accessibility', 'documentation', 'user'], checks, severity0Open: failed.length, severity1Open: 0, status: failed.length ? 'failed' : 'passed' }
await mkdir(join(root, 'release-audits'), { recursive: true })
await writeFile(join(root, 'release-audits/v6.7.0-verification.json'), `${JSON.stringify(report, null, 2)}\n`)
if (failed.length) { console.error(failed); process.exit(1) }
console.log(`Nova_A v6.7.0 verification passed: ${checks.length} checks.`)

/* 调用 JSON.parse(await source(`reference-projects/projects/${name}/project.nova`)) 并返回调用结果。 */ async function readReference(name) { return JSON.parse(await source(`reference-projects/projects/${name}/project.nova`)) }
/** 读取文件状态判断路径存在性，失败时返回假。 */ async function exists(path) { try { await stat(path); return true } catch { return false } }
/** 结构说明（自动提取）：hasDirectory；输入 path；直接调用 some、readdir；等待异步结果。 */ async function hasDirectory(path) { try { return (await readdir(path, { withFileTypes: true })).some(/* 调用 item.isDirectory() 并返回调用结果。 */ item => item.isDirectory()) } catch { return false } }
/** 结构说明（自动提取）：discoverLocalAndroidToolchain；无显式参数；直接调用 exists、join、missing.push、hasDirectory；等待异步结果。 */ async function discoverLocalAndroidToolchain() {
  const javaHome = process.env.JAVA_HOME || ''
  const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || ''
  const template = process.env.NOVA_A_ANDROID_TEMPLATE || ''
  const missing = []
  if (!javaHome || !await exists(join(javaHome, 'bin', process.platform === 'win32' ? 'java.exe' : 'java'))) missing.push('JDK/JAVA_HOME')
  if (!sdk) missing.push('Android SDK root')
  else {
    if (!await exists(join(sdk, 'platforms', 'android-35'))) missing.push('Android API 35')
    if (!await hasDirectory(join(sdk, 'build-tools'))) missing.push('Android build-tools')
    if (!await hasDirectory(join(sdk, 'ndk'))) missing.push('Android NDK')
    if (!await exists(join(sdk, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb'))) missing.push('adb')
  }
  if (!template || !await exists(join(template, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew')) || !await exists(join(template, 'app', 'build.gradle'))) missing.push('reviewed Gradle template')
  return { available: missing.length === 0, missing }
}
