/** 导出模板管理：解析目标模板信息并检查可用的构建模板。 */
import { reactive } from 'vue'
import type { BuildArchitecture, BuildRuntimeMode, BuildTarget, ExportCapabilities } from './buildSettings'
import { platformSupport } from './platformSupport'

export const NOVA_EXPORT_TEMPLATE_FORMAT = 1 as const
export interface ExportTemplateManifest {
  format: 'nova-export-template'; version: typeof NOVA_EXPORT_TEMPLATE_FORMAT; id: string; name: string; templateVersion: string; engineRange: string
  target: BuildTarget; architectures: BuildArchitecture[]; runtimeModes: BuildRuntimeMode[]; sha256: string; signature: string; publisher: string; trusted: boolean
  host: 'windows' | 'linux' | 'macos' | 'any'; minimumSdk: string; installed: boolean; source: 'bundled' | 'offline' | 'matching-host-ci'; limitations: string[]
}
export interface PlatformGate { id: string; label: string; passed: boolean; external: boolean; detail: string }
export interface PlatformQualification { target: BuildTarget; status: 'qualified' | 'pending-external' | 'blocked'; gates: PlatformGate[] }

const BUILTIN_TEMPLATES: ExportTemplateManifest[] = [
  { format: 'nova-export-template', version: 1, id: 'windows-x64-v1', name: 'Windows x64 player', templateVersion: '1.0.0', engineRange: '>=5.1.0 <6.0.0', target: 'windows', architectures: ['x86_64'], runtimeModes: ['game'], sha256: 'b9d08e44d92c1230ffcb22d28e5b9b0a1bd7e9fd15f1d4173500643246885668', signature: 'nova-bundled-v1', publisher: 'Whitelist', trusted: true, host: 'windows', minimumSdk: 'Windows 10 1809 + WebView2', installed: true, source: 'bundled', limitations: ['Unsigned until a publisher signing identity is configured.'] },
  { format: 'nova-export-template', version: 1, id: 'windows-headless-x64-v1', name: 'Windows x64 headless server', templateVersion: '1.0.0', engineRange: '>=5.8.0 <6.0.0', target: 'windows', architectures: ['x86_64'], runtimeModes: ['headless-server'], sha256: '873411ae565e5187474fa030249c427794071200cc2714dd114b3ada33109826', signature: 'nova-bundled-v1', publisher: 'Whitelist', trusted: true, host: 'windows', minimumSdk: 'Windows 10 1809', installed: true, source: 'bundled', limitations: ['Requires explicit native-UDP networking permission.'] },
  { format: 'nova-export-template', version: 1, id: 'web-es2022-v1', name: 'Web ES2022 player', templateVersion: '1.0.0', engineRange: '>=5.1.0 <6.0.0', target: 'web', architectures: ['x86_64'], runtimeModes: ['game'], sha256: 'eaa00572b9c119d01235407ec8794af75591180f7410818bef29e51a8eff43fa', signature: 'nova-bundled-v1', publisher: 'Whitelist', trusted: true, host: 'any', minimumSdk: 'ES2022 + WebAssembly + WebGL2', installed: true, source: 'bundled', limitations: ['Requires HTTP(S); file:// is unsupported.'] },
  { format: 'nova-export-template', version: 1, id: 'linux-x64-experimental-v1', name: 'Linux x64 matching-host player', templateVersion: '1.0.0', engineRange: '>=5.1.0 <6.0.0', target: 'linux', architectures: ['x86_64'], runtimeModes: ['game', 'headless-server'], sha256: 'cb2b465fa7a2c33da625533e4bd3ef1bda29df285c205ecc92b892202364c2c1', signature: 'nova-bundled-v1', publisher: 'Whitelist', trusted: true, host: 'linux', minimumSdk: 'WebKitGTK 4.1 matching-host toolchain', installed: false, source: 'matching-host-ci', limitations: ['Pending clean-machine, graphics, audio and input evidence.'] },
  { format: 'nova-export-template', version: 1, id: 'macos-universal-experimental-v1', name: 'macOS universal matching-host player', templateVersion: '1.0.0', engineRange: '>=5.1.0 <6.0.0', target: 'macos', architectures: ['x86_64', 'aarch64'], runtimeModes: ['game'], sha256: 'd844a51e947b6c1433fc84c54eb7a85ba619f52c41c133c0795ce72d741c6379', signature: 'nova-bundled-v1', publisher: 'Whitelist', trusted: true, host: 'macos', minimumSdk: 'Xcode 15 + macOS 12 SDK', installed: false, source: 'matching-host-ci', limitations: ['Pending hardware, signing, notarization, graphics, audio and input evidence.'] },
  { format: 'nova-export-template', version: 1, id: 'android-aarch64-gated-v1', name: 'Android aarch64 gated template', templateVersion: '6.7.0', engineRange: '>=6.0.0 <27.0.0', target: 'android', architectures: ['aarch64'], runtimeModes: ['game'], sha256: '57ca1d937328e2cb768ac115ab28b9d5381c5a9b4b71972955656b0fb0ff1412', signature: 'nova-bundled-v1', publisher: 'Whitelist', trusted: true, host: 'any', minimumSdk: 'JDK 17 + Android SDK 35 + NDK 27 + reviewed Gradle template', installed: false, source: 'offline', limitations: ['Build is blocked until JDK, SDK/API 35, build-tools, NDK, and the validated local template pass discovery. Signing, device install, input/audio/sensor hardware, and store review remain explicit qualification gates.'] }
]
// Template format 1 remains frozen across semantic and calendar-version releases.
for (const template of BUILTIN_TEMPLATES) template.engineRange = template.engineRange.replace('<6.0.0', '<27.0.0').replace('<7.0.0', '<27.0.0').replace('<8.0.0', '<27.0.0')

export const exportTemplateState = reactive({ templates: structuredClone(BUILTIN_TEMPLATES), androidGates: { jdk: false, sdk: false, ndk: false, template: false, signing: false, device: false, installLaunch: false, inputAudio: false }, selectedId: 'windows-x64-v1', lastError: '' })

/** 结构说明（自动提取）：exportTemplateFor；输入 id；直接调用 exportTemplateState.templates.find。 */ export function exportTemplateFor(id: string): ExportTemplateManifest | null { return exportTemplateState.templates.find(/* 比较 item.id 与 id，返回严格相等的判断结果。 */ item => item.id === id) ?? null }
/** 结构说明（自动提取）：compatibleExportTemplates；输入 target、architecture、runtimeMode；直接调用 exportTemplateState.templates.filter。 */ export function compatibleExportTemplates(target: BuildTarget, architecture: BuildArchitecture, runtimeMode: BuildRuntimeMode): ExportTemplateManifest[] {
  return exportTemplateState.templates.filter(/* 先计算 item.target === target && item.architectures.includes(architecture)；仅当其为真值时求右侧 item.runtimeModes.includes(runtimeMode)，返回短路求值结果。 */ item => item.target === target && item.architectures.includes(architecture) && item.runtimeModes.includes(runtimeMode))
}
/** Resolves the registered template for a target tuple instead of synthesizing an ID that may not exist. */
/** 结构说明（自动提取）：defaultExportTemplateId；输入 target、architecture、runtimeMode；直接调用 compatibleExportTemplates、compatible.find。 */ export function defaultExportTemplateId(target: BuildTarget, architecture: BuildArchitecture, runtimeMode: BuildRuntimeMode): string {
  const compatible = compatibleExportTemplates(target, architecture, runtimeMode)
  return compatible.find(/* 先计算 item.installed；仅当其为真值时求右侧 item.trusted，返回短路求值结果。 */ item => item.installed && item.trusted)?.id ?? compatible.find(/* 返回 item.trusted 的当前值。 */ item => item.trusted)?.id ?? compatible[0]?.id ?? ''
}
/** Migrates only Nova_A's previously synthesized, unregistered IDs; custom template IDs remain untouched. */
/** 结构说明（自动提取）：resolveExportTemplateId；输入 id、target、architecture、runtimeMode；直接调用 id.trim、exportTemplateFor、Set、legacyIds.has、defaultExportTemplateId；返回路径包含 selected。 */ export function resolveExportTemplateId(id: string, target: BuildTarget, architecture: BuildArchitecture, runtimeMode: BuildRuntimeMode): string {
  const selected = id.trim()
  if (exportTemplateFor(selected)) return selected
  const legacyIds = new Set([`${target}-${architecture}-v1`, `${target}-${architecture === 'x86_64' ? 'x64' : architecture}-v1`])
  return !selected || legacyIds.has(selected) ? defaultExportTemplateId(target, architecture, runtimeMode) : selected
}
/** 结构说明（自动提取）：exportTemplateIssues；输入 id、target、architecture、runtimeMode、capabilities；直接调用 compatibleExportTemplates、join、compatible.map、exportTemplateFor、test 等；返回路径包含 issues。 */ export function exportTemplateIssues(id: string, target: BuildTarget, architecture: BuildArchitecture, runtimeMode: BuildRuntimeMode, capabilities: ExportCapabilities): string[] {
  const compatible = compatibleExportTemplates(target, architecture, runtimeMode)
  const available = compatible.map(/* 返回 item.id 的当前值。 */ item => item.id).join(' or ')
  const template = exportTemplateFor(id); if (!template) return [`Export template "${id || '(empty)'}" is not registered for ${target}/${architecture}/${runtimeMode}. ${available ? `Choose ${available}.` : 'Install a matching template or change Target, Architecture, or Runtime.'}`]
  const issues: string[] = []
  if (!template.trusted || !template.signature || !/^[a-f0-9]{64}$/.test(template.sha256)) issues.push(`${template.name} (${template.id}) has invalid trust metadata. Reinstall it from a verified offline source.`)
  if (!template.installed) issues.push(`${template.name} (${template.id}) is registered but not installed. Install and verify it in Manage → Packages, or choose a locally installed target.`)
  if (template.target !== target || !template.architectures.includes(architecture) || !template.runtimeModes.includes(runtimeMode)) issues.push(`${template.name} (${template.id}) does not support ${target}/${architecture}/${runtimeMode}. ${available ? `Choose ${available}.` : 'Install a compatible template or change the target tuple.'}`)
  if (template.host !== 'any' && capabilities.host !== template.host) issues.push(`${template.name} (${template.id}) requires a ${template.host} host; this editor reports ${capabilities.host}. Use a matching host or CI runner.`)
  if (target === 'android' && !(['jdk', 'sdk', 'ndk', 'template'] as const).every(/* 返回 exportTemplateState.androidGates[gate] 的当前值。 */ gate => exportTemplateState.androidGates[gate])) issues.push('Android build requires JDK 17, SDK 35/build-tools, NDK, and the validated local template. Device, deploy, signing, input and audio remain explicit qualification gates, not build prerequisites.')
  return issues
}

/** 结构说明（自动提取）：platformQualification；输入 target、capabilities；直接调用 platformSupport、support.buildHosts.includes、support.buildHosts.join、exportTemplateState.templates.some、Object.entries 等；包含循环处理。 */ export function platformQualification(target: BuildTarget, capabilities: ExportCapabilities): PlatformQualification {
  const support = platformSupport(target), gates: PlatformGate[] = [
    { id: 'host', label: 'Matching build host', passed: support.buildHosts.includes(capabilities.host === 'unknown' ? 'web' : capabilities.host), external: target === 'linux' || target === 'macos', detail: `Requires ${support.buildHosts.join(' or ') || 'an approved host'}.` },
    { id: 'template', label: 'Verified export template', passed: exportTemplateState.templates.some(/* 先计算 item.target === target && item.installed；仅当其为真值时求右侧 item.trusted，返回短路求值结果。 */ item => item.target === target && item.installed && item.trusted), external: target === 'linux' || target === 'macos', detail: support.evidence },
    { id: 'reference', label: 'Reference matrix', passed: support.referenceMatrixPassed, external: !support.referenceMatrixPassed, detail: support.reason },
    { id: 'clean-machine', label: 'Clean-machine lifecycle', passed: false, external: true, detail: 'Install, launch, upgrade, repair and uninstall evidence must be attached from an independent host.' }
  ]
  if (target === 'android') for (const [id, passed] of Object.entries(exportTemplateState.androidGates)) gates.push({ id: `android-${id}`, label: id, passed, external: true, detail: 'Android promotion requires this independently captured gate.' })
  const passed = gates.every(/* 返回 gate.passed 的当前值。 */ gate => gate.passed), unavailable = support.availability === 'unavailable'
  return { target, status: passed ? 'qualified' : unavailable ? 'blocked' : 'pending-external', gates }
}

/** 结构说明（自动提取）：installOfflineExportTemplate；输入 value；直接调用 Array.isArray、Error、includes、String、slice 等；返回路径包含 template；包含显式抛错路径。 */ export function installOfflineExportTemplate(value: unknown): ExportTemplateManifest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Export template manifest must be an object.')
  const source = value as Partial<ExportTemplateManifest>, target: BuildTarget = ['windows', 'linux', 'macos', 'web', 'android'].includes(String(source.target)) ? source.target as BuildTarget : 'web'
  const publisher = String(source.publisher ?? '').slice(0, 120), signature = String(source.signature ?? ''), officialTrust = publisher === 'Whitelist' && (signature === 'nova-bundled-v1' || signature.startsWith('nova-official-v1:'))
  const template: ExportTemplateManifest = { format: 'nova-export-template', version: 1, id: String(source.id ?? '').trim().slice(0, 120), name: String(source.name ?? '').trim().slice(0, 120), templateVersion: String(source.templateVersion ?? '').trim().slice(0, 40), engineRange: String(source.engineRange ?? '').trim().slice(0, 80), target, architectures: [...new Set((Array.isArray(source.architectures) ? source.architectures : []).filter(/* 先计算 item === 'x86_64'；仅当其为假值时求右侧 item === 'aarch64'，返回短路求值结果。 */ (item): item is BuildArchitecture => item === 'x86_64' || item === 'aarch64'))], runtimeModes: [...new Set((Array.isArray(source.runtimeModes) ? source.runtimeModes : []).filter(/* 先计算 item === 'game'；仅当其为假值时求右侧 item === 'headless-server'，返回短路求值结果。 */ (item): item is BuildRuntimeMode => item === 'game' || item === 'headless-server'))], sha256: String(source.sha256 ?? '').toLowerCase(), signature, publisher, trusted: officialTrust, host: source.host === 'windows' || source.host === 'linux' || source.host === 'macos' ? source.host : 'any', minimumSdk: String(source.minimumSdk ?? '').slice(0, 300), installed: true, source: 'offline', limitations: (Array.isArray(source.limitations) ? source.limitations : []).filter(/* 比较 typeof item 与 'string'，返回严格相等的判断结果。 */ (item): item is string => typeof item === 'string').slice(0, 32).map(/* 调用 item.slice(0, 300) 并返回调用结果。 */ item => item.slice(0, 300)) }
  if (template.format !== source.format || source.version !== 1 || !/^[a-z0-9]+(?:[.-][a-z0-9]+)+$/.test(template.id) || !/^\d+\.\d+\.\d+$/.test(template.templateVersion) || !/^[a-f0-9]{64}$/.test(template.sha256) || !template.signature || !template.trusted || !template.architectures.length || !template.runtimeModes.length) throw new Error('Export template identity, publisher trust, version, architecture, or runtime metadata is invalid. Third-party templates require certification before installation.')
  const index = exportTemplateState.templates.findIndex(/* 比较 item.id 与 template.id，返回严格相等的判断结果。 */ item => item.id === template.id); if (index >= 0) exportTemplateState.templates.splice(index, 1, template); else exportTemplateState.templates.push(template)
  return template
}
