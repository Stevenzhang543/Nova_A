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
  { format: 'nova-export-template', version: 1, id: 'android-aarch64-gated-v1', name: 'Android aarch64 gated template', templateVersion: '1.0.0', engineRange: '>=6.0.0 <7.0.0', target: 'android', architectures: ['aarch64'], runtimeModes: ['game'], sha256: '57ca1d937328e2cb768ac115ab28b9d5381c5a9b4b71972955656b0fb0ff1412', signature: 'nova-bundled-v1', publisher: 'Whitelist', trusted: true, host: 'any', minimumSdk: 'JDK 17 + Android SDK 35 + NDK 27 + connected device', installed: false, source: 'offline', limitations: ['Blocked until SDK, template, signing, install, launch, input, audio and lifecycle gates all pass.'] }
]
// Template format 1 is frozen and compatible across the 5.x→6.x engine boundary.
for (const template of BUILTIN_TEMPLATES) template.engineRange = template.engineRange.replace('<6.0.0', '<7.0.0')

export const exportTemplateState = reactive({ templates: structuredClone(BUILTIN_TEMPLATES), androidGates: { jdk: false, sdk: false, ndk: false, template: false, signing: false, device: false, installLaunch: false, inputAudio: false }, selectedId: 'windows-x64-v1', lastError: '' })

export function exportTemplateFor(id: string): ExportTemplateManifest | null { return exportTemplateState.templates.find(item => item.id === id) ?? null }
/** Resolves the registered template for a target tuple instead of synthesizing an ID that may not exist. */
export function defaultExportTemplateId(target: BuildTarget, architecture: BuildArchitecture, runtimeMode: BuildRuntimeMode): string {
  const compatible = exportTemplateState.templates.filter(item => item.target === target && item.architectures.includes(architecture) && item.runtimeModes.includes(runtimeMode))
  return compatible.find(item => item.installed && item.trusted)?.id ?? compatible.find(item => item.trusted)?.id ?? compatible[0]?.id ?? ''
}
/** Migrates only Nova_A's previously synthesized, unregistered IDs; custom template IDs remain untouched. */
export function resolveExportTemplateId(id: string, target: BuildTarget, architecture: BuildArchitecture, runtimeMode: BuildRuntimeMode): string {
  const selected = id.trim()
  if (exportTemplateFor(selected)) return selected
  const legacyIds = new Set([`${target}-${architecture}-v1`, `${target}-${architecture === 'x86_64' ? 'x64' : architecture}-v1`])
  return !selected || legacyIds.has(selected) ? defaultExportTemplateId(target, architecture, runtimeMode) : selected
}
export function exportTemplateIssues(id: string, target: BuildTarget, architecture: BuildArchitecture, runtimeMode: BuildRuntimeMode, capabilities: ExportCapabilities): string[] {
  const template = exportTemplateFor(id); if (!template) return ['The selected export template is not installed or registered.']
  const issues: string[] = []
  if (!template.trusted || !template.signature || !/^[a-f0-9]{64}$/.test(template.sha256)) issues.push('Export template trust metadata is invalid.')
  if (!template.installed) issues.push('Export template is not installed on this host.')
  if (template.target !== target || !template.architectures.includes(architecture) || !template.runtimeModes.includes(runtimeMode)) issues.push('Export template does not match the target, architecture, or runtime mode.')
  if (template.host !== 'any' && capabilities.host !== template.host) issues.push(`Export template requires a ${template.host} host.`)
  if (target === 'android' && !Object.values(exportTemplateState.androidGates).every(Boolean)) issues.push('Android stays blocked until every SDK, template, signing, device, install/launch and runtime gate passes.')
  return issues
}

export function platformQualification(target: BuildTarget, capabilities: ExportCapabilities): PlatformQualification {
  const support = platformSupport(target), gates: PlatformGate[] = [
    { id: 'host', label: 'Matching build host', passed: support.buildHosts.includes(capabilities.host === 'unknown' ? 'web' : capabilities.host), external: target === 'linux' || target === 'macos', detail: `Requires ${support.buildHosts.join(' or ') || 'an approved host'}.` },
    { id: 'template', label: 'Verified export template', passed: exportTemplateState.templates.some(item => item.target === target && item.installed && item.trusted), external: target === 'linux' || target === 'macos', detail: support.evidence },
    { id: 'reference', label: 'Reference matrix', passed: support.referenceMatrixPassed, external: !support.referenceMatrixPassed, detail: support.reason },
    { id: 'clean-machine', label: 'Clean-machine lifecycle', passed: false, external: true, detail: 'Install, launch, upgrade, repair and uninstall evidence must be attached from an independent host.' }
  ]
  if (target === 'android') for (const [id, passed] of Object.entries(exportTemplateState.androidGates)) gates.push({ id: `android-${id}`, label: id, passed, external: true, detail: 'Android promotion requires this independently captured gate.' })
  const passed = gates.every(gate => gate.passed), unavailable = support.availability === 'unavailable'
  return { target, status: passed ? 'qualified' : unavailable ? 'blocked' : 'pending-external', gates }
}

export function installOfflineExportTemplate(value: unknown): ExportTemplateManifest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Export template manifest must be an object.')
  const source = value as Partial<ExportTemplateManifest>, target: BuildTarget = ['windows', 'linux', 'macos', 'web', 'android'].includes(String(source.target)) ? source.target as BuildTarget : 'web'
  const publisher = String(source.publisher ?? '').slice(0, 120), signature = String(source.signature ?? ''), officialTrust = publisher === 'Whitelist' && (signature === 'nova-bundled-v1' || signature.startsWith('nova-official-v1:'))
  const template: ExportTemplateManifest = { format: 'nova-export-template', version: 1, id: String(source.id ?? '').trim().slice(0, 120), name: String(source.name ?? '').trim().slice(0, 120), templateVersion: String(source.templateVersion ?? '').trim().slice(0, 40), engineRange: String(source.engineRange ?? '').trim().slice(0, 80), target, architectures: [...new Set((Array.isArray(source.architectures) ? source.architectures : []).filter((item): item is BuildArchitecture => item === 'x86_64' || item === 'aarch64'))], runtimeModes: [...new Set((Array.isArray(source.runtimeModes) ? source.runtimeModes : []).filter((item): item is BuildRuntimeMode => item === 'game' || item === 'headless-server'))], sha256: String(source.sha256 ?? '').toLowerCase(), signature, publisher, trusted: officialTrust, host: source.host === 'windows' || source.host === 'linux' || source.host === 'macos' ? source.host : 'any', minimumSdk: String(source.minimumSdk ?? '').slice(0, 300), installed: true, source: 'offline', limitations: (Array.isArray(source.limitations) ? source.limitations : []).filter((item): item is string => typeof item === 'string').slice(0, 32).map(item => item.slice(0, 300)) }
  if (template.format !== source.format || source.version !== 1 || !/^[a-z0-9]+(?:[.-][a-z0-9]+)+$/.test(template.id) || !/^\d+\.\d+\.\d+$/.test(template.templateVersion) || !/^[a-f0-9]{64}$/.test(template.sha256) || !template.signature || !template.trusted || !template.architectures.length || !template.runtimeModes.length) throw new Error('Export template identity, publisher trust, version, architecture, or runtime metadata is invalid. Third-party templates require certification before installation.')
  const index = exportTemplateState.templates.findIndex(item => item.id === template.id); if (index >= 0) exportTemplateState.templates.splice(index, 1, template); else exportTemplateState.templates.push(template)
  return template
}
