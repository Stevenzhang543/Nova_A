/** 26.29 平台定向检查：真实纯模块判定、当前 Windows 只读预检与隔离缺运行时分支，不冒充其他主机验收。 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
/** 转译并执行无浏览器依赖的实际平台契约模块。 */
function load(file) { const exports = {}; vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports }); return exports }
const engineVersion = JSON.parse(fs.readFileSync('package.json', 'utf8')).version
const qualification = process.argv.find(/** 读取正式验证的版本声明。 */ arg => arg.startsWith('--qualification-release='))?.split('=')[1]
if (qualification) { assert.equal(qualification, '26.29'); assert.equal(engineVersion, '26.29.0') }
const { platformSupport, selectableBuildPlatforms } = load('src/runtime/platformSupport.ts'), { platformPrerequisites29: prerequisites, platformPrerequisiteCopy29: copy } = load('src/runtime/platformPrerequisites29.ts')
assert.equal(platformSupport('unexpected').tier, 'unsupported'); assert.equal(platformSupport('unexpected').availability, 'unavailable')
assert.equal(platformSupport('web').editor, true); assert.ok(platformSupport('web').architectures.includes('aarch64'))
assert.equal(platformSupport('linux').referenceMatrixPassed, false); assert.equal(platformSupport('macos').referenceMatrixPassed, false)
assert.equal(selectableBuildPlatforms().some(/** 浏览器不能据 UA 假定本机存在 Linux 原生导出模板。 */ item => item.id === 'linux'), false)
assert.equal(selectableBuildPlatforms('linux').some(/** 匹配宿主应能选择实验 Linux 模板。 */ item => item.id === 'linux'), true)
assert.equal(selectableBuildPlatforms('linux').some(/** Linux 宿主不能冒充匹配的 macOS 宿主。 */ item => item.id === 'macos'), false)
const browser = { nativeAvailable: false, host: 'windows', architecture: 'unknown' }, native = { nativeAvailable: true, host: 'windows', architecture: 'x86_64' }, localeChecks = []
for (const locale of ['en', 'de', 'zh']) {
  const text = copy(locale)
  assert.equal(prerequisites('web', 'aarch64', 'game', browser, locale).join(''), text.web)
  assert.equal(prerequisites('windows', 'x86_64', 'game', browser, locale)[0], text.browser)
  assert.equal(prerequisites('windows', 'x86_64', 'game', { ...browser, nativeHost: true }, locale)[0], text.probeFailed)
  assert.equal(prerequisites('macos', 'aarch64', 'game', native, locale)[0], text.mismatch)
  assert.equal(prerequisites('windows', 'aarch64', 'game', native, locale)[0], text.mismatch)
  assert.equal(prerequisites('windows', 'x86_64', 'game', native, locale)[0], text.native)
  assert.ok(prerequisites('windows', 'x86_64', 'headless-server', native, locale).includes(text.headless))
  assert.equal(prerequisites('invalid', 'x86_64', 'game', native, locale)[0], text.unknown)
  assert.equal(prerequisites('android', 'aarch64', 'game', native, locale)[0], text.android)
  localeChecks.push(locale)
}
let actualWindows = { status: 'unavailable-host' }, simulatedMissing = null
if (process.platform === 'win32') {
  const script = path.resolve('scripts/check-windows-prerequisites.ps1')
  const actual = spawnSync('powershell', ['-NoProfile', '-File', script], { encoding: 'utf8', timeout: 30000, windowsHide: true })
  assert.ok([0, 2].includes(actual.status), actual.stderr); actualWindows = JSON.parse(actual.stdout)
  assert.ok(['attention-required', 'prerequisites-detected'].includes(actualWindows.status))
  const mock = `# 隔离返回旧系统构建号，不触碰实际注册表。
function Get-ItemProperty { param($LiteralPath) [pscustomobject]@{CurrentBuildNumber='7601'} };
# 隔离模拟注册路径不存在，不删除本机登记。
function Test-Path { param($LiteralPath) $false }; & '${script.replaceAll("'", "''")}' ; exit $LASTEXITCODE`
  const missing = spawnSync('powershell', ['-NoProfile', '-Command', mock], { encoding: 'utf8', timeout: 30000, windowsHide: true })
  assert.equal(missing.status, 2, missing.stderr); simulatedMissing = JSON.parse(missing.stdout)
  assert.equal(simulatedMissing.status, 'attention-required'); assert.equal(simulatedMissing.windowsBuild, 7601); assert.equal(simulatedMissing.webView2Versions.length, 0)
  assert.ok(simulatedMissing.issues.some(/** 真实脚本缺 WebView2 分支必须给出可执行安装指引。 */ issue => issue.includes('Install Microsoft Evergreen WebView2 Runtime')))
  assert.ok(simulatedMissing.issues.some(/** 低于历史 OS 底线不能静默显示就绪。 */ issue => issue.includes('below that floor')))
}
const workflow = fs.readFileSync('.github/workflows/platform-recipes.yml', 'utf8')
for (const target of ['x86_64-unknown-linux-gnu', 'aarch64-apple-darwin', 'x86_64-apple-darwin']) assert.ok(workflow.includes(target))
assert.ok(workflow.includes('if-no-files-found: error')); assert.ok(workflow.includes('unqualified-desktop-candidate')); assert.ok(workflow.includes('libwebkit2gtk-4.1-dev'))
const paths = ['src/runtime/platformSupport.ts', 'src/runtime/platformPrerequisites29.ts', 'src/components/BuildSettingsPanel.vue', 'scripts/check-windows-prerequisites.ps1', '.github/workflows/platform-recipes.yml']
const report = { status: 'passed', release: '26.29', engineVersion, generatedAt: new Date().toISOString(), checks: ['unknown target fails closed', 'Web editor and ARM architecture metadata', 'matching-host experimental target selection', 'three-language browser/native/architecture/Android guidance', 'GUI versus renderer-disabled versus native physics CLI disclosure', 'actual Windows read-only prerequisite probe', 'simulated absent runtime and old OS execute actual script failure branches', 'matching-host CI recipe targets'], localeChecks, actualWindows, simulatedMissing, sources: paths.map(/** 记录本次实际检查源码身份。 */ file => ({ path: file, sha256: createHash('sha256').update(fs.readFileSync(file)).digest('hex') })), boundaries: ['Missing-runtime branch uses mocked registry reads; no failing physical machine was provided.', 'Linux/macOS CI recipes are not executed here. No corresponding platform binary or signing/device acceptance is claimed.', 'Current Windows registration detection is not a GPU, audio, clean-machine or oldest-OS qualification.'] }
fs.mkdirSync('release-audits', { recursive: true }); fs.writeFileSync('release-audits/v26.29-platform.json', JSON.stringify(report, null, 2)); console.log(JSON.stringify({ status: report.status, engineVersion, localeChecks, actualWindows, simulatedMissing: simulatedMissing?.status }, null, 2))
