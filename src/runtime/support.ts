/** 支持诊断资料：组织可导出的环境及问题信息，供定位用户反馈。 */
import { reactive } from 'vue'
import { buildHistory, buildSettings } from './buildSettings'
import { feedbackDiagnostics } from './editorFeedback'
import { faultDiagnostics } from './faultCenter'
import { packageState } from './packages'
import { PLATFORM_SUPPORT_MATRIX } from './platformSupport'
import { recoveryDiagnostics } from './recovery'
import { transactionDiagnostics } from './projectTransactions'
import { externalChangeDiagnostics } from './projectExternalChanges'
import { migrationState } from './projectUpgrade'
import { stableContractDiagnostics } from './stableContracts'
import { diagnosticPrivacyChecklist, RELEASE_CANDIDATE_FREEZE } from './releaseEngineering'
import { NOVA_ENGINE_VERSION } from '../projects/projectFormat'

export interface KnownIssue { severity: 'S2' | 'S3'; area: string; issue: string; workaround: string; owner: string; patchTarget: string }
export const KNOWN_ISSUES: readonly KnownIssue[] = Object.freeze([
  Object.freeze({ severity: 'S2', area: 'Linux/macOS qualification', issue: 'Linux and macOS do not yet have the clean-machine evidence required for a stable tier.', workaround: 'Use Windows/Web Tier 1 or run the supplied CI/reference matrix on matching hardware.', owner: 'Release engineering', patchTarget: 'post-5.0 platform qualification' }),
  Object.freeze({ severity: 'S2', area: 'External browser certification', issue: 'Firefox and WebKit final hosted-player evidence is not attached to the local candidate.', workaround: 'Use the pinned Chromium path or run the published browser matrix before distribution.', owner: 'Web runtime', patchTarget: '5.0 certification evidence' }),
  Object.freeze({ severity: 'S3', area: 'Large worlds', issue: 'World streaming memory values are author estimates rather than operating-system allocation measurements.', workaround: 'Use conservative estimates and compare Profiler captures on target hardware.', owner: 'World runtime', patchTarget: '5.0.x diagnostics' }),
  Object.freeze({ severity: 'S3', area: 'Networking', issue: 'The optional networking package remains Experimental.', workaround: 'Do not treat networking as a 5.0 core stability guarantee.', owner: 'Package ecosystem', patchTarget: 'future package certification' }),
  Object.freeze({ severity: 'S3', area: 'Web bundle size', issue: 'The editor and crash-reporter entry chunks exceed Vite\'s advisory 500 KB threshold.', workaround: 'Exported players use a separate small entry; monitor gzip size and load the editor on the published minimum system.', owner: 'Editor performance', patchTarget: '5.0.x safe code-splitting pass' })
])

export type NovaReleaseChannel = 'stable' | 'beta' | 'development'
export const RELEASE_CHANNELS = Object.freeze([
  Object.freeze({ id: 'stable' as const, label: 'Stable', purpose: 'Production projects', policy: 'Security, S0/S1, migration and compatibility fixes only.', cadence: 'Patch releases after qualification.' }),
  Object.freeze({ id: 'beta' as const, label: 'Beta', purpose: 'Release-candidate validation', policy: 'Feature-complete candidates with documented S2 boundaries.', cadence: 'Time-boxed before a Stable release.' }),
  Object.freeze({ id: 'development' as const, label: 'Development', purpose: 'Extension and engine contributors', policy: 'Unstable; backups required and no production compatibility promise.', cadence: 'Continuous integration snapshots.' })
])
export const KNOWN_ISSUES_FEED = Object.freeze({ format: 'nova-known-issues-feed', version: 1, release: NOVA_ENGINE_VERSION, updatedAt: '2026-08-27', source: 'bundled-offline', issues: KNOWN_ISSUES })

export const supportState = reactive({
  releaseChannel: 'stable' as NovaReleaseChannel,
  includeProjectIdentifiers: false,
  includeFilePaths: false,
  privacyReviewed: false,
  crashReportingOptIn: false,
  lastExport: '',
  lastCrashExport: ''
})

/** 结构说明（自动提取）：download；输入 name、contents；直接调用 URL.createObjectURL、Blob、document.createElement、anchor.click、window.setTimeout；写入 anchor.href、anchor.download。 */ function download(name: string, contents: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' })), anchor = document.createElement('a')
  anchor.href = url; anchor.download = name; anchor.click(); window.setTimeout(/* 调用 URL.revokeObjectURL(url) 并返回调用结果。 */ () => URL.revokeObjectURL(url), 0)
}
/** 结构说明（自动提取）：diagnosticBundle；无显式参数；直接调用 toISOString、Date、diagnosticPrivacyChecklist、JSON.parse、stableContractDiagnostics 等。 */ export function diagnosticBundle(): Record<string, unknown> {
  const sanitize = /** 结构说明（自动提取）：sanitize；输入 source；直接调用 JSON.parse、source.replace；返回表达式求值结果。 */ (source: string) => supportState.includeFilePaths ? JSON.parse(source) : JSON.parse(source.replace(/[A-Za-z]:\\[^"\n]+|\/(?:Users|home)\/[^"\n]+/g, '[redacted-path]'))
  return {
    format: 'nova-diagnostic-bundle', version: 3, engineVersion: NOVA_ENGINE_VERSION, releaseChannel: supportState.releaseChannel, generatedAt: new Date().toISOString(), privacy: { projectIdentifiers: supportState.includeProjectIdentifiers, filePaths: supportState.includeFilePaths, uploaded: false, checklist: diagnosticPrivacyChecklist() },
    contracts: JSON.parse(stableContractDiagnostics()), platforms: PLATFORM_SUPPORT_MATRIX,
    build: { target: buildSettings.target, profile: buildSettings.profile, recent: buildHistory.slice(0, 10).map(/** 构造并返回记录 { ...item, outputPath: supportState.includeFilePaths ? item.outputPath : '[redacted-path]' }，字段按当前实参及捕获状态求值。 */ item => ({ ...item, outputPath: supportState.includeFilePaths ? item.outputPath : '[redacted-path]' })) },
    packages: { installed: packageState.installed.map(/** 构造并返回记录 { id: item.manifest.id, version: item.manifest.version, securityStatus: item.securityStatus, enabled: item.enabled }，字段按当前实参及捕获状态求值。 */ item => ({ id: item.manifest.id, version: item.manifest.version, securityStatus: item.securityStatus, enabled: item.enabled })), quarantine: packageState.quarantine },
    faults: sanitize(faultDiagnostics()), tasks: sanitize(feedbackDiagnostics()), recovery: sanitize(recoveryDiagnostics()), transactions: sanitize(transactionDiagnostics()), externalChanges: sanitize(externalChangeDiagnostics()), migration: sanitize(JSON.stringify({lastDryRun:migrationState.lastDryRun&&{...migrationState.lastDryRun,output:''},lastReport:migrationState.lastReport,logs:migrationState.logs},null,2)), knownIssuesFeed: KNOWN_ISSUES_FEED, releaseCandidate: RELEASE_CANDIDATE_FREEZE
  }
}

/** 结构说明（自动提取）：exportDiagnosticBundle；无显式参数；直接调用 JSON.stringify、diagnosticBundle、slice、toISOString、Date 等；写入 supportState.lastExport。 */ export function exportDiagnosticBundle(): boolean {
  if (!supportState.privacyReviewed) return false
  const source = `${JSON.stringify(diagnosticBundle(), null, 2)}\n`, name = `Nova_A-${NOVA_ENGINE_VERSION}-diagnostics-${new Date().toISOString().slice(0, 10)}.json`
  download(name, source); supportState.lastExport = name; return true
}

/** 结构说明（自动提取）：releaseHealthSnapshot；无显式参数；直接调用 entries.filter、JSON.parse、faultDiagnostics、toISOString、Date 等。 */ export function releaseHealthSnapshot(): Record<string, unknown> {
  const quarantined = packageState.quarantine.length
  const fatalFaults = (JSON.parse(faultDiagnostics()) as { entries?: Array<{ severity?: string }> }).entries?.filter(/* 比较 item.severity 与 'fatal'，返回严格相等的判断结果。 */ item => item.severity === 'fatal').length ?? 0
  return {
    format: 'nova-release-health', version: 1, engineVersion: NOVA_ENGINE_VERSION, channel: supportState.releaseChannel,
    generatedAt: new Date().toISOString(), openS0: 0, openS1: fatalFaults, openS2: KNOWN_ISSUES.filter(/* 比较 issue.severity 与 'S2'，返回严格相等的判断结果。 */ issue => issue.severity === 'S2').length,
    packageQuarantine: quarantined, recoveryAvailable: true, status: fatalFaults ? 'attention' : 'healthy'
  }
}

/** 结构说明（自动提取）：exportCrashReportPackage；无显式参数；直接调用 toISOString、Date、diagnosticBundle、releaseHealthSnapshot、replace 等；写入 supportState.lastCrashExport。 */ export function exportCrashReportPackage(): boolean {
  if (!supportState.crashReportingOptIn || !supportState.privacyReviewed) return false
  const report = {
    format: 'nova-crash-report-package', version: 1, engineVersion: NOVA_ENGINE_VERSION, createdAt: new Date().toISOString(),
    consent: { optIn: true, privacyReviewed: true, uploaded: false }, diagnostics: diagnosticBundle(), releaseHealth: releaseHealthSnapshot()
  }
  const name = `Nova_A-${NOVA_ENGINE_VERSION}-crash-report-${new Date().toISOString().replace(/[:.]/g, '-')}.nova-crash.json`
  download(name, `${JSON.stringify(report, null, 2)}\n`); supportState.lastCrashExport = name; return true
}
